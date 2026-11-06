'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SecurePhotoProps {
  /** Storage path (e.g. "production/{orderId}/{uuid}.jpg") or legacy URL */
  src: string
  alt: string
  className?: string
  wrapperClassName?: string
}

function isLegacyUrl(s: string) {
  return s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')
}

export function SecurePhoto({ src, alt, className, wrapperClassName }: SecurePhotoProps) {
  // Initialise url from src directly if it's already a public URL,
  // avoiding a synchronous setState inside the effect body.
  const [url, setUrl] = useState<string | null>(() => isLegacyUrl(src) ? src : null)
  const [loading, setLoading] = useState(() => !isLegacyUrl(src))
  const [error, setError] = useState(false)

  useEffect(() => {
    // Legacy URLs are already in state via the lazy initializer — nothing to do.
    if (isLegacyUrl(src)) return

    let cancelled = false

    async function fetchSignedUrl() {
      try {
        const res = await fetch('/api/photos/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: src }),
        })
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          setUrl(data.url)
        } else {
          setError(true)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSignedUrl()
    return () => { cancelled = true }
  }, [src])

  if (loading) {
    return (
      <div className={cn('animate-pulse rounded-lg bg-[var(--bg-subtle)]', className, wrapperClassName)} />
    )
  }

  if (error || !url) {
    return (
      <div className={cn('rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center', className, wrapperClassName)}>
        <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  {/* eslint-disable-next-line @next/next/no-img-element */}
  return <img src={url} alt={alt} className={cn(className, wrapperClassName)} />
}
