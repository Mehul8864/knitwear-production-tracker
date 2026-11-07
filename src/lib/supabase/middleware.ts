import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { getSupabaseUrl, getSupabasePublishableKey } from './env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Important: always call getUser() to refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes that don't require auth
  // - /login: auth page
  // - /buyer: token-based buyer portal (e.g. /buyer/[token])
  // - /buyer-portal: informational page for buyers who land without a token
  const publicRoutes = ['/login', '/buyer', '/buyer-portal']
  const isPublicRoute = publicRoutes.some((r) => pathname.startsWith(r))
  const isApiRoute = pathname.startsWith('/api/')
  const isStaticRoute = pathname.startsWith('/_next/') || pathname === '/favicon.ico'

  if (!user && !isPublicRoute && !isApiRoute && !isStaticRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    // Redirect to dashboard — the layout will send buyers to /buyer-portal
    // if their role is 'buyer'. This avoids checking the role in the proxy
    // (which would require an extra DB query in the hot path).
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
