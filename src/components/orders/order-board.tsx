'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  PlusCircle,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RiskBadge, StageBadge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, percentage, daysUntil, formatNumber } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import type { Order, Buyer, ProductionUnit } from '@/types/database'
import { cn } from '@/lib/utils'

type SortField = 'ex_factory_date' | 'risk_status' | 'po_number' | 'completed_quantity'
type SortDir = 'asc' | 'desc'

const riskOrder = { RED: 0, AMBER: 1, GREEN: 2 }

// Defined outside component to avoid ESLINT "component in render" error
function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-25" />
  return sortDir === 'asc'
    ? <ChevronUp  className="h-3 w-3" style={{ color: 'var(--accent)' }} />
    : <ChevronDown className="h-3 w-3" style={{ color: 'var(--accent)' }} />
}

// Also outside component — receives sort state and handler as props
function ThSort({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: SortField
  label: string
  sortField: SortField
  sortDir: SortDir
  onSort: (field: SortField) => void
}) {
  return (
    <th
      className="text-left px-4 py-3 text-label-caps cursor-pointer select-none whitespace-nowrap transition-colors"
      onClick={() => onSort(field)}
      style={{ color: sortField === field ? 'var(--accent)' : 'var(--text-muted)' }}
      aria-sort={sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="flex items-center gap-1.5">
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </span>
    </th>
  )
}

interface OrderBoardProps {
  initialOrders: Order[]
  buyers: Buyer[]
  units: ProductionUnit[]
}

export function OrderBoard({ initialOrders, buyers, units }: OrderBoardProps) {
  const [search, setSearch] = useState('')
  const [buyerFilter, setBuyerFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('ex_factory_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const pageSize = 12

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let orders = [...initialOrders]
    if (search) {
      const q = search.toLowerCase()
      orders = orders.filter(o =>
        o.po_number.toLowerCase().includes(q) ||
        o.style_name.toLowerCase().includes(q) ||
        (o.buyer as Buyer | null)?.name.toLowerCase().includes(q)
      )
    }
    if (buyerFilter !== 'all') orders = orders.filter(o => o.buyer_id === buyerFilter)
    if (unitFilter !== 'all') orders = orders.filter(o => o.production_unit_id === unitFilter)
    if (statusFilter !== 'all') orders = orders.filter(o => o.risk_status === statusFilter)
    orders.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'ex_factory_date': cmp = new Date(a.ex_factory_date).getTime() - new Date(b.ex_factory_date).getTime(); break
        case 'risk_status':     cmp = (riskOrder[a.risk_status] ?? 3) - (riskOrder[b.risk_status] ?? 3); break
        case 'po_number':       cmp = a.po_number.localeCompare(b.po_number); break
        case 'completed_quantity': cmp = a.completed_quantity - b.completed_quantity; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return orders
  }, [initialOrders, search, buyerFilter, unitFilter, statusFilter, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div
        className="bg-white rounded-[var(--radius-lg)] border border-[var(--border)] p-3.5 flex flex-wrap items-center gap-2.5"
        style={{ boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <Input
            placeholder="Search PO, style, buyer…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 h-8 text-[13px]"
            aria-label="Search orders"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
          {[
            {
              value: statusFilter, onChange: (v: string) => { setStatusFilter(v); setPage(1) },
              placeholder: 'Status', width: 'w-[110px]',
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'GREEN', label: 'On Track' },
                { value: 'AMBER', label: 'At Risk' },
                { value: 'RED', label: 'Delayed' },
              ],
            },
            {
              value: buyerFilter, onChange: (v: string) => { setBuyerFilter(v); setPage(1) },
              placeholder: 'Buyer', width: 'w-[130px]',
              options: [
                { value: 'all', label: 'All Buyers' },
                ...buyers.map(b => ({ value: b.id, label: b.name })),
              ],
            },
            {
              value: unitFilter, onChange: (v: string) => { setUnitFilter(v); setPage(1) },
              placeholder: 'Unit', width: 'w-[130px]',
              options: [
                { value: 'all', label: 'All Units' },
                ...units.map(u => ({ value: u.id, label: u.name })),
              ],
            },
          ].map((f, i) => (
            <Select key={i} value={f.value} onValueChange={f.onChange}>
              <SelectTrigger className={cn('h-8 text-[13px]', f.width)}>
                <SelectValue placeholder={f.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {f.options.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        <Link href="/dashboard/orders/new" className="ml-auto">
          <Button size="sm" className="gap-1.5 h-8 text-[13px]">
            <PlusCircle className="h-3.5 w-3.5" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Results info */}
      <p className="text-[12px] px-0.5" style={{ color: 'var(--text-muted)' }}>
        {filtered.length === 0 ? 'No orders' : `${filtered.length} order${filtered.length !== 1 ? 's' : ''}`}
        {search && ` matching "${search}"`}
      </p>

      {/* Table */}
      <div
        className="bg-white rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-sm)' }}
        role="region"
        aria-label="Orders table"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" role="table">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <th className="text-left px-4 py-3 text-label-caps whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Status</th>
                <ThSort field="po_number" label="PO Number" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left px-4 py-3 text-label-caps whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Buyer</th>
                <th className="text-left px-4 py-3 text-label-caps" style={{ color: 'var(--text-muted)' }}>Style</th>
                <th className="text-left px-4 py-3 text-label-caps whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Stage</th>
                <th className="text-right px-4 py-3 text-label-caps whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Total</th>
                <th className="text-left px-4 py-3 text-label-caps min-w-[140px]" style={{ color: 'var(--text-muted)' }}>Progress</th>
                <ThSort field="ex_factory_date" label="Ex-factory" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-0">
                    <EmptyState
                      icon={Package}
                      title="No orders match your filters"
                      description="Try adjusting your search or filters"
                      action={
                        <Link href="/dashboard/orders/new">
                          <Button size="sm" variant="secondary">Create an order</Button>
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginated.map(order => {
                  const pct = percentage(order.completed_quantity, order.total_quantity)
                  const days = daysUntil(order.ex_factory_date)
                  const buyer = order.buyer as Buyer | null
                  const unit = order.production_unit as ProductionUnit | null
                  const progressColor = order.risk_status === 'GREEN' ? 'var(--green)' :
                                        order.risk_status === 'AMBER' ? 'var(--amber)' : 'var(--red)'
                  return (
                    <tr
                      key={order.id}
                      className="group border-b border-[var(--border-light)] transition-colors duration-100 last:border-0"
                      style={{ '--hover-bg': 'var(--bg-subtle)' } as React.CSSProperties}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <RiskBadge status={order.risk_status} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
                          {order.po_number}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                        {buyer?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <span className="truncate block" style={{ color: 'var(--text-secondary)' }}>
                          {order.style_name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StageBadge stage={order.current_stage} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {formatNumber(order.total_quantity)}
                      </td>
                      <td className="px-4 py-3.5 min-w-[140px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11.5px]">
                            <span className="font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                            <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{formatNumber(order.completed_quantity)}</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${pct}%`, background: progressColor }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p
                          className="text-[12.5px] font-medium tabular-nums"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {formatDate(order.ex_factory_date)}
                        </p>
                        <p
                          className={cn(
                            'text-[11.5px] font-medium tabular-nums',
                            days < 0 ? 'text-[var(--red-text)]' :
                            days <= 7 ? 'text-[var(--amber-text)]' :
                            'text-[var(--text-muted)]'
                          )}
                        >
                          {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `in ${days}d`}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-[var(--radius-sm)] flex items-center"
                          style={{ color: 'var(--text-muted)' }}
                          aria-label={`View order ${order.po_number}`}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
          >
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} · {filtered.length} orders
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-7 text-[12px]">
                Previous
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 text-[12px]">
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
