'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import type { Profile } from '@/types/database'

interface AppShellProps {
  children: React.ReactNode
  profile: Profile
}

export function AppShell({ children, profile }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      {/* Desktop sidebar */}
      <Sidebar profile={profile} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar profile={profile} mobile onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav
          profile={profile}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-screen-xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
