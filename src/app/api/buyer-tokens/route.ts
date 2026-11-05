import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateSecureToken, hashToken } from '@/lib/token-utils'

const schema = z.object({
  buyer_id: z.string().uuid(),
  label: z.string().max(100).optional(),
  expires_days: z.number().positive().optional().default(90),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'merchandiser') {
      return NextResponse.json({ error: 'Only merchandisers can generate buyer links' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })

    const { buyer_id, label, expires_days } = parsed.data

    // Verify buyer exists
    const { data: buyer } = await supabase.from('buyers').select('id').eq('id', buyer_id).single()
    if (!buyer) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })

    // Generate cryptographically secure token
    const token = generateSecureToken()
    const tokenHash = await hashToken(token)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expires_days)

    const { error } = await supabase.from('buyer_access_tokens').insert({
      buyer_id,
      token_hash: tokenHash,
      label: label ?? null,
      expires_at: expiresAt.toISOString(),
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Return the plain token once (never stored, only the hash is stored)
    return NextResponse.json({ token }, { status: 201 })
  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
