'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Camera,
  Mic,
  MicOff,
  Send,
  AlertCircle,
  CheckCircle2,
  WifiOff,
  Wifi,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { generateId } from '@/lib/utils'
import { cn } from '@/lib/utils'

const PRODUCTION_STAGES = [
  { value: 'fabric_inhouse', label: 'Fabric In-house' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'stitching', label: 'Stitching' },
  { value: 'printing', label: 'Printing' },
  { value: 'washing', label: 'Washing' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'packing', label: 'Packing' },
  { value: 'final_inspection', label: 'Final Inspection' },
  { value: 'dispatch', label: 'Dispatch' },
]

const updateSchema = z.object({
  order_id: z.string().uuid('Select an order'),
  stage: z.string().min(1, 'Select production stage'),
  quantity_completed: z.number({ invalid_type_error: 'Enter a valid number' }).positive('Must be positive').int('Must be whole number'),
  issue_note: z.string().max(2000).optional(),
})
type UpdateValues = z.infer<typeof updateSchema>

interface OrderOption {
  id: string
  po_number: string
  style_name: string
  current_stage: string
  total_quantity: number
  completed_quantity: number
}

interface SupervisorUpdateFormProps {
  orders: OrderOption[]
  supervisorId: string
}

export function SupervisorUpdateForm({ orders, supervisorId }: SupervisorUpdateFormProps) {
  const [photos, setPhotos] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [tamilMode, setTamilMode] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const { isOnline, queueUpdate, pendingCount } = useOfflineQueue()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateValues>({
    resolver: zodResolver(updateSchema),
  })

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      toast.error('Microphone access denied')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const validFiles = files.filter((f) => {
      if (!f.type.startsWith('image/')) {
        toast.error(`${f.name} is not an image`)
        return false
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 10MB limit`)
        return false
      }
      return true
    })
    setPhotos((prev) => [...prev, ...validFiles].slice(0, 5))
  }

  async function onSubmit(data: UpdateValues) {
    const clientId = generateId()
    const today = new Date().toISOString().split('T')[0]

    const updatePayload = {
      client_id: clientId,
      order_id: data.order_id,
      supervisor_id: supervisorId,
      stage: data.stage,
      quantity_completed: data.quantity_completed,
      update_date: today,
      issue_note: data.issue_note ?? '',
      tamil_mode: tamilMode,
      has_audio: !!audioBlob,
    }

    if (!isOnline) {
      // Queue for offline sync
      await queueUpdate({
        ...updatePayload,
        photos: photos,
        audio: audioBlob ?? undefined,
      })
      toast.success('Update saved offline — will sync when connected')
      setSubmitted(true)
      reset()
      setPhotos([])
      setAudioBlob(null)
      return
    }

    try {
      // Upload photos if any
      const photoUrls: string[] = []
      for (const photo of photos) {
        const formData = new FormData()
        formData.append('file', photo)
        formData.append('order_id', data.order_id)
        const res = await fetch('/api/photos', {
          method: 'POST',
          body: formData,
        })
        if (res.ok) {
          const { url } = await res.json()
          photoUrls.push(url)
        }
      }

      // Upload audio and process AI if present
      let processedNote = data.issue_note ?? ''
      let englishNote = data.issue_note ?? ''
      if (audioBlob) {
        setAiProcessing(true)
        try {
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')
          formData.append('order_id', data.order_id)
          formData.append('tamil_mode', String(tamilMode))
          const aiRes = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData,
          })
          if (aiRes.ok) {
            const aiData = await aiRes.json()
            processedNote = aiData.originalNote ?? processedNote
            englishNote = aiData.englishTranslation ?? englishNote
          }
        } catch {
          toast.warning('Audio transcription failed — submitting text note only')
        } finally {
          setAiProcessing(false)
        }
      }

      // Process text note with AI if Tamil mode
      if (tamilMode && data.issue_note && !audioBlob) {
        setAiProcessing(true)
        try {
          const aiRes = await fetch('/api/ai/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              note: data.issue_note,
              order_id: data.order_id,
              tamil_mode: tamilMode,
            }),
          })
          if (aiRes.ok) {
            const aiData = await aiRes.json()
            englishNote = aiData.englishTranslation ?? englishNote
          }
        } catch {
          // AI failed, continue with original note
        } finally {
          setAiProcessing(false)
        }
      }

      // Submit update
      const res = await fetch('/api/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatePayload,
          photo_urls: photoUrls,
          issue_note_original: processedNote,
          issue_note_english: englishNote,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Submission failed')
      }

      toast.success('Update submitted successfully')
      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        reset()
        setPhotos([])
        setAudioBlob(null)
      }, 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit update')
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--green-bg)] border-2 border-emerald-200 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <p className="text-lg font-bold text-[var(--text-primary)]">Update Submitted!</p>
        <p className="text-sm text-[var(--text-muted)]">The production record has been saved.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg mx-auto space-y-4">
      {/* Connectivity indicator */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
        isOnline
          ? 'bg-[var(--green-bg)] text-emerald-700 border border-[var(--green-border)]'
          : 'bg-[var(--amber-bg)] text-amber-700 border border-[var(--amber-border)]'
      )}>
        {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <span className="font-medium">{isOnline ? 'Online' : 'Offline'}</span>
        {!isOnline && (
          <span className="text-xs ml-1">— updates will sync when reconnected</span>
        )}
        {pendingCount > 0 && (
          <span className="ml-auto text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Language toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTamilMode(false)}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border',
            !tamilMode
              ? 'bg-[var(--navy)] text-white border-[var(--navy)]'
              : 'bg-white text-[var(--text-secondary)] border-[var(--border)]'
          )}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setTamilMode(true)}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border',
            tamilMode
              ? 'bg-[var(--navy)] text-white border-[var(--navy)]'
              : 'bg-white text-[var(--text-secondary)] border-[var(--border)]'
          )}
        >
          தமிழ் (Tamil)
        </button>
      </div>

      {/* Order selection */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-base font-semibold">Order *</Label>
            <Select onValueChange={(v) => setValue('order_id', v)}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder={tamilMode ? 'ஆர்டர் தேர்ந்தெடு' : 'Select order'} />
              </SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    <div>
                      <span className="font-medium">{o.po_number}</span>
                      <span className="text-[var(--text-muted)] ml-2 text-xs">{o.style_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.order_id && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.order_id.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-base font-semibold">
              {tamilMode ? 'உற்பத்தி நிலை' : 'Production Stage'} *
            </Label>
            <Select onValueChange={(v) => setValue('stage', v)}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder={tamilMode ? 'நிலை தேர்ந்தெடு' : 'Select stage'} />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTION_STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.stage && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.stage.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quantity input — large touch target */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-base font-semibold">
            {tamilMode ? 'இன்று உற்பத்தி அளவு' : "Today's Quantity"} *
          </Label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            className={cn(
              'mt-2 w-full text-center text-4xl font-bold h-24 rounded-xl border-2 bg-white transition-colors outline-none',
              errors.quantity_completed
                ? 'border-red-300 text-red-600'
                : 'border-[var(--border)] focus:border-[var(--accent)] text-[var(--text-primary)]'
            )}
            {...register('quantity_completed', { valueAsNumber: true })}
          />
          <p className="text-center text-xs text-[var(--text-muted)] mt-1.5">pieces completed today</p>
          {errors.quantity_completed && (
            <p className="text-sm text-red-600 flex items-center justify-center gap-1 mt-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {errors.quantity_completed.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Photo capture */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-base font-semibold">
            {tamilMode ? 'படங்கள்' : 'Photographs'}{' '}
            <span className="text-xs font-normal text-[var(--text-muted)]">(optional)</span>
          </Label>
          <label className="mt-2 flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-[var(--border)] cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--bg-subtle)] transition-all">
            <Camera className="h-6 w-6 text-[var(--text-muted)] mb-1" />
            <span className="text-sm text-[var(--text-muted)]">
              {tamilMode ? 'படம் எடு / கோப்பு தேர்ந்தெடு' : 'Tap to take photo or select file'}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={handlePhotoCapture}
            />
          </label>
          {photos.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {photos.map((photo, i) => (
                <div key={i} className="relative">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Photo ${i + 1}`}
                    className="w-16 h-16 rounded-lg object-cover border border-[var(--border)]"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue note */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-base font-semibold">
            {tamilMode ? 'பிரச்சினை குறிப்பு' : 'Issue Note'}{' '}
            <span className="text-xs font-normal text-[var(--text-muted)]">(optional)</span>
          </Label>

          {/* Voice recording */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
                isRecording
                  ? 'bg-red-500 text-white border-red-500 animate-pulse'
                  : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]'
              )}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isRecording
                ? tamilMode ? 'நிறுத்து' : 'Stop Recording'
                : tamilMode ? 'குரல் பதிவு' : 'Record Voice'}
            </button>
            {audioBlob && !isRecording && (
              <span className="text-xs text-emerald-600 font-medium">✓ Voice note recorded</span>
            )}
          </div>

          <Textarea
            placeholder={
              tamilMode
                ? 'இன்றைய பிரச்சினைகளை தமிழிலோ ஆங்கிலத்திலோ எழுதுங்கள்...'
                : 'Describe any issues, delays, or quality concerns...'
            }
            className="min-h-[80px] text-base"
            {...register('issue_note')}
          />

          {tamilMode && (
            <p className="text-xs text-[var(--accent)] bg-[var(--accent-light)] px-3 py-2 rounded-lg">
              AI-powered: Tamil text will be automatically translated and categorised
            </p>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full h-14 text-lg font-bold"
        size="xl"
        loading={isSubmitting || aiProcessing}
      >
        <Send className="h-5 w-5" />
        {aiProcessing
          ? 'Processing with AI...'
          : isSubmitting
          ? tamilMode ? 'அனுப்புகிறது...' : 'Submitting...'
          : tamilMode ? 'அனுப்பு' : 'Send Update'}
      </Button>
    </form>
  )
}
