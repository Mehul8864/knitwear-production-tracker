'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * SignInLink — used on the /buyer-portal informational page.
 *
 * Problem this solves:
 *   The proxy (middleware) redirects any authenticated user away from /login
 *   to /dashboard. For an authenticated buyer, /dashboard then redirects back
 *   to /buyer-portal, creating a loop.
 *
 *   A plain <Link href="/login"> does not break this loop because the user
 *   is still authenticated when they arrive at /login.
 *
 * Solution:
 *   For authenticated users: sign out first, then navigate to /login.
 *   The proxy allows unauthenticated users through to /login normally.
 *
 *   For unauthenticated users: navigate directly to /login — no sign-out needed.
 *
 * This does NOT affect the buyer token portal (/buyer/[token]) which is
 * entirely session-free and unaffected by this component.
 */
interface SignInLinkProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function SignInLink({ children, className, style }: SignInLinkProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // Sign out any current session so the proxy lets the user
      // reach /login without being redirected to /dashboard.
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // User is authenticated — sign out first to clear the session.
        // After sign-out, the proxy will no longer redirect /login to /dashboard.
        await supabase.auth.signOut()
      }

      // Navigate to /login. With no active session, the proxy passes through.
      router.push('/login')
    } catch {
      // On any error, navigate anyway — the login page handles missing sessions.
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <a
      href="/login"
      onClick={handleClick}
      className={className}
      style={style}
      aria-label="Sign in to StitchOps as a merchandiser or supervisor"
      aria-disabled={loading}
    >
      {loading ? 'Redirecting…' : children}
    </a>
  )
}
