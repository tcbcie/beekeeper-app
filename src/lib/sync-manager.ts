// Sync Manager for handling offline/online data synchronization
// Manages pending actions and syncs them when connection is restored

import { supabase } from './supabase'
import { offlineDB, PendingSyncAction } from './offline-db'

export class SyncManager {
  private syncInProgress = false
  private syncCallbacks: Array<(success: boolean) => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for online event
      window.addEventListener('online', () => {
        console.log('Connection restored - triggering sync')
        this.syncPendingActions()
      })

      // Register background sync if supported
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(() => {
          console.log('Background Sync API supported')
        })
      }
    }
  }

  // Queue an action for later sync
  async queueAction(
    action: 'create' | 'update' | 'delete',
    table: string,
    data: Record<string, unknown>,
    userId: string
  ): Promise<string> {
    const syncId = await offlineDB.addPendingSync({
      action,
      table,
      data,
      userId,
    })

    // Try to register background sync
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        // Type assertion needed for Background Sync API
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-data')
        console.log('Background sync registered for:', syncId)
      } catch (error) {
        console.warn('Background sync registration failed:', error)
      }
    }

    // If online, try to sync immediately
    if (navigator.onLine) {
      setTimeout(() => this.syncPendingActions(), 100)
    }

    return syncId
  }

  // Sync all pending actions
  async syncPendingActions(): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping')
      return { success: 0, failed: 0 }
    }

    if (!navigator.onLine) {
      console.log('Offline - cannot sync')
      return { success: 0, failed: 0 }
    }

    this.syncInProgress = true
    console.log('Starting sync of pending actions...')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        console.warn('No active session - cannot sync')
        return { success: 0, failed: 0 }
      }

      const userId = session.user.id
      const pendingActions = await offlineDB.getPendingSyncs(userId)

      console.log(`Found ${pendingActions.length} pending actions to sync`)

      let successCount = 0
      let failedCount = 0

      // Sort by timestamp to maintain order
      const sortedActions = pendingActions.sort((a, b) => a.timestamp - b.timestamp)

      for (const action of sortedActions) {
        try {
          await this.executeSyncAction(action)
          await offlineDB.markSynced(action.id)
          successCount++
        } catch (error) {
          console.error('Failed to sync action:', action.id, error)
          await offlineDB.markSyncFailed(action.id, error instanceof Error ? error.message : 'Unknown error')
          failedCount++
        }
      }

      // Clean up synced actions
      await offlineDB.clearSyncedActions()

      console.log(`Sync complete: ${successCount} succeeded, ${failedCount} failed`)

      // Notify callbacks
      this.syncCallbacks.forEach(cb => cb(failedCount === 0))

      return { success: successCount, failed: failedCount }
    } finally {
      this.syncInProgress = false
    }
  }

  // Execute a single sync action
  private async executeSyncAction(action: PendingSyncAction): Promise<void> {
    console.log('Executing sync action:', action.id, action.action, action.table)

    const table = supabase.from(action.table)

    switch (action.action) {
      case 'create':
        const { error: createError } = await table.insert(action.data)
        if (createError) throw createError
        break

      case 'update':
        const { id, ...updateData } = action.data
        const { error: updateError } = await table.update(updateData).eq('id', id)
        if (updateError) throw updateError
        break

      case 'delete':
        const { error: deleteError } = await table.delete().eq('id', action.data.id)
        if (deleteError) throw deleteError
        break

      default:
        throw new Error(`Unknown action type: ${action.action}`)
    }

    console.log('Successfully synced action:', action.id)
  }

  // Add callback for sync completion
  onSyncComplete(callback: (success: boolean) => void): () => void {
    this.syncCallbacks.push(callback)

    // Return unsubscribe function
    return () => {
      const index = this.syncCallbacks.indexOf(callback)
      if (index > -1) {
        this.syncCallbacks.splice(index, 1)
      }
    }
  }

  // Check if there are pending syncs
  async hasPendingSyncs(userId: string): Promise<number> {
    const pending = await offlineDB.getPendingSyncs(userId)
    return pending.length
  }

  // Get pending sync count
  async getPendingSyncCount(userId: string): Promise<number> {
    return this.hasPendingSyncs(userId)
  }
}

// Export singleton instance
export const syncManager = new SyncManager()
