import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type {
  Queen,
  QueenReport,
  ReportTimeWindow,
  SisterSummary,
  TraitAverages,
  LatestInspectionSnapshot,
} from '@/types/queen'

interface QueenParent {
  id: string
  queen_number: string
  marking_color: string
}

interface QueenHive {
  id: string
  hive_number: string
  apiary_name: string | null
}

interface QueenOffspring {
  id: string
  queen_number: string
  birth_date: string
  status: string
  marking_color: string
}

interface QueenSighting {
  id: string
  inspection_date: string
  queen_seen: boolean
  eggs_present: boolean
  hive_number: string
  hive_id: string
}

interface UseQueenDetailReturn {
  queen: Queen | null
  hive: QueenHive | null
  offspring: QueenOffspring[]
  sightings: QueenSighting[]
  loading: boolean
  isOwner: boolean
  fetchQueenData: (currentUserId: string) => Promise<void>
  fetchQueenReport: (
    motherId: string | null | undefined,
    queenId: string,
    hiveId: string | null,
    range: ReportTimeWindow
  ) => Promise<QueenReport>
}

const EMPTY_AVERAGES: TraitAverages = {
  docility: null,
  population: null,
  brood_pattern: null,
  calmness: null,
  swarm_tendency: null,
  n: 0,
}

const DISEASE_COLUMNS: { col: string; label: string }[] = [
  { col: 'afb_disease', label: 'AFB' },
  { col: 'efb_disease', label: 'EFB' },
  { col: 'chalkbrood_disease', label: 'Chalkbrood' },
  { col: 'nosemosis_disease', label: 'Nosemosis' },
  { col: 'dwv_disease', label: 'DWV' },
  { col: 'iapv_cbpv_disease', label: 'IAPV/CBPV' },
]

// Compute "today minus N days" entirely in UTC so the cutoff is stable across
// timezones and won't drift by a day around local midnight.
const sinceForRange = (range: ReportTimeWindow): string | null => {
  if (range === 'all') return null
  const days = range === '30' ? 30 : 90
  const now = new Date()
  const utcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - days * 24 * 60 * 60 * 1000
  return new Date(utcMs).toISOString().slice(0, 10)
}

interface InspectionRatingRow {
  temperament_rating: number | null
  population_strength: number | null
  brood_pattern_rating: number | null
  calmness: number | null
  swarming_tendency: number | null
}

const averageRatings = (rows: InspectionRatingRow[]): TraitAverages => {
  const sums = { docility: 0, population: 0, brood_pattern: 0, calmness: 0, swarm_tendency: 0 }
  const counts = { docility: 0, population: 0, brood_pattern: 0, calmness: 0, swarm_tendency: 0 }
  let any = 0
  for (const r of rows) {
    let used = false
    if (r.temperament_rating != null) { sums.docility += r.temperament_rating; counts.docility++; used = true }
    if (r.population_strength != null) { sums.population += r.population_strength; counts.population++; used = true }
    if (r.brood_pattern_rating != null) { sums.brood_pattern += r.brood_pattern_rating; counts.brood_pattern++; used = true }
    if (r.calmness != null) { sums.calmness += r.calmness; counts.calmness++; used = true }
    if (r.swarming_tendency != null) { sums.swarm_tendency += r.swarming_tendency; counts.swarm_tendency++; used = true }
    if (used) any++
  }
  return {
    docility: counts.docility ? sums.docility / counts.docility : null,
    population: counts.population ? sums.population / counts.population : null,
    brood_pattern: counts.brood_pattern ? sums.brood_pattern / counts.brood_pattern : null,
    calmness: counts.calmness ? sums.calmness / counts.calmness : null,
    swarm_tendency: counts.swarm_tendency ? sums.swarm_tendency / counts.swarm_tendency : null,
    n: any,
  }
}

// Standalone report fetcher — no hook state required. Exported so non-hook
// callers (e.g. the queen comparison page) can reuse it without paying for
// an unused useQueenDetail() instance.
export async function fetchQueenReportData(
  motherId: string | null | undefined,
  targetQueenId: string,
  hiveId: string | null,
  range: ReportTimeWindow
): Promise<QueenReport> {
  const since = sinceForRange(range)

  // 1. Sisters (same mother, exclude self) — including hive/apiary/mating site
  let sisters: SisterSummary[] = []
  if (motherId) {
    const { data: sisterData, error: sisterErr } = await supabase
      .from('queens')
      .select('id, queen_number, marking_color, status, mated_date, mated_at_eircode, hives!queen_id(id, hive_number, apiaries(name))')
      .eq('mother_id', motherId)
      .neq('id', targetQueenId)
      .order('birth_date', { ascending: false })
    if (sisterErr) throw sisterErr
    sisters = (sisterData ?? []).map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = row as any
      const hiveData = Array.isArray(raw.hives) ? raw.hives[0] : raw.hives
      const apiaryData = hiveData?.apiaries
      const apiary = Array.isArray(apiaryData) ? apiaryData[0] : apiaryData
      return {
        id: raw.id,
        queen_number: raw.queen_number,
        marking_color: raw.marking_color,
        status: raw.status,
        mated_date: raw.mated_date ?? null,
        mated_at_eircode: raw.mated_at_eircode ?? null,
        hive_id: hiveData?.id ?? null,
        hive_number: hiveData?.hive_number ?? null,
        apiary_name: apiary?.name ?? null,
      }
    })
  }
  const sisterHiveIds = sisters
    .map((s) => s.hive_id)
    .filter((id): id is string => id !== null)

  // 2. Trait averages + latest snapshot for this queen's hive
  let traitAverages: TraitAverages = EMPTY_AVERAGES
  let latestSnapshot: LatestInspectionSnapshot | null = null
  if (hiveId) {
    let ratingsQuery = supabase
      .from('inspections')
      .select('temperament_rating, population_strength, brood_pattern_rating, calmness, swarming_tendency')
      .eq('hive_id', hiveId)
    if (since) ratingsQuery = ratingsQuery.gte('inspection_date', since)
    const { data: ratingRows, error: ratingErr } = await ratingsQuery
    if (ratingErr) throw ratingErr
    traitAverages = averageRatings((ratingRows ?? []) as InspectionRatingRow[])

    const diseaseCols = DISEASE_COLUMNS.map((d) => d.col).join(', ')
    const { data: latestRows, error: latestErr } = await supabase
      .from('inspections')
      .select(`inspection_date, queen_seen, eggs_present, ${diseaseCols}`)
      .eq('hive_id', hiveId)
      .order('inspection_date', { ascending: false })
      .limit(1)
    if (latestErr) throw latestErr
    if (latestRows && latestRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = latestRows[0] as any
      const flagged: string[] = []
      for (const d of DISEASE_COLUMNS) {
        if (typeof r[d.col] === 'number' && r[d.col] > 0) flagged.push(d.label)
      }
      latestSnapshot = {
        inspection_date: r.inspection_date,
        queen_seen: r.queen_seen ?? null,
        eggs_present: r.eggs_present ?? null,
        diseases: flagged,
      }
    }
  }

  // 3. Sister averages — combined across all sister hives
  let sisterAverages: TraitAverages = EMPTY_AVERAGES
  if (sisterHiveIds.length > 0) {
    let sisterQuery = supabase
      .from('inspections')
      .select('temperament_rating, population_strength, brood_pattern_rating, calmness, swarming_tendency')
      .in('hive_id', sisterHiveIds)
    if (since) sisterQuery = sisterQuery.gte('inspection_date', since)
    const { data: sRows, error: sErr } = await sisterQuery
    if (sErr) throw sErr
    sisterAverages = averageRatings((sRows ?? []) as InspectionRatingRow[])
  }

  return { sisters, traitAverages, sisterAverages, latestSnapshot }
}

export function useQueenDetail(queenId: string): UseQueenDetailReturn {
  const toast = useToast()
  const [queen, setQueen] = useState<Queen | null>(null)
  const [hive, setHive] = useState<QueenHive | null>(null)
  const [offspring, setOffspring] = useState<QueenOffspring[]>([])
  const [sightings, setSightings] = useState<QueenSighting[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const requestIdRef = useRef(0)

  const fetchQueenData = useCallback(async (currentUserId: string) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setLoading(true)
    setQueen(null)
    setHive(null)
    setOffspring([])
    setSightings([])
    setIsOwner(false)

    try {
      // Fetch queen with relations
      const { data: queenData, error: queenError } = await supabase
        .from('queens')
        .select(`
          *,
          batch:rearing_batches!batch_id(id, batch_name),
          hives!queen_id(id, hive_number, apiaries(name))
        `)
        .eq('id', queenId)
        .single()

      if (queenError) throw queenError
      if (!queenData) throw new Error('Queen not found')

      const [motherRes, fatherRes] = await Promise.all([
        queenData.mother_id
          ? supabase
              .from('queens')
              .select('id, queen_number, marking_color')
              .eq('id', queenData.mother_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        queenData.father_id
          ? supabase
              .from('queens')
              .select('id, queen_number, marking_color')
              .eq('id', queenData.father_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (motherRes.error) throw motherRes.error
      if (fatherRes.error) throw fatherRes.error

      if (requestIdRef.current !== requestId) return

      const queenWithParents: Queen = {
        ...(queenData as Queen),
        mother: (motherRes.data as QueenParent | null) ?? null,
        father: (fatherRes.data as QueenParent | null) ?? null,
      }

      setQueen(queenWithParents)
      setIsOwner(queenData.user_id === currentUserId)

      const hiveData = queenData.hives
      const assignedHive = Array.isArray(hiveData) ? hiveData[0] : hiveData
      let assignedHiveId: string | null = null
      if (assignedHive?.id) {
        assignedHiveId = assignedHive.id
        setHive({
          id: assignedHive.id,
          hive_number: assignedHive.hive_number,
          apiary_name: Array.isArray(assignedHive.apiaries)
            ? assignedHive.apiaries[0]?.name || null
            : assignedHive.apiaries?.name || null,
        })
      }

      const offspringRes = await supabase.from('queens')
        .select('id, queen_number, birth_date, status, marking_color')
        .eq('mother_id', queenId)
        .order('birth_date', { ascending: false })

      if (requestIdRef.current !== requestId) return

      if (offspringRes.error) {
        console.error('Error fetching offspring:', offspringRes.error)
        setOffspring([])
      } else {
        setOffspring((offspringRes.data || []) as QueenOffspring[])
      }

      if (assignedHiveId) {
        const sightingsRes = await supabase.from('inspections')
          .select('id, inspection_date, queen_seen, eggs_present, hive_id, hives(hive_number)')
          .eq('hive_id', assignedHiveId)
          .order('inspection_date', { ascending: false })
          .limit(10)

        const sightingData = ((sightingsRes.data || []) as Array<{
          id: string
          inspection_date: string
          queen_seen: boolean
          eggs_present: boolean
          hive_id: string
          hives: { hive_number: string }[]
        }>).map(s => ({
          id: s.id,
          inspection_date: s.inspection_date,
          queen_seen: s.queen_seen,
          eggs_present: s.eggs_present,
          hive_number: s.hives?.[0]?.hive_number || '',
          hive_id: s.hive_id,
        }))

        if (requestIdRef.current !== requestId) return

        if (sightingsRes.error) {
          console.error('Error fetching queen sightings:', sightingsRes.error)
          setSightings([])
        } else {
          setSightings(sightingData)
        }
      }

    } catch (error) {
      if (requestIdRef.current !== requestId) return
      console.error('Error fetching queen data:', error)
      toast.error('Failed to load queen details')
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false)
      }
    }
  }, [queenId, toast])

  return {
    queen,
    hive,
    offspring,
    sightings,
    loading,
    isOwner,
    fetchQueenData,
    // Module-level reference is already stable; no useCallback needed.
    fetchQueenReport: fetchQueenReportData,
  }
}
