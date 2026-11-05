import { Card, CardContent } from '@/components/ui/card'
import { StageBadge, Badge } from '@/components/ui/badge'
import { formatDateTime, formatDate } from '@/lib/utils'
import type { ProductionUpdate } from '@/types/database'

const AI_CATEGORY_LABELS: Record<string, string> = {
  MATERIAL_SHORTAGE: 'Material Shortage',
  MACHINE_BREAKDOWN: 'Machine Breakdown',
  LABOUR_SHORTAGE: 'Labour Shortage',
  QUALITY_REWORK: 'Quality Rework',
  PRINTING_DELAY: 'Printing Delay',
  WASHING_DELAY: 'Washing Delay',
  POWER_OUTAGE: 'Power Outage',
  SUBCONTRACTOR_DELAY: 'Subcontractor Delay',
  OTHER: 'Other',
}

interface UpdateHistoryListProps {
  updates: ProductionUpdate[]
}

export function UpdateHistoryList({ updates }: UpdateHistoryListProps) {
  if (updates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">No production updates yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Updates will appear here as supervisors submit them from the factory floor
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {updates.map((update) => {
        const supervisor = update.supervisor as { full_name: string } | null
        const category = update.ai_corrected_category ?? update.ai_category

        return (
          <Card key={update.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <StageBadge stage={update.stage} />
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {update.quantity_completed.toLocaleString()} pcs
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">·</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {supervisor?.full_name ?? 'Supervisor'}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">·</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(update.update_date ?? update.created_at)}
                    </span>
                  </div>

                  {/* Issue notes */}
                  {update.issue_note_original && (
                    <div className="mt-2 space-y-1">
                      {update.issue_note_original !== update.issue_note_english && (
                        <p className="text-xs text-[var(--text-muted)] italic">
                          Tamil: {update.issue_note_original}
                        </p>
                      )}
                      {update.issue_note_english && (
                        <p className="text-sm text-[var(--text-secondary)]">
                          {update.issue_note_english}
                        </p>
                      )}
                    </div>
                  )}

                  {/* AI classification */}
                  {category && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="accent">
                        AI: {AI_CATEGORY_LABELS[category] ?? category}
                      </Badge>
                      {update.ai_needs_review && (
                        <Badge variant="amber">Needs Review</Badge>
                      )}
                      {update.ai_corrected_category && (
                        <span className="text-xs text-[var(--text-muted)]">
                          (corrected from {AI_CATEGORY_LABELS[update.ai_category ?? ''] ?? update.ai_category})
                        </span>
                      )}
                      {update.ai_confidence != null && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {Math.round(update.ai_confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  )}

                  {/* Photos */}
                  {update.photo_urls?.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {update.photo_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-16 h-16 rounded-lg overflow-hidden border border-[var(--border)] hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={url}
                            alt={`Production photo ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatDateTime(update.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
