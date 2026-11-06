import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StageBadge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { ProductionUpdate } from '@/types/database'
import { MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface RecentUpdatesProps {
  updates: ProductionUpdate[]
}

const STAGE_COLORS: Record<string, string> = {
  stitching:        'var(--accent)',
  finishing:        'var(--green)',
  printing:         'var(--amber)',
  cutting:          'var(--navy-muted)',
  washing:          '#0891b2',
  packing:          '#7c3aed',
  fabric_inhouse:   'var(--text-muted)',
  final_inspection: 'var(--red)',
  dispatch:         'var(--green)',
}

export function RecentUpdates({ updates }: RecentUpdatesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Updates</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-3">
        {updates.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No updates yet"
            description="Factory updates will appear here"
            compact
          />
        ) : (
          <div className="space-y-0 divide-y divide-[var(--border-light)]">
            {updates.slice(0, 6).map(update => {
              const supervisor = update.supervisor as { full_name: string } | null
              const dotColor = STAGE_COLORS[update.stage] ?? 'var(--text-muted)'
              return (
                <div key={update.id} className="flex items-start gap-3 py-3 first:pt-1 last:pb-1">
                  <div
                    className="mt-[3px] w-2 h-2 rounded-full shrink-0"
                    style={{ background: dotColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StageBadge stage={update.stage} />
                      <span
                        className="text-[13px] font-semibold tabular-nums"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {(update.quantity_completed ?? 0).toLocaleString()} pcs
                      </span>
                    </div>
                    <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {supervisor?.full_name ?? 'Supervisor'}
                      {' · '}
                      {formatDate(update.update_date ?? update.created_at)}
                    </p>
                    {update.issue_note_english && (
                      <p
                        className="text-[11.5px] mt-1 rounded px-2 py-1 truncate"
                        style={{
                          background: 'var(--amber-bg)',
                          color: 'var(--amber-text)',
                          border: '1px solid var(--amber-border)',
                        }}
                      >
                        ⚠ {update.issue_note_english}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
