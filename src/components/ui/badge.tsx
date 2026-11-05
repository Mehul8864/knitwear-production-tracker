import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-0.5 border',
  {
    variants: {
      variant: {
        default: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border)]',
        green: 'bg-[var(--green-bg)] text-emerald-700 border-[var(--green-border)]',
        amber: 'bg-[var(--amber-bg)] text-amber-700 border-[var(--amber-border)]',
        red: 'bg-[var(--red-bg)] text-red-700 border-[var(--red-border)]',
        navy: 'bg-[var(--navy)] text-white border-[var(--navy)]',
        accent: 'bg-[var(--accent-light)] text-[var(--accent-dark)] border-[var(--accent-light)]',
        outline: 'bg-transparent text-[var(--text-secondary)] border-[var(--border)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

export function RiskBadge({ status }: { status: 'GREEN' | 'AMBER' | 'RED' | string }) {
  const map: Record<string, { label: string; variant: 'green' | 'amber' | 'red' }> = {
    GREEN: { label: 'On Track', variant: 'green' },
    AMBER: { label: 'At Risk', variant: 'amber' },
    RED: { label: 'Delayed', variant: 'red' },
  }
  const config = map[status] ?? { label: status, variant: 'red' as const }
  return (
    <Badge variant={config.variant}>
      <span
        className={cn('h-1.5 w-1.5 rounded-full', {
          'bg-emerald-500': config.variant === 'green',
          'bg-amber-500': config.variant === 'amber',
          'bg-red-500': config.variant === 'red',
        })}
      />
      {config.label}
    </Badge>
  )
}

export function StageBadge({ stage }: { stage: string }) {
  const labels: Record<string, string> = {
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
  return (
    <Badge variant="default">
      {labels[stage] ?? stage}
    </Badge>
  )
}
