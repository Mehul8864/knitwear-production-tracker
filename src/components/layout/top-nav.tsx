'use client'

import { usePathname } from 'next/navigation'
import { Menu, Bell, Search, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface TopNavProps {
  profile: Profile
  onMenuClick: () => void
}

const routeLabels: Record<string, string> = {
  '/dashboard':             'Overview',
  '/dashboard/orders':      'Orders',
  '/dashboard/orders/new':  'New Order',
  '/dashboard/tna':         'TNA Calendar',
  '/dashboard/updates':     'Production Updates',
  '/dashboard/reports':     'Reports',
  '/dashboard/settings':    'Settings',
  '/dashboard/update':      'Submit Update',
}

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [
    { label: 'StitchOps', href: '/dashboard' },
  ]
  let path = ''
  const parts = pathname.split('/').filter(Boolean)
  for (const part of parts) {
    path += `/${part}`
    const label = routeLabels[path]
    if (label && path !== '/dashboard') {
      crumbs.push({ label, href: path })
    } else if (!label && part !== 'dashboard') {
      crumbs.push({ label: part.charAt(0).toUpperCase() + part.slice(1), href: path })
    }
  }
  return crumbs
}

export function TopNav({ profile, onMenuClick }: TopNavProps) {
  const pathname = usePathname()
  const crumbs = getBreadcrumbs(pathname)
  const today = new Date()

  return (
    <header
      className="h-[56px] flex items-center px-4 gap-3 shrink-0"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        aria-label="Open navigation menu"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex-1 min-w-0 hidden sm:flex">
        <ol className="flex items-center gap-1 text-[12.5px]">
          {crumbs.map((crumb, i) => (
            <li key={crumb.href} className="flex items-center gap-1 min-w-0">
              {i > 0 && (
                <ChevronRight className="h-3 w-3 shrink-0" style={{ color: 'var(--text-faint)' }} />
              )}
              <span
                className={i === crumbs.length - 1 ? 'font-medium truncate' : 'truncate'}
                style={{
                  color: i === crumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {crumb.label}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {/* Mobile page title */}
      <div className="flex-1 sm:hidden">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {crumbs[crumbs.length - 1]?.label ?? 'StitchOps'}
        </span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Date — desktop only */}
        <span
          className="hidden md:block text-[11.5px] mr-2 tabular-nums"
          style={{ color: 'var(--text-muted)' }}
        >
          {formatDate(today)}
        </span>

        {/* Search */}
        <button
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          aria-label="Search"
        >
          <Search className="h-[15px] w-[15px]" />
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          aria-label="Notifications"
        >
          <Bell className="h-[15px] w-[15px]" />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--red-light)' }}
          />
        </button>

        {/* Avatar */}
        <div
          className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white text-[10px] font-bold ml-1 shrink-0"
          style={{ background: 'var(--accent)' }}
          aria-label={profile.full_name}
          title={profile.full_name}
        >
          {profile.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  )
}
