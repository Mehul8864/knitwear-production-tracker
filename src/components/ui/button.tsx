'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-[13px] font-[520]',
    'transition-all duration-150 outline-none select-none',
    'focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-40',
    'active:scale-[0.98]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--navy)] text-white',
          'hover:bg-[var(--navy-light)]',
          'shadow-[0_1px_3px_rgba(15,30,53,0.2),0_1px_2px_rgba(15,30,53,0.12)]',
        ].join(' '),
        secondary: [
          'bg-white text-[var(--text-primary)]',
          'border border-[var(--border)]',
          'hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]',
          'shadow-[var(--shadow-xs)]',
        ].join(' '),
        accent: [
          'bg-[var(--accent)] text-white',
          'hover:bg-[var(--accent-hover)]',
          'shadow-[0_1px_3px_rgba(79,110,247,0.25)]',
        ].join(' '),
        ghost: [
          'text-[var(--text-secondary)]',
          'hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
        ].join(' '),
        destructive: [
          'bg-[var(--red)] text-white',
          'hover:bg-red-700',
          'shadow-[0_1px_3px_rgba(220,38,38,0.2)]',
        ].join(' '),
        success: [
          'bg-[var(--green)] text-white',
          'hover:bg-emerald-700',
          'shadow-[0_1px_3px_rgba(5,150,105,0.2)]',
        ].join(' '),
        warning: [
          'bg-[var(--amber)] text-white',
          'hover:bg-amber-700',
        ].join(' '),
        link: 'text-[var(--accent)] underline-offset-4 hover:underline h-auto p-0',
      },
      size: {
        xs: 'h-7 px-2.5 text-[12px] rounded-[var(--radius-sm)]',
        sm: 'h-8 px-3 text-[12.5px]',
        md: 'h-9 px-4',
        lg: 'h-10 px-5 text-[14px]',
        xl: 'h-11 px-6 text-[15px]',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7 rounded-[var(--radius-sm)]',
        'icon-xs': 'h-6 w-6 rounded-[var(--radius-sm)] text-[11px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="h-3.5 w-3.5 animate-spin shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
