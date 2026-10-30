import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type { Apiary } from '@/types/apiary'
import { normaliseStoragePublicUrl } from '@/lib/storage-url'
import { firstOf } from '@/lib/embed'

interface ApiaryHive {
  id: string
  hive_number: string
  status: string
  is_queenless: boolean
  queenless_reason: string | null
  archived_at: string | null
  /** Latest inspection, absent when none was found; not proof that none exists */
  last_inspection_date?: string
  /** A treatment with a removal planned and no removal recorded */
  active_treatment?: { type: string; removal_date: string }
  queens?: {
    id: string
    queen_number: string
    marking_color?: string
  }[]
}

interface ApiaryRecentRecord {
  id: string
  date: string
  type: string
  hive_number: string
  hive_id: string
}

interface ApiaryStats {
  totalHives: number
  activeHives: number
  archivedHives: number
  lastInspectionDate: string | null
}

interface UseApiaryDetailReturn {
  apiary: Apiary | null
  hives: ApiaryHive[]
  recentRecords: ApiaryRecentRecord[]
  stats: ApiaryStats
  loading: boolean
  /** The load failed for a reason other than "no such apiary" (e.g. offline). */
  loadError: boolean
  isOwner: boolean
  fetchApiaryData: (currentUserId: string) => Promise<void>
}

export function useApiaryDetail(apiaryId: string): UseApiaryDetailReturn {
  const toast = useToast()
  // Each load is numbered; only the latest may update state, and unmounting retires them all (C7a-13)
  const fetchSeqRef = useRef(0)

  useEffect(() => {
    const seqRef = fetchSeqRef
    return () => { seqRef.current += 1 }
  }, [])

  const [apiary, setApiary] = useState<Apiary | null>(null)
  const [hives, setHives] = useState<ApiaryHive[]>([])
  const [recentRecords, setRecentRecords] = useState<ApiaryRecentRecord[]>([])
  const [stats, setStats] = useState<ApiaryStats>({
    totalHives: 0,
    activeHives: 0,
    archivedHives: 0,
    lastInspectionDate: null,
  })
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const fetchApiaryData = useCallback(async (currentUserId: string) => {
    const seq = ++fetchSeqRef.current
    const isCurrent = () => seq === fetchSeqRef.current
    setLoading(true)
    setLoadError(false)
    try {
      // Fetch apiary details
      const { data: apiaryData, error: apiaryError } = await supabase
        .from('apiaries')
        .select('*')
        .eq('id', apiaryId)
        .single()

      if (apiaryError) throw apiaryError
      if (!isCurrent()) return
      setApiary({
        ...apiaryData,
        image_url: normaliseStoragePublicUrl(apiaryData.image_url)
      })
      setIsOwner(apiaryData.user_id === currentUserId)

      // Fetch hives in this apiary
      const { data: hivesData, error: hivesError } = await supabase
        .from('hives')
        .select('id, hive_number, status, is_queenless, queenless_reason, archived_at, queens(id, queen_number, marking_color)')
        .eq('apiary_id', apiaryId)
        .order('hive_number')

      if (hivesError) throw hivesError
      if (!isCurrent()) return

      // hives.queen_id → queens is a to-one embed: it arrives as one object (or null), while
      // the page reads `queens[0]`. Normalise it to the array shape here, as useApiaryMap does.
      type QueenRef = NonNullable<ApiaryHive['queens']>[number]
      type HiveRow = Omit<ApiaryHive, 'queens'> & { queens?: QueenRef | QueenRef[] | null }
      const hivesArr: ApiaryHive[] = ((hivesData || []) as HiveRow[]).map(h => {
        const queen = firstOf(h.queens)
        return { ...h, queens: queen ? [queen] : [] }
      })
      setHives(hivesArr)

      // Calculate stats
      const active = hivesArr.filter(h => !h.archived_at).length
      const archived = hivesArr.filter(h => h.archived_at).length

      // Fetch latest inspection across all hives in this apiary
      const hiveIds = hivesArr.map(h => h.id)
      let lastInspDate: string | null = null
      const records: ApiaryRecentRecord[] = []

      if (hiveIds.length > 0) {
        const [inspRes, treatRes, checkRes, feedRes, harvestRes, hiveInspRes, activeTreatRes] = await Promise.all([
          supabase.from('inspections').select('id, inspection_date, hive_id, hives(hive_number)').in('hive_id', hiveIds).order('inspection_date', { ascending: false }).limit(5),
          supabase.from('varroa_treatments').select('id, treatment_date, hive_id, hives(hive_number)').in('hive_id', hiveIds).order('treatment_date', { ascending: false }).limit(3),
          supabase.from('varroa_checks').select('id, check_date, hive_id, hives(hive_number)').in('hive_id', hiveIds).order('check_date', { ascending: false }).limit(3),
          supabase.from('feedings').select('id, feed_date, hive_id, hives(hive_number)').in('hive_id', hiveIds).order('feed_date', { ascending: false }).limit(3),
          supabase.from('harvests').select('id, harvest_date, hive_id, hives(hive_number)').in('hive_id', hiveIds).order('harvest_date', { ascending: false }).limit(3),
          supabase.from('inspections').select('hive_id, inspection_date').in('hive_id', hiveIds).order('inspection_date', { ascending: false }).limit(500),
          supabase.from('varroa_treatments').select('hive_id, treatment_type, planned_removal_date').in('hive_id', hiveIds).is('removed_date', null).not('planned_removal_date', 'is', null).order('treatment_date', { ascending: false }),
        ])

        if (!isCurrent()) return

        if (inspRes.error) console.error('Failed to fetch inspections:', inspRes.error)
        if (treatRes.error) console.error('Failed to fetch treatments:', treatRes.error)
        if (checkRes.error) console.error('Failed to fetch varroa checks:', checkRes.error)
        if (feedRes.error) console.error('Failed to fetch feedings:', feedRes.error)
        if (harvestRes.error) console.error('Failed to fetch harvests:', harvestRes.error)
        if (hiveInspRes.error) console.error('Failed to fetch hive inspections:', hiveInspRes.error)
        if (activeTreatRes.error) console.error('Failed to fetch active treatments:', activeTreatRes.error)
        // Say so, rather than let "No inspections yet" or an empty Recent Activity pass as fact
        if (inspRes.error || treatRes.error || checkRes.error || feedRes.error || harvestRes.error || hiveInspRes.error || activeTreatRes.error) {
          toast.warning("Some recent records couldn't be loaded.")
        }

        // Each list is newest first, so the first row seen for a hive is its latest
        const lastInspection = new Map<string, string>()
        for (const row of (hiveInspRes.data || []) as { hive_id: string; inspection_date: string }[]) {
          if (!lastInspection.has(row.hive_id)) lastInspection.set(row.hive_id, row.inspection_date)
        }
        const activeTreatment = new Map<string, { type: string; removal_date: string }>()
        for (const row of (activeTreatRes.data || []) as { hive_id: string; treatment_type: string; planned_removal_date: string }[]) {
          if (!activeTreatment.has(row.hive_id)) activeTreatment.set(row.hive_id, { type: row.treatment_type, removal_date: row.planned_removal_date })
        }
        setHives(hivesArr.map(hive => ({
          ...hive,
          last_inspection_date: lastInspection.get(hive.id),
          active_treatment: activeTreatment.get(hive.id),
        })))

        // record.hive_id → hives is a to-one embed, so it arrives as one object.
        type RecordRow = { id: string; hive_id: string; hives: { hive_number: string } | { hive_number: string }[] | null }

        ;(inspRes.data || []).forEach((r: RecordRow & { inspection_date: string }) => {
          records.push({ id: r.id, date: r.inspection_date, type: 'Inspection', hive_number: firstOf(r.hives)?.hive_number || '', hive_id: r.hive_id })
        })
        ;(treatRes.data || []).forEach((r: RecordRow & { treatment_date: string }) => {
          records.push({ id: r.id, date: r.treatment_date, type: 'Treatment', hive_number: firstOf(r.hives)?.hive_number || '', hive_id: r.hive_id })
        })
        ;(checkRes.data || []).forEach((r: RecordRow & { check_date: string }) => {
          records.push({ id: r.id, date: r.check_date, type: 'Varroa Check', hive_number: firstOf(r.hives)?.hive_number || '', hive_id: r.hive_id })
        })
        ;(feedRes.data || []).forEach((r: RecordRow & { feed_date: string }) => {
          records.push({ id: r.id, date: r.feed_date, type: 'Feeding', hive_number: firstOf(r.hives)?.hive_number || '', hive_id: r.hive_id })
        })
        ;(harvestRes.data || []).forEach((r: RecordRow & { harvest_date: string }) => {
          records.push({ id: r.id, date: r.harvest_date, type: 'Harvest', hive_number: firstOf(r.hives)?.hive_number || '', hive_id: r.hive_id })
        })

        records.sort((a, b) => {
          const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
          if (diff !== 0) return diff
          return a.type.localeCompare(b.type) // Stable sort for same-date records
        })

        if (inspRes.data && inspRes.data.length > 0) {
          lastInspDate = (inspRes.data[0] as { inspection_date: string }).inspection_date
        }
      }

      setRecentRecords(records.slice(0, 5))
      setStats({
        totalHives: hivesArr.length,
        activeHives: active,
        archivedHives: archived,
        lastInspectionDate: lastInspDate,
      })
    } catch (error) {
      if (!isCurrent()) return
      console.error('Error fetching apiary data:', error)
      // PGRST116 = no row visible: the apiary doesn't exist or isn't shared, so "not found" is
      // right. Anything else (offline, timeout) is a load failure, not a missing apiary (C7a-12).
      if ((error as { code?: string } | null)?.code !== 'PGRST116') {
        setLoadError(true)
        toast.error('Failed to load apiary details')
      }
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [apiaryId, toast])

  return {
    apiary,
    hives,
    recentRecords,
    stats,
    loading,
    loadError,
    isOwner,
    fetchApiaryData,
  }
}
