import Dexie, { type Table } from 'dexie'
import type { FollowUpTaskDraft, InspectionFormData } from '@/types/records'

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

  constructor() {
    super('hivecraic-local')
    this.version(1).stores({ inspectionDrafts: 'userId' })
    this.version(2).stores({ inspectionDrafts: 'userId', screenCache: 'key' })
  }
}

let db: LocalDb | null = null

/** Opened on first use, so nothing touches IndexedDB during server rendering. */
export function getLocalDb(): LocalDb {
  db ??= new LocalDb()
  return db
}
