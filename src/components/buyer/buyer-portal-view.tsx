'use client'

import { RiskBadge, StageBadge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatDate, percentage, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Globe, Package, Calendar, CheckCircle2, Circle, ArrowRight, Clock } from 'lucide-react'
import type { OrderMilestone } from '@/types/database'

interface BuyerOrder {
  id: string
  po_number: string
  style_name: string
  total_quantity: number
  current_stage: string
  completed_quantity: number
  ex_factory_date: string
  status: string
  risk_status: string
  production_unit?: { name: string; location: string } | null
}

interface BuyerUpdate {
  order_id: string
  stage: string
  update_date: string
  photo_urls: string[]
}

interface BuyerDateHistory {
  order_id: string
  previous_date: string
  new_date: string
  reason: string
  changed_at: string
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

interface BuyerPortalViewProps {
  buyer: { name: string; country: string } | null
  orders: BuyerOrder[]
  milestones: OrderMilestone[]
  updates: BuyerUpdate[]
  dateHistory: BuyerDateHistory[]
}

export function BuyerPortalView({
  buyer,
  orders,
  milestones,
  updates,
  dateHistory,
}: BuyerPortalViewProps) {
  const totalQty = orders.reduce((s, o) => s + o.total_quantity, 0)
  const totalCompleted = orders.reduce((s, o) => s + o.completed_quantity, 0)
  const onTrack = orders.filter((o) => o.risk_status === 'GREEN').length

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--navy)' }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L3 7v11h5v-6h4v6h5V7L10 2z" fill="white" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-[var(--text-primary)] text-sm">StitchOps</span>
              <p className="text-xs text-[var(--text-muted)]">Buyer Production Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Globe className="h-4 w-4" />
            <span>{buyer?.name} · {buyer?.country}</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Production Status
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Live view of your orders as of {formatDate(new Date())}
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Orders', value: orders.length, icon: <Package className="h-4 w-4" /> },
            { label: 'On Track', value: onTrack, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
            { label: 'Total Ordered', value: `${formatNumber(totalQty)} pcs`, icon: <Package className="h-4 w-4" /> },
            {
              label: 'Overall Progress',
              value: `${percentage(totalCompleted, totalQty)}%`,
              icon: <Calendar className="h-4 w-4" />,
            },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">
                    {item.label}
                  </p>
                  <span className="text-[var(--text-muted)]">{item.icon}</span>
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Orders */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-sm font-medium text-[var(--text-primary)]">No active orders</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Your orders will appear here once they are created
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => {
              const pct = percentage(order.completed_quantity, order.total_quantity)
              const orderMilestones = milestones.filter((m) => m.order_id === order.id)
              const orderUpdates = updates.filter((u) => u.order_id === order.id)
              const orderHistory = dateHistory.filter((h) => h.order_id === order.id)
              const photos = orderUpdates.flatMap((u) => u.photo_urls ?? []).slice(0, 6)

              return (
                <Card key={order.id}>
                  <CardContent className="p-5">
                    <Tabs defaultValue="overview">
                      {/* Order header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">
                              {order.po_number}
                            </h2>
                            <RiskBadge status={order.risk_status} />
                          </div>
                          <p className="text-sm text-[var(--text-muted)]">
                            {order.style_name} · Ex-factory {formatDate(order.ex_factory_date)}
                          </p>
                        </div>
                        <StageBadge stage={order.current_stage} />
                      </div>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-[var(--text-secondary)]">Production Progress</span>
                          <span className="font-bold text-[var(--text-primary)]">
                            {pct}% · {formatNumber(order.completed_quantity)} / {formatNumber(order.total_quantity)} pcs
                          </span>
                        </div>
                        <Progress
                          value={pct}
                          className="h-2"
                          indicatorClassName={cn(
                            order.risk_status === 'GREEN' && 'bg-emerald-500',
                            order.risk_status === 'AMBER' && 'bg-amber-500',
                            order.risk_status === 'RED' && 'bg-red-500',
                          )}
                        />
                      </div>

                      <TabsList className="mb-4">
                        <TabsTrigger value="overview">Timeline</TabsTrigger>
                        <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
                        {orderHistory.length > 0 && (
                          <TabsTrigger value="changes">Date Changes</TabsTrigger>
                        )}
                      </TabsList>

                      <TabsContent value="overview">
                        {orderMilestones.length === 0 ? (
                          <p className="text-sm text-[var(--text-muted)]">No milestones defined</p>
                        ) : (
                          <div className="space-y-2">
                            {orderMilestones.map((m) => {
                              const isComplete = !!m.completed_date
                              const isPast = new Date(m.target_date) < new Date() && !isComplete
                              return (
                                <div
                                  key={m.id}
                                  className={cn(
                                    'flex items-center gap-3 p-2.5 rounded-xl',
                                    m.is_active && 'bg-[var(--accent-light)]'
                                  )}
                                >
                                  {isComplete ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                  ) : (
                                    <Circle className={cn('h-4 w-4 shrink-0', isPast ? 'text-red-400' : 'text-[var(--border-strong)]')} />
                                  )}
                                  <span className={cn('text-sm', isComplete ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-secondary)]')}>
                                    {STAGE_LABELS[m.stage] ?? m.name}
                                  </span>
                                  <span className={cn('text-xs ml-auto', isPast && !isComplete ? 'text-red-600 font-medium' : 'text-[var(--text-muted)]')}>
                                    {formatDate(m.target_date)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="photos">
                        {photos.length === 0 ? (
                          <p className="text-sm text-[var(--text-muted)]">No photos yet</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {photos.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={url}
                                  alt={`Production photo ${i + 1}`}
                                  className="w-full aspect-square object-cover rounded-xl border border-[var(--border)]"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="changes">
                        <div className="space-y-2">
                          {orderHistory.map((h, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-subtle)]">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="line-through text-[var(--text-muted)]">
                                  {formatDate(h.previous_date)}
                                </span>
                                <ArrowRight className="h-3 w-3 text-[var(--text-muted)]" />
                                <span className="font-medium text-[var(--text-primary)]">
                                  {formatDate(h.new_date)}
                                </span>
                              </div>
                              <span className="text-xs text-[var(--text-muted)] ml-auto">
                                {formatDate(h.changed_at)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)]">
            Secured by StitchOps · Read-only buyer view · Data shown: {buyer?.name} orders only
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Last updated: {formatDate(new Date())}
          </p>
        </div>
      </div>
    </div>
  )
}
