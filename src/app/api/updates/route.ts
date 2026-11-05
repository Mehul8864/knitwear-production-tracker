import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const updateSchema = z.object({
  client_id: z.string().uuid(),
  order_id: z.string().uuid(),
  supervisor_id: z.string().uuid(),
  stage: z.string().min(1),
  quantity_completed: z.number().positive().int(),
  update_date: z.string(),
  issue_note_original: z.string().max(2000).optional(),
  issue_note_english: z.string().max(2000).optional(),
  ai_category: z.string().optional(),
  ai_confidence: z.number().optional(),
  ai_needs_review: z.boolean().optional(),
  photo_urls: z.array(z.string()).optional().default([]),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 })
    }

    const data = parsed.data

    // Prevent duplicate submissions (idempotency via client_id)
    const { data: existing } = await supabase
      .from('production_updates')
      .select('id')
      .eq('client_id', data.client_id)
      .single()

    if (existing) {
      // Already exists — return success (idempotent)
      return NextResponse.json({ id: existing.id, duplicate: true }, { status: 200 })
    }

    // Get the active milestone for this order+stage
    const { data: milestone } = await supabase
      .from('order_milestones')
      .select('id, completed_quantity, target_quantity')
      .eq('order_id', data.order_id)
      .eq('stage', data.stage)
      .single()

    // Insert production update
    const { data: update, error: insertError } = await supabase
      .from('production_updates')
      .insert({
        client_id: data.client_id,
        order_id: data.order_id,
        milestone_id: milestone?.id ?? null,
        supervisor_id: data.supervisor_id,
        stage: data.stage,
        quantity_completed: data.quantity_completed,
        update_date: data.update_date,
        issue_note_original: data.issue_note_original ?? null,
        issue_note_english: data.issue_note_english ?? null,
        ai_category: data.ai_category ?? null,
        ai_confidence: data.ai_confidence ?? null,
        ai_needs_review: data.ai_needs_review ?? false,
        photo_urls: data.photo_urls,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Update milestone completed quantity
    if (milestone) {
      await supabase
        .from('order_milestones')
        .update({
          completed_quantity: milestone.completed_quantity + data.quantity_completed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', milestone.id)
    }

    // Update order completed quantity and current stage
    const { data: order } = await supabase
      .from('orders')
      .select('completed_quantity, total_quantity')
      .eq('id', data.order_id)
      .single()

    if (order) {
      const newCompleted = order.completed_quantity + data.quantity_completed
      const newRiskStatus = calculateOrderRisk(newCompleted, order.total_quantity)

      await supabase
        .from('orders')
        .update({
          completed_quantity: newCompleted,
          current_stage: data.stage,
          risk_status: newRiskStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.order_id)
    }

    return NextResponse.json({ id: update.id }, { status: 201 })
  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateOrderRisk(completed: number, total: number): string {
  const pct = total > 0 ? completed / total : 0
  if (pct >= 0.9) return 'GREEN'
  if (pct >= 0.6) return 'AMBER'
  return 'RED'
}
