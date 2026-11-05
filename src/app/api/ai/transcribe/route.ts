import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'AI_NOT_CONFIGURED',
        message: 'OpenAI API key not configured.',
        requiresManualReview: true,
      }, { status: 200 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const tamilMode = formData.get('tamil_mode') === 'true'

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Validate file size (25MB Whisper limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 })
    }

    const whisperModel = process.env.WHISPER_MODEL ?? 'whisper-1'
    const openai = new OpenAI({ apiKey })

    let transcription: string
    try {
      const transcript = await openai.audio.transcriptions.create({
        file: audioFile,
        model: whisperModel,
        language: tamilMode ? 'ta' : undefined,
        response_format: 'text',
      })
      transcription = typeof transcript === 'string' ? transcript : String(transcript)
    } catch (whisperError) {
      console.error('Whisper error:', whisperError)
      return NextResponse.json({
        error: 'TRANSCRIPTION_FAILED',
        message: 'Voice transcription failed. Please type your note instead.',
        requiresManualReview: true,
      }, { status: 200 })
    }

    // Now classify the transcribed text
    const classifyRes = await fetch(`${request.nextUrl.origin}/api/ai/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') ?? '',
      },
      body: JSON.stringify({
        note: transcription,
        order_id: formData.get('order_id'),
        tamil_mode: tamilMode,
      }),
    })

    const classification = await classifyRes.json()

    return NextResponse.json({
      ...classification,
      transcription,
    })
  } catch (error) {
    console.error('Transcribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
