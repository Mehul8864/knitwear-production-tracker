'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Clock, Edit2, AlertCircle } from 'lucide-react'
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
import { EmptyState } from '@/components/ui/empty-state'

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
    if (!editState.newDate) { toast.error('Please select a new date'); return }
    if (!editState.reason.trim()) { toast.error('Please provide a reason for the date change'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/milestones/${editState.milestone.id}/date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDate: editState.newDate, reason: editState.reason, orderId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to update date')
      }
      toast.success('Milestone date updated')
      setEditState(null)
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
        <CardContent>
          <EmptyState icon={Clock} title="No TNA milestones" description="Milestones are generated when creating an order with a TNA template" />
        </CardContent>
      </Card>
    )
  }

  const completedCount = milestones.filter(m => m.completed_date).length
  const totalCount = milestones.length

  return (
    <>
      <Card>
        <CardContent className="p-5">
          {/* Progress summary */}
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {completedCount} of {totalCount} milestones complete
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Monday–Saturday working calendar
              </p>
            </div>
            <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--green)' }} />
                Done
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                Current
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--border-strong)' }} />
                Upcoming
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute left-[11px] top-4 bottom-4 w-[1.5px]"
              style={{ background: 'var(--border)' }}
            />
            <div className="space-y-0">
              {milestones.map(m => {
                const targetDate = new Date(m.target_date)
                targetDate.setHours(0, 0, 0, 0)
                const isComplete = !!m.completed_date
                const isPast = targetDate < today && !isComplete
                const isCurrent = m.is_active

                return (
                  <div key={m.id} className="relative flex items-start gap-4 pb-5 last:pb-0">
                    {/* Node */}
                    <div
                      className="relative z-10 w-[23px] h-[23px] rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: isComplete ? 'var(--green-bg)' :
                                    isCurrent  ? 'var(--accent-light)' :
                                    isPast     ? 'var(--red-bg)' :
                                    'white',
                        border: `1.5px solid ${
                          isComplete ? 'var(--green)' :
                          isCurrent  ? 'var(--accent)' :
                          isPast     ? 'var(--red)' :
                          'var(--border)'
                        }`,
                      }}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-3 w-3" style={{ color: 'var(--green)' }} />
                      ) : isPast ? (
                        <AlertCircle className="h-3 w-3" style={{ color: 'var(--red)' }} />
                      ) : isCurrent ? (
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--border-strong)' }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={cn(
                              'text-[13px] font-medium',
                              isComplete ? 'line-through' : ''
                            )}
                            style={{
                              color: isComplete ? 'var(--text-muted)' :
                                     isCurrent  ? 'var(--text-primary)' :
                                     'var(--text-secondary)',
                            }}
                          >
                            {STAGE_LABELS[m.stage] ?? m.name}
                            {isCurrent && (
                              <span
                                className="ml-2 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                              >
                                Current
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock className="h-3 w-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                            <span
                              className={cn(
                                'text-[11.5px]',
                                isPast ? 'font-medium' : ''
                              )}
                              style={{ color: isPast ? 'var(--red-text)' : 'var(--text-muted)' }}
                            >
                              {formatDate(m.target_date)}
                              {isPast && ' · overdue'}
                            </span>
                            {isComplete && m.completed_date && (
                              <span className="text-[11.5px]" style={{ color: 'var(--green-text)' }}>
                                · Done {formatDate(m.completed_date)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                            {m.completed_quantity.toLocaleString()} / {m.target_quantity.toLocaleString()} pcs
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setEditState({ milestone: m, newDate: m.target_date.split('T')[0], reason: '' })}
                          aria-label={`Edit date for ${STAGE_LABELS[m.stage] ?? m.name}`}
                        >
                          <Edit2 className="h-3 w-3" />
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

      <Dialog open={!!editState} onOpenChange={open => !open && setEditState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Milestone Date</DialogTitle>
          </DialogHeader>
          {editState && (
            <div className="space-y-4 py-1">
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Changing: <strong style={{ color: 'var(--text-primary)' }}>
                  {STAGE_LABELS[editState.milestone.stage] ?? editState.milestone.name}
                </strong>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Current Date</Label>
                  <Input value={formatDate(editState.milestone.target_date)} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>New Date *</Label>
                  <Input
                    type="date"
                    value={editState.newDate}
                    onChange={e => setEditState(s => s ? { ...s, newDate: e.target.value } : s)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Reason for change *</Label>
                <Textarea
                  placeholder="Explain why this date is being changed. This is permanently recorded in the audit history."
                  value={editState.reason}
                  onChange={e => setEditState(s => s ? { ...s, reason: e.target.value } : s)}
                  className="h-[80px]"
                />
              </div>
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                All date changes are permanently recorded and visible to compliance teams.
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
