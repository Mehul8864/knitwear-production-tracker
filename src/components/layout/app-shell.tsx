'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import type { Profile } from '@/types/database'

interface AppShellProps {
  children: React.ReactNode
  profile: Profile
}

export function AppShell({ children, profile }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (sidebarOpen) setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Prevent body scroll when mobile sidebar open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar profile={profile} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(15,30,53,0.55)', backdropFilter: 'blur(3px)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar profile={profile} mobile onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav profile={profile} onMenuClick={() => setSidebarOpen(true)} />
        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
          role="main"
        >
          <div
            className="px-4 sm:px-6 py-6 max-w-[1440px] mx-auto animate-fade-up"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
