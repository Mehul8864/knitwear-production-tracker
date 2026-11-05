import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { authorizePhotoAccess, isStoragePath } from '@/lib/photo-auth'

const schema = z.object({
  path: z.string().min(1).max(500),
})

/**
 * POST /api/photos/signed-url
 *
 * Generates a short-lived signed URL for a production photo stored
 * in the private `production-photos` Supabase Storage bucket.
 *
 * Authorization:
 * - Merchandisers: full access to all photos
 * - Supervisors: only photos for orders in their assigned production unit
 * - Buyers: NOT allowed (use /api/photos/buyer-signed-url instead)
 *
 * The signed URL expires after 60 seconds for security.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate input
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 })
    }

    const { path } = parsed.data

    // 3. Get user profile and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, production_unit_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    // Buyers must use the buyer-specific endpoint
    if (profile.role === 'buyer') {
      return NextResponse.json(
        { error: 'Buyers must use the buyer-specific signed URL endpoint' },
        { status: 403 }
      )
    }

    // 4. Check if this is a legacy public URL (backward compat)
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
      return NextResponse.json({ url: path })
    }

    // 5. Validate it's a storage path
    if (!isStoragePath(path)) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 })
    }

    // 6. For supervisors, verify the photo belongs to an order in their unit
    let accessibleOrderIds: string[] = []
    if (profile.role === 'supervisor' && profile.production_unit_id) {
      const { data: unitOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('production_unit_id', profile.production_unit_id)
      accessibleOrderIds = (unitOrders ?? []).map((o) => o.id)
    }

    // 7. Authorize access
    const authResult = authorizePhotoAccess(path, {
      role: profile.role,
      supervisorUnitId: profile.production_unit_id,
      accessibleOrderIds,
    })

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Access denied', reason: authResult.reason },
        { status: 403 }
      )
    }

    // 8. Generate signed URL (60 second expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('production-photos')
      .createSignedUrl(path, 60)

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError?.message)
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: signedUrlData.signedUrl, expiresIn: 60 })
  } catch (error) {
    console.error('Signed URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
