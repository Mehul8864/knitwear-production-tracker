import { TrendingUp, AlertTriangle, XCircle, Package, Ship, Activity } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface KPICardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  sub?: string
  trend?: string
  color?: 'green' | 'amber' | 'red' | 'navy' | 'default'
}

function KPICard({ label, value, icon, sub, color = 'default' }: KPICardProps) {
  const styles: Record<string, { iconBg: string; iconColor: string; valueCls: string }> = {
    green:   { iconBg: 'var(--green-bg-alt)', iconColor: 'var(--green)',   valueCls: 'text-[var(--green-text)]' },
    amber:   { iconBg: 'var(--amber-bg-alt)', iconColor: 'var(--amber)',   valueCls: 'text-[var(--amber-text)]' },
    red:     { iconBg: 'var(--red-bg-alt)',   iconColor: 'var(--red)',     valueCls: 'text-[var(--red-text)]' },
    navy:    { iconBg: 'var(--navy)',          iconColor: 'white',          valueCls: 'text-[var(--text-primary)]' },
    default: { iconBg: 'var(--bg-subtle)',    iconColor: 'var(--text-secondary)', valueCls: 'text-[var(--text-primary)]' },
  }
  const s = styles[color]

  return (
    <div
      className="relative bg-white rounded-[var(--radius-lg)] border border-[var(--border)] p-5 overflow-hidden transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Subtle top accent */}
      {color !== 'default' && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[var(--radius-lg)]"
          style={{
            background: color === 'green' ? 'var(--green)' :
                        color === 'amber' ? 'var(--amber)' :
                        color === 'red'   ? 'var(--red)'   :
                        color === 'navy'  ? 'var(--navy)'  : 'transparent'
          }}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-label-caps mb-2.5">{label}</p>
          <p className={cn('text-[26px] font-bold leading-none tracking-[-0.025em]', s.valueCls)}>
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {sub && (
            <p className="text-[11.5px] mt-1.5 leading-tight" style={{ color: 'var(--text-muted)' }}>
              {sub}
            </p>
          )}
        </div>
        <div
          className="p-2 rounded-[var(--radius-md)] shrink-0 flex items-center justify-center"
          style={{ background: s.iconBg, color: s.iconColor }}
        >
          {icon}
        </div>
      </div>
    </div>
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
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <KPICard
        label="Active Orders"
        value={total}
        icon={<Activity className="h-[15px] w-[15px]" />}
        sub="In production now"
        color="navy"
      />
      <KPICard
        label="On Track"
        value={onTrack}
        icon={<TrendingUp className="h-[15px] w-[15px]" />}
        sub="Meeting run-rate"
        color="green"
      />
      <KPICard
        label="At Risk"
        value={atRisk}
        icon={<AlertTriangle className="h-[15px] w-[15px]" />}
        sub="Below required rate"
        color="amber"
      />
      <KPICard
        label="Delayed"
        value={delayed}
        icon={<XCircle className="h-[15px] w-[15px]" />}
        sub="Projected to miss"
        color="red"
      />
      <KPICard
        label="Total Pieces"
        value={totalQty}
        icon={<Package className="h-[15px] w-[15px]" />}
        sub="Across all orders"
        color="default"
      />
      <KPICard
        label="Shipping Soon"
        value={shippingSoon}
        icon={<Ship className="h-[15px] w-[15px]" />}
        sub="Ex-factory ≤ 14 days"
        color="amber"
      />
    </div>
  )
}
