import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
          'border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-light)] focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--bg-subtle)]',
          'resize-none transition-colors',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-100',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
