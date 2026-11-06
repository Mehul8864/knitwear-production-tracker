import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, prefix, suffix, ...props }, ref) => {
    if (prefix || suffix) {
      return (
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
              {prefix}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              'flex h-9 w-full rounded-[var(--radius-md)] border bg-white',
              'text-[13.5px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)]',
              'border-[var(--border)]',
              'transition-colors duration-150',
              'focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-[var(--bg-subtle)]',
              error && 'border-[var(--red)] focus:border-[var(--red)] focus:ring-[var(--red-bg-alt)]',
              prefix ? 'pl-9' : 'pl-3',
              suffix ? 'pr-9' : 'pr-3',
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 flex items-center" style={{ color: 'var(--text-muted)' }}>
              {suffix}
            </div>
          )}
        </div>
      )
    }
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-[var(--radius-md)] border bg-white px-3',
          'text-[13.5px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)]',
          'border-[var(--border)]',
          'transition-colors duration-150',
          'focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-[var(--bg-subtle)]',
          error && 'border-[var(--red)] focus:border-[var(--red)] focus:ring-[var(--red-bg-alt)]',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
