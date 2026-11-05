import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  category: z.enum([
    'MATERIAL_SHORTAGE', 'MACHINE_BREAKDOWN', 'LABOUR_SHORTAGE',
    'QUALITY_REWORK', 'PRINTING_DELAY', 'WASHING_DELAY',
    'POWER_OUTAGE', 'SUBCONTRACTOR_DELAY', 'OTHER',
  ]),
})

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'merchandiser') {
      return NextResponse.json({ error: 'Only merchandisers can correct AI categories' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })

    const { error } = await supabase
      .from('production_updates')
      .update({
        ai_corrected_category: parsed.data.category,
        ai_corrected_by: user.id,
        ai_needs_review: false,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
