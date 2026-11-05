'use client'

import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Info, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateRunRate, isEarlyWarning } from '@/lib/run-rate'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Order, OrderMilestone, ProductionUpdate } from '@/types/database'
import { cn } from '@/lib/utils'

interface RunRatePanelProps {
  order: Order
  milestones: OrderMilestone[]
  updates: ProductionUpdate[]
}

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

export function RunRatePanel({ order, milestones, updates }: RunRatePanelProps) {
  const referenceDate = new Date()

  const milestoneResults = useMemo(() => {
    return milestones.map((m) => {
      const stageUpdates = updates
        .filter((u) => u.stage === m.stage)
        .map((u) => ({
          date: new Date(u.update_date ?? u.created_at),
          quantity: u.quantity_completed,
        }))

      const result = calculateRunRate({
        targetQuantity: m.target_quantity || order.total_quantity,
        completedQuantity: m.completed_quantity,
        milestoneDeadline: new Date(m.target_date),
        recentUpdates: stageUpdates,
        referenceDate,
      })

      return { milestone: m, result }
    })
  }, [milestones, updates, order.total_quantity, referenceDate])

  // Overall order run-rate (based on ex-factory date)
  const overallRunRate = useMemo(() => {
    const allUpdates = updates.map((u) => ({
      date: new Date(u.update_date ?? u.created_at),
      quantity: u.quantity_completed,
    }))
    return calculateRunRate({
      targetQuantity: order.total_quantity,
      completedQuantity: order.completed_quantity,
      milestoneDeadline: new Date(order.ex_factory_date),
      recentUpdates: allUpdates,
      referenceDate,
    })
  }, [order, updates, referenceDate])

  const warnings = milestoneResults.filter(({ result }) => isEarlyWarning(result))

  return (
    <div className="space-y-5">
      {/* Overall run-rate summary */}
      <Card className={cn(
        'border-2',
        overallRunRate.status === 'GREEN' && 'border-emerald-200 bg-[var(--green-bg)]',
        overallRunRate.status === 'AMBER' && 'border-amber-200 bg-[var(--amber-bg)]',
        overallRunRate.status === 'RED' && 'border-red-200 bg-[var(--red-bg)]',
        overallRunRate.status === 'COMPLETE' && 'border-emerald-200 bg-[var(--green-bg)]',
      )}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            {overallRunRate.status === 'GREEN' || overallRunRate.status === 'COMPLETE' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : overallRunRate.status === 'AMBER' ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-[var(--text-primary)] mb-1">
                Order-level Run Rate — {order.po_number}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">{overallRunRate.explanation}</p>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            <MetricItem
              label="Remaining"
              value={`${formatNumber(overallRunRate.remainingQuantity)} pcs`}
            />
            <MetricItem
              label="Working Days Left"
              value={overallRunRate.workingDaysRemaining > 0 ? `${overallRunRate.workingDaysRemaining} days` : 'Deadline passed'}
              highlight={overallRunRate.workingDaysRemaining <= 3}
            />
            <MetricItem
              label="Required/Day"
              value={
                overallRunRate.requiredDailyOutput === Infinity
                  ? 'N/A'
                  : `${Math.ceil(overallRunRate.requiredDailyOutput).toLocaleString()} pcs`
              }
            />
            <MetricItem
              label="Actual/Day (7d avg)"
              value={`${Math.round(overallRunRate.actualDailyOutput).toLocaleString()} pcs`}
              highlight={overallRunRate.actualDailyOutput < overallRunRate.requiredDailyOutput}
            />
          </div>

          {overallRunRate.shortfallPerDay > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-white/60 border border-white/80">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Shortfall:{' '}
                <span className="text-red-600">
                  {Math.ceil(overallRunRate.shortfallPerDay).toLocaleString()} pcs/day
                </span>
              </p>
              {overallRunRate.projectedCompletionDate && (
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  At current rate, completion projected for{' '}
                  <strong>{formatDate(overallRunRate.projectedCompletionDate)}</strong>
                  {!overallRunRate.onTrackByDate && (
                    <span className="text-red-600 font-medium"> — misses ex-factory date</span>
                  )}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Early warning panel */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-[var(--amber-bg)] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="font-semibold text-amber-800 text-sm">
              Early Warning — {warnings.length} milestone{warnings.length !== 1 ? 's' : ''} at risk
            </p>
          </div>
          {warnings.map(({ milestone, result }) => (
            <div key={milestone.id} className="bg-white/60 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[var(--text-primary)]">
                  {STAGE_LABELS[milestone.stage] ?? milestone.name}
                </span>
                <span className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded-full',
                  result.status === 'RED' ? 'bg-[var(--red-bg)] text-red-700' : 'bg-[var(--amber-bg)] text-amber-700'
                )}>
                  {result.daysUntilDeadline}d to deadline
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{result.explanation}</p>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-[var(--text-muted)]">
                <span>Required: <strong className="text-[var(--text-primary)]">{Math.ceil(result.requiredDailyOutput)} pcs/d</strong></span>
                <span>Actual: <strong className="text-[var(--text-primary)]">{Math.round(result.actualDailyOutput)} pcs/d</strong></span>
                <span>Shortfall: <strong className="text-red-600">{Math.ceil(result.shortfallPerDay)} pcs/d</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Per-milestone breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Milestone Run-Rate Breakdown</CardTitle>
            <div className="flex items-center gap-1 ml-auto">
              <Info className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">
                Status: GREEN ≥ required · AMBER ≥ 70% · RED &lt; 70% or projected miss
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {milestoneResults.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">No milestones defined yet</p>
          ) : (
            <div className="space-y-3">
              {milestoneResults.map(({ milestone, result }) => (
                <div
                  key={milestone.id}
                  className={cn(
                    'p-4 rounded-xl border',
                    result.status === 'GREEN' || result.status === 'COMPLETE'
                      ? 'border-emerald-200 bg-[var(--green-bg)]'
                      : result.status === 'AMBER'
                      ? 'border-amber-200 bg-[var(--amber-bg)]'
                      : 'border-red-200 bg-[var(--red-bg)]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-medium text-sm text-[var(--text-primary)]">
                        {STAGE_LABELS[milestone.stage] ?? milestone.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Target: {formatDate(milestone.target_date)}
                      </p>
                    </div>
                    <span className={cn(
                      'text-xs font-bold px-2.5 py-1 rounded-full shrink-0',
                      (result.status === 'GREEN' || result.status === 'COMPLETE') && 'bg-white text-emerald-700',
                      result.status === 'AMBER' && 'bg-white text-amber-700',
                      result.status === 'RED' && 'bg-white text-red-700',
                    )}>
                      {result.status === 'COMPLETE' ? 'COMPLETE' : result.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <MetricItem label="Completed" value={`${formatNumber(result.completedQuantity)} pcs`} small />
                    <MetricItem label="Remaining" value={`${formatNumber(result.remainingQuantity)} pcs`} small />
                    <MetricItem label="Required/Day" value={result.requiredDailyOutput === Infinity ? 'N/A' : `${Math.ceil(result.requiredDailyOutput)} pcs`} small />
                    <MetricItem label="Actual/Day" value={`${Math.round(result.actualDailyOutput)} pcs`} small />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 italic">
                    {result.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricItem({
  label,
  value,
  highlight,
  small,
}: {
  label: string
  value: string
  highlight?: boolean
  small?: boolean
}) {
  return (
    <div className="bg-white/60 rounded-xl p-3">
      <p className={cn('text-[var(--text-muted)] mb-1', small ? 'text-xs' : 'text-xs font-medium uppercase tracking-wider')}>
        {label}
      </p>
      <p className={cn('font-bold text-[var(--text-primary)]', small ? 'text-sm' : 'text-base', highlight && 'text-red-600')}>
        {value}
      </p>
    </div>
  )
}
