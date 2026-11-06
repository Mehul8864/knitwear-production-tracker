'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Factory, Package, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RiskBadge, StageBadge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RunRatePanel } from './run-rate-panel'
import { TNATimeline } from './tna-timeline'
import { UpdateHistoryList } from './update-history-list'
import { ColourSizeMatrix } from './colour-size-matrix'
import { DateChangeHistory } from './date-change-history'
import { formatDate, percentage, formatNumber } from '@/lib/utils'
import type {
  Order,
  OrderMilestone,
  ProductionUpdate,
  OrderItem,
  MilestoneDateChangeHistory,
  Buyer,
  ProductionUnit,
} from '@/types/database'
import { cn } from '@/lib/utils'

interface OrderDetailViewProps {
  order: Order
  milestones: OrderMilestone[]
  updates: ProductionUpdate[]
  items: OrderItem[]
  dateHistory: MilestoneDateChangeHistory[]
}

export function OrderDetailView({
  order,
  milestones,
  updates,
  items,
  dateHistory,
}: OrderDetailViewProps) {
  const buyer = order.buyer as Buyer | null
  const unit = order.production_unit as ProductionUnit | null
  const pct = percentage(order.completed_quantity, order.total_quantity)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/dashboard/orders"
          className="p-2 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] transition-colors mt-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              {order.po_number}
            </h1>
            <RiskBadge status={order.risk_status} />
            <StageBadge stage={order.current_stage} />
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {order.style_name} · {buyer?.name} · Ex-factory {formatDate(order.ex_factory_date)}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Quantity',
            value: formatNumber(order.total_quantity),
            sub: 'pieces ordered',
            icon: <Package className="h-4 w-4" />,
          },
          {
            label: 'Completed',
            value: formatNumber(order.completed_quantity),
            sub: `${pct}% of order`,
            icon: <TrendingUp className="h-4 w-4" />,
          },
          {
            label: 'Production Unit',
            value: unit?.name ?? '—',
            sub: unit?.location ?? '',
            icon: <Factory className="h-4 w-4" />,
          },
          {
            label: 'Ex-factory Date',
            value: formatDate(order.ex_factory_date),
            sub: buyer?.country ?? '',
            icon: <Calendar className="h-4 w-4" />,
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  {item.label}
                </p>
                <span className="text-[var(--text-muted)]">{item.icon}</span>
              </div>
              <p className="text-lg font-bold text-[var(--text-primary)] leading-tight">
                {item.value}
              </p>
              {item.sub && (
                <p className="text-xs text-[var(--text-muted)] mt-1">{item.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Overall Progress</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{pct}%</span>
          </div>
          <Progress
            value={pct}
            className="h-2.5"
            indicatorClassName={cn(
              order.risk_status === 'GREEN' && 'bg-emerald-500',
              order.risk_status === 'AMBER' && 'bg-amber-500',
              order.risk_status === 'RED' && 'bg-red-500',
            )}
          />
          <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-muted)]">
            <span>{formatNumber(order.completed_quantity)} pcs completed</span>
            <span>{formatNumber(order.total_quantity - order.completed_quantity)} pcs remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="run-rate">
        <TabsList>
          <TabsTrigger value="run-rate">Run-Rate Analysis</TabsTrigger>
          <TabsTrigger value="tna">TNA Milestones</TabsTrigger>
          <TabsTrigger value="updates">Production Updates</TabsTrigger>
          <TabsTrigger value="items">Size/Colour Matrix</TabsTrigger>
          <TabsTrigger value="history">Date Change History</TabsTrigger>
        </TabsList>

        <TabsContent value="run-rate">
          <RunRatePanel
            order={order}
            milestones={milestones}
            updates={updates}
          />
        </TabsContent>

        <TabsContent value="tna">
          <TNATimeline
            orderId={order.id}
            milestones={milestones}
          />
        </TabsContent>

        <TabsContent value="updates">
          <UpdateHistoryList updates={updates} />
        </TabsContent>

        <TabsContent value="items">
          <ColourSizeMatrix items={items} />
        </TabsContent>

        <TabsContent value="history">
          <DateChangeHistory history={dateHistory} />
        </TabsContent>
      </Tabs>

      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Order Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--text-secondary)]">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
