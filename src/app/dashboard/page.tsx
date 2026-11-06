import type { Metadata } from 'next'
import { connection } from 'next/server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { DashboardKPIs } from '@/components/dashboard/dashboard-kpis'

import { EarlyWarningPanel } from '@/components/dashboard/early-warning-panel'

import { RecentUpdates } from '@/components/dashboard/recent-updates'

import { ProductionTrendChart } from '@/components/dashboard/production-trend-chart'

import { UpcomingDeadlines } from '@/components/dashboard/upcoming-deadlines'


export const metadata: Metadata = { title: 'Dashboard' }


export const instant = false

export default async function DashboardPage() {
  const supabase = await createClient()
  await connection()

  // Ensure auth.uid() is resolved before RLS-gated queries run
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all data needed for dashboard in parallel.
  //
  // IMPORTANT: production_updates has TWO foreign keys to profiles:
  //   - supervisor_id (the actual supervisor)
  //   - ai_corrected_by (the merchandiser who corrected the AI)
  // PostgREST raises PGRST201 (ambiguous embed) without an explicit FK hint.
  // We use the !<fk_name> hint to specify which FK to follow for the join.
  const [ordersResult, updatesResult] = await Promise.all([
    supabase
      .from('orders')
      .select('*, buyer:buyers(*), production_unit:production_units(*)')
      .eq('status', 'active')
      .order('ex_factory_date', { ascending: true }),
    supabase
      .from('production_updates')
      .select('*, supervisor:profiles!production_updates_supervisor_id_fkey(full_name)')
      .order('update_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const orders = ordersResult.data ?? []
  const updates = updatesResult.data ?? []

  // Calculate KPI counts
  const total = orders.length
  const onTrack = orders.filter((o) => o.risk_status === 'GREEN').length
  const atRisk = orders.filter((o) => o.risk_status === 'AMBER').length
  const delayed = orders.filter((o) => o.risk_status === 'RED').length
  const totalQty = orders.reduce((sum, o) => sum + o.total_quantity, 0)

  const today = new Date()
  const in14Days = new Date(today)
  in14Days.setDate(in14Days.getDate() + 14)
  const shippingSoon = orders.filter((o) => {
    const d = new Date(o.ex_factory_date)
    return d >= today && d <= in14Days
  }).length

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1
          className="text-[20px] font-bold tracking-[-0.018em] leading-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Production Overview
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Live factory status � {total} active order{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* KPI row */}
      <DashboardKPIs
        total={total}
        onTrack={onTrack}
        atRisk={atRisk}
        delayed={delayed}
        totalQty={totalQty}
        shippingSoon={shippingSoon}
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <ProductionTrendChart orders={orders} updates={updates} />
          <UpcomingDeadlines orders={orders} />
        </div>
        <div className="space-y-4">
          <EarlyWarningPanel orders={orders} />
          <RecentUpdates updates={updates} />
        </div>
      </div>
    </div>
  )
}
