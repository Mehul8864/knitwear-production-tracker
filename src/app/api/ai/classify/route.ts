import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const AI_CATEGORIES = [
  'MATERIAL_SHORTAGE',
  'MACHINE_BREAKDOWN',
  'LABOUR_SHORTAGE',
  'QUALITY_REWORK',
  'PRINTING_DELAY',
  'WASHING_DELAY',
  'POWER_OUTAGE',
  'SUBCONTRACTOR_DELAY',
  'OTHER',
] as const

const classifySchema = z.object({
  note: z.string().min(1).max(2000),
  order_id: z.string().uuid().optional(),
  tamil_mode: z.boolean().optional().default(false),
})

const aiResponseSchema = z.object({
  originalNote: z.string(),
  englishTranslation: z.string(),
  reasonCategory: z.enum(AI_CATEGORIES),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = classifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 })
    }

    const { note, tamil_mode } = parsed.data

    // Check AI configuration
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'AI_NOT_CONFIGURED',
        message: 'OpenAI API key not configured. Manual category selection required.',
        requiresManualReview: true,
        originalNote: note,
        englishTranslation: note,
      }, { status: 200 })
    }

    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

    const openai = new OpenAI({ apiKey })

    const systemPrompt = `You are a production issue classifier for a knitwear manufacturing facility in Tiruppur, India.
Your task is to analyse production update notes (which may be in Tamil or English) and:
1. Translate to English if needed
2. Classify the issue into exactly one category
3. Provide a confidence score

Available categories:
- MATERIAL_SHORTAGE: Raw materials, fabric, thread, buttons, or accessories not available
- MACHINE_BREAKDOWN: Sewing machines, cutting machines, or other equipment failure
- LABOUR_SHORTAGE: Workers absent, insufficient staff, labour disputes
- QUALITY_REWORK: Items rejected and need rework, quality issues
- PRINTING_DELAY: Screen printing, sublimation, or embroidery delays
- WASHING_DELAY: Stone wash, enzyme wash, or other finishing delays
- POWER_OUTAGE: Electricity failure, load shedding
- SUBCONTRACTOR_DELAY: Third-party unit delayed
- OTHER: Cannot be classified into the above categories

Respond with valid JSON only, no other text.`

    const userPrompt = `Analyse this production note${tamil_mode ? ' (may be in Tamil)' : ''}:
"${note}"

Return JSON with this exact structure:
{
  "originalNote": "<original note text>",
  "englishTranslation": "<English translation or original if already English>",
  "reasonCategory": "<one of the categories above>",
  "confidence": <0.0 to 1.0>,
  "needsReview": <true if confidence < 0.75>
}`

    let aiResponse
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 500,
      })

      const content = completion.choices[0]?.message?.content
      if (!content) throw new Error('Empty AI response')

      const parsed = JSON.parse(content)
      aiResponse = aiResponseSchema.parse(parsed)

      // needsReview based on confidence
      if (aiResponse.confidence < 0.75) {
        aiResponse = { ...aiResponse, needsReview: true }
      }
    } catch (aiError) {
      console.error('AI classification error:', aiError)
      return NextResponse.json({
        error: 'AI_ERROR',
        message: 'AI classification failed. Please select category manually.',
        requiresManualReview: true,
        originalNote: note,
        englishTranslation: note,
      }, { status: 200 })
    }

    // Store AI classification result
    if (parsed.data.order_id) {
      await supabase.from('ai_classifications').insert({
        order_id: parsed.data.order_id,
        original_note: aiResponse.originalNote,
        english_translation: aiResponse.englishTranslation,
        reason_category: aiResponse.reasonCategory,
        confidence: aiResponse.confidence,
        needs_review: aiResponse.needsReview,
        model_used: model,
      }).select().single()
    }

    return NextResponse.json(aiResponse)
  } catch (error) {
    console.error('AI classify route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
