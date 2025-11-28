// IndexedDB wrapper for offline data storage
// Stores hive data, inspections, and pending sync operations

const DB_NAME = 'HiveCraicOfflineDB'
const DB_VERSION = 1

// Store names
export const STORES = {
  HIVES: 'hives',
  BATCHES: 'batches',
  QUEENS: 'queens',
  APIARIES: 'apiaries',
  INSPECTIONS: 'inspections',
  PENDING_SYNC: 'pending_sync',
} as const

export interface PendingSyncAction {
  id: string
  timestamp: number
  action: 'create' | 'update' | 'delete'
  table: string
  data: any
  userId: string
  synced: boolean
  error?: string
}

class OfflineDB {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db

    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('IndexedDB error:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB initialized successfully')
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores if they don't exist
        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' })

            // Add indexes for common queries
            if (storeName === STORES.PENDING_SYNC) {
              store.createIndex('timestamp', 'timestamp', { unique: false })
              store.createIndex('synced', 'synced', { unique: false })
              store.createIndex('userId', 'userId', { unique: false })
            } else {
              store.createIndex('user_id', 'user_id', { unique: false })
              store.createIndex('updated_at', 'updated_at', { unique: false })
            }
          }
        })

        console.log('IndexedDB schema upgraded to version', DB_VERSION)
      }
    })

    return this.initPromise
  }

  // Generic CRUD operations
  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllByUserId<T>(storeName: string, userId: string): Promise<T[]> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index('user_id')
      const request = index.getAll(userId)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async put<T extends { id: string }>(storeName: string, data: T): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async putMany<T extends { id: string }>(storeName: string, items: T[]): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)

      items.forEach(item => store.put(item))

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Pending sync operations
  async addPendingSync(action: Omit<PendingSyncAction, 'id' | 'timestamp' | 'synced'>): Promise<string> {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const pendingAction: PendingSyncAction = {
      id,
      timestamp: Date.now(),
      synced: false,
      ...action,
    }

    await this.put(STORES.PENDING_SYNC, pendingAction)
    console.log('Added pending sync action:', id, action)
    return id
  }

  async getPendingSyncs(userId: string): Promise<PendingSyncAction[]> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PENDING_SYNC, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index('userId')
      const request = index.getAll(userId)

      request.onsuccess = () => {
        const results = request.result.filter((item: PendingSyncAction) => !item.synced)
        resolve(results)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async markSynced(syncId: string): Promise<void> {
    const action = await this.get<PendingSyncAction>(STORES.PENDING_SYNC, syncId)
    if (action) {
      action.synced = true
      await this.put(STORES.PENDING_SYNC, action)
      console.log('Marked sync action as synced:', syncId)
    }
  }

  async markSyncFailed(syncId: string, error: string): Promise<void> {
    const action = await this.get<PendingSyncAction>(STORES.PENDING_SYNC, syncId)
    if (action) {
      action.error = error
      await this.put(STORES.PENDING_SYNC, action)
      console.error('Sync action failed:', syncId, error)
    }
  }

  async clearSyncedActions(): Promise<void> {
    const all = await this.getAll<PendingSyncAction>(STORES.PENDING_SYNC)
    const synced = all.filter(item => item.synced)

    for (const action of synced) {
      await this.delete(STORES.PENDING_SYNC, action.id)
    }

    console.log(`Cleared ${synced.length} synced actions`)
  }
}

// Export singleton instance
export const offlineDB = new OfflineDB()

// Initialize on module load
if (typeof window !== 'undefined') {
  offlineDB.init().catch(console.error)
}
