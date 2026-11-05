import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const orderId = formData.get('order_id') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` }, { status: 400 })
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 })
    }

    // Sanitise filename
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const sanitisedName = `${crypto.randomUUID()}.${ext}`
    const path = `production/${orderId ?? 'general'}/${sanitisedName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('production-photos')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      // Storage not configured — return placeholder
      console.error('Storage upload error:', uploadError.message)
      return NextResponse.json({
        url: `/api/placeholder-photo`,
        path,
        warning: 'Storage not configured — photo not saved',
      })
    }

    // Return the STORAGE PATH (not a public URL).
    // The frontend will request a signed URL via /api/photos/signed-url.
    // This ensures the private bucket is never exposed via public URLs.
    return NextResponse.json({ path, url: path }, { status: 201 })
  } catch (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
