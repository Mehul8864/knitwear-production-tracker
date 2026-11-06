import { redirect } from 'next/navigation'
import { connection } from 'next/server'

import { createClient } from '@/lib/supabase/server'



export const instant = false

export default async function BuyerPortalRedirectPage() {
  const supabase = await createClient()
  await connection()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // This page is shown to buyers who log in with email/password
  // For now, redirect to login with info
  redirect('/login')
}

