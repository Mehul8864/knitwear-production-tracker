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
  Languages,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { generateId } from '@/lib/utils'
import { cn } from '@/lib/utils'

const PRODUCTION_STAGES = [
  { value: 'fabric_inhouse', label: 'Fabric In-house' },
  { value: 'cutting',        label: 'Cutting' },
  { value: 'stitching',      label: 'Stitching' },
  { value: 'printing',       label: 'Printing' },
  { value: 'washing',        label: 'Washing' },
  { value: 'finishing',      label: 'Finishing' },
  { value: 'packing',        label: 'Packing' },
  { value: 'final_inspection', label: 'Final Inspection' },
  { value: 'dispatch',       label: 'Dispatch' },
]

const updateSchema = z.object({
  order_id:           z.string().uuid('Select an order'),
  stage:              z.string().min(1, 'Select production stage'),
  quantity_completed: z.number({ invalid_type_error: 'Enter a valid number' }).positive('Must be positive').int('Must be a whole number'),
  issue_note:         z.string().max(2000).optional(),
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isOnline, queueUpdate, pendingCount } = useOfflineQueue()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateValues>({ resolver: zodResolver(updateSchema) })

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
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
    const valid = files.filter(f => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} is not an image`); return false }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} exceeds 10MB`); return false }
      return true
    })
    setPhotos(prev => [...prev, ...valid].slice(0, 5))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onSubmit(data: UpdateValues) {
    const clientId = generateId()
    const today = new Date().toISOString().split('T')[0]
    const payload = {
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
      await queueUpdate({ ...payload, photos, audio: audioBlob ?? undefined })
      toast.success('Saved offline — will sync when connected')
      setSubmitted(true)
      reset(); setPhotos([]); setAudioBlob(null)
      return
    }

    try {
      const photoUrls: string[] = []
      for (const photo of photos) {
        const fd = new FormData()
        fd.append('file', photo)
        fd.append('order_id', data.order_id)
        const r = await fetch('/api/photos', { method: 'POST', body: fd })
        if (r.ok) { const { url } = await r.json(); photoUrls.push(url) }
      }

      let processedNote = data.issue_note ?? ''
      let englishNote = data.issue_note ?? ''

      if (audioBlob) {
        setAiProcessing(true)
        try {
          const fd = new FormData()
          fd.append('audio', audioBlob, 'recording.webm')
          fd.append('order_id', data.order_id)
          fd.append('tamil_mode', String(tamilMode))
          const r = await fetch('/api/ai/transcribe', { method: 'POST', body: fd })
          if (r.ok) { const d = await r.json(); processedNote = d.originalNote ?? processedNote; englishNote = d.englishTranslation ?? englishNote }
        } catch { toast.warning('Audio transcription failed — submitting text note') }
        finally { setAiProcessing(false) }
      } else if (tamilMode && data.issue_note) {
        setAiProcessing(true)
        try {
          const r = await fetch('/api/ai/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: data.issue_note, order_id: data.order_id, tamil_mode: tamilMode }),
          })
          if (r.ok) { const d = await r.json(); englishNote = d.englishTranslation ?? englishNote }
        } catch {}
        finally { setAiProcessing(false) }
      }

      const res = await fetch('/api/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          photo_urls: photoUrls,
          issue_note_original: processedNote,
          issue_note_english: englishNote,
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Submission failed') }

      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        reset(); setPhotos([]); setAudioBlob(null)
      }, 2500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit update')
    }
  }

  /* ─── Success state ─── */
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'var(--green-bg)', border: '2px solid var(--green-border)' }}
        >
          <CheckCircle2 className="h-8 w-8" style={{ color: 'var(--green)' }} />
        </div>
        <p className="text-[18px] font-bold" style={{ color: 'var(--text-primary)' }}>Update submitted!</p>
        <p className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>The production record has been saved.</p>
      </div>
    )
  }

  /* ─── Main form ─── */
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg mx-auto space-y-3.5" noValidate>
      {/* Connectivity indicator */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium"
        style={{
          background: isOnline ? 'var(--green-bg)' : 'var(--amber-bg)',
          border: `1px solid ${isOnline ? 'var(--green-border)' : 'var(--amber-border)'}`,
          color: isOnline ? 'var(--green-text)' : 'var(--amber-text)',
        }}
      >
        {isOnline ? <Wifi className="h-4 w-4 shrink-0" /> : <WifiOff className="h-4 w-4 shrink-0" />}
        <span>{isOnline ? 'Online' : 'Offline — updates queued'}</span>
        {pendingCount > 0 && (
          <span
            className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--amber-light)', color: 'white' }}
          >
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Language toggle */}
      <div
        className="flex rounded-[var(--radius-md)] overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {['English', 'தமிழ்'].map((lang, i) => {
          const isTamil = i === 1
          const active = isTamil === tamilMode
          return (
            <button
              key={lang}
              type="button"
              onClick={() => setTamilMode(isTamil)}
              className="flex-1 py-2.5 text-[13.5px] font-medium flex items-center justify-center gap-2 transition-all duration-150"
              style={{
                background: active ? 'var(--navy)' : 'white',
                color: active ? 'white' : 'var(--text-secondary)',
              }}
            >
              <Languages className="h-4 w-4 shrink-0" />
              {lang}
            </button>
          )
        })}
      </div>

      {/* Order and stage */}
      <div
        className="bg-white rounded-[var(--radius-lg)] border border-[var(--border)] p-4 space-y-3.5"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="space-y-1.5">
          <Label className="text-[14px] font-semibold">{tamilMode ? 'ஆர்டர் *' : 'Order *'}</Label>
          <Select onValueChange={v => setValue('order_id', v)}>
            <SelectTrigger className="h-11 text-[14px]">
              <SelectValue placeholder={tamilMode ? 'ஆர்டர் தேர்ந்தெடு' : 'Select order'} />
            </SelectTrigger>
            <SelectContent>
              {orders.map(o => (
                <SelectItem key={o.id} value={o.id}>
                  <span className="font-semibold">{o.po_number}</span>
                  <span className="ml-2 text-[var(--text-muted)] text-[12px]">{o.style_name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.order_id && (
            <p className="text-[12px] flex items-center gap-1" style={{ color: 'var(--red)' }}>
              <AlertCircle className="h-3 w-3" />{errors.order_id.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-[14px] font-semibold">{tamilMode ? 'உற்பத்தி நிலை *' : 'Production Stage *'}</Label>
          <Select onValueChange={v => setValue('stage', v)}>
            <SelectTrigger className="h-11 text-[14px]">
              <SelectValue placeholder={tamilMode ? 'நிலை தேர்ந்தெடு' : 'Select stage'} />
            </SelectTrigger>
            <SelectContent>
              {PRODUCTION_STAGES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.stage && (
            <p className="text-[12px] flex items-center gap-1" style={{ color: 'var(--red)' }}>
              <AlertCircle className="h-3 w-3" />{errors.stage.message}
            </p>
          )}
        </div>
      </div>

      {/* Quantity — large touch target */}
      <div
        className="bg-white rounded-[var(--radius-lg)] border border-[var(--border)] p-4"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <Label className="text-[14px] font-semibold block mb-3">
          {tamilMode ? 'இன்று உற்பத்தி *' : "Today's Quantity *"}
        </Label>
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="0"
          className={cn(
            'w-full text-center text-[48px] font-bold h-[90px] rounded-[var(--radius-md)] border-2 outline-none transition-colors',
            'bg-white',
            errors.quantity_completed
              ? 'border-[var(--red)] text-[var(--red-text)]'
              : 'border-[var(--border)] focus:border-[var(--accent)] text-[var(--text-primary)]'
          )}
          {...register('quantity_completed', { valueAsNumber: true })}
          aria-label="Quantity completed today"
        />
        <p className="text-center text-[12px] mt-2" style={{ color: 'var(--text-muted)' }}>
          pieces completed today
        </p>
        {errors.quantity_completed && (
          <p className="text-[12px] flex items-center justify-center gap-1 mt-1.5" style={{ color: 'var(--red)' }}>
            <AlertCircle className="h-3 w-3" />{errors.quantity_completed.message}
          </p>
        )}
      </div>

      {/* Photo upload */}
      <div
        className="bg-white rounded-[var(--radius-lg)] border border-[var(--border)] p-4"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <Label className="text-[14px] font-semibold block mb-3">
          {tamilMode ? 'படங்கள்' : 'Photos'}{' '}
          <span className="font-normal text-[12px]" style={{ color: 'var(--text-muted)' }}>optional</span>
        </Label>
        <label
          className="flex flex-col items-center justify-center w-full h-20 rounded-[var(--radius-md)] cursor-pointer transition-all duration-150"
          style={{
            border: '2px dashed var(--border)',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <Camera className="h-5 w-5 mb-1" />
          <span className="text-[13px]">{tamilMode ? 'படம் எடு / கோப்பு' : 'Tap to capture or select'}</span>
          <input
            ref={fileInputRef}
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
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Photo ${i + 1}`}
                  className="w-16 h-16 rounded-[var(--radius-md)] object-cover border border-[var(--border)]"
                />
                <button
                  type="button"
                  onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]"
                  style={{ background: 'var(--red)' }}
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issue note */}
      <div
        className="bg-white rounded-[var(--radius-lg)] border border-[var(--border)] p-4 space-y-3"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <Label className="text-[14px] font-semibold block">
          {tamilMode ? 'பிரச்சினை குறிப்பு' : 'Issue Note'}{' '}
          <span className="font-normal text-[12px]" style={{ color: 'var(--text-muted)' }}>optional</span>
        </Label>

        {/* Voice recording */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={cn(
            'flex items-center gap-2.5 px-4 py-2.5 rounded-[var(--radius-md)] text-[13.5px] font-medium w-full justify-center transition-all duration-150 border',
            isRecording ? 'animate-pulse-dot' : ''
          )}
          style={{
            background: isRecording ? 'var(--red-bg)' : 'var(--bg-subtle)',
            border: `1px solid ${isRecording ? 'var(--red-border)' : 'var(--border)'}`,
            color: isRecording ? 'var(--red-text)' : 'var(--text-secondary)',
          }}
        >
          {isRecording ? <MicOff className="h-4 w-4 shrink-0" /> : <Mic className="h-4 w-4 shrink-0" />}
          {isRecording
            ? (tamilMode ? 'நிறுத்து' : 'Stop Recording')
            : (tamilMode ? 'குரல் பதிவு' : 'Record Voice Note')}
          {audioBlob && !isRecording && (
            <CheckCircle2 className="h-4 w-4 ml-auto shrink-0" style={{ color: 'var(--green)' }} />
          )}
        </button>

        <Textarea
          placeholder={
            tamilMode
              ? 'பிரச்சினைகளை தமிழிலோ ஆங்கிலத்திலோ எழுதுங்கள்…'
              : 'Describe any issues, delays, or quality concerns…'
          }
          className="min-h-[80px] text-[14px]"
          {...register('issue_note')}
        />

        {tamilMode && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-[12px]"
            style={{ background: 'var(--accent-light)', color: 'var(--accent-dark)' }}
          >
            <Languages className="h-3.5 w-3.5 shrink-0" />
            Tamil text will be automatically translated and categorised
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full h-[54px] text-[16px] font-semibold gap-3"
        loading={isSubmitting || aiProcessing}
      >
        <Send className="h-5 w-5 shrink-0" />
        {aiProcessing ? 'Processing with AI…'
          : isSubmitting ? (tamilMode ? 'அனுப்புகிறது…' : 'Submitting…')
          : (tamilMode ? 'அனுப்பு' : 'Send Update')}
      </Button>
    </form>
  )
}
