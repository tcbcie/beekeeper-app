import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type { Apiary } from '@/types/apiary'
import { normaliseStoragePublicUrl } from '@/lib/storage-url'

interface ApiaryHive {
  id: string
  hive_number: string
  status: string
  is_queenless: boolean
  queenless_reason: string | null
  archived_at: string | null
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
  isOwner: boolean
  fetchApiaryData: (currentUserId: string) => Promise<void>
}

export function useApiaryDetail(apiaryId: string): UseApiaryDetailReturn {
  const toast = useToast()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
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

  const fetchApiaryData = useCallback(async (currentUserId: string) => {
    setLoading(true)
    try {
      // Fetch apiary details
      const { data: apiaryData, error: apiaryError } = await supabase
        .from('apiaries')
        .select('*')
        .eq('id', apiaryId)
        .single()

      if (apiaryError) throw apiaryError
      if (!mountedRef.current) return
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
      if (!mountedRef.current) return

      const hivesArr = (hivesData || []) as ApiaryHive[]
      setHives(hivesArr)

      // Calculate stats
      const active = hivesArr.filter(h => !h.archived_at).length
      const archived = hivesArr.filter(h => h.archived_at).length

      // Fetch latest inspection across all hives in this apiary
      const hiveIds = hivesArr.map(h => h.id)
      let lastInspDate: string | null = null
      const records: ApiaryRecentRecord[] = []

      if (hiveIds.length > 0) {
        const [inspRes, treatRes, checkRes, feedRes, harvestRes] = await Promise.all([
          supabase.from('inspections').select('id, inspection_date, hive_id, hives(hive_number)').in('hive_id', hiveIds).order('inspection_date', { ascending: false }).limit(5),
          supabase.from('varroa_treatments').select('id, treatment_date, hive_id, hives(hive_number)').in('hive_id', hiveIds).order('treatment_date', { ascending: false }).limit(3),
          supabase.from('varroa_checks').select('id, check_date, hive_id, hives(hive_number)').in('hive_id', hiveIds).order('check_date', { ascending: false }).limit(3),
          supabase.from('feedings').select('id, feed_date, hive_id, hives(hive_number)').in('hive_id', hiveIds).order('feed_date', { ascending: false }).limit(3),
          supabase.from('harvests').select('id, harvest_date, hive_id, hives(hive_number)').in('hive_id', hiveIds).order('harvest_date', { ascending: false }).limit(3),
        ])

        if (!mountedRef.current) return

        if (inspRes.error) console.error('Failed to fetch inspections:', inspRes.error)
        if (treatRes.error) console.error('Failed to fetch treatments:', treatRes.error)
        if (checkRes.error) console.error('Failed to fetch varroa checks:', checkRes.error)
        if (feedRes.error) console.error('Failed to fetch feedings:', feedRes.error)
        if (harvestRes.error) console.error('Failed to fetch harvests:', harvestRes.error)

        type RecordRow = { id: string; hive_id: string; hives: { hive_number: string }[] }

        ;(inspRes.data || []).forEach((r: RecordRow & { inspection_date: string }) => {
          records.push({ id: r.id, date: r.inspection_date, type: 'Inspection', hive_number: r.hives?.[0]?.hive_number || '', hive_id: r.hive_id })
        })
        ;(treatRes.data || []).forEach((r: RecordRow & { treatment_date: string }) => {
          records.push({ id: r.id, date: r.treatment_date, type: 'Treatment', hive_number: r.hives?.[0]?.hive_number || '', hive_id: r.hive_id })
        })
        ;(checkRes.data || []).forEach((r: RecordRow & { check_date: string }) => {
          records.push({ id: r.id, date: r.check_date, type: 'Varroa Check', hive_number: r.hives?.[0]?.hive_number || '', hive_id: r.hive_id })
        })
        ;(feedRes.data || []).forEach((r: RecordRow & { feed_date: string }) => {
          records.push({ id: r.id, date: r.feed_date, type: 'Feeding', hive_number: r.hives?.[0]?.hive_number || '', hive_id: r.hive_id })
        })
        ;(harvestRes.data || []).forEach((r: RecordRow & { harvest_date: string }) => {
          records.push({ id: r.id, date: r.harvest_date, type: 'Harvest', hive_number: r.hives?.[0]?.hive_number || '', hive_id: r.hive_id })
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
      console.error('Error fetching apiary data:', error)
      toast.error('Failed to load apiary details')
    } finally {
      setLoading(false)
    }
  }, [apiaryId, toast])

  return {
    apiary,
    hives,
    recentRecords,
    stats,
    loading,
    isOwner,
    fetchApiaryData,
  }
}
