'use client'

import { usePathname } from 'next/navigation'
import { Menu, Bell, Search, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface TopNavProps {
  profile: Profile
  onMenuClick: () => void
}

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/orders': 'Order Board',
  '/dashboard/orders/new': 'Create Order',
  '/dashboard/tna': 'TNA Calendar',
  '/dashboard/updates': 'Production Updates',
  '/dashboard/reports': 'Reports',
  '/dashboard/settings': 'Settings',
  '/dashboard/update': 'Submit Update',
}

function getBreadcrumbs(pathname: string): string[] {
  const parts = pathname.split('/').filter(Boolean)
  const crumbs: string[] = ['StitchOps']
  let path = ''
  for (const part of parts) {
    path += `/${part}`
    const label = breadcrumbMap[path]
    if (label) crumbs.push(label)
    else if (part !== 'dashboard') crumbs.push(part.charAt(0).toUpperCase() + part.slice(1))
  }
  return crumbs
}

export function TopNav({ profile, onMenuClick }: TopNavProps) {
  const pathname = usePathname()
  const crumbs = getBreadcrumbs(pathname)
  const today = formatDate(new Date())

  return (
    <header className="h-14 border-b border-[var(--border)] bg-white flex items-center px-4 gap-4 shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex-1 min-w-0">
        <ol className="flex items-center gap-1.5 text-sm">
          {crumbs.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
              )}
              <span
                className={cn(
                  'truncate',
                  i === crumbs.length - 1
                    ? 'text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-muted)]'
                )}
              >
                {crumb}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Date */}
        <span className="hidden md:block text-xs text-[var(--text-muted)] mr-2">{today}</span>

        {/* Search */}
        <button
          className="p-2 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
          <span className="text-xs font-semibold text-[var(--accent-dark)]">
            {profile.full_name?.charAt(0).toUpperCase() ?? 'U'}
          </span>
        </div>
      </div>
    </header>
  )
}
