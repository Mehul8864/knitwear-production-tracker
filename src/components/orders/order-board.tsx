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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RiskBadge, StageBadge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, percentage, daysUntil, formatNumber } from '@/lib/utils'
import type { Order, Buyer, ProductionUnit } from '@/types/database'
import { cn } from '@/lib/utils'

type SortField = 'ex_factory_date' | 'risk_status' | 'po_number' | 'completed_quantity'
type SortDir = 'asc' | 'desc'

const riskOrder = { RED: 0, AMBER: 1, GREEN: 2 }

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
  const pageSize = 10

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let orders = [...initialOrders]

    if (search) {
      const q = search.toLowerCase()
      orders = orders.filter(
        (o) =>
          o.po_number.toLowerCase().includes(q) ||
          o.style_name.toLowerCase().includes(q) ||
          (o.buyer as Buyer | null)?.name.toLowerCase().includes(q)
      )
    }
    if (buyerFilter !== 'all') {
      orders = orders.filter((o) => o.buyer_id === buyerFilter)
    }
    if (unitFilter !== 'all') {
      orders = orders.filter((o) => o.production_unit_id === unitFilter)
    }
    if (statusFilter !== 'all') {
      orders = orders.filter((o) => o.risk_status === statusFilter)
    }

    orders.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'ex_factory_date':
          cmp = new Date(a.ex_factory_date).getTime() - new Date(b.ex_factory_date).getTime()
          break
        case 'risk_status':
          cmp = (riskOrder[a.risk_status] ?? 3) - (riskOrder[b.risk_status] ?? 3)
          break
        case 'po_number':
          cmp = a.po_number.localeCompare(b.po_number)
          break
        case 'completed_quantity':
          cmp = a.completed_quantity - b.completed_quantity
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return orders
  }, [initialOrders, search, buyerFilter, unitFilter, statusFilter, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ChevronUp className="h-3.5 w-3.5 opacity-30" />
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3.5 w-3.5 text-[var(--accent)]" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-[var(--accent)]" />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Search PO, style, buyer..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="h-4 w-4 text-[var(--text-muted)] shrink-0" />

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="GREEN">On Track</SelectItem>
                <SelectItem value="AMBER">At Risk</SelectItem>
                <SelectItem value="RED">Delayed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={buyerFilter} onValueChange={(v) => { setBuyerFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Buyer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buyers</SelectItem>
                {buyers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={unitFilter} onValueChange={(v) => { setUnitFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Link href="/dashboard/orders/new" className="ml-auto">
            <Button size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Results summary */}
      <p className="text-sm text-[var(--text-muted)] px-1">
        Showing {paginated.length} of {filtered.length} orders
      </p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden shadow-[var(--shadow-sm)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-[var(--text-primary)]"
                  onClick={() => handleSort('po_number')}
                >
                  <span className="flex items-center gap-1">PO Number <SortIcon field="po_number" /></span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                  Buyer
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                  Style
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                  Unit
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                  Total Qty
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                  Stage
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap min-w-[160px]">
                  Progress
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-[var(--text-primary)]"
                  onClick={() => handleSort('ex_factory_date')}
                >
                  <span className="flex items-center gap-1">Ex-factory <SortIcon field="ex_factory_date" /></span>
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <p className="text-sm font-medium text-[var(--text-primary)]">No orders found</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Try adjusting your filters or{' '}
                      <Link href="/dashboard/orders/new" className="text-[var(--accent)] hover:underline">
                        create a new order
                      </Link>
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((order) => {
                  const pct = percentage(order.completed_quantity, order.total_quantity)
                  const days = daysUntil(order.ex_factory_date)
                  const buyer = order.buyer as Buyer | null
                  const unit = order.production_unit as ProductionUnit | null
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[var(--bg-subtle)] transition-colors group"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <RiskBadge status={order.risk_status} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {order.po_number}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[var(--text-secondary)]">
                        {buyer?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 max-w-[160px]">
                        <span className="truncate block text-[var(--text-secondary)]">
                          {order.style_name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[var(--text-muted)] text-xs">
                        {unit?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right font-medium text-[var(--text-primary)]">
                        {formatNumber(order.total_quantity)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StageBadge stage={order.current_stage} />
                      </td>
                      <td className="px-4 py-3.5 min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--text-secondary)]">{pct}%</span>
                            <span className="text-[var(--text-muted)]">
                              {formatNumber(order.completed_quantity)} pcs
                            </span>
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
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div>
                          <p className="text-xs font-medium text-[var(--text-primary)]">
                            {formatDate(order.ex_factory_date)}
                          </p>
                          <p className={cn('text-xs', days < 0 ? 'text-red-600 font-semibold' : days <= 7 ? 'text-amber-600' : 'text-[var(--text-muted)]')}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `in ${days}d`}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center"
                        >
                          <ArrowRight className="h-4 w-4" />
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
          <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
