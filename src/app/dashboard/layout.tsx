import { redirect } from 'next/navigation'
import { connection } from 'next/server'

import { createClient } from '@/lib/supabase/server'

import { AppShell } from '@/components/layout/app-shell'



export const instant = false

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await connection()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Buyers should see the buyer portal, not the main dashboard
  if (profile.role === 'buyer') {
    redirect('/buyer-portal')
  }

  return <AppShell profile={profile}>{children}</AppShell>
}

