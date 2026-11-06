import type { Metadata } from 'next'
import { connection } from 'next/server'

import { createClient } from '@/lib/supabase/server'

import { SettingsView } from '@/components/settings/settings-view'


export const metadata: Metadata = { title: 'Settings' }


export const instant = false

export default async function SettingsPage() {
  const supabase = await createClient()
  await connection()

  const { data: { user } } = await supabase.auth.getUser()

  const [profileResult, buyersResult, unitsResult, tokensResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('buyers').select('*').order('name'),
    supabase.from('production_units').select('*').order('name'),
    supabase.from('buyer_access_tokens').select('*, buyer:buyers(name)').order('created_at', { ascending: false }),
  ])

  const aiConfigured = !!(process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_AI_CONFIGURED)

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Manage account, buyers, production units, and access links
        </p>
      </div>
      <SettingsView
        profile={profileResult.data}
        buyers={buyersResult.data ?? []}
        units={unitsResult.data ?? []}
        tokens={tokensResult.data ?? []}
        aiConfigured={aiConfigured}
      />
    </div>
  )
}

