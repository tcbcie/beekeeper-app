import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { getCurrentUserId } from '@/lib/auth'
import { getTeamAccess } from '@/lib/team-access'
import { openScreenCache } from '@/lib/screen-cache'
import {
  slotPositionPct, snapPctToGrid, yardDimsFromMetres,
  DEFAULT_YARD_WIDTH_M, DEFAULT_YARD_DEPTH_M, type YardDims,
} from '@/lib/yard-geometry'
import { getCurrentDate, toLocalDateString } from '@/lib/date-utils'
import { getTreatmentRemovalState } from '@/lib/treatment-removal'
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
  /** Per-super fullness (0-100) from the most recent inspection; null when not recorded. */
  last_super_fullness?: number[] | null
  // Status for the map's "Show" chooser. Each is undefined when its lookup was
  // not asked for or failed, so the map shows "not known" rather than a guess.
  /** Latest inspection in the last year (null = none in that time). */
  last_inspection_date?: string | null
  /** Latest recorded stores level in the last year, and the day it was read. */
  last_stores_level?: number | null
  last_stores_date?: string | null
  /** Open tasks for this hive. */
  active_tasks_count?: number
  /** A varroa treatment still on the hive (null = none). */
  active_treatment?: { treatment_type: string; overdue: boolean } | null
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

export const LANDMARK_KINDS = ['shed', 'tree', 'water', 'gate', 'label'] as const
export type LandmarkKind = (typeof LANDMARK_KINDS)[number]

/** Something that makes the layout recognisable on site: a shed, a tree, water, a gate, or a text label. */
export interface YardLandmark {
  id: string
  kind: LandmarkKind
  label: string | null
  map_x: number
  map_y: number
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

/** Per-apiary yard frame: dimensions, entrance marker, and where north points. */
export interface YardSettings {
  yard_entrance_x: number | null
  yard_entrance_y: number | null
  north_angle_deg: number
  /** Real apiary size in metres (1 scene unit = 0.5 m). */
  yard_width_m: number
  yard_depth_m: number
}

export type YardSettingsPatch = Partial<YardSettings>

interface UseApiaryMapReturn {
  apiaryName: string | null
  hives: MapHive[]
  benches: YardBench[]
  landmarks: YardLandmark[]
  yard: YardSettings
  /** The apiary rectangle in scene units, derived from the metre dimensions. */
  yardDims: YardDims
  loading: boolean
  /** The first load failed, so there is no map to show — offer "Try again" (retry). */
  loadFailed: boolean
  /**
   * When the map on screen is the copy saved on this device because the latest
   * could not be loaded (a timestamp), otherwise null. A saved copy is for
   * looking at: nothing can be changed until the map has loaded again.
   */
  staleSince: number | null
  isOwner: boolean
  /**
   * May move and turn hives: the apiary owner, or a team member the apiary is
   * shared with. Benches and the map setup stay with the owner.
   */
  canMoveHives: boolean
  /** Resolves true once the change is saved; false when it failed and was put back. */
  saveHivePlacement: (hiveId: string, patch: HivePlacementPatch) => Promise<boolean>
  saveYardSettings: (patch: YardSettingsPatch) => Promise<void>
  saveYardDimensions: (widthM: number, depthM: number) => Promise<void>
  addBench: (capacity: number) => Promise<void>
  saveBenchPlacement: (benchId: string, patch: BenchPlacementPatch) => Promise<boolean>
  deleteBench: (benchId: string) => Promise<void>
  /** Add a landmark at the centre of the map; resolves its id, or null on failure. */
  addLandmark: (kind: LandmarkKind, label: string) => Promise<string | null>
  saveLandmarkPlacement: (landmarkId: string, patch: { map_x: number; map_y: number }) => Promise<boolean>
  deleteLandmark: (landmarkId: string) => Promise<void>
  reload: () => Promise<void>
  /** Load again after a failed first load, showing the loading state meanwhile. */
  retry: () => void
}

interface UseApiaryMapOptions {
  /** Also fetch each hive's last recorded super fullness (only the 3D view shows it). */
  withSuperFullness?: boolean
  /** Also fetch inspection age, stores, tasks and treatments (the 2D map's "Show" chooser). */
  withStatus?: boolean
}

const DEFAULT_YARD: YardSettings = {
  yard_entrance_x: null,
  yard_entrance_y: null,
  north_angle_deg: 0,
  yard_width_m: DEFAULT_YARD_WIDTH_M,
  yard_depth_m: DEFAULT_YARD_DEPTH_M,
}

const dimsOf = (yard: YardSettings): YardDims =>
  yardDimsFromMetres(
    Number(yard.yard_width_m) || DEFAULT_YARD_WIDTH_M,
    Number(yard.yard_depth_m) || DEFAULT_YARD_DEPTH_M,
  )

type Updater<T> = T | ((prev: T) => T)

/** What the map last showed, kept on the device so it opens without signal. */
interface MapSnapshot {
  apiaryName: string | null
  isOwner: boolean
  canMoveHives: boolean
  yard: YardSettings
  hives: MapHive[]
  benches: YardBench[]
  /** Missing from copies saved before landmarks existed. */
  landmarks?: YardLandmark[]
}

/** A write failed when it errored or saved no row (a blocked write returns no error). */
const writeFailed = (res: { error: unknown; data: unknown[] | null }) =>
  !!res.error || !res.data || res.data.length === 0

export function useApiaryMap(apiaryId: string, options: UseApiaryMapOptions = {}): UseApiaryMapReturn {
  const { withSuperFullness = false, withStatus = false } = options
  const toast = useToast()
  const mountedRef = useRef(true)
  const userIdRef = useRef<string | null>(null)
  // Monotonic token so a slow reload can never overwrite a newer one's result.
  const loadSeqRef = useRef(0)
  // True once a load has succeeded: later failures keep the map on screen.
  const loadedRef = useRef(false)
  // Saves in progress, loads in progress, and whether a save discarded a load
  // (so the map is refreshed once the saves have finished).
  const pendingSavesRef = useRef(0)
  const loadsInFlightRef = useRef(0)
  const reloadOwedRef = useRef(false)
  // Mirror the latest state so a save can read the pre-change snapshot
  // synchronously, without depending on when React runs a state updater.
  const hivesRef = useRef<MapHive[]>([])
  const benchesRef = useRef<YardBench[]>([])
  const yardRef = useRef<YardSettings>(DEFAULT_YARD)
  const landmarksRef = useRef<YardLandmark[]>([])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const [apiaryName, setApiaryName] = useState<string | null>(null)
  const [hives, setHivesState] = useState<MapHive[]>([])
  const [benches, setBenchesState] = useState<YardBench[]>([])
  const [yard, setYardState] = useState<YardSettings>(DEFAULT_YARD)
  const [landmarks, setLandmarksState] = useState<YardLandmark[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [staleSince, setStaleSince] = useState<number | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [canMoveHives, setCanMoveHives] = useState(false)

  // Every state change goes through these setters, which update the snapshot
  // ref in the same step. A second save started before React re-renders then
  // still reads the first save's values (the refs used to lag a render behind).
  const setHives = useCallback((next: Updater<MapHive[]>) => {
    hivesRef.current = typeof next === 'function' ? next(hivesRef.current) : next
    setHivesState(hivesRef.current)
  }, [])
  const setBenches = useCallback((next: Updater<YardBench[]>) => {
    benchesRef.current = typeof next === 'function' ? next(benchesRef.current) : next
    setBenchesState(benchesRef.current)
  }, [])
  const setLandmarks = useCallback((next: Updater<YardLandmark[]>) => {
    landmarksRef.current = typeof next === 'function' ? next(landmarksRef.current) : next
    setLandmarksState(landmarksRef.current)
  }, [])
  const setYard = useCallback((next: Updater<YardSettings>) => {
    yardRef.current = typeof next === 'function' ? next(yardRef.current) : next
    setYardState(yardRef.current)
  }, [])

  const load = useCallback(async (quiet: boolean) => {
    if (!apiaryId) return
    const seq = ++loadSeqRef.current
    // Ignore results once a newer load has started, a save has begun, or the component unmounted.
    const isCurrent = () => mountedRef.current && seq === loadSeqRef.current
    // No setLoading(true): `loading` starts true for the first load, and a reload (after a failed
    // save) swapped the whole canvas for "Loading…", dropping any drag in progress (C7a-14)
    loadsInFlightRef.current++
    // The copy of this map saved on the device, shown until the fresh one
    // arrives, and kept on screen if it never does (no signal at the apiary).
    let cache: ReturnType<typeof openScreenCache<MapSnapshot>> | null = null
    let freshArrived = false
    let failed = false
    let copySavedAt: number | null = null
    try {
      const userId = userIdRef.current ?? (await getCurrentUserId())
      userIdRef.current = userId

      if (userId) {
        cache = openScreenCache<MapSnapshot>(userId, `apiary-map:${apiaryId}:${withSuperFullness ? '3d' : '2d'}`)
        // Only a first load needs the copy; a refresh already has a map on screen.
        if (!loadedRef.current) {
          cache.read().then(entry => {
            if (!entry || freshArrived || !isCurrent()) return
            copySavedAt = entry.savedAt
            setApiaryName(entry.data.apiaryName)
            setIsOwner(entry.data.isOwner)
            setCanMoveHives(entry.data.canMoveHives)
            setYard(entry.data.yard)
            setHives(entry.data.hives)
            setBenches(entry.data.benches)
            setLandmarks(entry.data.landmarks ?? [])
            setLoading(false)
            // The load may already have failed by the time the copy is read.
            if (failed) {
              setLoadFailed(false)
              setStaleSince(entry.savedAt)
            }
          })
        }
      }

      const [apiaryRes, hivesRes, benchesRes, teamAccess, landmarksRes] = await Promise.all([
        supabase.from('apiaries')
          .select('name, user_id, yard_entrance_x, yard_entrance_y, north_angle_deg, yard_width_m, yard_depth_m')
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
        // Cached; resolves to "no shared access" on failure, which only keeps a team member view-only.
        userId ? getTeamAccess(userId) : null,
        supabase
          .from('yard_landmarks')
          .select('id, kind, label, map_x, map_y')
          .eq('apiary_id', apiaryId)
          .order('created_at'),
      ])

      // The apiary is gone or no longer shared: no copy of it may be shown again.
      if (apiaryRes.error?.code === 'PGRST116') cache?.forget()
      if (apiaryRes.error) throw apiaryRes.error
      if (hivesRes.error) throw hivesRes.error
      if (benchesRes.error) throw benchesRes.error
      if (landmarksRes.error) throw landmarksRes.error
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

      // Attach each hive's last *recorded* per-super fullness for the 3D view.
      // Fullness is optional, so most inspections leave it null; rows are
      // newest-first, so the first row per hive that actually has an array is
      // the latest recorded value.
      // Only the 3D view shows it, and only inspections that recorded it are fetched.
      const hiveIds = hiveRows.map(h => h.id)
      if (withSuperFullness && hiveIds.length > 0) {
        const { data: fullnessRows, error: fullnessError } = await supabase
          .from('inspections')
          .select('hive_id, inspection_date, honey_super_fullness')
          .in('hive_id', hiveIds)
          .not('honey_super_fullness', 'is', null)
          .order('inspection_date', { ascending: false })
        if (!isCurrent()) return
        if (fullnessError) {
          console.error('Error loading super fullness:', fullnessError)
        } else {
          const fullnessByHive = new Map<string, number[]>()
          for (const row of fullnessRows || []) {
            if (!fullnessByHive.has(row.hive_id) && Array.isArray(row.honey_super_fullness)) {
              fullnessByHive.set(row.hive_id, row.honey_super_fullness as number[])
            }
          }
          hiveRows = hiveRows.map(h => ({ ...h, last_super_fullness: fullnessByHive.get(h.id) ?? null }))
        }
      }

      // Status for the "Show" chooser: three small lookups run together. Any
      // that fails leaves its fields undefined (shown as "not known").
      if (withStatus && hiveIds.length > 0) {
        const today = getCurrentDate()
        const yearAgo = toLocalDateString(new Date(Date.now() - 366 * 24 * 60 * 60 * 1000))
        const [inspectionsRes, treatmentsRes, tasksRes] = await Promise.all([
          // No user_id filter on any of these: RLS scopes them, and a team-mate's
          // inspection of a shared hive must count.
          supabase.from('inspections')
            .select('hive_id, inspection_date, stores_level')
            .in('hive_id', hiveIds)
            .gte('inspection_date', yearAgo)
            .order('inspection_date', { ascending: false }),
          supabase.from('varroa_treatments')
            .select('hive_id, treatment_date, treatment_type, planned_removal_date, removed_date')
            .in('hive_id', hiveIds)
            .not('planned_removal_date', 'is', null)
            .is('removed_date', null)
            .order('treatment_date', { ascending: false }),
          supabase.from('tasks_events')
            .select('hive_id')
            .in('hive_id', hiveIds)
            .eq('completed', false),
        ])
        if (!isCurrent()) return

        if (inspectionsRes.error) {
          console.error('Error loading inspection status:', inspectionsRes.error)
        } else {
          const lastDate = new Map<string, string>()
          const stores = new Map<string, { level: number; date: string }>()
          for (const row of inspectionsRes.data || []) {
            if (!lastDate.has(row.hive_id)) lastDate.set(row.hive_id, row.inspection_date)
            if (row.stores_level != null && !stores.has(row.hive_id)) {
              stores.set(row.hive_id, { level: Number(row.stores_level), date: row.inspection_date })
            }
          }
          hiveRows = hiveRows.map(h => ({
            ...h,
            last_inspection_date: lastDate.get(h.id) ?? null,
            last_stores_level: stores.get(h.id)?.level ?? null,
            last_stores_date: stores.get(h.id)?.date ?? null,
          }))
        }

        if (treatmentsRes.error) {
          console.error('Error loading treatment status:', treatmentsRes.error)
        } else {
          const treatment = new Map<string, { treatment_type: string; overdue: boolean }>()
          for (const row of treatmentsRes.data || []) {
            if (!row.hive_id || treatment.has(row.hive_id)) continue
            const state = getTreatmentRemovalState(row, today)
            if (state === 'none') continue
            treatment.set(row.hive_id, { treatment_type: row.treatment_type, overdue: state === 'overdue' })
          }
          hiveRows = hiveRows.map(h => ({ ...h, active_treatment: treatment.get(h.id) ?? null }))
        }

        if (tasksRes.error) {
          console.error('Error loading task status:', tasksRes.error)
        } else {
          const tasks = new Map<string, number>()
          for (const row of tasksRes.data || []) {
            if (row.hive_id) tasks.set(row.hive_id, (tasks.get(row.hive_id) ?? 0) + 1)
          }
          hiveRows = hiveRows.map(h => ({ ...h, active_tasks_count: tasks.get(h.id) ?? 0 }))
        }
      }

      const owner = !!userId && apiaryRes.data?.user_id === userId
      const fresh: MapSnapshot = {
        apiaryName: apiaryRes.data?.name ?? null,
        isOwner: owner,
        canMoveHives: owner || !!teamAccess?.sharedApiaryIds.includes(apiaryId),
        yard: {
          yard_entrance_x: apiaryRes.data?.yard_entrance_x ?? null,
          yard_entrance_y: apiaryRes.data?.yard_entrance_y ?? null,
          north_angle_deg: apiaryRes.data?.north_angle_deg ?? 0,
          yard_width_m: Number(apiaryRes.data?.yard_width_m) || DEFAULT_YARD_WIDTH_M,
          yard_depth_m: Number(apiaryRes.data?.yard_depth_m) || DEFAULT_YARD_DEPTH_M,
        },
        hives: hiveRows,
        benches: (benchesRes.data || []) as YardBench[],
        landmarks: ((landmarksRes.data || []) as YardLandmark[]).map(l => ({ ...l, map_x: Number(l.map_x), map_y: Number(l.map_y) })),
      }
      freshArrived = true
      setApiaryName(fresh.apiaryName)
      setIsOwner(fresh.isOwner)
      setCanMoveHives(fresh.canMoveHives)
      setYard(fresh.yard)
      setHives(fresh.hives)
      setBenches(fresh.benches)
      setLandmarks(fresh.landmarks ?? [])
      cache?.save(fresh)
      loadedRef.current = true
      setLoadFailed(false)
      setStaleSince(null)
    } catch (error) {
      console.error('Error loading apiary map:', error)
      if (isCurrent()) {
        // A failed first load has nothing to show: the screen offers "Try again".
        // A failed refresh keeps the map already on screen.
        failed = true
        if (loadedRef.current) {
          if (!quiet) toast.error('Could not refresh the apiary map')
        } else if (copySavedAt !== null) {
          setStaleSince(copySavedAt)
        } else {
          setLoadFailed(true)
        }
      }
    } finally {
      loadsInFlightRef.current--
      if (isCurrent()) setLoading(false)
    }
  }, [apiaryId, toast, withSuperFullness, withStatus, setHives, setBenches, setYard, setLandmarks])

  const reload = useCallback(() => load(false), [load])

  const retry = useCallback(() => {
    setLoadFailed(false)
    setLoading(true)
    load(false)
  }, [load])

  useEffect(() => {
    reload()
  }, [reload])

  // Refresh when the user comes back to the screen, so a phone left open does
  // not show an old layout. Never while a save is in progress, and never before
  // the first load has succeeded (the "Try again" panel covers that).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (!loadedRef.current || pendingSavesRef.current > 0) return
      load(true)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  /**
   * Run a save. A load still in the air when the save starts is discarded (its
   * result predates the change and would undo it on screen); the map is then
   * refreshed once every save has finished.
   */
  const runSave = useCallback(async <T,>(save: () => Promise<T>): Promise<T> => {
    if (loadsInFlightRef.current > 0) {
      loadSeqRef.current++
      reloadOwedRef.current = true
    }
    pendingSavesRef.current++
    try {
      return await save()
    } finally {
      pendingSavesRef.current--
      if (pendingSavesRef.current === 0 && reloadOwedRef.current && mountedRef.current) {
        reloadOwedRef.current = false
        load(true)
      }
    }
  }, [load])

  const requireUser = useCallback((): string | null => {
    const userId = userIdRef.current
    if (!userId) toast.error('You must be signed in to edit the apiary map')
    return userId
  }, [toast])

  const saveHivePlacement = useCallback((hiveId: string, patch: HivePlacementPatch) => runSave(async (): Promise<boolean> => {
    const userId = requireUser()
    if (!userId) return false

    // Snapshot the hive being changed (read synchronously from the ref) so we
    // can roll back on failure. Reading state here would be stale; reading it
    // from the setHives updater would not be available until React re-renders.
    const previous = hivesRef.current.find(h => h.id === hiveId)
    if (!previous) return false // Unknown hive — nothing to persist.
    // Only the fields this save changed are put back on failure, so a second
    // change made meanwhile (drag, then turn) is not undone with it.
    const revert = Object.fromEntries(
      (Object.keys(patch) as (keyof HivePlacementPatch)[]).map(key => [key, previous[key]]),
    ) as HivePlacementPatch

    // Optimistically apply the change.
    setHives(prev => prev.map(h => (h.id === hiveId ? { ...h, ...patch } : h)))

    // No user_id filter: row level security decides (the hive's owner, or a
    // team member with access to its apiary), so the apiary owner can place a
    // team-mate's hive and the other way round. Return the affected row so a
    // silently blocked write is caught rather than left diverging from the DB.
    const { data, error } = await supabase
      .from('hives')
      .update(patch)
      .eq('id', hiveId)
      .select('id')

    if (error || !data || data.length === 0) {
      console.error('Error saving hive placement:', error ?? 'no matching row updated')
      if (!mountedRef.current) return false
      // Roll back to the exact prior values.
      setHives(prev => prev.map(h => (h.id === hiveId ? { ...h, ...revert } : h)))
      toast.error('Could not save hive position')
      return false
    }
    return true
  }), [runSave, requireUser, toast, setHives])

  const saveYardSettings = useCallback((patch: YardSettingsPatch) => runSave(async () => {
    const userId = requireUser()
    if (!userId) return

    const previous = yardRef.current
    const revert = Object.fromEntries(
      (Object.keys(patch) as (keyof YardSettings)[]).map(key => [key, previous[key]]),
    ) as YardSettingsPatch
    setYard(prev => ({ ...prev, ...patch }))

    const { data, error } = await supabase
      .from('apiaries')
      .update(patch)
      .eq('id', apiaryId)
      .eq('user_id', userId)
      .select('id')

    if (error || !data || data.length === 0) {
      console.error('Error saving apiary map settings:', error ?? 'no matching row updated')
      if (!mountedRef.current) return
      setYard(prev => ({ ...prev, ...revert }))
      toast.error('Could not save the apiary map settings')
    }
  }), [apiaryId, runSave, requireUser, toast, setYard])

  const addBench = useCallback((capacity: number) => runSave(async () => {
    const userId = requireUser()
    if (!userId) return

    // Spawn at the grid intersection nearest the canvas centre.
    const centre = snapPctToGrid(50, 50, dimsOf(yardRef.current))
    const { data, error } = await supabase
      .from('yard_benches')
      .insert({ user_id: userId, apiary_id: apiaryId, map_x: centre.x, map_y: centre.y, rotation_deg: 0, capacity })
      .select('id, map_x, map_y, rotation_deg, capacity')
      .single()

    if (error || !data) {
      console.error('Error adding bench:', error)
      if (mountedRef.current) toast.error('Could not add the bench')
      return
    }
    if (mountedRef.current) setBenches(prev => [...prev, data as YardBench])
  }), [apiaryId, runSave, requireUser, toast, setBenches])

  /**
   * Move/rotate a bench. The bench carries its hives: every linked hive gets
   * its canonical percent position (and, on rotation, its facing) recomputed
   * and persisted so the 3D view and any fallback consumers stay true.
   */
  const saveBenchPlacement = useCallback((benchId: string, patch: BenchPlacementPatch) => runSave(async (): Promise<boolean> => {
    const userId = requireUser()
    if (!userId) return false

    const prevBench = benchesRef.current.find(b => b.id === benchId)
    if (!prevBench) return false
    const nextBench = { ...prevBench, ...patch }
    const linkedHives = hivesRef.current.filter(h => h.bench_id === benchId)
    const prevHives = new Map(linkedHives.map(h => [h.id, h]))

    const dims = dimsOf(yardRef.current)

    // Optimistically move the bench and its hives together.
    setBenches(prev => prev.map(b => (b.id === benchId ? nextBench : b)))
    setHives(prev => prev.map(h => {
      if (h.bench_id !== benchId || h.bench_slot == null) return h
      const pos = slotPositionPct(nextBench, h.bench_slot, dims)
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
      return false
    }

    // Persist the recomputed hive placements, per hive. A write that saves no
    // row (blocked or the hive is gone) counts as a failure, like an error.
    const results = await Promise.all(linkedHives.filter(h => h.bench_slot != null).map(h => {
      const pos = slotPositionPct(nextBench, h.bench_slot as number, dims)
      return supabase
        .from('hives')
        .update({
          map_x: pos.x,
          map_y: pos.y,
          ...(patch.rotation_deg != null ? { rotation_deg: patch.rotation_deg } : {}),
        })
        .eq('id', h.id)
        .select('id')
    }))
    if (results.some(writeFailed)) {
      console.error('Error updating hives on bench move:', results.find(r => r.error)?.error ?? 'no matching row updated')
      // Bench itself saved; re-sync so the UI shows the DB's true positions.
      if (mountedRef.current) toast.error('Some hives on the bench could not be saved, so the map was reloaded')
      reloadOwedRef.current = true
      return false
    }
    return true
  }), [runSave, requireUser, toast, setHives, setBenches])

  /**
   * Resize the apiary rectangle (metres). Positions are stored as percentages,
   * so every placed object is rescaled to keep its REAL-WORLD position
   * (anchored to the top-left corner) — enlarging adds space right/bottom,
   * shrinking clamps anything that would fall outside.
   */
  const saveYardDimensions = useCallback((widthM: number, depthM: number) => runSave(async () => {
    const userId = requireUser()
    if (!userId) return

    // 0.5 m steps, matching the DB CHECK range.
    const w = Math.round(widthM * 2) / 2
    const d = Math.round(depthM * 2) / 2
    if (!Number.isFinite(w) || !Number.isFinite(d) || w < 2 || w > 60 || d < 2 || d > 60) {
      toast.error('Apiary size must be between 2 and 60 metres')
      return
    }

    const prevYard = yardRef.current
    const oldW = Number(prevYard.yard_width_m) || DEFAULT_YARD_WIDTH_M
    const oldD = Number(prevYard.yard_depth_m) || DEFAULT_YARD_DEPTH_M
    if (oldW === w && oldD === d) return

    const sx = oldW / w
    const sy = oldD / d
    const newDims = yardDimsFromMetres(w, d)
    const scalePct = (v: number | string | null, s: number) =>
      v == null ? null : Math.round(Math.min(100, Math.max(0, Number(v) * s)) * 100) / 100

    const prevHives = hivesRef.current
    const prevBenches = benchesRef.current

    const scaledBenches = prevBenches.map(b => ({
      ...b,
      map_x: scalePct(b.map_x, sx) as number,
      map_y: scalePct(b.map_y, sy) as number,
    }))
    const scaledBenchById = new Map(scaledBenches.map(b => [b.id, b]))
    const prevLandmarks = landmarksRef.current
    const scaledLandmarks = prevLandmarks.map(l => ({
      ...l,
      map_x: scalePct(l.map_x, sx) as number,
      map_y: scalePct(l.map_y, sy) as number,
    }))

    const scaledHives = prevHives.map(h => {
      // Bench hives re-derive from their (rescaled) bench so they stay on slot.
      if (h.bench_id != null && h.bench_slot != null && scaledBenchById.has(h.bench_id)) {
        const pos = slotPositionPct(scaledBenchById.get(h.bench_id)!, h.bench_slot, newDims)
        return { ...h, map_x: pos.x, map_y: pos.y }
      }
      if (h.map_x == null || h.map_y == null) return h
      return { ...h, map_x: scalePct(h.map_x, sx) as number, map_y: scalePct(h.map_y, sy) as number }
    })

    const apiaryPatch = {
      yard_width_m: w,
      yard_depth_m: d,
      yard_entrance_x: scalePct(prevYard.yard_entrance_x, sx),
      yard_entrance_y: scalePct(prevYard.yard_entrance_y, sy),
    }

    // Optimistically apply everything together.
    setYard(prev => ({ ...prev, ...apiaryPatch }))
    setBenches(scaledBenches)
    setLandmarks(scaledLandmarks)
    setHives(scaledHives)

    const { data, error } = await supabase
      .from('apiaries')
      .update(apiaryPatch)
      .eq('id', apiaryId)
      .eq('user_id', userId)
      .select('id')

    if (error || !data || data.length === 0) {
      console.error('Error resizing apiary:', error ?? 'no matching row updated')
      if (!mountedRef.current) return
      setYard(prevYard)
      setBenches(prevBenches)
      setLandmarks(prevLandmarks)
      setHives(prevHives)
      toast.error('Could not resize the apiary')
      return
    }

    // Persist the rescaled placements (best effort; re-sync on any failure).
    const results = await Promise.all([
      ...scaledBenches.map(b =>
        supabase.from('yard_benches').update({ map_x: b.map_x, map_y: b.map_y }).eq('id', b.id).eq('user_id', userId).select('id'),
      ),
      ...scaledLandmarks.map(l =>
        supabase.from('yard_landmarks').update({ map_x: l.map_x, map_y: l.map_y }).eq('id', l.id).eq('user_id', userId).select('id'),
      ),
      ...scaledHives
        .filter(h => h.map_x != null && h.map_y != null)
        .map(h =>
          supabase.from('hives').update({ map_x: h.map_x, map_y: h.map_y }).eq('id', h.id).select('id'),
        ),
    ])
    if (results.some(writeFailed)) {
      console.error('Error rescaling placements:', results.find(r => r.error)?.error ?? 'no matching row updated')
      if (mountedRef.current) toast.error('The apiary was resized, but some positions could not be saved and were reloaded')
      reloadOwedRef.current = true
    }
  }), [apiaryId, runSave, requireUser, toast, setHives, setBenches, setYard, setLandmarks])

  /** Delete a bench; its hives stay where they are, just unlinked (grounded). */
  const deleteBench = useCallback((benchId: string) => runSave(async () => {
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
        .select('id'),
    ))
    // The bench is only deleted once every hive on it is safely on the ground.
    const groundFailed = groundResults.some(writeFailed)
    const deleteRes = groundFailed
      ? null
      : await supabase.from('yard_benches').delete().eq('id', benchId).eq('user_id', userId).select('id')

    if (groundFailed || !deleteRes || writeFailed(deleteRes)) {
      console.error('Error deleting bench:', deleteRes?.error ?? groundResults.find(r => r.error)?.error ?? 'no matching row updated')
      // The grounding writes may have partially succeeded, so a local rollback
      // could show hives linked to a bench the DB has already unlinked —
      // re-sync from the DB instead of guessing.
      if (mountedRef.current) toast.error('Could not delete the bench')
      reloadOwedRef.current = true
    }
  }), [runSave, requireUser, toast, setHives, setBenches])

  const addLandmark = useCallback((kind: LandmarkKind, label: string) => runSave(async (): Promise<string | null> => {
    const userId = requireUser()
    if (!userId) return null

    const centre = snapPctToGrid(50, 50, dimsOf(yardRef.current))
    const { data, error } = await supabase
      .from('yard_landmarks')
      .insert({ user_id: userId, apiary_id: apiaryId, kind, label: label.trim().slice(0, 40) || null, map_x: centre.x, map_y: centre.y })
      .select('id, kind, label, map_x, map_y')
      .single()

    if (error || !data) {
      console.error('Error adding landmark:', error)
      if (mountedRef.current) toast.error('Could not add the landmark')
      return null
    }
    const added = { ...(data as YardLandmark), map_x: Number(data.map_x), map_y: Number(data.map_y) }
    if (mountedRef.current) setLandmarks(prev => [...prev, added])
    return added.id
  }), [apiaryId, runSave, requireUser, toast, setLandmarks])

  const saveLandmarkPlacement = useCallback((landmarkId: string, patch: { map_x: number; map_y: number }) => runSave(async (): Promise<boolean> => {
    const userId = requireUser()
    if (!userId) return false
    const previous = landmarksRef.current.find(l => l.id === landmarkId)
    if (!previous) return false

    setLandmarks(prev => prev.map(l => (l.id === landmarkId ? { ...l, ...patch } : l)))
    const res = await supabase.from('yard_landmarks').update(patch).eq('id', landmarkId).eq('user_id', userId).select('id')
    if (writeFailed(res)) {
      console.error('Error saving landmark position:', res.error ?? 'no matching row updated')
      if (!mountedRef.current) return false
      setLandmarks(prev => prev.map(l => (l.id === landmarkId ? { ...l, map_x: previous.map_x, map_y: previous.map_y } : l)))
      toast.error('Could not save the landmark position')
      return false
    }
    return true
  }), [runSave, requireUser, toast, setLandmarks])

  const deleteLandmark = useCallback((landmarkId: string) => runSave(async () => {
    const userId = requireUser()
    if (!userId) return
    const previous = landmarksRef.current.find(l => l.id === landmarkId)
    if (!previous) return

    setLandmarks(prev => prev.filter(l => l.id !== landmarkId))
    const res = await supabase.from('yard_landmarks').delete().eq('id', landmarkId).eq('user_id', userId).select('id')
    if (writeFailed(res)) {
      console.error('Error deleting landmark:', res.error ?? 'no matching row deleted')
      if (!mountedRef.current) return
      setLandmarks(prev => (prev.some(l => l.id === landmarkId) ? prev : [...prev, previous]))
      toast.error('Could not delete the landmark')
    }
  }), [runSave, requireUser, toast, setLandmarks])

  return {
    apiaryName,
    hives,
    benches,
    landmarks,
    yard,
    yardDims: dimsOf(yard),
    loading,
    loadFailed,
    staleSince,
    isOwner,
    canMoveHives,
    saveHivePlacement,
    saveYardSettings,
    saveYardDimensions,
    addBench,
    saveBenchPlacement,
    deleteBench,
    addLandmark,
    saveLandmarkPlacement,
    deleteLandmark,
    reload,
    retry,
  }
}
