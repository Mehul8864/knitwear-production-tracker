'use client'

import { useState, useEffect, useCallback } from 'react'
import { OfflineQueueDB, type QueuedUpdate } from '@/lib/offline-db'
import { toast } from 'sonner'

let db: OfflineQueueDB | null = null

function getDB(): OfflineQueueDB {
  if (!db) {
    db = new OfflineQueueDB()
  }
  return db
}

export function useOfflineQueue() {
  // Initialise from navigator.onLine directly to avoid a synchronous setState in useEffect
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== 'undefined' ? navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncPending()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load pending count on mount
    loadPendingCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadPendingCount() {
    try {
      const database = getDB()
      const pending = await database.getQueue()
      setPendingCount(pending.filter((u) => u.status === 'pending').length)
    } catch {
      // IndexedDB not available (SSR)
    }
  }

  async function syncPending() {
    if (syncing) return
    setSyncing(true)
    try {
      const database = getDB()
      const pending = await database.getQueue()
      const toSync = pending.filter((u) => u.status === 'pending')

      for (const item of toSync) {
        try {
          await database.updateStatus(item.id!, 'syncing')

          const formData = new FormData()
          // Append photos if any
          if (item.photos) {
            for (let i = 0; i < item.photos.length; i++) {
              formData.append('files', item.photos[i] as Blob)
            }
          }

          const res = await fetch('/api/updates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: item.client_id,
              order_id: item.order_id,
              supervisor_id: item.supervisor_id,
              stage: item.stage,
              quantity_completed: item.quantity_completed,
              update_date: item.update_date,
              issue_note_original: item.issue_note,
              issue_note_english: item.issue_note,
              photo_urls: [],
            }),
          })

          if (res.ok || res.status === 409) {
            // 409 = duplicate (already synced), still mark as done
            await database.updateStatus(item.id!, 'synced')
          } else {
            const err = await res.json()
            await database.updateStatus(item.id!, 'failed', err.error)
          }
        } catch (err) {
          await database.updateStatus(
            item.id!,
            'failed',
            err instanceof Error ? err.message : 'Network error'
          )
        }
      }

      await loadPendingCount()
      const synced = toSync.length
      if (synced > 0) {
        toast.success(`Synced ${synced} offline update${synced !== 1 ? 's' : ''}`)
      }
    } finally {
      setSyncing(false)
    }
  }

  const queueUpdate = useCallback(
    async (update: Omit<QueuedUpdate, 'id' | 'queued_at' | 'status' | 'retry_count'>) => {
      const database = getDB()
      await database.addToQueue({
        ...update,
        queued_at: new Date().toISOString(),
        status: 'pending',
        retry_count: 0,
      })
      await loadPendingCount()
    },
    []
  )

  return { isOnline, pendingCount, syncing, queueUpdate, syncPending }
}
