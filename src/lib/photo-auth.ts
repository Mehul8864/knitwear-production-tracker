/**
 * Photo Authorization Library
 *
 * Extracts order IDs from storage paths and validates that a user or buyer
 * is permitted to access a specific photo. All authorization checks are
 * server-side only — the client never receives the service role key.
 *
 * Storage path format: production/{orderId}/{uuid}.ext
 */

/**
 * Extracts the order UUID from a Supabase storage path.
 * Returns null if the path doesn't match the expected pattern.
 *
 * @example
 * extractOrderIdFromPath('production/order001-.../abc123.jpg')
 * // → 'order001-...'
 *
 * extractOrderIdFromPath('http://example.com/photo.jpg')
 * // → null
 */
export function extractOrderIdFromPath(path: string): string | null {
  if (!path || typeof path !== 'string') return null
  const match = path.match(/^production\/([^/]+)\//)
  return match ? match[1] : null
}

/**
 * Returns true if the string is a Supabase storage path (not a full URL).
 * Storage paths start with "production/" and don't start with "http".
 */
export function isStoragePath(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  return value.startsWith('production/') && !value.startsWith('http')
}

/**
 * Returns true if the string is a full HTTP URL or a relative URL path
 * (backward-compatible with legacy public URLs).
 */
export function isPublicUrl(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')
}

/**
 * Validates that a buyer is authorized to access photos for a given order.
 *
 * @param buyerId - The buyer ID from the validated access token
 * @param orderId - The order ID extracted from the photo path
 * @param buyerOrders - Array of order IDs that belong to this buyer
 * @returns true if the order belongs to the buyer
 */
export function isBuyerAuthorizedForOrder(
  buyerId: string,
  orderId: string,
  buyerOrders: string[]
): boolean {
  if (!buyerId || !orderId) return false
  return buyerOrders.includes(orderId)
}

/**
 * Validates that a supervisor is authorized to access photos for a given order.
 *
 * @param supervisorUnitId - The supervisor's assigned production unit ID
 * @param orderId - The order ID extracted from the photo path
 * @param unitOrders - Array of order IDs assigned to the supervisor's unit
 * @returns true if the order belongs to the supervisor's unit
 */
export function isSupervisorAuthorizedForOrder(
  supervisorUnitId: string | null | undefined,
  orderId: string,
  unitOrders: string[]
): boolean {
  if (!supervisorUnitId || !orderId) return false
  return unitOrders.includes(orderId)
}

/**
 * Result of a photo access authorization check.
 */
export interface PhotoAuthResult {
  authorized: boolean
  reason: string
  orderId: string | null
}

/**
 * Comprehensive authorization check for photo access.
 * Used by the signed URL API routes.
 *
 * @param path - The storage path from the photo_urls array
 * @param authContext - The requesting user/buyer context
 */
export function authorizePhotoAccess(
  path: string,
  authContext: {
    role: 'merchandiser' | 'supervisor' | 'buyer'
    buyerId?: string
    supervisorUnitId?: string | null
    accessibleOrderIds: string[]
  }
): PhotoAuthResult {
  // Legacy public URLs are always accessible (backward compat)
  if (isPublicUrl(path)) {
    return { authorized: true, reason: 'Legacy public URL', orderId: null }
  }

  // Must be a storage path
  if (!isStoragePath(path)) {
    return { authorized: false, reason: 'Invalid path format', orderId: null }
  }

  const orderId = extractOrderIdFromPath(path)
  if (!orderId) {
    return { authorized: false, reason: 'Could not extract order ID from path', orderId: null }
  }

  // Merchandisers can access all photos
  if (authContext.role === 'merchandiser') {
    return { authorized: true, reason: 'Merchandiser has full access', orderId }
  }

  // Supervisors can only access photos for orders in their unit
  if (authContext.role === 'supervisor') {
    if (isSupervisorAuthorizedForOrder(authContext.supervisorUnitId, orderId, authContext.accessibleOrderIds)) {
      return { authorized: true, reason: 'Order belongs to supervisor unit', orderId }
    }
    return { authorized: false, reason: 'Order does not belong to supervisor unit', orderId }
  }

  // Buyers can only access photos for their own orders
  if (authContext.role === 'buyer') {
    if (isBuyerAuthorizedForOrder(authContext.buyerId ?? '', orderId, authContext.accessibleOrderIds)) {
      return { authorized: true, reason: 'Order belongs to buyer', orderId }
    }
    return { authorized: false, reason: 'Order does not belong to this buyer', orderId }
  }

  return { authorized: false, reason: 'Unknown role', orderId }
}
