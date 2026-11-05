import { TrendingUp, AlertTriangle, XCircle, Package, Ship, Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatNumber } from '@/lib/utils'

interface KPICardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  sub?: string
  color?: 'green' | 'amber' | 'red' | 'navy' | 'default'
}

function KPICard({ label, value, icon, sub, color = 'default' }: KPICardProps) {
  const colorMap = {
    green: 'text-emerald-600 bg-[var(--green-bg)]',
    amber: 'text-amber-600 bg-[var(--amber-bg)]',
    red: 'text-red-600 bg-[var(--red-bg)]',
    navy: 'text-white bg-[var(--navy)]',
    default: 'text-[var(--text-secondary)] bg-[var(--bg-subtle)]',
  }
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
              {label}
            </p>
            <p className="text-2xl font-bold text-[var(--text-primary)] leading-none">
              {typeof value === 'number' ? formatNumber(value) : value}
            </p>
            {sub && (
              <p className="text-xs text-[var(--text-muted)] mt-1.5">{sub}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface DashboardKPIsProps {
  total: number
  onTrack: number
  atRisk: number
  delayed: number
  totalQty: number
  shippingSoon: number
}

export function DashboardKPIs({ total, onTrack, atRisk, delayed, totalQty, shippingSoon }: DashboardKPIsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard
        label="Active Orders"
        value={total}
        icon={<Activity className="h-4 w-4" />}
        sub="Currently in production"
        color="navy"
      />
      <KPICard
        label="On Track"
        value={onTrack}
        icon={<TrendingUp className="h-4 w-4" />}
        sub="Meeting run-rate"
        color="green"
      />
      <KPICard
        label="At Risk"
        value={atRisk}
        icon={<AlertTriangle className="h-4 w-4" />}
        sub="Below required rate"
        color="amber"
      />
      <KPICard
        label="Delayed"
        value={delayed}
        icon={<XCircle className="h-4 w-4" />}
        sub="Projected to miss deadline"
        color="red"
      />
      <KPICard
        label="Total Qty"
        value={totalQty}
        icon={<Package className="h-4 w-4" />}
        sub="Pieces in production"
        color="default"
      />
      <KPICard
        label="Shipping Soon"
        value={shippingSoon}
        icon={<Ship className="h-4 w-4" />}
        sub="Ex-factory ≤ 14 days"
        color="amber"
      />
    </div>
  )
}
