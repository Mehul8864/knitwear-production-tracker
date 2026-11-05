import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { authorizePhotoAccess, isStoragePath } from '@/lib/photo-auth'
import { hashToken } from '@/lib/token-utils'

const schema = z.object({
  path: z.string().min(1).max(500),
  token: z.string().min(1).max(128),
})

/**
 * POST /api/photos/buyer-signed-url
 *
 * Generates a short-lived signed URL for a production photo for a buyer
 * accessing the read-only portal via a secure token link.
 *
 * Authorization:
 * 1. The buyer token is hashed and looked up in buyer_access_tokens
 * 2. The token must not be revoked or expired
 * 3. The photo's order must belong to the buyer identified by the token
 * 4. A 60-second signed URL is generated using the anon key client
 *
 * No service role key is exposed to the client. The signed URL is
 * time-limited and scoped to the specific photo path.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 })
    }

    const { path, token } = parsed.data

    // 1. Validate buyer token
    const tokenHash = await hashToken(token)
    const { data: accessToken } = await supabase
      .from('buyer_access_tokens')
      .select('buyer_id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .single()

    if (!accessToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    // Check revocation
    if (accessToken.revoked_at) {
      return NextResponse.json({ error: 'Token revoked' }, { status: 403 })
    }

    // Check expiry
    if (accessToken.expires_at && new Date(accessToken.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 403 })
    }

    const buyerId = accessToken.buyer_id

    // 2. Handle legacy public URLs (backward compat)
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
      return NextResponse.json({ url: path })
    }

    // 3. Validate it's a storage path
    if (!isStoragePath(path)) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 })
    }

    // 4. Fetch all order IDs belonging to this buyer
    const { data: buyerOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('buyer_id', buyerId)

    const accessibleOrderIds = (buyerOrders ?? []).map((o) => o.id)

    // 5. Authorize — verify the photo belongs to one of the buyer's orders
    const authResult = authorizePhotoAccess(path, {
      role: 'buyer',
      buyerId,
      accessibleOrderIds,
    })

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Access denied — this photo does not belong to your orders' },
        { status: 403 }
      )
    }

    // 6. Generate signed URL (60 second expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('production-photos')
      .createSignedUrl(path, 60)

    if (signedUrlError || !signedUrlData) {
      console.error('Buyer signed URL error:', signedUrlError?.message)
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: signedUrlData.signedUrl, expiresIn: 60 })
  } catch (error) {
    console.error('Buyer signed URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
