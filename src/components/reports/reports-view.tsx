'use client'

import { useState } from 'react'
import { Download, FileText, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RiskBadge, StageBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, formatNumber, percentage } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Order, Buyer } from '@/types/database'

interface ReportsViewProps {
  orders: Order[]
  buyers: Buyer[]
}

export function ReportsView({ orders, buyers }: ReportsViewProps) {
  const [buyerFilter, setBuyerFilter] = useState('all')
  const [exporting, setExporting] = useState(false)

  const filtered = buyerFilter === 'all'
    ? orders
    : orders.filter(o => o.buyer_id === buyerFilter)

  async function exportPDF() {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFillColor(15, 30, 53)
      doc.rect(0, 0, 297, 22, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('StitchOps — Production Status Report', 14, 14)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated: ${formatDate(new Date())}`, 240, 14)
      const tableData = filtered.map(order => {
        const buyer = order.buyer as Buyer | null
        const pct = percentage(order.completed_quantity, order.total_quantity)
        return [
          order.po_number,
          buyer?.name ?? '',
          order.style_name,
          formatNumber(order.total_quantity),
          formatNumber(order.completed_quantity),
          `${pct}%`,
          order.current_stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          order.risk_status,
          formatDate(order.ex_factory_date),
        ]
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      autoTable(doc, {
        startY: 28,
        head: [['PO', 'Buyer', 'Style', 'Total Qty', 'Completed', 'Progress', 'Stage', 'Status', 'Ex-factory']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [15, 30, 53], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 248, 250] as [number, number, number] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (data: any) => {
          if (data.column.index === 7) {
            const v = String(data.cell.raw)
            data.cell.styles.textColor = v === 'GREEN' ? [5, 150, 105] : v === 'AMBER' ? [217, 119, 6] : [220, 38, 38]
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })
      doc.save(`StitchOps_Report_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF exported')
    } catch (err) {
      console.error(err)
      toast.error('Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const wsData = [
        ['StitchOps — Production Status Report'],
        [`Generated: ${formatDate(new Date())}`],
        [],
        ['PO Number', 'Buyer', 'Style', 'Total Qty', 'Completed', 'Progress %', 'Stage', 'Status', 'Ex-factory Date'],
        ...filtered.map(order => {
          const buyer = order.buyer as Buyer | null
          const pct = percentage(order.completed_quantity, order.total_quantity)
          return [
            order.po_number,
            buyer?.name ?? '',
            order.style_name,
            order.total_quantity,
            order.completed_quantity,
            pct,
            order.current_stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            order.risk_status,
            formatDate(order.ex_factory_date),
          ]
        }),
      ]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [{ wch: 16 }, { wch: 20 }, { wch: 32 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 16 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Production Status')
      XLSX.writeFile(wb, `StitchOps_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel exported')
    } catch (err) {
      console.error(err)
      toast.error('Failed to export Excel')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Export controls */}
      <div
        className="bg-white rounded-[var(--radius-lg)] border border-[var(--border)] p-4 flex flex-wrap items-end gap-4"
        style={{ boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="space-y-1.5">
          <p className="text-label-caps flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            Filter by buyer
          </p>
          <Select value={buyerFilter} onValueChange={setBuyerFilter}>
            <SelectTrigger className="w-[180px] h-8 text-[13px]">
              <SelectValue placeholder="All buyers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buyers</SelectItem>
              {buyers.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2.5 ml-auto">
          <Button variant="secondary" size="sm" onClick={exportPDF} loading={exporting} className="h-8 text-[12.5px] gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={exportExcel} loading={exporting} className="h-8 text-[12.5px] gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary */}
      <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
        {filtered.length} order{filtered.length !== 1 ? 's' : ''} · {filtered.reduce((s, o) => s + o.total_quantity, 0).toLocaleString()} total pieces
      </p>

      {/* Table */}
      <div
        className="bg-white rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No orders"
            description="No orders match your current filter"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  {['PO', 'Buyer', 'Style', 'Total', 'Progress', 'Stage', 'Status', 'Ex-factory'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-label-caps whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const buyer = order.buyer as Buyer | null
                  const pct = percentage(order.completed_quantity, order.total_quantity)
                  const progressColor = order.risk_status === 'GREEN' ? 'var(--green)' :
                                        order.risk_status === 'AMBER' ? 'var(--amber)' : 'var(--red)'
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-[var(--border-light)] last:border-0 transition-colors duration-100"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap font-semibold tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
                        {order.po_number}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{buyer?.name}</td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <span className="truncate block" style={{ color: 'var(--text-secondary)' }}>{order.style_name}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {formatNumber(order.total_quantity)}
                      </td>
                      <td className="px-4 py-3.5 min-w-[130px]">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11.5px]">
                            <span className="font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                            <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{formatNumber(order.completed_quantity)}</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${pct}%`, background: progressColor }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap"><StageBadge stage={order.current_stage} /></td>
                      <td className="px-4 py-3.5 whitespace-nowrap"><RiskBadge status={order.risk_status} /></td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(order.ex_factory_date)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
