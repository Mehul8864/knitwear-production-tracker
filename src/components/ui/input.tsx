import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg border bg-white px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors',
          'border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-light)] focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--bg-subtle)]',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-100',
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
