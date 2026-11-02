import Dexie, { type Table } from 'dexie'
import type { FollowUpTaskDraft, InspectionFormData } from '@/types/records'
import type { QueuedInspection } from './inspection-outbox'

export interface InspectionDraftContent {
  formData: InspectionFormData
  givenTakenDrafts: Record<string, string>
  followUpDrafts: FollowUpTaskDraft[]
  formApiaryId: string
  step: number
  photos: File[]
}

export interface InspectionDraft extends InspectionDraftContent {
  userId: string
  savedAt: number
}

export interface ScreenCacheRow {
  key: string
  build: string
  savedAt: number
  data: unknown
}

class LocalDb extends Dexie {
  inspectionDrafts!: Table<InspectionDraft, string>
  screenCache!: Table<ScreenCacheRow, string>
  inspectionOutbox!: Table<QueuedInspection, string>

  constructor() {
    super('hivecraic-local')
    this.version(1).stores({ inspectionDrafts: 'userId' })
    this.version(2).stores({ inspectionDrafts: 'userId', screenCache: 'key' })
    this.version(3).stores({ inspectionDrafts: 'userId', screenCache: 'key', inspectionOutbox: 'id, userId' })
  }
}

let db: LocalDb | null = null

/** Opened on first use, so nothing touches IndexedDB during server rendering. */
export function getLocalDb(): LocalDb {
  db ??= new LocalDb()
  return db
}
