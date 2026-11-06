import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { RiskBadge } from '@/components/ui/badge'
import { daysUntil, formatDate } from '@/lib/utils'
import type { Order } from '@/types/database'
import { cn } from '@/lib/utils'

interface EarlyWarningPanelProps {
  orders: Order[]
}

export function EarlyWarningPanel({ orders }: EarlyWarningPanelProps) {
  const warnings = orders
    .filter(o => {
      const days = daysUntil(o.ex_factory_date)
      return days >= 0 && days <= 14 && o.risk_status !== 'GREEN'
    })
    .sort((a, b) => daysUntil(a.ex_factory_date) - daysUntil(b.ex_factory_date))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle
            className="h-4 w-4 shrink-0"
            style={{ color: warnings.length > 0 ? 'var(--amber)' : 'var(--text-muted)' }}
          />
          <CardTitle>Early Warnings</CardTitle>
          {warnings.length > 0 && (
            <span
              className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums"
              style={{ background: 'var(--amber-bg-alt)', color: 'var(--amber-text)', border: '1px solid var(--amber-border)' }}
            >
              {warnings.length}
            </span>
          )}
        </div>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Orders at risk with deadline &le; 14 days
        </p>
      </CardHeader>
      <CardContent className="pt-3">
        {warnings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'var(--green-bg)' }}
            >
              <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--green)' }} />
            </div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--green-text)' }}>All clear</p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No at-risk orders due soon</p>
          </div>
        ) : (
          <div className="space-y-2">
            {warnings.map(order => {
              const days = daysUntil(order.ex_factory_date)
              const isCritical = days <= 3 || order.risk_status === 'RED'
              return (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] transition-all duration-150 group"
                  style={{
                    background: isCritical ? 'var(--red-bg)' : 'var(--amber-bg)',
                    border: `1px solid ${isCritical ? 'var(--red-border)' : 'var(--amber-border)'}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[13px] font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {order.po_number}
                      </span>
                      <RiskBadge status={order.risk_status} />
                    </div>
                    <p className="text-[11.5px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(order.ex_factory_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        'text-[12px] font-bold tabular-nums',
                        isCritical ? 'text-[var(--red-text)]' : 'text-[var(--amber-text)]'
                      )}
                    >
                      {days}d
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
