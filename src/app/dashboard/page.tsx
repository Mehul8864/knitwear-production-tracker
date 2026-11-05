import type { Metadata } from 'next'
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

  // Fetch all data needed for dashboard in parallel
  const [ordersResult, updatesResult] = await Promise.all([
    supabase
      .from('orders')
      .select('*, buyer:buyers(*), production_unit:production_units(*)')
      .eq('status', 'active')
      .order('ex_factory_date', { ascending: true }),
    supabase
      .from('production_updates')
      .select('*, supervisor:profiles(full_name)')
      .order('update_date', { ascending: false })
      .limit(10),
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          Production Overview
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Live factory status across all active orders
        </p>
      </div>

      {/* KPI Cards */}
      <DashboardKPIs
        total={total}
        onTrack={onTrack}
        atRisk={atRisk}
        delayed={delayed}
        totalQty={totalQty}
        shippingSoon={shippingSoon}
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <ProductionTrendChart orders={orders} updates={updates} />
          <UpcomingDeadlines orders={orders} />
        </div>
        <div className="space-y-6">
          <EarlyWarningPanel orders={orders} />
          <RecentUpdates updates={updates} />
        </div>
      </div>
    </div>
  )
}

