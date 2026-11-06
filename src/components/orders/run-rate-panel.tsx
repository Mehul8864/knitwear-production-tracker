'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateRunRate, isEarlyWarning } from '@/lib/run-rate'
import { formatDate, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Order, OrderMilestone, ProductionUpdate } from '@/types/database'

interface RunRatePanelProps {
  order: Order
  milestones: OrderMilestone[]
  updates: ProductionUpdate[]
}

const STAGE_LABELS: Record<string, string> = {
  fabric_inhouse: 'Fabric In-house', cutting: 'Cutting', stitching: 'Stitching',
  printing: 'Printing', washing: 'Washing', finishing: 'Finishing',
  packing: 'Packing', final_inspection: 'Final Inspection', dispatch: 'Dispatch',
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-[var(--radius-md)] p-3.5 space-y-1"
      style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.7)' }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(0,0,0,0.45)' }}>
        {label}
      </p>
      <p
        className={cn('text-[18px] font-bold leading-none tracking-[-0.02em]', highlight ? 'text-[var(--red-text)]' : '')}
        style={!highlight ? { color: 'var(--text-primary)' } : undefined}
      >
        {value}
      </p>
    </div>
  )
}

export function RunRatePanel({ order, milestones, updates }: RunRatePanelProps) {
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)

  const referenceDate = useMemo(() => new Date(), [])

  const milestoneResults = useMemo(() => {
    return milestones.map(m => {
      const stageUpdates = updates
        .filter(u => u.stage === m.stage)
        .map(u => ({ date: new Date(u.update_date ?? u.created_at), quantity: u.quantity_completed }))
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

  const overallRunRate = useMemo(() => {
    const allUpdates = updates.map(u => ({
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

  const statusStyles = {
    GREEN:    { bg: 'var(--green-bg)',    border: 'var(--green-border)',   icon: <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--green)' }} /> },
    AMBER:    { bg: 'var(--amber-bg)',    border: 'var(--amber-border)',   icon: <AlertTriangle className="h-4 w-4" style={{ color: 'var(--amber)' }} /> },
    RED:      { bg: 'var(--red-bg)',      border: 'var(--red-border)',     icon: <TrendingDown className="h-4 w-4" style={{ color: 'var(--red)' }} /> },
    COMPLETE: { bg: 'var(--green-bg)',    border: 'var(--green-border)',   icon: <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--green)' }} /> },
  }

  const ovStyle = statusStyles[overallRunRate.status as keyof typeof statusStyles] ?? statusStyles.AMBER

  return (
    <div className="space-y-4">
      {/* Overall order run-rate card */}
      <div
        className="rounded-[var(--radius-lg)] p-5"
        style={{ background: ovStyle.bg, border: `1.5px solid ${ovStyle.border}` }}
      >
        <div className="flex items-start gap-3 mb-4">
          {ovStyle.icon}
          <div className="flex-1">
            <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Order-level Run Rate — {order.po_number}
            </p>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {overallRunRate.explanation}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric
            label="Remaining"
            value={`${formatNumber(overallRunRate.remainingQuantity)} pcs`}
          />
          <Metric
            label="Working Days Left"
            value={overallRunRate.workingDaysRemaining > 0 ? `${overallRunRate.workingDaysRemaining}` : '0'}
            highlight={overallRunRate.workingDaysRemaining <= 3}
          />
          <Metric
            label="Required / Day"
            value={overallRunRate.requiredDailyOutput === Infinity ? 'N/A' : `${Math.ceil(overallRunRate.requiredDailyOutput)} pcs`}
          />
          <Metric
            label="Actual / Day (7d)"
            value={`${Math.round(overallRunRate.actualDailyOutput)} pcs`}
            highlight={overallRunRate.actualDailyOutput < overallRunRate.requiredDailyOutput && overallRunRate.status !== 'COMPLETE'}
          />
        </div>

        {overallRunRate.shortfallPerDay > 0 && (
          <div
            className="mt-3 rounded-[var(--radius-md)] px-3.5 py-2.5 text-[12.5px] flex items-start gap-2"
            style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)' }}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'var(--red)' }} />
            <span style={{ color: 'var(--text-primary)' }}>
              Shortfall: <strong style={{ color: 'var(--red-text)' }}>{Math.ceil(overallRunRate.shortfallPerDay).toLocaleString()} pcs/day</strong>
              {overallRunRate.projectedCompletionDate && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  {' · Projected '}
                  <strong>{formatDate(overallRunRate.projectedCompletionDate)}</strong>
                  {!overallRunRate.onTrackByDate && (
                    <span style={{ color: 'var(--red-text)', fontWeight: 600 }}> — misses deadline</span>
                  )}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Early warnings */}
      {warnings.length > 0 && (
        <div
          className="rounded-[var(--radius-lg)] p-4"
          style={{ background: 'var(--amber-bg)', border: '1.5px solid var(--amber-border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--amber)' }} />
            <p className="text-[12.5px] font-semibold" style={{ color: 'var(--amber-text)' }}>
              {warnings.length} milestone{warnings.length !== 1 ? 's' : ''} at risk within 14 days
            </p>
          </div>
          <div className="space-y-2">
            {warnings.map(({ milestone, result }) => (
              <div
                key={milestone.id}
                className="rounded-[var(--radius-md)] px-3.5 py-2.5"
                style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)' }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {STAGE_LABELS[milestone.stage] ?? milestone.name}
                  </span>
                  <span
                    className="text-[11.5px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: result.status === 'RED' ? 'var(--red-bg-alt)' : 'var(--amber-bg-alt)',
                      color: result.status === 'RED' ? 'var(--red-text)' : 'var(--amber-text)',
                    }}
                  >
                    {result.daysUntilDeadline}d
                  </span>
                </div>
                <p className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>{result.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-milestone breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Milestone Breakdown</CardTitle>
            <div className="ml-auto flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Info className="h-3 w-3 shrink-0" />
              <span className="text-[11px]">GREEN ≥ required · AMBER ≥ 70% · RED &lt; 70%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {milestoneResults.length === 0 ? (
            <p className="text-[13px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>No milestones defined</p>
          ) : (
            <div className="space-y-2">
              {milestoneResults.map(({ milestone, result }) => {
                const st = statusStyles[result.status as keyof typeof statusStyles] ?? statusStyles.AMBER
                const isExpanded = expandedMilestone === milestone.id
                return (
                  <button
                    key={milestone.id}
                    className="w-full text-left rounded-[var(--radius-md)] p-3.5 transition-all duration-150"
                    style={{ background: st.bg, border: `1px solid ${st.border}` }}
                    onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-2.5 mb-1">
                      {st.icon}
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {STAGE_LABELS[milestone.stage] ?? milestone.name}
                      </span>
                      <span
                        className="ml-auto text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(255,255,255,0.7)',
                          color: result.status === 'GREEN' || result.status === 'COMPLETE' ? 'var(--green-text)' :
                                 result.status === 'AMBER' ? 'var(--amber-text)' : 'var(--red-text)',
                        }}
                      >
                        {result.status === 'COMPLETE' ? 'DONE' : result.status}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
                        {[
                          { label: 'Completed', value: `${formatNumber(result.completedQuantity)} pcs` },
                          { label: 'Remaining', value: `${formatNumber(result.remainingQuantity)} pcs` },
                          { label: 'Required/Day', value: result.requiredDailyOutput === Infinity ? 'N/A' : `${Math.ceil(result.requiredDailyOutput)} pcs` },
                          { label: 'Actual/Day', value: `${Math.round(result.actualDailyOutput)} pcs` },
                        ].map(m => (
                          <div key={m.label} className="rounded-[var(--radius-sm)] p-2.5" style={{ background: 'rgba(255,255,255,0.5)' }}>
                            <p className="text-[10.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>{m.label}</p>
                            <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{m.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[11.5px] mt-1.5 italic text-left" style={{ color: 'var(--text-secondary)' }}>
                      {result.explanation}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
