'use client'

import { RiskBadge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatDate, percentage, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Globe, Package, TrendingUp, CheckCircle2, Circle, ArrowRight, Clock } from 'lucide-react'
import type { OrderMilestone } from '@/types/database'
import { BuyerSecurePhoto } from '@/components/photos/buyer-secure-photo'

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
  fabric_inhouse: 'Fabric In-house', cutting: 'Cutting', stitching: 'Stitching',
  printing: 'Printing', washing: 'Washing', finishing: 'Finishing',
  packing: 'Packing', final_inspection: 'Final Inspection', dispatch: 'Dispatch',
}

interface BuyerPortalViewProps {
  buyer: { name: string; country: string } | null
  orders: BuyerOrder[]
  milestones: OrderMilestone[]
  updates: BuyerUpdate[]
  dateHistory: BuyerDateHistory[]
  buyerToken: string
}

export function BuyerPortalView({ buyer, orders, milestones, updates, dateHistory, buyerToken }: BuyerPortalViewProps) {
  const totalQty       = orders.reduce((s, o) => s + o.total_quantity, 0)
  const totalCompleted = orders.reduce((s, o) => s + o.completed_quantity, 0)
  const onTrack        = orders.filter(o => o.risk_status === 'GREEN').length
  const overallPct     = percentage(totalCompleted, totalQty)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20"
        style={{ background: 'var(--navy)', boxShadow: '0 1px 0 rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 2L3 7v11h5v-6h4v6h5V7L10 2z" fill="white" />
              </svg>
            </div>
            <span className="font-semibold text-white text-[13.5px] tracking-[-0.01em]">StitchOps</span>
          </div>

          <div className="h-4 w-px mx-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <span className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Production Portal</span>

          <div className="ml-auto flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} />
            <span className="text-[12.5px] font-medium text-white">{buyer?.name}</span>
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{buyer?.country}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-7 space-y-6 animate-fade-up">
        {/* Overview */}
        <div>
          <h1
            className="text-[22px] font-bold tracking-[-0.02em]"
            style={{ color: 'var(--text-primary)' }}
          >
            Production Status
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
            As of {formatDate(new Date())} · {orders.length} active order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active Orders',   value: String(orders.length),              icon: <Package className="h-3.5 w-3.5" /> },
            { label: 'On Track',        value: String(onTrack),                    icon: <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--green)' }} /> },
            { label: 'Total Ordered',   value: `${formatNumber(totalQty)} pcs`,    icon: <Package className="h-3.5 w-3.5" /> },
            { label: 'Overall Progress',value: `${overallPct}%`,                   icon: <TrendingUp className="h-3.5 w-3.5" /> },
          ].map(item => (
            <div
              key={item.label}
              className="bg-white rounded-[var(--radius-lg)] border border-[var(--border)] p-4"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-label-caps">{item.label}</p>
                <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
              </div>
              <p className="text-[20px] font-bold tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Orders */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-[var(--radius-lg)] border border-[var(--border)] p-16 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>No active orders</p>
            <p className="text-[12.5px] mt-1" style={{ color: 'var(--text-muted)' }}>Your orders will appear here once created</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const pct            = percentage(order.completed_quantity, order.total_quantity)
              const orderMilestone = milestones.filter(m => m.order_id === order.id)
              const orderUpdates   = updates.filter(u => u.order_id === order.id)
              const orderHistory   = dateHistory.filter(h => h.order_id === order.id)
              const photos         = orderUpdates.flatMap(u => u.photo_urls ?? []).slice(0, 6)
              const progressColor  = order.risk_status === 'GREEN' ? 'var(--green)' :
                                     order.risk_status === 'AMBER' ? 'var(--amber)' : 'var(--red)'

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)]"
                  style={{ boxShadow: 'var(--shadow-md)' }}
                >
                  {/* Order header */}
                  <div
                    className="px-5 py-4"
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <h2 className="text-[17px] font-bold tracking-[-0.018em]" style={{ color: 'var(--text-primary)' }}>
                            {order.po_number}
                          </h2>
                          <RiskBadge status={order.risk_status} />
                        </div>
                        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                          {order.style_name}
                          {order.production_unit && (
                            <span> · {(order.production_unit as { name: string }).name}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          Ex-factory
                        </p>
                        <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatDate(order.ex_factory_date)}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3.5">
                      <div className="flex items-center justify-between text-[12px] mb-1.5">
                        <span style={{ color: 'var(--text-secondary)' }}>Production progress</span>
                        <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          {pct}% · {formatNumber(order.completed_quantity)} / {formatNumber(order.total_quantity)} pcs
                        </span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: progressColor }} />
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <Tabs defaultValue="timeline" className="p-5 pt-4">
                    <TabsList className="mb-4">
                      <TabsTrigger value="timeline">Timeline</TabsTrigger>
                      <TabsTrigger value="photos">Photos {photos.length > 0 && `(${photos.length})`}</TabsTrigger>
                      {orderHistory.length > 0 && (
                        <TabsTrigger value="changes">Date Changes ({orderHistory.length})</TabsTrigger>
                      )}
                    </TabsList>

                    <TabsContent value="timeline">
                      {orderMilestone.length === 0 ? (
                        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No milestones defined</p>
                      ) : (
                        <div className="space-y-1">
                          {orderMilestone.map(m => {
                            const isComplete = !!m.completed_date
                            const isPast = new Date(m.target_date) < new Date() && !isComplete
                            return (
                              <div
                                key={m.id}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)]',
                                  m.is_active ? 'bg-[var(--accent-light)]' : ''
                                )}
                              >
                                {isComplete
                                  ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--green)' }} />
                                  : <Circle className={cn('h-3.5 w-3.5 shrink-0', isPast ? 'text-[var(--red)]' : 'text-[var(--border-strong)]')} />
                                }
                                <span
                                  className={cn('text-[13px]', isComplete ? 'line-through' : '')}
                                  style={{ color: isComplete ? 'var(--text-muted)' : 'var(--text-secondary)' }}
                                >
                                  {STAGE_LABELS[m.stage] ?? m.name}
                                </span>
                                <span
                                  className={cn('text-[12px] ml-auto', isPast && !isComplete ? 'font-medium' : '')}
                                  style={{ color: isPast && !isComplete ? 'var(--red-text)' : 'var(--text-muted)' }}
                                >
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
                        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No production photos yet</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {photos.map((photoPath, i) => (
                            <BuyerSecurePhoto
                              key={i}
                              src={photoPath}
                              token={buyerToken}
                              alt={`Production photo ${i + 1}`}
                              className="w-full aspect-square object-cover rounded-[var(--radius-md)] border border-[var(--border)]"
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="changes">
                      <div className="space-y-2">
                        {orderHistory.map((h, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)]"
                            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                          >
                            <div className="flex items-center gap-2 text-[12.5px] flex-1 min-w-0">
                              <span className="line-through" style={{ color: 'var(--text-muted)' }}>{formatDate(h.previous_date)}</span>
                              <ArrowRight className="h-3 w-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatDate(h.new_date)}</span>
                            </div>
                            <span className="text-[11.5px] shrink-0" style={{ color: 'var(--text-muted)' }}>{formatDate(h.changed_at)}</span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div
          className="text-center py-8"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="text-[12px]" style={{ color: 'var(--text-faint)' }}>
            Secured by StitchOps · Read-only buyer view · {buyer?.name} orders only
          </p>
          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
            <Clock className="h-3 w-3 inline mr-1" />
            Last updated: {formatDate(new Date())}
          </p>
        </div>
      </div>
    </div>
  )
}
