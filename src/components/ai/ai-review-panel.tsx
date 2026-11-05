'use client'

import { useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { ProductionUpdate, AICategory } from '@/types/database'

const AI_CATEGORIES: { value: AICategory; label: string }[] = [
  { value: 'MATERIAL_SHORTAGE', label: 'Material Shortage' },
  { value: 'MACHINE_BREAKDOWN', label: 'Machine Breakdown' },
  { value: 'LABOUR_SHORTAGE', label: 'Labour Shortage' },
  { value: 'QUALITY_REWORK', label: 'Quality Rework' },
  { value: 'PRINTING_DELAY', label: 'Printing Delay' },
  { value: 'WASHING_DELAY', label: 'Washing Delay' },
  { value: 'POWER_OUTAGE', label: 'Power Outage' },
  { value: 'SUBCONTRACTOR_DELAY', label: 'Subcontractor Delay' },
  { value: 'OTHER', label: 'Other' },
]

interface AIReviewPanelProps {
  updates: ProductionUpdate[]
}

export function AIReviewPanel({ updates }: AIReviewPanelProps) {
  const [corrections, setCorrections] = useState<Record<string, AICategory>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = updates.filter((u) => !dismissed.has(u.id))

  async function handleCorrect(updateId: string, category: AICategory) {
    setSaving((s) => ({ ...s, [updateId]: true }))
    try {
      const res = await fetch(`/api/updates/${updateId}/correct-category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      })
      if (!res.ok) throw new Error('Failed to save correction')
      toast.success('Category corrected and saved')
      setDismissed((d) => new Set([...d, updateId]))
    } catch {
      toast.error('Failed to save correction')
    } finally {
      setSaving((s) => ({ ...s, [updateId]: false }))
    }
  }

  async function handleConfirm(update: ProductionUpdate) {
    if (!update.ai_category) return
    await handleCorrect(update.id, update.ai_category)
  }

  if (visible.length === 0) return null

  return (
    <Card className="border-amber-200 bg-[var(--amber-bg)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-amber-800">
            AI Review Required — {visible.length} item{visible.length !== 1 ? 's' : ''}
          </CardTitle>
        </div>
        <p className="text-xs text-amber-700 mt-1">
          These AI classifications have low confidence and need human verification.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.map((update) => (
          <div key={update.id} className="bg-white rounded-xl p-4 border border-amber-200">
            <div className="space-y-3">
              {/* Original note */}
              {update.issue_note_original && (
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Original Note
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] italic">
                    {update.issue_note_original}
                  </p>
                </div>
              )}
              {/* Translation */}
              {update.issue_note_english && update.issue_note_english !== update.issue_note_original && (
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    English Translation
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {update.issue_note_english}
                  </p>
                </div>
              )}
              {/* AI suggestion */}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-[var(--text-muted)]">AI suggested:</p>
                <Badge variant="accent">
                  {AI_CATEGORIES.find((c) => c.value === update.ai_category)?.label ?? update.ai_category}
                </Badge>
                <span className="text-xs text-[var(--text-muted)]">
                  {update.ai_confidence != null && `${Math.round(update.ai_confidence * 100)}% confidence`}
                </span>
              </div>
              {/* Correction */}
              <div className="flex items-center gap-3 flex-wrap">
                <Select
                  onValueChange={(v) => setCorrections((c) => ({ ...c, [update.id]: v as AICategory }))}
                  defaultValue={update.ai_category ?? undefined}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select correct category" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => handleCorrect(update.id, corrections[update.id] ?? update.ai_category!)}
                  loading={saving[update.id]}
                  disabled={!corrections[update.id] && !update.ai_category}
                >
                  <Check className="h-3.5 w-3.5" />
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleConfirm(update)}
                >
                  Keep AI suggestion
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
