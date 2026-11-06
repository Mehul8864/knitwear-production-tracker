'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Clock, Edit2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import type { OrderMilestone } from '@/types/database'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STAGE_LABELS: Record<string, string> = {
  fabric_inhouse: 'Fabric In-house',
  cutting: 'Cutting',
  stitching: 'Stitching',
  printing: 'Printing',
  washing: 'Washing',
  finishing: 'Finishing',
  packing: 'Packing',
  final_inspection: 'Final Inspection',
  dispatch: 'Dispatch',
}

interface TNATimelineProps {
  orderId: string
  milestones: OrderMilestone[]
}

interface EditState {
  milestone: OrderMilestone
  newDate: string
  reason: string
}

export function TNATimeline({ orderId, milestones }: TNATimelineProps) {
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  async function handleSaveDate() {
    if (!editState) return
    if (!editState.newDate) {
      toast.error('Please select a new date')
      return
    }
    if (!editState.reason.trim()) {
      toast.error('Please provide a reason for the date change')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/milestones/${editState.milestone.id}/date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDate: editState.newDate,
          reason: editState.reason,
          orderId,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to update date')
      }
      toast.success('Milestone date updated')
      setEditState(null)
      // Refresh the page to show updated data
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error updating date')
    } finally {
      setSaving(false)
    }
  }

  if (milestones.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">No TNA milestones yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Generate milestones from a TNA template when creating the order
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-5">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-[var(--border)]" />

            <div className="space-y-0">
              {milestones.map((m) => {
                const targetDate = new Date(m.target_date)
                targetDate.setHours(0, 0, 0, 0)
                const isComplete = !!m.completed_date
                const isPast = targetDate < today && !isComplete
                const isCurrent = m.is_active

                return (
                  <div key={m.id} className="relative flex items-start gap-4 pb-6 last:pb-0">
                    {/* Icon */}
                    <div className="relative z-10 shrink-0">
                      {isComplete ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-500 bg-white" />
                      ) : isCurrent ? (
                        <div className="h-6 w-6 rounded-full border-2 border-[var(--accent)] bg-[var(--accent-light)] flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                        </div>
                      ) : (
                        <Circle
                          className={cn(
                            'h-6 w-6 bg-white',
                            isPast ? 'text-red-400' : 'text-[var(--border-strong)]'
                          )}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={cn(
                              'font-medium text-sm',
                              isComplete
                                ? 'text-emerald-700'
                                : isCurrent
                                ? 'text-[var(--text-primary)]'
                                : 'text-[var(--text-secondary)]'
                            )}
                          >
                            {STAGE_LABELS[m.stage] ?? m.name}
                            {isCurrent && (
                              <span className="ml-2 text-xs font-semibold text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-[var(--text-muted)]" />
                            <span
                              className={cn(
                                'text-xs',
                                isPast ? 'text-red-600 font-medium' : 'text-[var(--text-muted)]'
                              )}
                            >
                              {formatDate(m.target_date)}
                              {isPast && ' (overdue)'}
                            </span>
                            {isComplete && m.completed_date && (
                              <span className="text-xs text-emerald-600">
                                · Completed {formatDate(m.completed_date)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--text-muted)] mt-0.5">
                            {m.completed_quantity.toLocaleString()} / {m.target_quantity.toLocaleString()} pcs
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setEditState({
                              milestone: m,
                              newDate: m.target_date.split('T')[0],
                              reason: '',
                            })
                          }
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit date dialog */}
      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Milestone Date</DialogTitle>
          </DialogHeader>
          {editState && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Changing date for:{' '}
                <strong className="text-[var(--text-primary)]">
                  {STAGE_LABELS[editState.milestone.stage] ?? editState.milestone.name}
                </strong>
              </p>
              <div className="space-y-1.5">
                <Label>Current Date</Label>
                <Input
                  value={formatDate(editState.milestone.target_date)}
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <Label>New Date *</Label>
                <Input
                  type="date"
                  value={editState.newDate}
                  onChange={(e) =>
                    setEditState((s) => s ? { ...s, newDate: e.target.value } : s)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reason for change *</Label>
                <Textarea
                  placeholder="Explain why this date is being changed. This will be recorded in the audit history."
                  value={editState.reason}
                  onChange={(e) =>
                    setEditState((s) => s ? { ...s, reason: e.target.value } : s)
                  }
                  className="h-24"
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                All date changes are permanently recorded in the audit history.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditState(null)}>Cancel</Button>
            <Button onClick={handleSaveDate} loading={saving}>Save Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
