import type { Metadata } from 'next'
import { connection } from 'next/server'

import { createClient } from '@/lib/supabase/server'

import { OrderBoard } from '@/components/orders/order-board'


export const metadata: Metadata = { title: 'Order Board' }


export const instant = false

export default async function OrdersPage() {
  await connection()
  const supabase = await createClient()

  const [ordersResult, buyersResult, unitsResult] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        *,
        buyer:buyers(*),
        production_unit:production_units(*)
      `)
      .order('ex_factory_date', { ascending: true }),
    supabase.from('buyers').select('*').order('name'),
    supabase.from('production_units').select('*').order('name'),
  ])

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          Order Board
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          All production orders sorted by risk and deadline
        </p>
      </div>
      <OrderBoard
        initialOrders={ordersResult.data ?? []}
        buyers={buyersResult.data ?? []}
        units={unitsResult.data ?? []}
      />
    </div>
  )
}

