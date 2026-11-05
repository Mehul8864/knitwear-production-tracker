import { describe, it, expect } from 'vitest'
import {
  extractOrderIdFromPath,
  isStoragePath,
  isPublicUrl,
  isBuyerAuthorizedForOrder,
  isSupervisorAuthorizedForOrder,
  authorizePhotoAccess,
} from './photo-auth'

// ─── Demo data constants (matching seed.sql) ──────────────
const BUYER_B_ID = '11111111-1111-1111-1111-111111111111' // Company B (UK)
const BUYER_C_ID = '22222222-2222-2222-2222-222222222222' // Company C (Germany)

const ORDER_B1 = 'order001-0000-0000-0000-000000000001' // B-PO-88213 (Company B)
const ORDER_B2 = 'order002-0000-0000-0000-000000000002' // B-PO-88240 (Company B)
const ORDER_C1 = 'order003-0000-0000-0000-000000000003' // C-PO-0488 (Company C)

const UNIT_ALPHA = 'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const UNIT_BETA = 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

// Company B's orders
const BUYER_B_ORDERS = [ORDER_B1, ORDER_B2]
// Company C's orders
const BUYER_C_ORDERS = [ORDER_C1]

// Unit Alpha's orders (B-PO-88213, B-PO-88240)
const UNIT_ALPHA_ORDERS = [ORDER_B1, ORDER_B2]
// Unit Beta's orders (C-PO-0488)
const UNIT_BETA_ORDERS = [ORDER_C1]

// Photo paths
const PHOTO_B1 = `production/${ORDER_B1}/abc123.jpg`
const PHOTO_B2 = `production/${ORDER_B2}/def456.jpg`
const PHOTO_C1 = `production/${ORDER_C1}/ghi789.jpg`

describe('extractOrderIdFromPath', () => {
  it('extracts order ID from a valid storage path', () => {
    expect(extractOrderIdFromPath(PHOTO_B1)).toBe(ORDER_B1)
    expect(extractOrderIdFromPath(PHOTO_C1)).toBe(ORDER_C1)
  })
  it('returns null for an invalid path', () => {
    expect(extractOrderIdFromPath('http://example.com/photo.jpg')).toBeNull()
    expect(extractOrderIdFromPath('')).toBeNull()
    expect(extractOrderIdFromPath('not-a-path')).toBeNull()
  })
  it('returns null for undefined/null input', () => {
    expect(extractOrderIdFromPath(null as unknown as string)).toBeNull()
  })
  it('handles paths with different extensions', () => {
    expect(extractOrderIdFromPath(`production/${ORDER_B1}/photo.png`)).toBe(ORDER_B1)
    expect(extractOrderIdFromPath(`production/${ORDER_B1}/photo.webp`)).toBe(ORDER_B1)
  })
})

describe('isStoragePath', () => {
  it('returns true for valid storage paths', () => {
    expect(isStoragePath(PHOTO_B1)).toBe(true)
    expect(isStoragePath('production/any-order-id/file.jpg')).toBe(true)
  })
  it('returns false for HTTP URLs', () => {
    expect(isStoragePath('http://example.com/photo.jpg')).toBe(false)
    expect(isStoragePath('https://cdn.example.com/photo.jpg')).toBe(false)
  })
  it('returns false for relative paths', () => {
    expect(isStoragePath('/api/photo')).toBe(false)
  })
  it('returns false for empty or invalid input', () => {
    expect(isStoragePath('')).toBe(false)
    expect(isStoragePath(null as unknown as string)).toBe(false)
  })
})

describe('isPublicUrl', () => {
  it('returns true for HTTP/HTTPS URLs', () => {
    expect(isPublicUrl('http://example.com/photo.jpg')).toBe(true)
    expect(isPublicUrl('https://cdn.example.com/photo.jpg')).toBe(true)
  })
  it('returns true for relative paths', () => {
    expect(isPublicUrl('/api/photo')).toBe(true)
  })
  it('returns false for storage paths', () => {
    expect(isPublicUrl(PHOTO_B1)).toBe(false)
  })
})

describe('isBuyerAuthorizedForOrder', () => {
  it('allows Company B to access its own orders', () => {
    expect(isBuyerAuthorizedForOrder(BUYER_B_ID, ORDER_B1, BUYER_B_ORDERS)).toBe(true)
    expect(isBuyerAuthorizedForOrder(BUYER_B_ID, ORDER_B2, BUYER_B_ORDERS)).toBe(true)
  })

  it('BLOCKS Company B from accessing Company C orders', () => {
    expect(isBuyerAuthorizedForOrder(BUYER_B_ID, ORDER_C1, BUYER_B_ORDERS)).toBe(false)
  })

  it('BLOCKS Company C from accessing Company B orders', () => {
    expect(isBuyerAuthorizedForOrder(BUYER_C_ID, ORDER_B1, BUYER_C_ORDERS)).toBe(false)
    expect(isBuyerAuthorizedForOrder(BUYER_C_ID, ORDER_B2, BUYER_C_ORDERS)).toBe(false)
  })

  it('allows Company C to access its own orders', () => {
    expect(isBuyerAuthorizedForOrder(BUYER_C_ID, ORDER_C1, BUYER_C_ORDERS)).toBe(true)
  })

  it('blocks access with empty buyer ID', () => {
    expect(isBuyerAuthorizedForOrder('', ORDER_B1, BUYER_B_ORDERS)).toBe(false)
  })

  it('blocks access with empty order list', () => {
    expect(isBuyerAuthorizedForOrder(BUYER_B_ID, ORDER_B1, [])).toBe(false)
  })
})

describe('isSupervisorAuthorizedForOrder', () => {
  it('allows Unit Alpha supervisor to access Unit Alpha orders', () => {
    expect(isSupervisorAuthorizedForOrder(UNIT_ALPHA, ORDER_B1, UNIT_ALPHA_ORDERS)).toBe(true)
    expect(isSupervisorAuthorizedForOrder(UNIT_ALPHA, ORDER_B2, UNIT_ALPHA_ORDERS)).toBe(true)
  })

  it('BLOCKS Unit Alpha supervisor from accessing Unit Beta orders', () => {
    expect(isSupervisorAuthorizedForOrder(UNIT_ALPHA, ORDER_C1, UNIT_ALPHA_ORDERS)).toBe(false)
  })

  it('BLOCKS Unit Beta supervisor from accessing Unit Alpha orders', () => {
    expect(isSupervisorAuthorizedForOrder(UNIT_BETA, ORDER_B1, UNIT_BETA_ORDERS)).toBe(false)
  })

  it('allows Unit Beta supervisor to access Unit Beta orders', () => {
    expect(isSupervisorAuthorizedForOrder(UNIT_BETA, ORDER_C1, UNIT_BETA_ORDERS)).toBe(true)
  })

  it('blocks access with null unit ID', () => {
    expect(isSupervisorAuthorizedForOrder(null, ORDER_B1, UNIT_ALPHA_ORDERS)).toBe(false)
  })
})

describe('authorizePhotoAccess', () => {
  // ─── Merchandiser access ───────────────────────────────
  it('allows merchandiser to access any photo', () => {
    const result = authorizePhotoAccess(PHOTO_B1, {
      role: 'merchandiser',
      accessibleOrderIds: [],
    })
    expect(result.authorized).toBe(true)
    expect(result.orderId).toBe(ORDER_B1)
  })

  it('allows merchandiser to access Company C photos', () => {
    const result = authorizePhotoAccess(PHOTO_C1, {
      role: 'merchandiser',
      accessibleOrderIds: [],
    })
    expect(result.authorized).toBe(true)
  })

  // ─── Supervisor access ─────────────────────────────────
  it('allows supervisor to access photos for their unit orders', () => {
    const result = authorizePhotoAccess(PHOTO_B1, {
      role: 'supervisor',
      supervisorUnitId: UNIT_ALPHA,
      accessibleOrderIds: UNIT_ALPHA_ORDERS,
    })
    expect(result.authorized).toBe(true)
  })

  it('BLOCKS supervisor from accessing photos outside their unit', () => {
    const result = authorizePhotoAccess(PHOTO_C1, {
      role: 'supervisor',
      supervisorUnitId: UNIT_ALPHA,
      accessibleOrderIds: UNIT_ALPHA_ORDERS,
    })
    expect(result.authorized).toBe(false)
    expect(result.reason).toContain('does not belong')
  })

  // ─── Buyer access — the critical isolation test ────────
  it('allows Company B buyer to access Company B photos', () => {
    const result = authorizePhotoAccess(PHOTO_B1, {
      role: 'buyer',
      buyerId: BUYER_B_ID,
      accessibleOrderIds: BUYER_B_ORDERS,
    })
    expect(result.authorized).toBe(true)
    expect(result.orderId).toBe(ORDER_B1)
  })

  it('BLOCKS Company B buyer from accessing Company C photos', () => {
    const result = authorizePhotoAccess(PHOTO_C1, {
      role: 'buyer',
      buyerId: BUYER_B_ID,
      accessibleOrderIds: BUYER_B_ORDERS,
    })
    expect(result.authorized).toBe(false)
    expect(result.reason).toContain('does not belong to this buyer')
  })

  it('BLOCKS Company C buyer from accessing Company B photos', () => {
    const result = authorizePhotoAccess(PHOTO_B1, {
      role: 'buyer',
      buyerId: BUYER_C_ID,
      accessibleOrderIds: BUYER_C_ORDERS,
    })
    expect(result.authorized).toBe(false)
    expect(result.reason).toContain('does not belong to this buyer')
  })

  it('BLOCKS Company C buyer from accessing Company B photos (second order)', () => {
    const result = authorizePhotoAccess(PHOTO_B2, {
      role: 'buyer',
      buyerId: BUYER_C_ID,
      accessibleOrderIds: BUYER_C_ORDERS,
    })
    expect(result.authorized).toBe(false)
  })

  it('allows Company C buyer to access Company C photos', () => {
    const result = authorizePhotoAccess(PHOTO_C1, {
      role: 'buyer',
      buyerId: BUYER_C_ID,
      accessibleOrderIds: BUYER_C_ORDERS,
    })
    expect(result.authorized).toBe(true)
  })

  // ─── Edge cases ────────────────────────────────────────
  it('rejects invalid path format', () => {
    const result = authorizePhotoAccess('not-a-valid-path', {
      role: 'merchandiser',
      accessibleOrderIds: [],
    })
    expect(result.authorized).toBe(false)
  })

  it('allows legacy public URLs (backward compat)', () => {
    const result = authorizePhotoAccess('https://example.com/old-photo.jpg', {
      role: 'merchandiser',
      accessibleOrderIds: [],
    })
    expect(result.authorized).toBe(true)
  })

  it('allows legacy relative URLs (backward compat)', () => {
    const result = authorizePhotoAccess('/api/placeholder-photo', {
      role: 'buyer',
      buyerId: BUYER_B_ID,
      accessibleOrderIds: BUYER_B_ORDERS,
    })
    expect(result.authorized).toBe(true)
  })

  it('blocks buyer with empty accessibleOrderIds', () => {
    const result = authorizePhotoAccess(PHOTO_B1, {
      role: 'buyer',
      buyerId: BUYER_B_ID,
      accessibleOrderIds: [],
    })
    expect(result.authorized).toBe(false)
  })
})
