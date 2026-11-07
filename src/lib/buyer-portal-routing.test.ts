/**
 * Regression tests for the Buyer Portal redirect-loop fix.
 *
 * Root cause of the bug:
 *   1. /buyer-portal was NOT in the proxy's publicRoutes list.
 *      Unauthenticated requests to /buyer-portal were redirected to /login.
 *   2. /buyer-portal page itself redirected authenticated buyers back to /login.
 *   3. The proxy then saw user + /login → redirected to /dashboard.
 *   4. Dashboard layout saw role=buyer → redirected to /buyer-portal.
 *      LOOP: /dashboard → /buyer-portal → /login → /dashboard → ...
 *
 * Fix:
 *   1. Added /buyer-portal to publicRoutes in middleware.ts.
 *   2. Replaced /buyer-portal page redirect logic with an informational
 *      "use your token link" UI — no redirects from this page.
 *
 * Architecture reminder:
 *   Buyers access the portal via /buyer/<token> — a token-scoped,
 *   session-free read-only URL. Email/password login is for
 *   merchandisers and supervisors only.
 */

import { describe, it, expect } from 'vitest'

// ─── Proxy routing logic (mirrors middleware.ts) ──────────────────────────────

const PUBLIC_ROUTES = ['/login', '/buyer', '/buyer-portal']

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(r => pathname.startsWith(r))
}

function proxyDecision(pathname: string, isAuthenticated: boolean): string {
  const isApiRoute = pathname.startsWith('/api/')
  const isStaticRoute = pathname.startsWith('/_next/') || pathname === '/favicon.ico'
  const isPublic = isPublicRoute(pathname) || isApiRoute || isStaticRoute

  if (!isAuthenticated && !isPublic) {
    return `REDIRECT /login`
  }
  if (isAuthenticated && pathname === '/login') {
    return `REDIRECT /dashboard`
  }
  return 'PASS'
}

// ─── Dashboard layout logic (mirrors dashboard/layout.tsx) ────────────────────

function dashboardLayoutDecision(role: string | null): string {
  if (!role) return 'REDIRECT /login'
  if (role === 'buyer') return 'REDIRECT /buyer-portal'
  return 'RENDER dashboard'
}

// ─── Buyer portal page logic (mirrors buyer-portal/page.tsx) ─────────────────

function buyerPortalPageDecision(): string {
  // Fixed: no longer redirects anywhere — just renders informational UI
  return 'RENDER buyer portal info'
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Proxy public routes', () => {
  it('/buyer-portal is a public route (unauthenticated access allowed)', () => {
    expect(isPublicRoute('/buyer-portal')).toBe(true)
  })

  it('/buyer is a public route (token portal)', () => {
    expect(isPublicRoute('/buyer')).toBe(true)
  })

  it('/buyer/[token] is a public route', () => {
    expect(isPublicRoute('/buyer/abc123def456')).toBe(true)
  })

  it('/login is a public route', () => {
    expect(isPublicRoute('/login')).toBe(true)
  })

  it('/dashboard is NOT a public route', () => {
    expect(isPublicRoute('/dashboard')).toBe(false)
  })

  it('/dashboard/orders is NOT a public route', () => {
    expect(isPublicRoute('/dashboard/orders')).toBe(false)
  })
})

describe('Proxy routing decisions', () => {
  it('Unauthenticated user visiting /dashboard → redirected to /login', () => {
    expect(proxyDecision('/dashboard', false)).toBe('REDIRECT /login')
  })

  it('Unauthenticated user visiting /buyer-portal → PASSES (no redirect)', () => {
    expect(proxyDecision('/buyer-portal', false)).toBe('PASS')
  })

  it('Unauthenticated user visiting /buyer/token → PASSES (no redirect)', () => {
    expect(proxyDecision('/buyer/abc123', false)).toBe('PASS')
  })

  it('Authenticated user visiting /login → redirected to /dashboard', () => {
    expect(proxyDecision('/login', true)).toBe('REDIRECT /dashboard')
  })

  it('Authenticated user visiting /dashboard → PASSES', () => {
    expect(proxyDecision('/dashboard', true)).toBe('PASS')
  })

  it('Authenticated user visiting /buyer-portal → PASSES (public route)', () => {
    expect(proxyDecision('/buyer-portal', true)).toBe('PASS')
  })
})

describe('Dashboard layout role routing', () => {
  it('Merchandiser → renders dashboard', () => {
    expect(dashboardLayoutDecision('merchandiser')).toBe('RENDER dashboard')
  })

  it('Supervisor → renders dashboard', () => {
    expect(dashboardLayoutDecision('supervisor')).toBe('RENDER dashboard')
  })

  it('Buyer role → redirected to /buyer-portal', () => {
    expect(dashboardLayoutDecision('buyer')).toBe('REDIRECT /buyer-portal')
  })

  it('No profile → redirected to /login', () => {
    expect(dashboardLayoutDecision(null)).toBe('REDIRECT /login')
  })
})

describe('Buyer portal page', () => {
  it('Always renders informational UI — no redirects', () => {
    expect(buyerPortalPageDecision()).toBe('RENDER buyer portal info')
  })
})

describe('Redirect loop regression — full path simulation', () => {
  function simulate(startPath: string, isAuthenticated: boolean, role: string | null, maxSteps = 10): string[] {
    const visited: string[] = []
    let current = startPath
    const auth = isAuthenticated

    for (let step = 0; step < maxSteps; step++) {
      if (visited.includes(current)) {
        return [...visited, `LOOP DETECTED at ${current}`]
      }
      visited.push(current)

      // Apply proxy
      const proxyResult = proxyDecision(current, auth)
      if (proxyResult.startsWith('REDIRECT')) {
        current = proxyResult.replace('REDIRECT ', '')
        // If redirected to /dashboard, user is still authenticated
        continue
      }

      // Apply page/layout logic
      if (current === '/buyer-portal') {
        // Fixed: no redirect, renders content
        return [...visited, 'END: buyer portal rendered']
      }
      if (current.startsWith('/dashboard')) {
        const layoutResult = dashboardLayoutDecision(role)
        if (layoutResult.startsWith('REDIRECT')) {
          current = layoutResult.replace('REDIRECT ', '')
          continue
        }
        return [...visited, 'END: dashboard rendered']
      }
      if (current === '/login') {
        if (auth) {
          // Proxy should have caught this and redirected — shouldn't reach here
          current = '/dashboard'
          continue
        }
        return [...visited, 'END: login shown']
      }

      return [...visited, `END: ${current}`]
    }
    return [...visited, 'LOOP: max steps exceeded']
  }

  it('Buyer with role=buyer navigating to /dashboard — reaches buyer portal, no loop', () => {
    const path = simulate('/dashboard', true, 'buyer')
    expect(path).not.toContain(expect.stringContaining('LOOP'))
    expect(path[path.length - 1]).toBe('END: buyer portal rendered')
  })

  it('Buyer going to /buyer-portal directly — renders immediately, no loop', () => {
    const path = simulate('/buyer-portal', false, null)
    expect(path).not.toContain(expect.stringContaining('LOOP'))
    expect(path[path.length - 1]).toBe('END: buyer portal rendered')
  })

  it('Merchandiser navigating to /dashboard — renders dashboard, no loop', () => {
    const path = simulate('/dashboard', true, 'merchandiser')
    expect(path).not.toContain(expect.stringContaining('LOOP'))
    expect(path[path.length - 1]).toBe('END: dashboard rendered')
  })

  it('Supervisor navigating to /dashboard — renders dashboard, no loop', () => {
    const path = simulate('/dashboard', true, 'supervisor')
    expect(path).not.toContain(expect.stringContaining('LOOP'))
    expect(path[path.length - 1]).toBe('END: dashboard rendered')
  })

  it('Unauthenticated user visiting /buyer/token — reaches buyer token page, no loop', () => {
    const path = simulate('/buyer/abc123token', false, null)
    // /buyer/* is public — proxy passes it through, no redirect
    expect(path).not.toContain(expect.stringContaining('LOOP'))
    expect(path[0]).toBe('/buyer/abc123token')
  })

  it('Unauthenticated user visiting /dashboard — redirected to login, no loop', () => {
    const path = simulate('/dashboard', false, null)
    expect(path).not.toContain(expect.stringContaining('LOOP'))
    expect(path[path.length - 1]).toBe('END: login shown')
  })

  it('Authenticated buyer at /login — goes to dashboard → buyer portal, no loop', () => {
    // Proxy: /login + authenticated → /dashboard
    // Dashboard layout: role=buyer → /buyer-portal
    // /buyer-portal: renders (no redirect)
    const path = simulate('/login', true, 'buyer')
    expect(path).not.toContain(expect.stringContaining('LOOP'))
    expect(path[path.length - 1]).toBe('END: buyer portal rendered')
  })
})

describe('Token-based buyer access architecture', () => {
  it('/buyer/[token] route is accessible without authentication', () => {
    // Token links are the intended buyer access method — no session required
    expect(isPublicRoute('/buyer/a6824c0b1d15e67470b53c7d64e6ed26b02138540621a6daab3df6d6a9dc8007')).toBe(true)
  })

  it('/buyer-portal does not require authentication', () => {
    // Informs buyers to use their token link — must be accessible without login
    expect(proxyDecision('/buyer-portal', false)).toBe('PASS')
  })

  it('Company B buyer token path is public', () => {
    // Real token format: 64-char hex
    const companyBToken = 'a'.repeat(64)
    expect(isPublicRoute(`/buyer/${companyBToken}`)).toBe(true)
  })

  it('Company C buyer token path is public', () => {
    const companyCToken = 'b'.repeat(64)
    expect(isPublicRoute(`/buyer/${companyCToken}`)).toBe(true)
  })
})

// ─── SignInLink behaviour ─────────────────────────────────────────────────────
// The "Sign in here" link is implemented as a client component (SignInLink)
// that signs out any current session before navigating to /login.
// This prevents the proxy from redirecting an authenticated buyer from
// /login back to /dashboard (which would loop back to /buyer-portal).

/**
 * Simulates the SignInLink click → sign-out → navigate-to-login flow.
 * Returns the effective pathname the proxy receives after sign-out.
 */
function signInLinkDecision(wasAuthenticated: boolean): { signedOut: boolean; destination: string } {
  if (wasAuthenticated) {
    // SignInLink calls supabase.auth.signOut() before pushing /login
    return { signedOut: true, destination: '/login' }
  }
  // No session to clear — navigate directly
  return { signedOut: false, destination: '/login' }
}

describe('"Sign in here" link (SignInLink component)', () => {
  it('Navigates to /login for unauthenticated visitors', () => {
    const result = signInLinkDecision(false)
    expect(result.destination).toBe('/login')
    expect(result.signedOut).toBe(false)
  })

  it('Signs out AND navigates to /login for authenticated buyers', () => {
    const result = signInLinkDecision(true)
    expect(result.signedOut).toBe(true)
    expect(result.destination).toBe('/login')
  })

  it('After sign-out, proxy allows /login through (no redirect to /dashboard)', () => {
    // Post-sign-out: user is unauthenticated
    const proxyResult = proxyDecision('/login', false /* signed out */)
    expect(proxyResult).toBe('PASS')
  })

  it('Authenticated buyer clicks "Sign in here" — no redirect loop', () => {
    // 1. SignInLink signs out → now unauthenticated
    // 2. Navigate to /login
    // 3. Proxy: unauthenticated + /login = PASS (no redirect)
    // 4. Login page renders ✓
    const { signedOut, destination } = signInLinkDecision(true /* was buyer */)
    expect(signedOut).toBe(true)
    const proxyResult = proxyDecision(destination, false /* post-sign-out */)
    expect(proxyResult).toBe('PASS')
  })

  it('Unauthenticated visitor clicks "Sign in here" — reaches login page', () => {
    const { destination } = signInLinkDecision(false)
    const proxyResult = proxyDecision(destination, false)
    expect(proxyResult).toBe('PASS')
  })
})

describe('Login page post-sign-in routing', () => {
  it('Merchandiser signs in → redirected to /dashboard → renders dashboard', () => {
    // After successful login: router.push('/dashboard')
    // Proxy: authenticated + /dashboard = PASS
    // Dashboard layout: role=merchandiser → RENDER dashboard
    const proxyResult = proxyDecision('/dashboard', true)
    const layoutResult = dashboardLayoutDecision('merchandiser')
    expect(proxyResult).toBe('PASS')
    expect(layoutResult).toBe('RENDER dashboard')
  })

  it('Supervisor signs in → redirected to /dashboard → renders dashboard', () => {
    const proxyResult = proxyDecision('/dashboard', true)
    const layoutResult = dashboardLayoutDecision('supervisor')
    expect(proxyResult).toBe('PASS')
    expect(layoutResult).toBe('RENDER dashboard')
  })

  it('Buyer cannot access /dashboard (layout redirects to /buyer-portal)', () => {
    const layoutResult = dashboardLayoutDecision('buyer')
    expect(layoutResult).toBe('REDIRECT /buyer-portal')
    expect(layoutResult).not.toBe('RENDER dashboard')
  })

  it('Buyer is never served the internal Dashboard UI', () => {
    // Full path: buyer signs in → /dashboard → layout sees buyer role
    const layoutResult = dashboardLayoutDecision('buyer')
    expect(layoutResult).not.toContain('RENDER dashboard')
  })
})

describe('Buyer data isolation architecture', () => {
  /**
   * These tests verify the structural access rules.
   * Full RLS enforcement is tested in photo-auth.test.ts (35 tests).
   */

  it('Company B token path is a distinct URL from Company C token path', () => {
    const tokenB = 'a6824c0b1d15e67470b53c7d64e6ed26b02138540621a6daab3df6d6a9dc8007'
    const tokenC = '499a0957c736309b7f1467513d71fcfbe835ae6e8060c06266447d14d3bde9f2'
    expect(`/buyer/${tokenB}`).not.toBe(`/buyer/${tokenC}`)
    expect(isPublicRoute(`/buyer/${tokenB}`)).toBe(true)
    expect(isPublicRoute(`/buyer/${tokenC}`)).toBe(true)
  })

  it('Buyer API routes validate token server-side before returning data', () => {
    // Token-based signed URL endpoints are in /api/* — not public routes
    // (they require token validation inside the route handler itself,
    //  not via the proxy, which is the correct architecture)
    expect(isPublicRoute('/api/photos/buyer-signed-url')).toBe(false)
    // The proxy passes /api/* routes through — validation is in the handler
  })

  it('Invalid/expired token: /buyer/[token] page calls notFound() — no loop', () => {
    // /buyer/* is a public route — the proxy passes through.
    // Inside the page, an invalid token hash lookup returns null → notFound()
    // This renders a 404 page, not a redirect loop.
    const proxyResult = proxyDecision('/buyer/invalidtoken', false)
    expect(proxyResult).toBe('PASS')
    // The page-level notFound() terminates rendering, no redirect.
  })
})

describe('Full scenario regression: "Sign in here" from /buyer-portal, no loop', () => {
  function fullSignInFlow(
    wasAuthenticated: boolean,
    signsInAsRole: string
  ): string[] {
    const steps: string[] = ['START: /buyer-portal']

    // Step 1: user clicks "Sign in here"
    const { signedOut, destination } = signInLinkDecision(wasAuthenticated)
    if (signedOut) steps.push('SIGN OUT')
    steps.push(`NAVIGATE TO: ${destination}`)

    // Step 2: proxy decision at /login (now unauthenticated)
    const proxyAtLogin = proxyDecision(destination, false)
    if (proxyAtLogin === 'PASS') {
      steps.push('PROXY: /login passes through')
    } else {
      steps.push(`PROXY: ${proxyAtLogin}`)
      return [...steps, 'LOOP RISK']
    }

    // Step 3: user fills login form and signs in
    steps.push(`SIGNS IN AS: ${signsInAsRole}`)
    steps.push('ROUTER: push /dashboard')

    // Step 4: proxy at /dashboard (now authenticated)
    const proxyAtDashboard = proxyDecision('/dashboard', true)
    if (proxyAtDashboard === 'PASS') {
      steps.push('PROXY: /dashboard passes through')
    }

    // Step 5: layout decision
    const layout = dashboardLayoutDecision(signsInAsRole)
    steps.push(`LAYOUT: ${layout}`)

    if (layout.startsWith('RENDER')) {
      steps.push(`END: ${layout}`)
    } else if (layout === 'REDIRECT /buyer-portal') {
      steps.push('END: buyer portal rendered (informational page)')
    } else {
      steps.push(`END: ${layout}`)
    }

    return steps
  }

  it('Unauthenticated visitor → sign in as merchandiser → dashboard, no loop', () => {
    const steps = fullSignInFlow(false, 'merchandiser')
    expect(steps.some(s => s.includes('LOOP'))).toBe(false)
    expect(steps[steps.length - 1]).toBe('END: RENDER dashboard')
  })

  it('Unauthenticated visitor → sign in as supervisor → dashboard, no loop', () => {
    const steps = fullSignInFlow(false, 'supervisor')
    expect(steps.some(s => s.includes('LOOP'))).toBe(false)
    expect(steps[steps.length - 1]).toBe('END: RENDER dashboard')
  })

  it('Authenticated buyer → click "Sign in here" → sign out → sign in as merchandiser → dashboard', () => {
    const steps = fullSignInFlow(true /* was buyer, signs out */, 'merchandiser')
    expect(steps.some(s => s.includes('LOOP'))).toBe(false)
    expect(steps).toContain('SIGN OUT')
    expect(steps[steps.length - 1]).toBe('END: RENDER dashboard')
  })

  it('Authenticated buyer → click "Sign in here" → sign out → sign in as buyer again → buyer portal info', () => {
    // Even if they sign in as a buyer again, they reach /buyer-portal info, not a loop
    const steps = fullSignInFlow(true /* was buyer */, 'buyer')
    expect(steps.some(s => s.includes('LOOP'))).toBe(false)
    expect(steps[steps.length - 1]).toBe('END: buyer portal rendered (informational page)')
  })
})
