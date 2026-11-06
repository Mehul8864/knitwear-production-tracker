import { redirect } from 'next/navigation'
import { connection } from 'next/server'

import { createClient } from '@/lib/supabase/server'



export const instant = false

export default async function HomePage() {
  await connection()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}

