import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { RiskBadge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatDate, percentage, daysUntil } from '@/lib/utils'
import type { Order } from '@/types/database'
import { cn } from '@/lib/utils'

interface UpcomingDeadlinesProps {
  orders: Order[]
}

export function UpcomingDeadlines({ orders }: UpcomingDeadlinesProps) {
  const sorted = [...orders]
    .sort((a, b) => new Date(a.ex_factory_date).getTime() - new Date(b.ex_factory_date).getTime())
    .slice(0, 6)

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">No upcoming deadlines</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Ex-factory Dates</CardTitle>
          <Link
            href="/dashboard/orders"
            className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="space-y-3">
          {sorted.map((order) => {
            const pct = percentage(order.completed_quantity, order.total_quantity)
            const days = daysUntil(order.ex_factory_date)
            return (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--bg-subtle)] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {order.po_number}
                    </span>
                    <RiskBadge status={order.risk_status} />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {order.style_name} · {(order.buyer as { name: string } | null)?.name}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>{pct}% complete</span>
                      <span>{order.completed_quantity.toLocaleString()} / {order.total_quantity.toLocaleString()} pcs</span>
                    </div>
                    <Progress
                      value={pct}
                      className="h-1.5"
                      indicatorClassName={cn(
                        order.risk_status === 'GREEN' && 'bg-emerald-500',
                        order.risk_status === 'AMBER' && 'bg-amber-500',
                        order.risk_status === 'RED' && 'bg-red-500',
                      )}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn('text-xs font-semibold', days <= 7 ? 'text-red-600' : days <= 14 ? 'text-amber-600' : 'text-[var(--text-secondary)]')}>
                    {days < 0 ? 'Overdue' : days === 0 ? 'Today' : `${days}d`}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatDate(order.ex_factory_date)}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
