import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrderDetailView } from '@/components/orders/order-detail-view'

export const instant = false

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('orders').select('po_number').eq('id', id).single()
  return { title: data?.po_number ?? 'Order' }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [orderResult, milestonesResult, updatesResult, itemsResult, historyResult] =
    await Promise.all([
      supabase
        .from('orders')
        .select('*, buyer:buyers(*), production_unit:production_units(*)')
        .eq('id', id)
        .single(),
      supabase
        .from('order_milestones')
        .select('*')
        .eq('order_id', id)
        .order('sort_order'),
      supabase
        .from('production_updates')
        .select('*, supervisor:profiles!production_updates_supervisor_id_fkey(full_name)')
        .eq('order_id', id)
        .order('update_date', { ascending: false }),
      supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id)
        .order('colour'),
      supabase
        .from('milestone_date_change_history')
        .select('*, profile:profiles(full_name, email)')
        .eq('order_id', id)
        .order('changed_at', { ascending: false }),
    ])

  if (!orderResult.data) notFound()

  return (
    <OrderDetailView
      order={orderResult.data}
      milestones={milestonesResult.data ?? []}
      updates={updatesResult.data ?? []}
      items={itemsResult.data ?? []}
      dateHistory={historyResult.data ?? []}
    />
  )
}
