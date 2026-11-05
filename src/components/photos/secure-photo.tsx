'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SecurePhotoProps {
  /** Storage path (e.g. "production/{orderId}/{uuid}.jpg") or legacy URL */
  src: string
  alt: string
  className?: string
  /** Wrapper className for the loading/error state */
  wrapperClassName?: string
}

/**
 * Client component that fetches a time-limited signed URL from the
 * server before rendering an <img>. Used by authenticated users
 * (merchandisers and supervisors) viewing production photos stored
 * in the private Supabase Storage bucket.
 *
 * For buyer portal photos, use BuyerSecurePhoto instead.
 */
export function SecurePhoto({ src, alt, className, wrapperClassName }: SecurePhotoProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Legacy public URLs are rendered directly
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
      setUrl(src)
      setLoading(false)
      return
    }

    async function fetchSignedUrl() {
      try {
        const res = await fetch('/api/photos/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: src }),
        })
        if (res.ok) {
          const data = await res.json()
          setUrl(data.url)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchSignedUrl()
  }, [src])

  if (loading) {
    return (
      <div
        className={cn(
          'animate-pulse rounded-lg bg-[var(--bg-subtle)]',
          className,
          wrapperClassName
        )}
      />
    )
  }

  if (error || !url) {
    return (
      <div
        className={cn(
          'rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center',
          className,
          wrapperClassName
        )}
      >
        <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  return <img src={url} alt={alt} className={cn(className, wrapperClassName)} />
}
