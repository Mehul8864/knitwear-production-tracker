import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, compact, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 gap-2' : 'py-16 gap-3',
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-xl mb-1',
            compact ? 'w-9 h-9' : 'w-12 h-12'
          )}
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
        >
          <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </div>
      )}
      <p
        className={cn('font-medium', compact ? 'text-[13px]' : 'text-[14px]')}
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn('max-w-[280px]', compact ? 'text-[12px]' : 'text-[13px]')}
          style={{ color: 'var(--text-muted)' }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
