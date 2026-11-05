'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface BuyerSecurePhotoProps {
  /** Storage path (e.g. "production/{orderId}/{uuid}.jpg") or legacy URL */
  src: string
  /** The buyer access token from the URL */
  token: string
  alt: string
  className?: string
  wrapperClassName?: string
}

/**
 * Client component that fetches a time-limited signed URL for a
 * production photo displayed in the buyer read-only portal.
 *
 * The buyer token is validated server-side on every request, and
 * the photo's order ownership is verified before the signed URL is
 * generated. This ensures Company B cannot access Company C's photos.
 */
export function BuyerSecurePhoto({ src, token, alt, className, wrapperClassName }: BuyerSecurePhotoProps) {
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
        const res = await fetch('/api/photos/buyer-signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: src, token }),
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
  }, [src, token])

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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
    )
  }

  return <img src={url} alt={alt} className={cn(className, wrapperClassName)} />
}
