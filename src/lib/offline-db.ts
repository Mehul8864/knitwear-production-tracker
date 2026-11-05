import Dexie, { type Table } from 'dexie'

export interface QueuedUpdate {
  id?: number
  client_id: string
  order_id: string
  supervisor_id: string
  stage: string
  quantity_completed: number
  update_date: string
  issue_note?: string
  tamil_mode?: boolean
  has_audio?: boolean
  photos?: Blob[]
  audio?: Blob
  queued_at: string
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  retry_count: number
  error_message?: string
}

export class OfflineQueueDB extends Dexie {
  updates!: Table<QueuedUpdate, number>

  constructor() {
    super('stitchops_offline')
    this.version(1).stores({
      updates: '++id, client_id, status, queued_at, order_id',
    })
  }

  async addToQueue(
    update: Omit<QueuedUpdate, 'id'>
  ): Promise<number> {
    // Check for duplicate client_id
    const existing = await this.updates
      .where('client_id')
      .equals(update.client_id)
      .first()
    if (existing) {
      return existing.id!
    }
    return this.updates.add(update as QueuedUpdate)
  }

  async getQueue(): Promise<QueuedUpdate[]> {
    return this.updates.orderBy('queued_at').toArray()
  }

  async updateStatus(
    id: number,
    status: QueuedUpdate['status'],
    errorMessage?: string
  ): Promise<void> {
    await this.updates.update(id, {
      status,
      ...(errorMessage ? { error_message: errorMessage } : {}),
      ...(status === 'failed' ? { retry_count: (await this.updates.get(id))!.retry_count + 1 } : {}),
    })
  }

  async clearSynced(): Promise<void> {
    await this.updates.where('status').equals('synced').delete()
  }
}
