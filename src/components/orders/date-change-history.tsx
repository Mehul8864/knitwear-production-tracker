import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime, formatDate } from '@/lib/utils'
import type { MilestoneDateChangeHistory } from '@/types/database'
import { ArrowRight, History } from 'lucide-react'

interface DateChangeHistoryProps {
  history: MilestoneDateChangeHistory[]
}

export function DateChangeHistory({ history }: DateChangeHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[var(--text-muted)]" />
          <CardTitle>Date Change Audit History</CardTitle>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Every milestone date change is permanently recorded here for buyer compliance.
        </p>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">No date changes recorded</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              All future date modifications will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((h) => {
              const profile = h.profile as { full_name: string; email: string } | null
              return (
                <div
                  key={h.id}
                  className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-[var(--text-primary)] line-through decoration-red-400">
                          {formatDate(h.previous_date)}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatDate(h.new_date)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">
                      {formatDateTime(h.changed_at)}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    &ldquo;{h.reason}&rdquo;
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5">
                    Changed by {profile?.full_name ?? 'Unknown'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
