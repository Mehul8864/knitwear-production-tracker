import Link from 'next/link'
import { ArrowRight, Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { RiskBadge, StageBadge } from '@/components/ui/badge'
import { formatDate, percentage, daysUntil, formatNumber } from '@/lib/utils'
import type { Order } from '@/types/database'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'

interface UpcomingDeadlinesProps {
  orders: Order[]
}

export function UpcomingDeadlines({ orders }: UpcomingDeadlinesProps) {
  const sorted = [...orders]
    .sort((a, b) => new Date(a.ex_factory_date).getTime() - new Date(b.ex_factory_date).getTime())
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Ex-factory</CardTitle>
          <Link
            href="/dashboard/orders"
            className="text-[12px] font-medium flex items-center gap-1 transition-colors hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {sorted.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming deadlines"
            compact
          />
        ) : (
          <div className="space-y-1">
            {sorted.map(order => {
              const pct = percentage(order.completed_quantity, order.total_quantity)
              const days = daysUntil(order.ex_factory_date)
              const progressColor = order.risk_status === 'GREEN' ? 'var(--green)' :
                                    order.risk_status === 'AMBER' ? 'var(--amber)' :
                                    'var(--red)'
              return (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="flex items-center gap-4 px-3 py-2.5 rounded-[var(--radius-md)] transition-all duration-150 group -mx-1"
                  style={{ color: 'inherit' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {/* PO + progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {order.po_number}
                      </span>
                      <RiskBadge status={order.risk_status} />
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${pct}%`, background: progressColor }}
                        />
                      </div>
                      <span className="text-[11px] font-mono shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Days */}
                  <div className="text-right shrink-0 w-12">
                    <p
                      className={cn(
                        'text-[12.5px] font-bold tabular-nums',
                        days < 0 ? 'text-[var(--red-text)]' :
                        days <= 7 ? 'text-[var(--amber-text)]' :
                        'text-[var(--text-secondary)]'
                      )}
                    >
                      {days < 0 ? 'OD' : `${days}d`}
                    </p>
                    <p className="text-[10.5px]" style={{ color: 'var(--text-faint)' }}>
                      {formatDate(order.ex_factory_date).split(' ').slice(0, 2).join(' ')}
                    </p>
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
