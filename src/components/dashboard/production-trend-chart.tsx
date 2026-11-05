'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { Order, ProductionUpdate } from '@/types/database'
import { formatDate } from '@/lib/utils'

interface ProductionTrendChartProps {
  orders: Order[]
  updates: ProductionUpdate[]
}

export function ProductionTrendChart({ updates }: ProductionTrendChartProps) {
  const chartData = useMemo(() => {
    // Build 7-day rolling data
    const days: { date: string; label: string; quantity: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const dateStr = d.toISOString().split('T')[0]
      const qty = updates
        .filter((u) => u.update_date?.startsWith(dateStr))
        .reduce((sum, u) => sum + (u.quantity_completed ?? 0), 0)
      days.push({
        date: dateStr,
        label: formatDate(d).split(' ').slice(0, 2).join(' '),
        quantity: qty,
      })
    }
    return days
  }, [updates])

  const total = chartData.reduce((s, d) => s + d.quantity, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Weekly Production Trend</CardTitle>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Total pieces produced over the last 7 days
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {total.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-muted)]">pcs this week</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="quantityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
                fontSize: '12px',
                padding: '8px 12px',
              }}
              formatter={(value: number) => [`${value.toLocaleString()} pcs`, 'Produced']}
            />
            <Area
              type="monotone"
              dataKey="quantity"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#quantityGrad)"
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
