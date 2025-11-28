// Custom React hook for handling offline data operations
// Provides easy-to-use interface for IndexedDB and sync queue

import { useState, useEffect, useCallback } from 'react'
import { offlineDB } from '@/lib/offline-db'
import { syncManager } from '@/lib/sync-manager'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export function useOfflineData<T extends { id: string; user_id: string }>(
  tableName: string,
  storeName: string
) {
  const { userId } = useAuth()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Fetch data from Supabase or IndexedDB
  const fetchData = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      if (navigator.onLine) {
        // Online: fetch from Supabase
        const { data: fetchedData, error: fetchError } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })

        if (fetchError) throw fetchError

        // Cache in IndexedDB
        if (fetchedData) {
          await offlineDB.putMany(storeName, fetchedData as T[])
          setData(fetchedData as T[])
        }
      } else {
        // Offline: fetch from IndexedDB
        const cachedData = await offlineDB.getAllByUserId<T>(storeName, userId)
        setData(cachedData)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')

      // Try to load from cache on error
      try {
        const cachedData = await offlineDB.getAllByUserId<T>(storeName, userId)
        setData(cachedData)
      } catch (cacheError) {
        console.error('Failed to load cached data:', cacheError)
      }
    } finally {
      setLoading(false)
    }
  }, [userId, tableName, storeName])

  // Create new record
  const create = useCallback(
    async (newData: Omit<T, 'id'>): Promise<T | null> => {
      if (!userId) return null

      const id = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const record = { ...newData, id, user_id: userId } as T

      try {
        if (navigator.onLine) {
          // Online: insert to Supabase
          const { data: insertedData, error: insertError } = await supabase
            .from(tableName)
            .insert(record)
            .select()
            .single()

          if (insertError) throw insertError

          // Cache locally
          await offlineDB.put(storeName, insertedData as T)
          setData((prev) => [insertedData as T, ...prev])

          return insertedData as T
        } else {
          // Offline: save to IndexedDB and queue for sync
          await offlineDB.put(storeName, record)
          await syncManager.queueAction('create', tableName, record, userId)

          setData((prev) => [record, ...prev])
          return record
        }
      } catch (err) {
        console.error('Error creating record:', err)
        setError(err instanceof Error ? err.message : 'Failed to create record')
        return null
      }
    },
    [userId, tableName, storeName]
  )

  // Update existing record
  const update = useCallback(
    async (id: string, updates: Partial<T>): Promise<boolean> => {
      if (!userId) return false

      try {
        if (navigator.onLine) {
          // Online: update in Supabase
          const { error: updateError } = await supabase
            .from(tableName)
            .update(updates)
            .eq('id', id)

          if (updateError) throw updateError

          // Update cache
          const existing = await offlineDB.get<T>(storeName, id)
          if (existing) {
            await offlineDB.put(storeName, { ...existing, ...updates })
          }

          setData((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
          )

          return true
        } else {
          // Offline: save to IndexedDB and queue for sync
          const existing = await offlineDB.get<T>(storeName, id)
          if (existing) {
            const updated = { ...existing, ...updates }
            await offlineDB.put(storeName, updated)
            await syncManager.queueAction('update', tableName, updated, userId)

            setData((prev) =>
              prev.map((item) => (item.id === id ? updated : item))
            )

            return true
          }

          return false
        }
      } catch (err) {
        console.error('Error updating record:', err)
        setError(err instanceof Error ? err.message : 'Failed to update record')
        return false
      }
    },
    [userId, tableName, storeName]
  )

  // Delete record
  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!userId) return false

      try {
        if (navigator.onLine) {
          // Online: delete from Supabase
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id)

          if (deleteError) throw deleteError

          // Remove from cache
          await offlineDB.delete(storeName, id)
          setData((prev) => prev.filter((item) => item.id !== id))

          return true
        } else {
          // Offline: mark as deleted and queue for sync
          await offlineDB.delete(storeName, id)
          await syncManager.queueAction('delete', tableName, { id }, userId)

          setData((prev) => prev.filter((item) => item.id !== id))
          return true
        }
      } catch (err) {
        console.error('Error deleting record:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete record')
        return false
      }
    },
    [userId, tableName, storeName]
  )

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      fetchData() // Refresh data when coming online
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [fetchData])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    isOnline,
    create,
    update,
    remove,
    refresh: fetchData,
  }
}
