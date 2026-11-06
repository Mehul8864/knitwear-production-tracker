'use client'

import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RiskBadge, StageBadge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatDate, formatNumber, percentage } from '@/lib/utils'
import type { Order, Buyer } from '@/types/database'
import { cn } from '@/lib/utils'

interface ReportsViewProps {
  orders: Order[]
  buyers: Buyer[]
}

export function ReportsView({ orders, buyers }: ReportsViewProps) {
  const [buyerFilter, setBuyerFilter] = useState('all')
  const [exporting, setExporting] = useState(false)

  const filtered = buyerFilter === 'all'
    ? orders
    : orders.filter((o) => o.buyer_id === buyerFilter)

  async function exportPDF() {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape' })

      // Header
      doc.setFillColor(23, 36, 58)
      doc.rect(0, 0, 297, 25, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('StitchOps — Production Status Report', 14, 16)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated: ${formatDate(new Date())}`, 230, 16)

      // Table
      const tableData = filtered.map((order) => {
        const buyer = order.buyer as Buyer | null
        const pct = percentage(order.completed_quantity, order.total_quantity)
        return [
          order.po_number,
          buyer?.name ?? '—',
          order.style_name,
          formatNumber(order.total_quantity),
          formatNumber(order.completed_quantity),
          `${pct}%`,
          order.current_stage.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          order.risk_status,
          formatDate(order.ex_factory_date),
        ]
      })

      autoTable(doc, {
        startY: 32,
        head: [['PO Number', 'Buyer', 'Style', 'Total Qty', 'Completed', 'Progress', 'Stage', 'Status', 'Ex-factory']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [23, 36, 58], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 248, 250] as [number, number, number] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (data: any) => {
          if (data.column.index === 7) {
            const v = String(data.cell.raw)
            data.cell.styles.textColor =
              v === 'GREEN' ? [16, 185, 129] :
              v === 'AMBER' ? [245, 158, 11] :
              [239, 68, 68]
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })

      doc.save(`StitchOps_Report_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF exported successfully')
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
        ...filtered.map((order) => {
          const buyer = order.buyer as Buyer | null
          const pct = percentage(order.completed_quantity, order.total_quantity)
          return [
            order.po_number,
            buyer?.name ?? '',
            order.style_name,
            order.total_quantity,
            order.completed_quantity,
            pct,
            order.current_stage.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            order.risk_status,
            formatDate(order.ex_factory_date),
          ]
        }),
      ]

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Production Status')

      // Set column widths
      ws['!cols'] = [
        { wch: 16 }, { wch: 20 }, { wch: 32 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 16 },
      ]

      XLSX.writeFile(wb, `StitchOps_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel exported successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to export Excel')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Export controls */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-1.5">Filter by buyer</p>
              <Select value={buyerFilter} onValueChange={setBuyerFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All buyers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buyers</SelectItem>
                  {buyers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={exportPDF}
                loading={exporting}
              >
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
              <Button
                variant="secondary"
                onClick={exportExcel}
                loading={exporting}
              >
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filtered.length} orders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">PO</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">Buyer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Style</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider min-w-[140px]">Progress</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">Ex-factory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((order) => {
                  const buyer = order.buyer as Buyer | null
                  const pct = percentage(order.completed_quantity, order.total_quantity)
                  return (
                    <tr key={order.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">{order.po_number}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{buyer?.name}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[200px] truncate">{order.style_name}</td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)] whitespace-nowrap">{formatNumber(order.total_quantity)}</td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{pct}%</span>
                            <span className="text-[var(--text-muted)]">{formatNumber(order.completed_quantity)}</span>
                          </div>
                          <Progress value={pct} className="h-1.5" indicatorClassName={cn(
                            order.risk_status === 'GREEN' && 'bg-emerald-500',
                            order.risk_status === 'AMBER' && 'bg-amber-500',
                            order.risk_status === 'RED' && 'bg-red-500',
                          )} />
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StageBadge stage={order.current_stage} /></td>
                      <td className="px-4 py-3 whitespace-nowrap"><RiskBadge status={order.risk_status} /></td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap text-xs">{formatDate(order.ex_factory_date)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
