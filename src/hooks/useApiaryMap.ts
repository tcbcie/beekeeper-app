import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { getCurrentUserId } from '@/lib/auth'
import { slotPositionPct } from '@/lib/yard-geometry'
import type { HiveConfiguration } from '@/types/hive'

/** Normalise any angle to [0, 360). */
export const normaliseDeg = (deg: number) => ((deg % 360) + 360) % 360

export interface MapQueen {
  id: string
  queen_number: string
  marking_color?: string
  /** Free-text mating site/station name (denormalised snapshot). */
  mating_station?: string | null
  /** Postcode of the mating location. */
  mated_at_eircode?: string | null
  /** Text snapshot of the breeder's mother for distributed queens (no local FK). */
  distributed_mother_queen?: string | null
  mother_id?: string | null
  /**
   * Resolved by a second batched lookup on mother_id (the useQueenDetail
   * pattern) — an embedded queens→queens self-join is directionally ambiguous
   * in PostgREST and could return daughters instead of the mother.
   */
  mother?: { id: string; queen_number: string } | null
}

export interface MapHive {
  id: string
  hive_number: string
  status: string
  is_queenless: boolean
  queenless_reason: string | null
  map_x: number | null
  map_y: number | null
  /** Body rotation, degrees clockwise from canvas-up (entrance = front face). */
  rotation_deg: number | null
  /** Bench the hive stands on (NULL = on the ground). */
  bench_id: string | null
  bench_slot: number | null
  // Physical box stack, used by the 3D view to build the hive model.
  configuration: HiveConfiguration | null
  queens?: MapQueen[]
}

/**
 * One-line lineage summary for map labels/inspectors:
 * "Mother: RZ018 · Mated: @ Glenview (D02X285)". Unknown parts are omitted;
 * returns null when nothing is known. Mother comes from the mother_id FK,
 * falling back to the distributed snapshot — the same rule as the queen
 * detail page.
 */
export function queenLineageParts(queen: MapQueen | undefined): string[] {
  if (!queen) return []
  const mother = queen.mother?.queen_number || queen.distributed_mother_queen || null

  const station = queen.mating_station?.trim() || null
  const eircode = queen.mated_at_eircode?.trim() || null
  const mated = station
    ? `@ ${station}${eircode ? ` (${eircode})` : ''}`
    : eircode

  const parts: string[] = []
  if (mother) parts.push(`Mother: ${mother}`)
  if (mated) parts.push(`Mated: ${mated}`)
  return parts
}

export function describeQueenLineage(queen: MapQueen | undefined): string | null {
  const parts = queenLineageParts(queen)
  return parts.length > 0 ? parts.join(' · ') : null
}

export interface YardBench {
  id: string
  map_x: number
  map_y: number
  rotation_deg: number
  capacity: number
}

/**
 * A hive is on the yard when it has ground coordinates, or a COMPLETE bench
 * link (the bench exists and a slot is set). A partial link (e.g. a slot lost
 * to a partial write or the FK backstop) counts as unplaced — it returns to
 * the tray rather than rendering at a phantom position. Single source of
 * truth for both the 2D map and the 3D scene.
 */
export function isHivePlaced(hive: MapHive, benchIds: { has(id: string): boolean }): boolean {
  if (hive.map_x != null && hive.map_y != null) return true
  return hive.bench_id != null && hive.bench_slot != null && benchIds.has(hive.bench_id)
}

// Only the placement fields may be patched from the yard map.
export interface HivePlacementPatch {
  map_x?: number | null
  map_y?: number | null
  rotation_deg?: number | null
  bench_id?: string | null
  bench_slot?: number | null
}

export interface BenchPlacementPatch {
  map_x?: number
  map_y?: number
  rotation_deg?: number
}

/** Per-apiary yard frame: entrance marker position + where north points. */
export interface YardSettings {
  yard_entrance_x: number | null
  yard_entrance_y: number | null
  north_angle_deg: number
}

export type YardSettingsPatch = Partial<YardSettings>

interface UseApiaryMapReturn {
  apiaryName: string | null
  hives: MapHive[]
  benches: YardBench[]
  yard: YardSettings
  loading: boolean
  isOwner: boolean
  saveHivePlacement: (hiveId: string, patch: HivePlacementPatch) => Promise<void>
  saveYardSettings: (patch: YardSettingsPatch) => Promise<void>
  addBench: (capacity: number) => Promise<void>
  saveBenchPlacement: (benchId: string, patch: BenchPlacementPatch) => Promise<void>
  deleteBench: (benchId: string) => Promise<void>
  reload: () => Promise<void>
}

const DEFAULT_YARD: YardSettings = { yard_entrance_x: null, yard_entrance_y: null, north_angle_deg: 0 }

export function useApiaryMap(apiaryId: string): UseApiaryMapReturn {
  const toast = useToast()
  const mountedRef = useRef(true)
  const userIdRef = useRef<string | null>(null)
  // Monotonic token so a slow reload can never overwrite a newer one's result.
  const loadSeqRef = useRef(0)
  // Mirror the latest state so a save can read the pre-change snapshot
  // synchronously, without depending on when React runs a state updater.
  const hivesRef = useRef<MapHive[]>([])
  const benchesRef = useRef<YardBench[]>([])
  const yardRef = useRef<YardSettings>(DEFAULT_YARD)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const [apiaryName, setApiaryName] = useState<string | null>(null)
  const [hives, setHives] = useState<MapHive[]>([])
  const [benches, setBenches] = useState<YardBench[]>([])
  const [yard, setYard] = useState<YardSettings>(DEFAULT_YARD)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  // Keep the snapshot refs current with rendered state.
  useEffect(() => { hivesRef.current = hives }, [hives])
  useEffect(() => { benchesRef.current = benches }, [benches])
  useEffect(() => { yardRef.current = yard }, [yard])

  const reload = useCallback(async () => {
    if (!apiaryId) return
    const seq = ++loadSeqRef.current
    // Ignore results once a newer load has started or the component unmounted.
    const isCurrent = () => mountedRef.current && seq === loadSeqRef.current
    setLoading(true)
    try {
      const userId = userIdRef.current ?? (await getCurrentUserId())
      userIdRef.current = userId

      const [apiaryRes, hivesRes, benchesRes] = await Promise.all([
        supabase.from('apiaries')
          .select('name, user_id, yard_entrance_x, yard_entrance_y, north_angle_deg')
          .eq('id', apiaryId).single(),
        supabase
          .from('hives')
          .select('id, hive_number, status, is_queenless, queenless_reason, map_x, map_y, rotation_deg, bench_id, bench_slot, configuration, queens(id, queen_number, marking_color, mating_station, mated_at_eircode, distributed_mother_queen, mother_id)')
          .eq('apiary_id', apiaryId)
          .is('archived_at', null)
          .order('hive_number'),
        supabase
          .from('yard_benches')
          .select('id, map_x, map_y, rotation_deg, capacity')
          .eq('apiary_id', apiaryId)
          .order('created_at'),
      ])

      if (apiaryRes.error) throw apiaryRes.error
      if (hivesRes.error) throw hivesRes.error
      if (benchesRes.error) throw benchesRes.error
      if (!isCurrent()) return

      // PostgREST returns the queens embed as a single OBJECT for this
      // to-one relationship (hives.queen_id → queens), not an array —
      // normalise at this one chokepoint so every consumer can rely on
      // MapHive.queens being an array.
      type RawQueens = MapQueen | MapQueen[] | null | undefined
      let hiveRows: MapHive[] = ((hivesRes.data || []) as (Omit<MapHive, 'queens'> & { queens?: RawQueens })[])
        .map(row => ({
          ...row,
          queens: row.queens == null ? [] : Array.isArray(row.queens) ? row.queens : [row.queens],
        }))

      // Resolve mother queens with one batched lookup (the useQueenDetail
      // pattern): an embedded queens→queens self-join is directionally
      // ambiguous in PostgREST. Failure degrades gracefully — lineage simply
      // omits the mother.
      const motherIds = Array.from(new Set(
        hiveRows.flatMap(h => (h.queens ?? []).map(q => q.mother_id).filter((id): id is string => !!id)),
      ))
      if (motherIds.length > 0) {
        const { data: mothers, error: mothersError } = await supabase
          .from('queens')
          .select('id, queen_number')
          .in('id', motherIds)
        if (!isCurrent()) return
        if (mothersError) {
          console.error('Error resolving mother queens:', mothersError)
        } else {
          const motherById = new Map((mothers || []).map(m => [m.id as string, m as { id: string; queen_number: string }]))
          hiveRows = hiveRows.map(h => ({
            ...h,
            queens: h.queens?.map(q => ({
              ...q,
              mother: q.mother_id ? motherById.get(q.mother_id) ?? null : null,
            })),
          }))
        }
      }

      setApiaryName(apiaryRes.data?.name ?? null)
      setIsOwner(!!userId && apiaryRes.data?.user_id === userId)
      setYard({
        yard_entrance_x: apiaryRes.data?.yard_entrance_x ?? null,
        yard_entrance_y: apiaryRes.data?.yard_entrance_y ?? null,
        north_angle_deg: apiaryRes.data?.north_angle_deg ?? 0,
      })
      setHives(hiveRows)
      setBenches((benchesRes.data || []) as YardBench[])
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

  const requireUser = useCallback((): string | null => {
    const userId = userIdRef.current
    if (!userId) toast.error('You must be signed in to edit the yard map')
    return userId
  }, [toast])

  const saveHivePlacement = useCallback(async (hiveId: string, patch: HivePlacementPatch) => {
    const userId = requireUser()
    if (!userId) return

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
  }, [requireUser, toast])

  const saveYardSettings = useCallback(async (patch: YardSettingsPatch) => {
    const userId = requireUser()
    if (!userId) return

    const previous = yardRef.current
    setYard(prev => ({ ...prev, ...patch }))

    const { data, error } = await supabase
      .from('apiaries')
      .update(patch)
      .eq('id', apiaryId)
      .eq('user_id', userId)
      .select('id')

    if (error || !data || data.length === 0) {
      console.error('Error saving yard settings:', error ?? 'no matching row updated')
      if (!mountedRef.current) return
      setYard(previous)
      toast.error('Could not save yard settings')
    }
  }, [apiaryId, requireUser, toast])

  const addBench = useCallback(async (capacity: number) => {
    const userId = requireUser()
    if (!userId) return

    const { data, error } = await supabase
      .from('yard_benches')
      .insert({ user_id: userId, apiary_id: apiaryId, map_x: 50, map_y: 50, rotation_deg: 0, capacity })
      .select('id, map_x, map_y, rotation_deg, capacity')
      .single()

    if (error || !data) {
      console.error('Error adding bench:', error)
      if (mountedRef.current) toast.error('Could not add the bench')
      return
    }
    if (mountedRef.current) setBenches(prev => [...prev, data as YardBench])
  }, [apiaryId, requireUser, toast])

  /**
   * Move/rotate a bench. The bench carries its hives: every linked hive gets
   * its canonical percent position (and, on rotation, its facing) recomputed
   * and persisted so the 3D view and any fallback consumers stay true.
   */
  const saveBenchPlacement = useCallback(async (benchId: string, patch: BenchPlacementPatch) => {
    const userId = requireUser()
    if (!userId) return

    const prevBench = benchesRef.current.find(b => b.id === benchId)
    if (!prevBench) return
    const nextBench = { ...prevBench, ...patch }
    const linkedHives = hivesRef.current.filter(h => h.bench_id === benchId)
    const prevHives = new Map(linkedHives.map(h => [h.id, h]))

    // Optimistically move the bench and its hives together.
    setBenches(prev => prev.map(b => (b.id === benchId ? nextBench : b)))
    setHives(prev => prev.map(h => {
      if (h.bench_id !== benchId || h.bench_slot == null) return h
      const pos = slotPositionPct(nextBench, h.bench_slot)
      return {
        ...h,
        map_x: pos.x,
        map_y: pos.y,
        ...(patch.rotation_deg != null ? { rotation_deg: patch.rotation_deg } : {}),
      }
    }))

    const rollback = () => {
      if (!mountedRef.current) return
      setBenches(prev => prev.map(b => (b.id === benchId ? prevBench : b)))
      setHives(prev => prev.map(h => prevHives.get(h.id) ?? h))
      toast.error('Could not save bench position')
    }

    const { data, error } = await supabase
      .from('yard_benches')
      .update(patch)
      .eq('id', benchId)
      .eq('user_id', userId)
      .select('id')

    if (error || !data || data.length === 0) {
      console.error('Error saving bench placement:', error ?? 'no matching row updated')
      rollback()
      return
    }

    // Persist the recomputed hive placements (best effort, per hive).
    const results = await Promise.all(linkedHives.map(h => {
      if (h.bench_slot == null) return Promise.resolve({ error: null })
      const pos = slotPositionPct(nextBench, h.bench_slot)
      return supabase
        .from('hives')
        .update({
          map_x: pos.x,
          map_y: pos.y,
          ...(patch.rotation_deg != null ? { rotation_deg: patch.rotation_deg } : {}),
        })
        .eq('id', h.id)
        .eq('user_id', userId)
    }))
    if (results.some(r => r.error)) {
      console.error('Error updating hives on bench move:', results.find(r => r.error)?.error)
      // Bench itself saved; re-sync so the UI shows the DB's true positions.
      if (mountedRef.current) reload()
    }
  }, [requireUser, reload, toast])

  /** Delete a bench; its hives stay where they are, just unlinked (grounded). */
  const deleteBench = useCallback(async (benchId: string) => {
    const userId = requireUser()
    if (!userId) return

    const linkedHives = hivesRef.current.filter(h => h.bench_id === benchId)

    setBenches(prev => prev.filter(b => b.id !== benchId))
    setHives(prev => prev.map(h => (h.bench_id === benchId ? { ...h, bench_id: null, bench_slot: null } : h)))

    // Ground the hives first so no window exists where they point at a dead bench.
    const groundResults = await Promise.all(linkedHives.map(h =>
      supabase.from('hives')
        .update({ bench_id: null, bench_slot: null })
        .eq('id', h.id)
        .eq('user_id', userId),
    ))
    const { error } = await supabase
      .from('yard_benches')
      .delete()
      .eq('id', benchId)
      .eq('user_id', userId)

    if (error || groundResults.some(r => r.error)) {
      console.error('Error deleting bench:', error ?? groundResults.find(r => r.error)?.error)
      if (!mountedRef.current) return
      toast.error('Could not delete the bench')
      // The grounding writes may have partially succeeded, so a local rollback
      // could show hives linked to a bench the DB has already unlinked —
      // re-sync from the DB instead of guessing.
      reload()
    }
  }, [requireUser, reload, toast])

  return {
    apiaryName,
    hives,
    benches,
    yard,
    loading,
    isOwner,
    saveHivePlacement,
    saveYardSettings,
    addBench,
    saveBenchPlacement,
    deleteBench,
    reload,
  }
}
