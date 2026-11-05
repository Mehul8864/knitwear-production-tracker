import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { getSupabaseUrl, getSupabasePublishableKey } from './env'

export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey()
  )
}
