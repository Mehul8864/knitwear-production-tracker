/**
 * Supabase Environment Variable Resolution
 *
 * Supports both modern and legacy Supabase API key names with automatic
 * fallback. This ensures compatibility with:
 *   - Modern: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
 *   - Legacy:  NEXT_PUBLIC_SUPABASE_ANON_KEY,        SUPABASE_SERVICE_ROLE_KEY
 *
 * Browser-safe functions only access NEXT_PUBLIC_* variables.
 * Server-only functions access SUPABASE_SECRET_KEY / SUPABASE_URL.
 */

/**
 * Resolves the Supabase project URL.
 * Server-side: prefers SUPABASE_URL, falls back to NEXT_PUBLIC_SUPABASE_URL.
 * Browser-side: SUPABASE_URL is undefined, so NEXT_PUBLIC_SUPABASE_URL is used.
 */
export function getSupabaseUrl(): string {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL
  return process.env.NEXT_PUBLIC_SUPABASE_URL!
}

/**
 * Resolves the publishable (anon) key — safe for browser exposure.
 * Prefers the modern NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 * falls back to legacy NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function getSupabasePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Resolves the secret (service role) key — SERVER-SIDE ONLY.
 * Never import this in browser/client code.
 * Prefers the modern SUPABASE_SECRET_KEY,
 * falls back to legacy SUPABASE_SERVICE_ROLE_KEY.
 */
export function getSupabaseSecretKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
