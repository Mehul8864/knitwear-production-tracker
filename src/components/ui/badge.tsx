import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[var(--radius-full)] text-[11.5px] font-[530] px-2.5 py-[3px] border whitespace-nowrap',
  {
    variants: {
      variant: {
        default:  'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border)]',
        green:    'bg-[var(--green-bg)] text-[var(--green-text)] border-[var(--green-border)]',
        amber:    'bg-[var(--amber-bg)] text-[var(--amber-text)] border-[var(--amber-border)]',
        red:      'bg-[var(--red-bg)] text-[var(--red-text)] border-[var(--red-border)]',
        navy:     'bg-[var(--navy)] text-white border-[var(--navy)]',
        accent:   'bg-[var(--accent-light)] text-[var(--accent-dark)] border-[var(--accent-muted)]',
        outline:  'bg-transparent text-[var(--text-secondary)] border-[var(--border)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }

/* ─── Status badges ─────────────────────────────────────────── */
const STATUS_CONFIG = {
  GREEN: { label: 'On Track',  variant: 'green' as const, dotClass: 'bg-[var(--green-light)]' },
  AMBER: { label: 'At Risk',   variant: 'amber' as const, dotClass: 'bg-[var(--amber-light)]' },
  RED:   { label: 'Delayed',   variant: 'red' as const,   dotClass: 'bg-[var(--red-light)]'   },
}

export function RiskBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
  if (!config) return <Badge variant="default">{status}</Badge>
  return (
    <Badge variant={config.variant}>
      <span className={cn('status-dot', config.dotClass)} />
      {config.label}
    </Badge>
  )
}

const STAGE_LABELS: Record<string, string> = {
  fabric_inhouse:   'Fabric In',
  cutting:          'Cutting',
  stitching:        'Stitching',
  printing:         'Printing',
  washing:          'Washing',
  finishing:        'Finishing',
  packing:          'Packing',
  final_inspection: 'Inspection',
  dispatch:         'Dispatch',
}

export function StageBadge({ stage }: { stage: string }) {
  return (
    <Badge variant="default" className="font-mono text-[10.5px] tracking-wide uppercase">
      {STAGE_LABELS[stage] ?? stage}
    </Badge>
  )
}
