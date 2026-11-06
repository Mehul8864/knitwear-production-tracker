'use client'

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { Order, ProductionUpdate } from '@/types/database'

interface ProductionTrendChartProps {
  orders: Order[]
  updates: ProductionUpdate[]
}

export function ProductionTrendChart({ updates }: ProductionTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const chartData = useMemo(() => {
    const nowUtc = new Date()
    const todayUtc = new Date(Date.UTC(nowUtc.getFullYear(), nowUtc.getMonth(), nowUtc.getDate()))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(todayUtc)
      d.setUTCDate(d.getUTCDate() - (6 - i))
      const dateStr = d.toISOString().split('T')[0]
      const qty = updates
        .filter(u => {
          const s = u.update_date ? String(u.update_date).slice(0, 10)
                  : u.created_at ? String(u.created_at).slice(0, 10)
                  : null
          return s === dateStr
        })
        .reduce((sum, u) => sum + (u.quantity_completed ?? 0), 0)
      const label = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
      return { date: dateStr, label, quantity: qty }
    })
  }, [updates])

  const total = chartData.reduce((s, d) => s + d.quantity, 0)
  const maxQty = Math.max(...chartData.map(d => d.quantity), 1)
  const avgQty = Math.round(total / 7)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Weekly Production Trend</CardTitle>
            <p className="text-[12.5px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Pieces produced · last 7 days
            </p>
          </div>
          <div className="text-right shrink-0">
            <p
              className="text-[24px] font-bold leading-none tracking-[-0.02em]"
              style={{ color: 'var(--text-primary)' }}
            >
              {total.toLocaleString()}
            </p>
            <p className="text-[11.5px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {avgQty.toLocaleString()} avg/day
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-3">
        {/* Mini bar chart alternative using divs for precision */}
        <div className="flex items-end gap-1.5 h-[120px] mb-2">
          {chartData.map((d, i) => {
            const pct = maxQty > 0 ? (d.quantity / maxQty) * 100 : 0
            const isWeekend = new Date(d.date).getUTCDay() === 0
            const isHovered = hoveredIndex === i
            return (
              <div
                key={d.date}
                className="flex-1 flex flex-col justify-end"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="relative group">
                  {/* Tooltip */}
                  {isHovered && d.quantity > 0 && (
                    <div
                      className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10.5px] font-medium text-white whitespace-nowrap z-10"
                      style={{ background: 'var(--navy)' }}
                    >
                      {d.quantity.toLocaleString()}
                    </div>
                  )}
                  <div
                    className="rounded-[3px] transition-all duration-200"
                    style={{
                      height: `${Math.max(pct, d.quantity > 0 ? 4 : 0)}%`,
                      minHeight: d.quantity > 0 ? '6px' : '0',
                      background: isHovered
                        ? 'var(--accent)'
                        : isWeekend
                        ? 'var(--bg-subtle)'
                        : `linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%)`,
                      opacity: isWeekend ? 0.4 : 1,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        {/* X axis labels */}
        <div className="flex gap-1.5">
          {chartData.map(d => (
            <div
              key={d.date}
              className="flex-1 text-center text-[10.5px] font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              {d.label}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
