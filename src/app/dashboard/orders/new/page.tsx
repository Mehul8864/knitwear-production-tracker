import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CreateOrderForm } from '@/components/orders/create-order-form'

export const metadata: Metadata = { title: 'Create Order' }

export const instant = false

export default async function CreateOrderPage() {
  const supabase = await createClient()

  const [buyersResult, unitsResult, templatesResult] = await Promise.all([
    supabase.from('buyers').select('*').order('name'),
    supabase.from('production_units').select('*').order('name'),
    supabase
      .from('tna_templates')
      .select('*, milestones:tna_template_milestones(*)'),
  ])

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          Create New Order
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Enter order details, size matrix, and generate a TNA plan
        </p>
      </div>
      <CreateOrderForm
        buyers={buyersResult.data ?? []}
        units={unitsResult.data ?? []}
        templates={templatesResult.data ?? []}
      />
    </div>
  )
}

