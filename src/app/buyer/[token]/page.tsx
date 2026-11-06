import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BuyerPortalView } from '@/components/buyer/buyer-portal-view'
import type { Metadata } from 'next'
import { hashToken } from '@/lib/token-utils'

// This page is dynamic — it accesses cookies and runtime params
// Force dynamic rendering — prevent Partial Prerender of auth-gated pages

interface Props {
  params: Promise<{ token: string }>
}

export const metadata: Metadata = {
  title: 'Production Status — StitchOps Buyer Portal',
  description: 'Secure buyer-only view of your production orders',
}

export const instant = false

export default async function BuyerPortalPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()
  await connection()

  // Hash the token before looking it up
  const tokenHash = await hashToken(token)

  // Validate token
  const { data: accessToken } = await supabase
    .from('buyer_access_tokens')
    .select('*, buyer:buyers(*)')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .single()

  if (!accessToken) {
    notFound()
  }

  // Check expiry
  if (accessToken.expires_at && new Date(accessToken.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center max-w-sm">
          <p className="text-xl font-bold text-[var(--text-primary)] mb-2">Link Expired</p>
          <p className="text-sm text-[var(--text-muted)]">
            This buyer access link has expired. Please contact your merchandiser for a new link.
          </p>
        </div>
      </div>
    )
  }

  const buyerId = accessToken.buyer_id

  // Fetch buyer's orders ONLY — strictly isolated
  const { data: rawOrders } = await supabase
    .from('orders')
    .select(`
      id, po_number, style_name, total_quantity, current_stage,
      completed_quantity, ex_factory_date, status, risk_status,
      production_unit:production_units(name, location)
    `)
    .eq('buyer_id', buyerId)
    .eq('status', 'active')
    .order('ex_factory_date', { ascending: true })

  // Normalise production_unit join (Supabase returns array for joins)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = (rawOrders ?? []).map((o: any) => ({
    ...o,
    production_unit: Array.isArray(o.production_unit)
      ? o.production_unit[0] ?? null
      : o.production_unit ?? null,
  }))

  // Fetch milestones for these orders
  const orderIds = orders.map((o) => o.id)
  const { data: milestones } = orderIds.length > 0
    ? await supabase
        .from('order_milestones')
        .select('*')
        .in('order_id', orderIds)
        .order('sort_order')
    : { data: [] }

  // Fetch approved photos
  const { data: updates } = orderIds.length > 0
    ? await supabase
        .from('production_updates')
        .select('order_id, stage, update_date, photo_urls')
        .in('order_id', orderIds)
        .order('update_date', { ascending: false })
    : { data: [] }

  // Date change history
  const { data: dateHistory } = orderIds.length > 0
    ? await supabase
        .from('milestone_date_change_history')
        .select('order_id, previous_date, new_date, reason, changed_at')
        .in('order_id', orderIds)
        .order('changed_at', { ascending: false })
    : { data: [] }

  const buyer = accessToken.buyer as { name: string; country: string } | null

  return (
    <BuyerPortalView
      buyer={buyer}
      orders={orders ?? []}
      milestones={milestones ?? []}
      updates={updates ?? []}
      dateHistory={dateHistory ?? []}
      buyerToken={token}
    />
  )
}
