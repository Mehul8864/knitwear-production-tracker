import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { UpdateHistoryList } from '@/components/orders/update-history-list'
import { AIReviewPanel } from '@/components/ai/ai-review-panel'

export const metadata: Metadata = { title: 'Production Updates' }

export const instant = false

export default async function UpdatesPage() {
  const supabase = await createClient()

  const [updatesResult, reviewResult] = await Promise.all([
    supabase
      .from('production_updates')
      .select('*, supervisor:profiles(full_name), order:orders(po_number)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('production_updates')
      .select('*')
      .eq('ai_needs_review', true)
      .is('ai_corrected_category', null)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          Production Updates
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          All factory update submissions
        </p>
      </div>

      {(reviewResult.data ?? []).length > 0 && (
        <AIReviewPanel updates={reviewResult.data ?? []} />
      )}

      <UpdateHistoryList updates={updatesResult.data ?? []} />
    </div>
  )
}

