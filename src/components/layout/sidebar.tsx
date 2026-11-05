'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TableProperties,
  PlusSquare,
  CalendarDays,
  Activity,
  BarChart3,
  Settings,
  X,
  LogOut,
  Factory,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Order Board', icon: TableProperties },
  { href: '/dashboard/orders/new', label: 'Create Order', icon: PlusSquare },
  { href: '/dashboard/tna', label: 'TNA Calendar', icon: CalendarDays },
  { href: '/dashboard/updates', label: 'Production Updates', icon: Activity },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const supervisorNav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/update', label: 'Submit Update', icon: Activity },
  { href: '/dashboard/orders', label: 'My Orders', icon: TableProperties },
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
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={cn(
        'flex flex-col w-[220px] shrink-0 border-r border-[var(--border)] bg-white h-screen',
        mobile && 'shadow-[var(--shadow-lg)]'
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-[var(--border)] gap-3 shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--navy)' }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L3 7v11h5v-6h4v6h5V7L10 2z" fill="white" />
          </svg>
        </div>
        <span className="font-semibold text-[var(--text-primary)] text-sm tracking-tight">
          StitchOps
        </span>
        {mobile && (
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Role badge */}
      <div className="px-4 pt-4 pb-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2.5 py-1 rounded-full border border-[var(--border)]">
          <Factory className="h-3 w-3" />
          {profile.role === 'merchandiser' ? 'Merchandiser' : 'Supervisor'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                isActive
                  ? 'bg-[var(--navy)] text-white font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-[var(--border)] space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-[var(--accent-light)] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[var(--accent-dark)]">
              {profile.full_name?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate leading-none mb-0.5">
              {profile.full_name}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">{profile.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--red-bg)] hover:text-red-700 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
