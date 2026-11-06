import type { Metadata } from 'next'
import { connection } from 'next/server'

import { createClient } from '@/lib/supabase/server'

import { ReportsView } from '@/components/reports/reports-view'


export const metadata: Metadata = { title: 'Reports' }


export const instant = false

export default async function ReportsPage() {
  const supabase = await createClient()
  await connection()

  const [ordersResult, buyersResult] = await Promise.all([
    supabase
      .from('orders')
      .select('*, buyer:buyers(*), production_unit:production_units(*)')
      .order('ex_factory_date', { ascending: true }),
    supabase.from('buyers').select('*').order('name'),
  ])

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          Reports
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Export production status reports as PDF or Excel
        </p>
      </div>
      <ReportsView
        orders={ordersResult.data ?? []}
        buyers={buyersResult.data ?? []}
      />
    </div>
  )
}

