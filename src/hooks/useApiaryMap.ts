import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { getCurrentUserId } from '@/lib/auth'

export type EntranceDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

export interface MapHive {
  id: string
  hive_number: string
  status: string
  is_queenless: boolean
  queenless_reason: string | null
  map_x: number | null
  map_y: number | null
  entrance_direction: EntranceDirection | null
  queens?: {
    id: string
    queen_number: string
    marking_color?: string
  }[]
}

// Only the placement fields may be patched from the yard map.
export interface HivePlacementPatch {
  map_x?: number | null
  map_y?: number | null
  entrance_direction?: EntranceDirection | null
}

interface UseApiaryMapReturn {
  apiaryName: string | null
  hives: MapHive[]
  loading: boolean
  isOwner: boolean
  saveHivePlacement: (hiveId: string, patch: HivePlacementPatch) => Promise<void>
  reload: () => Promise<void>
}

export function useApiaryMap(apiaryId: string): UseApiaryMapReturn {
  const toast = useToast()
  const mountedRef = useRef(true)
  const userIdRef = useRef<string | null>(null)
  // Monotonic token so a slow reload can never overwrite a newer one's result.
  const loadSeqRef = useRef(0)
  // Mirrors the latest hives so a save can read the pre-change snapshot
  // synchronously, without depending on when React runs a state updater.
  const hivesRef = useRef<MapHive[]>([])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const [apiaryName, setApiaryName] = useState<string | null>(null)
  const [hives, setHives] = useState<MapHive[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  // Keep the snapshot ref current with rendered state.
  useEffect(() => { hivesRef.current = hives }, [hives])

  const reload = useCallback(async () => {
    if (!apiaryId) return
    const seq = ++loadSeqRef.current
    // Ignore results once a newer load has started or the component unmounted.
    const isCurrent = () => mountedRef.current && seq === loadSeqRef.current
    setLoading(true)
    try {
      const userId = userIdRef.current ?? (await getCurrentUserId())
      userIdRef.current = userId

      const [apiaryRes, hivesRes] = await Promise.all([
        supabase.from('apiaries').select('name, user_id').eq('id', apiaryId).single(),
        supabase
          .from('hives')
          .select('id, hive_number, status, is_queenless, queenless_reason, map_x, map_y, entrance_direction, queens(id, queen_number, marking_color)')
          .eq('apiary_id', apiaryId)
          .is('archived_at', null)
          .order('hive_number'),
      ])

      if (apiaryRes.error) throw apiaryRes.error
      if (hivesRes.error) throw hivesRes.error
      if (!isCurrent()) return

      setApiaryName(apiaryRes.data?.name ?? null)
      setIsOwner(!!userId && apiaryRes.data?.user_id === userId)
      setHives((hivesRes.data || []) as MapHive[])
    } catch (error) {
      console.error('Error loading apiary map:', error)
      if (isCurrent()) toast.error('Failed to load yard map')
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [apiaryId, toast])

  useEffect(() => {
    reload()
  }, [reload])

  const saveHivePlacement = useCallback(async (hiveId: string, patch: HivePlacementPatch) => {
    const userId = userIdRef.current
    if (!userId) {
      toast.error('You must be signed in to edit the yard map')
      return
    }

    // Snapshot the hive being changed (read synchronously from the ref) so we
    // can roll back on failure. Reading state here would be stale; reading it
    // from the setHives updater would not be available until React re-renders.
    const previous = hivesRef.current.find(h => h.id === hiveId)
    if (!previous) return // Unknown hive — nothing to persist.

    // Optimistically apply the change.
    setHives(prev => prev.map(h => (h.id === hiveId ? { ...h, ...patch } : h)))

    // Return the affected row so a silently blocked write (RLS denial, ownership
    // mismatch, row removed) is caught rather than left diverging from the DB.
    const { data, error } = await supabase
      .from('hives')
      .update(patch)
      .eq('id', hiveId)
      .eq('user_id', userId)
      .select('id')

    if (error || !data || data.length === 0) {
      console.error('Error saving hive placement:', error ?? 'no matching row updated')
      if (!mountedRef.current) return
      // Roll back to the exact prior values.
      setHives(prev => prev.map(h => (h.id === hiveId ? previous : h)))
      toast.error('Could not save hive position')
    }
  }, [toast])

  return { apiaryName, hives, loading, isOwner, saveHivePlacement, reload }
}
