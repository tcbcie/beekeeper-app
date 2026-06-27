'use client'
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateGDDFromDaily, calculateForagingHours, type OpenMeteoDaily } from '@/lib/gdd'
import { DEFAULT_TBR_CONSTANTS, type TbrConstants, type InterventionMethod, type ResolvedCropDate } from '@/types/tbr'
import {
  dayDiff,
  planFromResolved,
  rebuildFoodBudget,
  resolveCropDate,
  cellsForFrame,
  waxForFrameKg,
  SPRING_CROP_DURATION_DAYS,
  SUMMER_FLOW_DURATION_DAYS,
  SWARM_SEASON_START_MD,
  type GddRecordLite,
  type VegInfoLite,
  type ProjectionContext,
  type TbrResult,
  type FoodBudget,
} from '@/lib/tbr-model'

const MIN_USEFUL_NECTAR_VALUE = 3

export interface FoodPlan {
  budget: FoodBudget
  /** Earliest worthwhile nectar source predicted at/after the break, if any. */
  nextNectarDate: string | null
  nextNectarName: string | null
  /** True if that nectar income arrives before the colony's own foragers recover. */
  incomeBeforeRecovery: boolean
  recoveryDate: string
}

export interface ApiaryOption {
  id: string
  name: string
  latitude: number | null
  longitude: number | null
}

/** How a crop would resolve at the selected apiary — drives the picker colour coding. */
export type CropDataLevel = 'observed' | 'projected' | 'estimated' | 'none'

export interface VegOption {
  id: string
  name: string
  dataLevel: CropDataLevel
}

export interface FrameStandardOption {
  id: string
  label: string
  widthMm: number
  heightMm: number
}

// Used only if the frame_standards fetch fails.
const FALLBACK_FRAME_STANDARDS: FrameStandardOption[] = [
  { id: 'british_national_deep', label: 'British National Deep', widthMm: 335, heightMm: 195 },
  { id: 'langstroth_deep', label: 'Langstroth Deep', widthMm: 425, heightMm: 210 },
  { id: 'dadant_modified_deep', label: 'Dadant Modified Deep', widthMm: 420, heightMm: 260 },
  { id: 'commercial', label: 'Commercial', widthMm: 406, heightMm: 195 },
  { id: 'smith', label: 'Smith', widthMm: 350, heightMm: 195 },
]

interface UseTbrPlannerReturn {
  apiaries: ApiaryOption[]
  selectedApiaryId: string | null
  setSelectedApiaryId: (id: string) => void
  vegOptions: VegOption[]
  springVegId: string | null
  summerVegId: string | null
  setSpringVegId: (id: string) => void
  setSummerVegId: (id: string) => void
  resolvedSpring: ResolvedCropDate | null
  resolvedSummer: ResolvedCropDate | null
  constants: TbrConstants
  setConstants: (c: TbrConstants) => void
  /** Hive frame systems and the chosen one (drives the brood-frame maths). */
  frameStandards: FrameStandardOption[]
  frameStandardId: string | null
  setFrameStandardId: (id: string) => void
  /** Average brood-area utilisation (0..1) — wall-to-wall is never 100%. */
  broodUtilisation: number
  setBroodUtilisation: (v: number) => void
  /** Usable brood cells per frame after utilisation, for the brood readout. */
  effectiveCellsPerFrame: number
  /** Which brood-break intervention to model. */
  method: InterventionMethod
  setMethod: (m: InterventionMethod) => void
  /** When true, model precocious foraging after the break (faster recovery). */
  precocious: boolean
  setPrecocious: (v: boolean) => void
  tbrOverride: string | null
  setTbrOverride: (d: string | null) => void
  /** Minimum average spring forager strength to protect (0..1) — relaxes the earliest break date. */
  springFloor: number
  setSpringFloor: (v: number) => void
  /** Swarm-season floor the recommendation can't precede, plus the slider's date bounds (this season). */
  swarmSeason: { start: string; min: string; max: string }
  setSwarmSeasonStart: (d: string) => void
  /** Foraging days in the forecast horizon (null if no forecast available) — guidance only, not fed into the model. */
  forecastForagingDays: number | null
  /** Length of the forecast horizon in days. */
  forecastDays: number
  result: TbrResult | null
  /** Honey/pollen needed to rebuild + nectar-income outlook for the chosen date. */
  foodPlan: FoodPlan | null
  loading: boolean
  error: string | null
  /** True once apiary data has loaded but no location/records exist to project from. */
  noProjection: boolean
}

const RECENT_RATE_WINDOW_DAYS = 14

// Days earlier that post-break bees begin foraging when precocious foraging is modelled.
// ~7 d matches forager-depletion studies (normal onset ~21 d → precocious ~14 d).
const PRECOCIOUS_ACCEL_DAYS = 7

// Weather-aware spring trade-off: how far ahead we forecast, and the flyable-hours bar for a day to
// count as a foraging day (the app's authoritative 12°C / sunshine / rain rule lives in calculateForagingHours).
const FORECAST_DAYS = 10
const FORAGING_HOUR_THRESHOLD = 1

/**
 * Fetch the apiary's daily forecast over FORECAST_DAYS and score each day's foraging hours,
 * so the planner can tell when the spring crop is weather-finished. Returns null on any failure.
 */
async function fetchForecast(
  lat: number,
  lon: number,
  signal: AbortSignal
): Promise<{ date: string; hours: number }[] | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,sunshine_duration,precipitation_sum` +
    `&timezone=Europe/Dublin&forecast_days=${FORECAST_DAYS}`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const data = await res.json()
    const d = data?.daily as {
      time?: string[]
      temperature_2m_max?: number[]
      temperature_2m_min?: number[]
      sunshine_duration?: number[]
      precipitation_sum?: number[]
    } | undefined
    if (!d?.time || !d.temperature_2m_max) return null
    const out: { date: string; hours: number }[] = []
    for (let i = 0; i < d.time.length; i++) {
      const hours = calculateForagingHours(
        Number(d.temperature_2m_min?.[i]),
        Number(d.temperature_2m_max?.[i]),
        Number(d.sunshine_duration?.[i]),
        Number(d.precipitation_sum?.[i] ?? 0)
      )
      out.push({ date: d.time[i], hours: Number.isFinite(hours) ? hours : 0 })
    }
    return out
  } catch {
    return null
  }
}

/**
 * Fetch this year's accumulated GDD and recent daily accrual for a location.
 * Returns `asOf` (the last date actually covered by the archive, which lags ~5 days)
 * so projections can be anchored on real data rather than on `today`.
 */
async function fetchGddContext(
  lat: number,
  lon: number,
  signal: AbortSignal
): Promise<{ accumulatedGdd: number; dailyGddRate: number; asOf: string } | null> {
  const now = new Date()
  const year = now.getFullYear()
  const today = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${year}-01-01&end_date=${today}` +
    `&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Dublin`

  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const data = await res.json()
    const daily = data?.daily as OpenMeteoDaily | undefined
    if (!daily?.temperature_2m_max || !daily.time || daily.time.length === 0) return null

    const accumulatedGdd = calculateGDDFromDaily(daily)
    const asOf = daily.time[daily.time.length - 1]

    const n = daily.time.length
    const from = Math.max(0, n - RECENT_RATE_WINDOW_DAYS)
    const recent: OpenMeteoDaily = {
      time: daily.time.slice(from),
      temperature_2m_max: daily.temperature_2m_max.slice(from),
      temperature_2m_min: daily.temperature_2m_min.slice(from),
    }
    const recentDays = recent.time.length || 1
    const recentRate = calculateGDDFromDaily(recent) / recentDays

    // Fall back to the season's average daily accrual (not a meaningless 1/day) if the
    // recent window happens to be flat, so projections stay in a sane range.
    const dayOfYear = Math.max(1, dayDiff(`${asOf.slice(0, 4)}-01-01`, asOf) + 1)
    const seasonalAvg = accumulatedGdd / dayOfYear
    const dailyGddRate = recentRate > 0 ? recentRate : Math.max(seasonalAvg, 0.5)

    return { accumulatedGdd, dailyGddRate, asOf }
  } catch {
    return null
  }
}

// Read a session-stored value, merging object shapes so newly-added fields keep their defaults.
function readSession<T>(key: string, initial: T): T {
  if (typeof window === 'undefined') return initial
  try {
    const raw = window.sessionStorage.getItem(key)
    if (raw == null) return initial
    const parsed = JSON.parse(raw) as T
    if (
      initial && typeof initial === 'object' && !Array.isArray(initial) &&
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ) {
      return { ...initial, ...parsed }
    }
    return parsed
  } catch {
    return initial
  }
}

// Bump when the stored shape changes, so stale entries from an older deploy are abandoned cleanly.
const PERSIST_VERSION = 1

// useState that persists to sessionStorage, so picks survive leaving/returning to the page this session.
function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => readSession(key, initial))
  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.sessionStorage.setItem(key, JSON.stringify(state)) } catch { /* ignore quota/serialise errors */ }
  }, [key, state])
  return [state, setState]
}

export function useTbrPlanner(userId: string): UseTbrPlannerReturn {
  // Persist the user's picks per session (keyed by user + schema version) so navigating away and back keeps them.
  const sk = (name: string) => `tbr:v${PERSIST_VERSION}:${userId}:${name}`

  const [apiaries, setApiaries] = useState<ApiaryOption[]>([])
  const [selectedApiaryId, setSelectedApiaryId] = usePersistentState<string | null>(sk('apiary'), null)
  const [vegInfo, setVegInfo] = useState<VegInfoLite[]>([])
  const [records, setRecords] = useState<GddRecordLite[]>([])
  const [proj, setProj] = useState<ProjectionContext | null>(null)
  const [springVegId, setSpringVegId] = usePersistentState<string | null>(sk('spring'), null)
  const [summerVegId, setSummerVegId] = usePersistentState<string | null>(sk('summer'), null)
  const [constants, setConstants] = usePersistentState<TbrConstants>(sk('constants'), DEFAULT_TBR_CONSTANTS)
  const [frameStandards, setFrameStandards] = useState<FrameStandardOption[]>([])
  const [frameStandardId, setFrameStandardId] = usePersistentState<string | null>(sk('frame'), null)
  const [broodUtilisation, setBroodUtilisation] = usePersistentState<number>(sk('utilisation'), 0.8)
  const [method, setMethodState] = usePersistentState<InterventionMethod>(sk('method'), 'tbr')
  const [precocious, setPrecocious] = usePersistentState<boolean>(sk('precocious'), false)
  const [tbrOverride, setTbrOverride] = usePersistentState<string | null>(sk('override'), null)
  const [springFloor, setSpringFloor] = usePersistentState<number>(sk('springFloor'), 0.8)
  // Swarm-season start the recommendation is floored at (null = regional default for the season).
  const [swarmSeasonStart, setSwarmSeasonStart] = usePersistentState<string | null>(sk('swarmSeason'), null)
  // 10-day foraging forecast for the selected apiary (null until/unless it loads).
  const [forecast, setForecast] = useState<{ date: string; hours: number }[] | null>(null)

  // Switching method invalidates a hand-picked date (the feasible window differs).
  const setMethod = useCallback((m: InterventionMethod) => {
    setMethodState(m)
    setTbrOverride(null)
  }, [setMethodState, setTbrOverride])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noProjection, setNoProjection] = useState(false)

  // Track whether the user has manually chosen crops, so auto-defaults don't override them.
  // Restored picks count as user-chosen, so the auto-pick on load won't clobber them.
  const userPickedSpring = useRef(readSession<string | null>(sk('spring'), null) != null)
  const userPickedSummer = useRef(readSession<string | null>(sk('summer'), null) != null)

  const chooseSpring = useCallback((id: string) => {
    userPickedSpring.current = true
    setSpringVegId(id)
    setTbrOverride(null)
  }, [setSpringVegId, setTbrOverride])
  const chooseSummer = useCallback((id: string) => {
    userPickedSummer.current = true
    setSummerVegId(id)
    setTbrOverride(null)
  }, [setSummerVegId, setTbrOverride])

  // Load apiaries + vegetation reference data once.
  useEffect(() => {
    if (!userId) return
    let active = true

    async function loadStatic() {
      setError(null)
      const [apiaryRes, vegTypeRes, vegInfoRes, recCountRes, frameRes] = await Promise.all([
        supabase
          .from('apiaries')
          .select('id, name, latitude, longitude')
          .eq('user_id', userId)
          .order('name'),
        supabase
          .from('dropdown_values')
          .select('id, value, dropdown_categories!inner(category_key)')
          .eq('dropdown_categories.category_key', 'vegetation_type')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('vegetation_info')
          .select('vegetation_type_id, typical_gdd_range, bloom_period, nectar_value'),
        supabase
          .from('gdd_records')
          .select('apiary_id')
          .eq('user_id', userId),
        supabase
          .from('frame_standards')
          .select('id, label, width_mm, height_mm')
          .eq('is_active', true)
          .order('display_order'),
      ])

      if (!active) return

      if (apiaryRes.error) {
        setError('Could not load apiaries.')
        setLoading(false)
        return
      }

      const apiaryList = (apiaryRes.data ?? []) as ApiaryOption[]
      setApiaries(apiaryList)
      // Default to the apiary with the most bloom records (the user's main data site), so the
      // planner doesn't open on a sparse apiary and silently fall back to generic estimates.
      const recCounts = new Map<string, number>()
      for (const r of (recCountRes.data ?? []) as { apiary_id: string }[]) {
        recCounts.set(r.apiary_id, (recCounts.get(r.apiary_id) ?? 0) + 1)
      }
      const defaultApiary = apiaryList
        .slice()
        .sort((a, b) => (recCounts.get(b.id) ?? 0) - (recCounts.get(a.id) ?? 0))[0]
      // Keep a restored selection if it still exists, otherwise fall back to the default.
      if (apiaryList.length > 0) {
        setSelectedApiaryId((prev) => (prev && apiaryList.some((a) => a.id === prev) ? prev : defaultApiary.id))
      }

      // Frame systems (fall back to presets if the fetch fails); default to British National Deep.
      // Coerce dimensions: PostgREST returns numeric columns as strings, which would break the cell maths.
      const frames: FrameStandardOption[] = ((frameRes.data ?? []) as {
        id: string; label: string; width_mm: number | string; height_mm: number | string
      }[]).map((f) => ({ id: f.id, label: f.label, widthMm: Number(f.width_mm), heightMm: Number(f.height_mm) }))
      const frameList = frames.length > 0 ? frames : FALLBACK_FRAME_STANDARDS
      setFrameStandards(frameList)
      const defaultFrame = frameList.find((f) => /national deep/i.test(f.label)) ?? frameList[0]
      // Keep a restored frame system if it still exists, otherwise fall back to the default.
      if (defaultFrame) {
        setFrameStandardId((prev) => (prev && frameList.some((f) => f.id === prev) ? prev : defaultFrame.id))
      }

      const names = new Map<string, string>()
      for (const v of (vegTypeRes.data ?? []) as { id: string; value: string }[]) {
        names.set(v.id, v.value)
      }
      const infoByVeg = new Map<string, { typical_gdd_range: string | null; bloom_period: string | null; nectar_value: number | null }>()
      for (const r of (vegInfoRes.data ?? []) as {
        vegetation_type_id: string
        typical_gdd_range: string | null
        bloom_period: string | null
        nectar_value: number | null
      }[]) {
        infoByVeg.set(r.vegetation_type_id, r)
      }
      const merged: VegInfoLite[] = Array.from(names.entries()).map(([id, name]) => ({
        vegetationTypeId: id,
        name,
        typicalGddRange: infoByVeg.get(id)?.typical_gdd_range ?? null,
        bloomPeriod: infoByVeg.get(id)?.bloom_period ?? null,
        nectarValue: infoByVeg.get(id)?.nectar_value ?? null,
      }))
      merged.sort((a, b) => a.name.localeCompare(b.name))
      setVegInfo(merged)

      setLoading(false)
    }

    loadStatic()
    return () => {
      active = false
    }
  }, [userId, setSelectedApiaryId, setFrameStandardId])

  // Load records + GDD projection whenever the selected apiary changes.
  useEffect(() => {
    if (!selectedApiaryId) return
    const controller = new AbortController()
    let active = true

    async function loadApiary(apiaryId: string) {
      setNoProjection(false)
      const recRes = await supabase
        .from('gdd_records')
        .select('vegetation_type_id, year, start_date, end_date, gdd_value')
        .eq('apiary_id', apiaryId)

      if (!active) return
      if (recRes.error) console.error('TBR planner: failed to load GDD records', recRes.error)

      const recs: GddRecordLite[] = ((recRes.data ?? []) as {
        vegetation_type_id: string
        year: number
        start_date: string | null
        end_date: string | null
        gdd_value: number | null
      }[]).map((r) => ({
        vegetationTypeId: r.vegetation_type_id,
        year: r.year,
        startDate: r.start_date,
        endDate: r.end_date,
        gddValue: r.gdd_value,
      }))
      setRecords(recs)

      // Auto-pick sensible default crops from records (user choices win).
      const avg = new Map<string, { sum: number; n: number }>()
      for (const r of recs) {
        if (typeof r.gddValue === 'number') {
          const cur = avg.get(r.vegetationTypeId) ?? { sum: 0, n: 0 }
          avg.set(r.vegetationTypeId, { sum: cur.sum + r.gddValue, n: cur.n + 1 })
        }
      }
      const ranked = Array.from(avg.entries())
        .map(([id, v]) => ({ id, avg: v.sum / v.n }))
        .sort((a, b) => b.avg - a.avg)
      if (ranked.length > 0) {
        const summer = ranked[0]
        if (!userPickedSummer.current) setSummerVegId(summer.id)
        // Spring default: latest forage clearly earlier than the summer flow.
        const springCandidates = ranked.filter((r) => r.avg <= summer.avg * 0.6)
        const spring = springCandidates[0] ?? ranked[ranked.length - 1]
        if (!userPickedSpring.current && spring && spring.id !== summer.id) {
          setSpringVegId(spring.id)
        }
      }

      // GDD projection context from the apiary's location.
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const apiary = apiaries.find((a) => a.id === apiaryId)
      // PostgREST can return `numeric` columns as strings — coerce and validate.
      const lat = apiary?.latitude != null ? Number(apiary.latitude) : null
      const lon = apiary?.longitude != null ? Number(apiary.longitude) : null
      let ctx: ProjectionContext = {
        accumulatedGdd: null,
        dailyGddRate: null,
        today,
        currentYear: now.getFullYear(),
      }
      if (lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)) {
        const gdd = await fetchGddContext(lat, lon, controller.signal)
        if (!active) return
        if (gdd) {
          ctx = {
            accumulatedGdd: gdd.accumulatedGdd,
            dailyGddRate: gdd.dailyGddRate,
            today: gdd.asOf,
            currentYear: Number(gdd.asOf.slice(0, 4)) || now.getFullYear(),
          }
        }
      }
      setProj(ctx)

      // 10-day foraging forecast (weather-aware spring trade-off). Cleared when the apiary has no coords.
      if (lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)) {
        const fc = await fetchForecast(lat, lon, controller.signal)
        if (!active) return
        setForecast(fc)
      } else {
        setForecast(null)
      }

      // Flag when nothing can be projected (no coords AND no usable records).
      const hasThisYearObserved = recs.some((r) => r.year === now.getFullYear() && r.startDate)
      if (ctx.accumulatedGdd == null && !hasThisYearObserved) setNoProjection(true)
    }

    loadApiary(selectedApiaryId)
    return () => {
      active = false
      controller.abort()
    }
  }, [selectedApiaryId, apiaries, setSpringVegId, setSummerVegId])

  const vegOptions: VegOption[] = useMemo(() => {
    const currentYear = proj?.currentYear ?? new Date().getFullYear()
    const byCrop = new Map<string, GddRecordLite[]>()
    for (const r of records) {
      const arr = byCrop.get(r.vegetationTypeId)
      if (arr) arr.push(r)
      else byCrop.set(r.vegetationTypeId, [r])
    }
    const levelOf = (v: VegInfoLite): CropDataLevel => {
      const recs = byCrop.get(v.vegetationTypeId) ?? []
      if (recs.some((r) => r.year === currentYear && r.startDate)) return 'observed'
      if (recs.some((r) => typeof r.gddValue === 'number')) return 'projected'
      if (v.typicalGddRange) return 'estimated'
      return 'none'
    }
    const rank: Record<CropDataLevel, number> = { observed: 0, projected: 1, estimated: 2, none: 3 }
    return vegInfo
      .map((v) => ({ id: v.vegetationTypeId, name: v.name, dataLevel: levelOf(v) }))
      .sort((a, b) => rank[a.dataLevel] - rank[b.dataLevel] || a.name.localeCompare(b.name))
  }, [vegInfo, records, proj])

  const vegInfoById = useMemo(() => {
    const m = new Map<string, VegInfoLite>()
    for (const v of vegInfo) m.set(v.vegetationTypeId, v)
    return m
  }, [vegInfo])

  // Selected frame system → brood-frame geometry for the readout and food budget.
  const selectedFrame = useMemo(
    () => frameStandards.find((f) => f.id === frameStandardId) ?? null,
    [frameStandards, frameStandardId]
  )
  const effectiveCellsPerFrame = useMemo(() => {
    if (!selectedFrame) return 0
    return Math.max(1, Math.round(cellsForFrame(selectedFrame.widthMm, selectedFrame.heightMm) * broodUtilisation))
  }, [selectedFrame, broodUtilisation])

  const resolvedSpring = useMemo<ResolvedCropDate | null>(() => {
    if (!springVegId || !proj) return null
    const info = vegInfoById.get(springVegId)
    return resolveCropDate(springVegId, info?.name ?? 'Spring crop', records, info, proj, SPRING_CROP_DURATION_DAYS)
  }, [springVegId, proj, vegInfoById, records])

  const resolvedSummer = useMemo<ResolvedCropDate | null>(() => {
    if (!summerVegId || !proj) return null
    const info = vegInfoById.get(summerVegId)
    return resolveCropDate(summerVegId, info?.name ?? 'Summer flow', records, info, proj, SUMMER_FLOW_DURATION_DAYS)
  }, [summerVegId, proj, vegInfoById, records])

  // Foraging days in the forecast horizon — surfaced as guidance only. Weather is deliberately NOT
  // fed into the model: a poor forecast is the beekeeper's judgment call, not an automatic shift.
  const forecastForagingDays = useMemo<number | null>(() => {
    if (!forecast || forecast.length === 0) return null
    return forecast.filter((d) => d.hours >= FORAGING_HOUR_THRESHOLD).length
  }, [forecast])

  // Swarm-season slider bounds (this season) and the effective floor date. A stored value from
  // another year or outside the window falls back to the regional default.
  const swarmSeason = useMemo(() => {
    const year = resolvedSummer?.date?.slice(0, 4)
      ?? proj?.currentYear?.toString()
      ?? new Date().getFullYear().toString()
    const min = `${year}-04-01`
    const max = `${year}-06-30`
    const fallback = `${year}-${SWARM_SEASON_START_MD}`
    const start = swarmSeasonStart && swarmSeasonStart >= min && swarmSeasonStart <= max
      ? swarmSeasonStart
      : fallback
    return { start, min, max }
  }, [resolvedSummer, proj, swarmSeasonStart])

  const result = useMemo<TbrResult | null>(() => {
    if (!resolvedSummer?.date) return null
    return planFromResolved(
      resolvedSpring?.date ?? null,
      resolvedSpring?.endDate ?? null,
      resolvedSummer.date,
      resolvedSummer.endDate,
      constants,
      tbrOverride,
      method,
      precocious ? PRECOCIOUS_ACCEL_DAYS : 0,
      springFloor,
      swarmSeason.start
    )
  }, [resolvedSpring, resolvedSummer, constants, tbrOverride, method, precocious, springFloor, swarmSeason.start])

  // Worthwhile nectar blooms (value ≥ threshold) resolved once per apiary/projection and
  // sorted ascending, so the TBR slider can pick the next bloom without re-resolving every crop.
  const nectarBlooms = useMemo<{ date: string; name: string }[]>(() => {
    if (!proj) return []
    const out: { date: string; name: string }[] = []
    for (const v of vegInfo) {
      if ((v.nectarValue ?? 0) < MIN_USEFUL_NECTAR_VALUE) continue
      const r = resolveCropDate(v.vegetationTypeId, v.name, records, v, proj)
      if (r.date) out.push({ date: r.date, name: v.name })
    }
    return out.sort((a, b) => a.date.localeCompare(b.date))
  }, [vegInfo, records, proj])

  const foodPlan = useMemo<FoodPlan | null>(() => {
    if (!result) return null
    const { effectiveTbrDate, plan } = result
    const recoveryDate = plan.milestones.firstForagerDate
    const frameSpec = selectedFrame
      ? {
          cellsPerBroodFrame: effectiveCellsPerFrame,
          waxPerFrameKg: waxForFrameKg(selectedFrame.widthMm, selectedFrame.heightMm),
        }
      : undefined
    const budget = rebuildFoodBudget(constants, dayDiff(effectiveTbrDate, recoveryDate), method, frameSpec)

    // Earliest worthwhile nectar source predicted at/after the break.
    const next = nectarBlooms.find((b) => b.date >= effectiveTbrDate) ?? null
    const nextNectarDate = next?.date ?? null
    const nextNectarName = next?.name ?? null

    const incomeBeforeRecovery = nextNectarDate != null && nextNectarDate <= recoveryDate
    return { budget, nextNectarDate, nextNectarName, incomeBeforeRecovery, recoveryDate }
  }, [result, constants, method, nectarBlooms, selectedFrame, effectiveCellsPerFrame])

  return {
    apiaries,
    selectedApiaryId,
    setSelectedApiaryId: (id) => {
      setSelectedApiaryId(id)
      setTbrOverride(null)
    },
    vegOptions,
    springVegId,
    summerVegId,
    setSpringVegId: chooseSpring,
    setSummerVegId: chooseSummer,
    resolvedSpring,
    resolvedSummer,
    constants,
    setConstants,
    frameStandards,
    frameStandardId,
    setFrameStandardId,
    broodUtilisation,
    setBroodUtilisation,
    effectiveCellsPerFrame,
    method,
    setMethod,
    precocious,
    setPrecocious,
    tbrOverride,
    setTbrOverride,
    springFloor,
    setSpringFloor,
    swarmSeason,
    setSwarmSeasonStart: (d) => {
      setSwarmSeasonStart(d)
      setTbrOverride(null)
    },
    forecastForagingDays,
    forecastDays: FORECAST_DAYS,
    result,
    foodPlan,
    loading,
    error,
    noProjection,
  }
}
