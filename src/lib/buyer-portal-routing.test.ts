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
