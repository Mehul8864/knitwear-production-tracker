import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const createOrderSchema = z.object({
  po_number: z.string().min(1).max(50),
  buyer_id: z.string().uuid(),
  style_name: z.string().min(1).max(100),
  style_description: z.string().max(500).optional(),
  production_unit_id: z.string().uuid(),
  ex_factory_date: z.string(),
  notes: z.string().max(1000).optional(),
  total_quantity: z.number().positive(),
  items: z.array(z.object({
    colour: z.string().min(1),
    size: z.string().min(1),
    quantity: z.number().positive(),
  })),
  milestones: z.array(z.object({
    stage: z.string(),
    name: z.string(),
    target_date: z.string(),
    sort_order: z.number(),
    target_quantity: z.number(),
    completed_quantity: z.number(),
  })).optional().default([]),
})

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Only merchandisers can create orders' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 })
    }

    const data = parsed.data

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        po_number: data.po_number,
        buyer_id: data.buyer_id,
        style_name: data.style_name,
        style_description: data.style_description ?? null,
        production_unit_id: data.production_unit_id,
        ex_factory_date: data.ex_factory_date,
        notes: data.notes ?? null,
        total_quantity: data.total_quantity,
        current_stage: 'fabric_inhouse',
        completed_quantity: 0,
        status: 'active',
        risk_status: 'GREEN',
        created_by: user.id,
      })
      .select()
      .single()

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // Create order items
    if (data.items.length > 0) {
      const { error: itemsError } = await supabase.from('order_items').insert(
        data.items.map((item) => ({
          order_id: order.id,
          colour: item.colour,
          size: item.size,
          quantity: item.quantity,
        }))
      )
      if (itemsError) {
        console.error('Items insert error:', itemsError)
      }
    }

    // Create milestones
    if (data.milestones.length > 0) {
      const { error: msError } = await supabase.from('order_milestones').insert(
        data.milestones.map((m) => ({
          order_id: order.id,
          stage: m.stage,
          name: m.name,
          target_date: m.target_date,
          sort_order: m.sort_order,
          target_quantity: m.target_quantity,
          completed_quantity: m.completed_quantity,
          is_active: m.sort_order === Math.min(...data.milestones.map((x) => x.sort_order)),
        }))
      )
      if (msError) {
        console.error('Milestones insert error:', msError)
      }
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      order_id: order.id,
      action: 'order_created',
      details: { po_number: data.po_number },
    })

    return NextResponse.json({ id: order.id }, { status: 201 })
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
