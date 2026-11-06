import type { Metadata } from 'next'
import { connection } from 'next/server'

import { createClient } from '@/lib/supabase/server'

import { redirect } from 'next/navigation'

import { SupervisorUpdateForm } from '@/components/supervisor/supervisor-update-form'


export const metadata: Metadata = { title: 'Submit Update' }


export const instant = false

export default async function SupervisorUpdatePage() {
  const supabase = await createClient()
  await connection()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, production_unit:production_units(*)')
    .eq('id', user.id)
    .single()

  // Merchandisers can also access this for review
  const ordersQuery = profile?.role === 'supervisor'
    ? supabase
        .from('orders')
        .select('id, po_number, style_name, current_stage, total_quantity, completed_quantity')
        .eq('production_unit_id', profile.production_unit_id ?? '')
        .eq('status', 'active')
    : supabase
        .from('orders')
        .select('id, po_number, style_name, current_stage, total_quantity, completed_quantity')
        .eq('status', 'active')
        .limit(20)

  const { data: orders } = await ordersQuery.order('ex_factory_date', { ascending: true })

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          Submit Production Update
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Report today&apos;s production quantity, photographs, and any issues
        </p>
      </div>
      <SupervisorUpdateForm
        orders={orders ?? []}
        supervisorId={user.id}
      />
    </div>
  )
}

