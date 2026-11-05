import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { TNACalendarView } from '@/components/tna/tna-calendar-view'

export const metadata: Metadata = { title: 'TNA Calendar' }

export const instant = false

export default async function TNAPage() {
  const supabase = await createClient()

  const [milestonesResult, ordersResult] = await Promise.all([
    supabase
      .from('order_milestones')
      .select('*, order:orders(po_number, style_name, buyer_id, buyer:buyers(name), risk_status)')
      .order('target_date', { ascending: true }),
    supabase
      .from('orders')
      .select('id, po_number, style_name, risk_status, buyer:buyers(name)')
      .eq('status', 'active'),
  ])

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          TNA Calendar
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Upcoming production milestones across all active orders
        </p>
      </div>
      <TNACalendarView
        milestones={milestonesResult.data ?? []}
        orders={ordersResult.data ?? []}
      />
    </div>
  )
}

