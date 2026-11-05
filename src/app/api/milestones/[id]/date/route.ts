import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const dateChangeSchema = z.object({
  newDate: z.string().min(1, 'New date is required'),
  reason: z.string().min(1, 'Reason is required').max(1000),
  orderId: z.string().uuid(),
})

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'merchandiser') {
      return NextResponse.json({ error: 'Only merchandisers can change milestone dates' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = dateChangeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 })
    }

    const { newDate, reason, orderId } = parsed.data

    // Get current milestone
    const { data: milestone, error: msError } = await supabase
      .from('order_milestones')
      .select('target_date, order_id')
      .eq('id', id)
      .single()

    if (msError || !milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Verify ownership
    if (milestone.order_id !== orderId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const previousDate = milestone.target_date

    // Update milestone date
    const { error: updateError } = await supabase
      .from('order_milestones')
      .update({ target_date: newDate, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Record audit history
    const { error: historyError } = await supabase
      .from('milestone_date_change_history')
      .insert({
        milestone_id: id,
        order_id: orderId,
        previous_date: previousDate,
        new_date: newDate,
        reason,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
      })

    if (historyError) {
      console.error('History insert error:', historyError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Date change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
