'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TableProperties,
  PlusCircle,
  CalendarDays,
  Activity,
  BarChart2,
  Settings,
  X,
  LogOut,
  ShoppingBag,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard',            label: 'Overview',    icon: LayoutDashboard, exact: true },
  { href: '/dashboard/orders',     label: 'Orders',      icon: TableProperties },
  { href: '/dashboard/orders/new', label: 'New Order',   icon: PlusCircle },
  { href: '/dashboard/tna',        label: 'TNA Calendar',icon: CalendarDays },
  { href: '/dashboard/updates',    label: 'Updates',     icon: Activity },
  { href: '/dashboard/reports',    label: 'Reports',     icon: BarChart2 },
  { href: '/dashboard/settings',   label: 'Settings',    icon: Settings },
]

const supervisorNav = [
  { href: '/dashboard',        label: 'Overview',      icon: LayoutDashboard, exact: true },
  { href: '/dashboard/update', label: 'Submit Update', icon: Zap },
  { href: '/dashboard/orders', label: 'My Orders',     icon: TableProperties },
]

interface SidebarProps {
  profile: Profile
  mobile?: boolean
  onClose?: () => void
}

export function Sidebar({ profile, mobile, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isSupervisor = profile.role === 'supervisor'
  const items = isSupervisor ? supervisorNav : navItems

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/login')
    router.refresh()
  }

  function isActive(item: { href: string; exact?: boolean }) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <aside
      className={cn(
        'flex flex-col h-screen shrink-0 overflow-hidden',
        mobile ? 'w-[228px] shadow-2xl' : 'w-[228px]'
      )}
      style={{ background: 'var(--navy)' }}
    >
      {/* Brand */}
      <div
        className="h-[56px] flex items-center px-4 gap-3 shrink-0"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 2L3 7v11h5v-6h4v6h5V7L10 2z" fill="white" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white font-semibold text-[13.5px] tracking-[-0.01em]">StitchOps</span>
        </div>
        {mobile && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--sidebar-text)', backgroundColor: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--sidebar-item-hover-bg)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Role badge */}
      <div className="px-3 pt-4 pb-1">
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <ShoppingBag className="h-3 w-3 shrink-0" style={{ color: 'var(--sidebar-text-muted)' }} />
          <span className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--sidebar-text-muted)' }}>
            {isSupervisor ? 'SUPERVISOR' : 'MERCHANDISER'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto" role="navigation" aria-label="Main navigation">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'sidebar-item',
                active && 'active'
              )}
            >
              <Icon className="sidebar-item-icon h-[15px] w-[15px]" aria-hidden="true" />
              <span>{item.label}</span>
              {active && (
                <span
                  className="ml-auto w-1 h-4 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.5)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div
        className="px-2.5 pt-2 pb-3 shrink-0 space-y-0.5"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        {/* Profile row */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg" style={{ color: 'var(--sidebar-text)' }}>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium truncate" style={{ color: 'var(--sidebar-text-active)' }}>
              {profile.full_name}
            </p>
            <p className="text-[11px] truncate" style={{ color: 'var(--sidebar-text-muted)' }}>
              {profile.email}
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="sidebar-item w-full text-left"
          style={{ color: 'rgba(255,100,100,0.7)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,120,120,1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.12)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,100,100,0.7)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <LogOut className="sidebar-item-icon h-[14px] w-[14px]" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
