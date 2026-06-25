'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateGDDFromDaily, type OpenMeteoDaily } from '@/lib/gdd'
import { DEFAULT_TBR_CONSTANTS, type TbrConstants, type InterventionMethod, type ResolvedCropDate } from '@/types/tbr'
import {
  dayDiff,
  planFromResolved,
  rebuildFoodBudget,
  resolveCropDate,
  SPRING_CROP_DURATION_DAYS,
  SUMMER_FLOW_DURATION_DAYS,
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
  /** Which brood-break intervention to model. */
  method: InterventionMethod
  setMethod: (m: InterventionMethod) => void
  /** When true, model precocious foraging after the break (faster recovery). */
  precocious: boolean
  setPrecocious: (v: boolean) => void
  tbrOverride: string | null
  setTbrOverride: (d: string | null) => void
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

export function useTbrPlanner(userId: string): UseTbrPlannerReturn {
  const [apiaries, setApiaries] = useState<ApiaryOption[]>([])
  const [selectedApiaryId, setSelectedApiaryId] = useState<string | null>(null)
  const [vegInfo, setVegInfo] = useState<VegInfoLite[]>([])
  const [records, setRecords] = useState<GddRecordLite[]>([])
  const [proj, setProj] = useState<ProjectionContext | null>(null)
  const [springVegId, setSpringVegId] = useState<string | null>(null)
  const [summerVegId, setSummerVegId] = useState<string | null>(null)
  const [constants, setConstants] = useState<TbrConstants>(DEFAULT_TBR_CONSTANTS)
  const [method, setMethodState] = useState<InterventionMethod>('tbr')
  const [precocious, setPrecocious] = useState(false)
  const [tbrOverride, setTbrOverride] = useState<string | null>(null)

  // Switching method invalidates a hand-picked date (the feasible window differs).
  const setMethod = useCallback((m: InterventionMethod) => {
    setMethodState(m)
    setTbrOverride(null)
  }, [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noProjection, setNoProjection] = useState(false)

  // Track whether the user has manually chosen crops, so auto-defaults don't override them.
  const userPickedSpring = useRef(false)
  const userPickedSummer = useRef(false)

  const chooseSpring = useCallback((id: string) => {
    userPickedSpring.current = true
    setSpringVegId(id)
    setTbrOverride(null)
  }, [])
  const chooseSummer = useCallback((id: string) => {
    userPickedSummer.current = true
    setSummerVegId(id)
    setTbrOverride(null)
  }, [])

  // Load apiaries + vegetation reference data once.
  useEffect(() => {
    if (!userId) return
    let active = true

    async function loadStatic() {
      setError(null)
      const [apiaryRes, vegTypeRes, vegInfoRes, recCountRes] = await Promise.all([
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
      if (apiaryList.length > 0) setSelectedApiaryId((prev) => prev ?? defaultApiary.id)

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
  }, [userId])

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

      // Flag when nothing can be projected (no coords AND no usable records).
      const hasThisYearObserved = recs.some((r) => r.year === now.getFullYear() && r.startDate)
      if (ctx.accumulatedGdd == null && !hasThisYearObserved) setNoProjection(true)
    }

    loadApiary(selectedApiaryId)
    return () => {
      active = false
      controller.abort()
    }
  }, [selectedApiaryId, apiaries])

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
      precocious ? PRECOCIOUS_ACCEL_DAYS : 0
    )
  }, [resolvedSpring, resolvedSummer, constants, tbrOverride, method, precocious])

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
    const budget = rebuildFoodBudget(constants, dayDiff(effectiveTbrDate, recoveryDate), method)

    // Earliest worthwhile nectar source predicted at/after the break.
    const next = nectarBlooms.find((b) => b.date >= effectiveTbrDate) ?? null
    const nextNectarDate = next?.date ?? null
    const nextNectarName = next?.name ?? null

    const incomeBeforeRecovery = nextNectarDate != null && nextNectarDate <= recoveryDate
    return { budget, nextNectarDate, nextNectarName, incomeBeforeRecovery, recoveryDate }
  }, [result, constants, method, nectarBlooms])

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
    method,
    setMethod,
    precocious,
    setPrecocious,
    tbrOverride,
    setTbrOverride,
    result,
    foodPlan,
    loading,
    error,
    noProjection,
  }
}
