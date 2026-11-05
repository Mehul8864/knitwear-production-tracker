import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StageBadge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { ProductionUpdate } from '@/types/database'

interface RecentUpdatesProps {
  updates: ProductionUpdate[]
}

export function RecentUpdates({ updates }: RecentUpdatesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Factory Updates</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {updates.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">No updates yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {updates.slice(0, 6).map((update) => (
              <div key={update.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StageBadge stage={update.stage} />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {update.quantity_completed.toLocaleString()} pcs
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    By {(update.supervisor as { full_name: string } | null)?.full_name ?? 'Supervisor'} · {formatDate(update.update_date ?? update.created_at)}
                  </p>
                  {update.issue_note_english && (
                    <p className="text-xs text-amber-700 mt-1 truncate">
                      ⚠ {update.issue_note_english}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
