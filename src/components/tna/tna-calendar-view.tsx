'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { RiskBadge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TNAMilestone {
  id: string
  order_id: string
  stage: string
  name: string
  target_date: string
  completed_date?: string | null
  is_active: boolean
  order?: {
    po_number: string
    style_name: string
    risk_status: string
    buyer?: { name: string } | null
  } | null
}

interface TNACalendarViewProps {
  milestones: TNAMilestone[]
  orders: { id: string; po_number: string; style_name: string; risk_status: string }[]
}

const STAGE_LABELS: Record<string, string> = {
  fabric_inhouse: 'Fabric In',
  cutting: 'Cutting',
  stitching: 'Stitching',
  printing: 'Printing',
  washing: 'Washing',
  finishing: 'Finishing',
  packing: 'Packing',
  final_inspection: 'Inspection',
  dispatch: 'Dispatch',
}

const STATUS_COLORS: Record<string, string> = {
  GREEN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  AMBER: 'bg-amber-100 text-amber-700 border-amber-200',
  RED: 'bg-red-100 text-red-700 border-red-200',
}

export function TNACalendarView({ milestones }: TNACalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Stable reference to "now" — use useState lazy initializer since
  // Date.now() cannot be called inside render per React Compiler rules.
  const [nowMs] = useState<number>(() => Date.now())

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const milestonesByDate = useMemo(() => {
    const map = new Map<string, TNAMilestone[]>()
    for (const m of milestones) {
      const key = m.target_date.split('T')[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return map
  }, [milestones])

  const selectedMilestones = useMemo(() => {
    if (!selectedDay) return []
    const key = format(selectedDay, 'yyyy-MM-dd')
    return milestonesByDate.get(key) ?? []
  }, [selectedDay, milestonesByDate])

  // Upcoming milestones list (next 30 days)
  const upcomingMilestones = useMemo(() => {
    const today = new Date()
    const in30 = new Date(today)
    in30.setDate(in30.getDate() + 30)
    return milestones
      .filter((m) => {
        const d = new Date(m.target_date)
        return d >= today && d <= in30 && !m.completed_date
      })
      .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
      .slice(0, 10)
  }, [milestones])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="xl:col-span-2">
        <CardContent className="p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1.5 rounded-lg text-sm hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Offset for first day */}
            {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const dayMilestones = milestonesByDate.get(key) ?? []
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const isCurrentDay = isToday(day)

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'relative min-h-[64px] p-1.5 rounded-xl border text-left transition-all',
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                      : isCurrentDay
                      ? 'border-[var(--accent)] bg-white'
                      : 'border-[var(--border)] bg-white hover:bg-[var(--bg-subtle)]',
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isCurrentDay
                        ? 'text-[var(--accent)] font-bold'
                        : 'text-[var(--text-secondary)]'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayMilestones.slice(0, 2).map((m, i) => {
                      const riskStatus = m.order?.risk_status ?? 'GREEN'
                      return (
                        <div
                          key={i}
                          className={cn(
                            'text-xs px-1 py-0.5 rounded truncate border text-left',
                            STATUS_COLORS[riskStatus] ?? STATUS_COLORS.GREEN
                          )}
                        >
                          {STAGE_LABELS[m.stage] ?? m.name}
                        </div>
                      )
                    })}
                    {dayMilestones.length > 2 && (
                      <div className="text-xs text-[var(--text-muted)] px-1">
                        +{dayMilestones.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected day details */}
          {selectedDay && selectedMilestones.length > 0 && (
            <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                {format(selectedDay, 'EEEE, MMMM d')} — {selectedMilestones.length} milestone{selectedMilestones.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2">
                {selectedMilestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-[var(--border)]">
                    <RiskBadge status={m.order?.risk_status ?? 'GREEN'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {m.order?.po_number} · {STAGE_LABELS[m.stage] ?? m.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {m.order?.style_name}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/orders/${m.order_id}`}
                      className="text-xs text-[var(--accent)] hover:underline shrink-0"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming milestones list */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">
            Upcoming (next 30 days)
          </h3>
          {upcomingMilestones.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No milestones in the next 30 days</p>
          ) : (
            <div className="space-y-2">
              {upcomingMilestones.map((m) => {
                const daysLeft = Math.ceil(
                  (new Date(m.target_date).getTime() - nowMs) / (1000 * 60 * 60 * 24)
                )
                return (
                  <Link
                    key={m.id}
                    href={`/dashboard/orders/${m.order_id}`}
                    className="block p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-subtle)] transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {m.order?.po_number}
                      </span>
                      <span className={cn(
                        'text-xs font-bold',
                        daysLeft <= 3 ? 'text-red-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-[var(--text-muted)]'
                      )}>
                        {daysLeft}d
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {STAGE_LABELS[m.stage] ?? m.name} · {formatDate(m.target_date)}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
