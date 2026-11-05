import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { daysUntil, formatDate } from '@/lib/utils'
import type { Order } from '@/types/database'
import { cn } from '@/lib/utils'

interface EarlyWarningPanelProps {
  orders: Order[]
}

export function EarlyWarningPanel({ orders }: EarlyWarningPanelProps) {
  const warnings = orders
    .filter((o) => {
      const days = daysUntil(o.ex_factory_date)
      return days >= 0 && days <= 14 && o.risk_status !== 'GREEN'
    })
    .sort((a, b) => daysUntil(a.ex_factory_date) - daysUntil(b.ex_factory_date))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <CardTitle>Early Warnings</CardTitle>
          {warnings.length > 0 && (
            <span className="ml-auto text-xs font-semibold text-amber-700 bg-[var(--amber-bg)] border border-[var(--amber-border)] px-2 py-0.5 rounded-full">
              {warnings.length}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Orders with deadline ≤ 14 days at risk
        </p>
      </CardHeader>
      <CardContent className="pt-2">
        {warnings.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-emerald-700">All clear</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">No at-risk orders due soon</p>
          </div>
        ) : (
          <div className="space-y-2">
            {warnings.map((order) => {
              const days = daysUntil(order.ex_factory_date)
              return (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="block p-3 rounded-xl border border-[var(--border)] hover:border-amber-300 hover:bg-[var(--amber-bg)] transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {order.po_number}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        {order.style_name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded-full',
                          order.risk_status === 'RED'
                            ? 'bg-[var(--red-bg)] text-red-700'
                            : 'bg-[var(--amber-bg)] text-amber-700'
                        )}
                      >
                        {days === 0 ? 'Today' : `${days}d`}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5">
                    Ex-factory: {formatDate(order.ex_factory_date)}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
