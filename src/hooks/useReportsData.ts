'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Hive } from '@/types/records'
import type {
  ApiaryWithEircode,
  BeekeeperProfile,
  DAFMTreatmentRecord,
  VarroaMonitoringRecord,
  InspectionSummaryRecord,
  HiveOverviewRecord,
  HarvestRecord,
  ArchivedHiveRecord
} from '@/types/reports'

interface UseReportsDataReturn {
  // Base data
  apiaries: ApiaryWithEircode[]
  hives: Hive[]
  profile: BeekeeperProfile | null
  loading: boolean

  // Fetch functions
  fetchBaseData: (userId: string) => Promise<void>
  fetchDAFMTreatments: (userId: string, apiaryId: string, startDate: string, endDate: string) => Promise<DAFMTreatmentRecord[]>
  fetchVarroaMonitoring: (userId: string, hiveId: string, startDate: string, endDate: string) => Promise<VarroaMonitoringRecord[]>
  fetchInspectionSummary: (userId: string, hiveId: string, startDate: string, endDate: string) => Promise<InspectionSummaryRecord[]>
  fetchApiaryOverview: (userId: string, apiaryId: string) => Promise<HiveOverviewRecord[]>
  fetchHarvestData: (userId: string, apiaryId: string, startDate: string, endDate: string) => Promise<HarvestRecord[]>
  fetchArchivedHives: (userId: string, apiaryId: string, startDate: string, endDate: string) => Promise<ArchivedHiveRecord[]>
}

export function useReportsData(): UseReportsDataReturn {
  const [apiaries, setApiaries] = useState<ApiaryWithEircode[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [profile, setProfile] = useState<BeekeeperProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBaseData = useCallback(async (userId: string) => {
    setLoading(true)
    try {
      // Fetch apiaries with eircode
      const { data: apiariesData } = await supabase
        .from('apiaries')
        .select('id, name, eircode, location')
        .eq('user_id', userId)
        .order('name')

      if (apiariesData) {
        setApiaries(apiariesData)
      }

      // Fetch hives
      const { data: hivesData } = await supabase
        .from('hives')
        .select('id, hive_number, apiary_id, status, archived_at, configuration')
        .eq('user_id', userId)
        .is('archived_at', null)
        .order('hive_number')

      if (hivesData) {
        setHives(hivesData as Hive[])
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .single()

      if (profileData) {
        setProfile(profileData)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDAFMTreatments = useCallback(async (
    userId: string,
    apiaryId: string,
    startDate: string,
    endDate: string
  ): Promise<DAFMTreatmentRecord[]> => {
    let query = supabase
      .from('varroa_treatments')
      .select(`
        treatment_date,
        treatment_type,
        batch_number,
        dosage,
        notes,
        hives!inner(
          hive_number,
          apiary_id,
          apiaries(name, eircode)
        ),
        application_method:dropdown_values!varroa_treatments_application_method_id_fkey(value)
      `)
      .eq('user_id', userId)
      .gte('treatment_date', startDate)
      .lte('treatment_date', endDate)
      .order('treatment_date', { ascending: false })

    if (apiaryId) {
      query = query.eq('hives.apiary_id', apiaryId)
    }

    const { data } = await query

    if (!data) return []

    return data.map((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hive = t.hives as any
      return {
        treatment_date: t.treatment_date,
        hive_number: hive?.hive_number || '',
        apiary_name: hive?.apiaries?.name || '',
        eircode: hive?.apiaries?.eircode || null,
        treatment_type: t.treatment_type,
        batch_number: t.batch_number,
        dosage: t.dosage,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        application_method: (t.application_method as any)?.value || null,
        notes: t.notes
      }
    })
  }, [])

  const fetchVarroaMonitoring = useCallback(async (
    userId: string,
    hiveId: string,
    startDate: string,
    endDate: string
  ): Promise<VarroaMonitoringRecord[]> => {
    const records: VarroaMonitoringRecord[] = []

    // Fetch checks
    let checksQuery = supabase
      .from('varroa_checks')
      .select('check_date, method, mites_count, infestation_rate, action_threshold_reached, hives(hive_number)')
      .eq('user_id', userId)
      .gte('check_date', startDate)
      .lte('check_date', endDate)

    if (hiveId) {
      checksQuery = checksQuery.eq('hive_id', hiveId)
    }

    const { data: checksData } = await checksQuery.order('check_date', { ascending: false })

    if (checksData) {
      checksData.forEach((c) => {
        const hive = c.hives as unknown as { hive_number: string } | null
        records.push({
          date: c.check_date,
          type: 'check',
          hive_number: hive?.hive_number || '',
          method: c.method,
          mites_count: c.mites_count,
          infestation_rate: c.infestation_rate,
          action_threshold_reached: c.action_threshold_reached
        })
      })
    }

    // Fetch treatments
    let treatmentsQuery = supabase
      .from('varroa_treatments')
      .select('treatment_date, treatment_type, dosage, hives(hive_number)')
      .eq('user_id', userId)
      .gte('treatment_date', startDate)
      .lte('treatment_date', endDate)

    if (hiveId) {
      treatmentsQuery = treatmentsQuery.eq('hive_id', hiveId)
    }

    const { data: treatmentsData } = await treatmentsQuery.order('treatment_date', { ascending: false })

    if (treatmentsData) {
      treatmentsData.forEach((t) => {
        const hive = t.hives as unknown as { hive_number: string } | null
        records.push({
          date: t.treatment_date,
          type: 'treatment',
          hive_number: hive?.hive_number || '',
          treatment_type: t.treatment_type,
          dosage: t.dosage
        })
      })
    }

    // Sort by date descending
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [])

  const fetchInspectionSummary = useCallback(async (
    userId: string,
    hiveId: string,
    startDate: string,
    endDate: string
  ): Promise<InspectionSummaryRecord[]> => {
    if (!hiveId) return []

    const { data } = await supabase
      .from('inspections')
      .select('inspection_date, queen_seen, eggs_present, brood_pattern_rating, temperament_rating, population_strength, honey_supers, notes')
      .eq('user_id', userId)
      .eq('hive_id', hiveId)
      .gte('inspection_date', startDate)
      .lte('inspection_date', endDate)
      .order('inspection_date', { ascending: false })

    if (!data) return []

    return data.map((i) => ({
      inspection_date: i.inspection_date,
      queen_seen: i.queen_seen,
      eggs_present: i.eggs_present,
      brood_pattern_rating: i.brood_pattern_rating,
      temperament_rating: i.temperament_rating,
      population_strength: i.population_strength,
      honey_supers: i.honey_supers,
      notes: i.notes
    }))
  }, [])

  const fetchApiaryOverview = useCallback(async (
    userId: string,
    apiaryId: string
  ): Promise<HiveOverviewRecord[]> => {
    if (!apiaryId) return []

    // Fetch hives in the apiary
    const { data: hivesData } = await supabase
      .from('hives')
      .select('id, hive_number, status')
      .eq('user_id', userId)
      .eq('apiary_id', apiaryId)
      .is('archived_at', null)
      .order('hive_number')

    if (!hivesData || hivesData.length === 0) return []

    // Fetch latest inspection for each hive
    const hiveIds = hivesData.map(h => h.id)
    const { data: inspectionsData } = await supabase
      .from('inspections')
      .select('hive_id, inspection_date, queen_seen, population_strength, notes')
      .in('hive_id', hiveIds)
      .order('inspection_date', { ascending: false })

    // Group by hive_id, taking only the latest
    const latestInspections = new Map<string, {
      inspection_date: string
      queen_seen: boolean
      population_strength: number
      notes: string
    }>()

    if (inspectionsData) {
      inspectionsData.forEach(i => {
        if (!latestInspections.has(i.hive_id)) {
          latestInspections.set(i.hive_id, {
            inspection_date: i.inspection_date,
            queen_seen: i.queen_seen,
            population_strength: i.population_strength,
            notes: i.notes
          })
        }
      })
    }

    return hivesData.map(h => {
      const inspection = latestInspections.get(h.id)
      return {
        hive_id: h.id,
        hive_number: h.hive_number,
        status: h.status,
        last_inspection_date: inspection?.inspection_date || null,
        queen_seen: inspection?.queen_seen ?? null,
        population_strength: inspection?.population_strength ?? null,
        notes: inspection?.notes || null
      }
    })
  }, [])

  const fetchHarvestData = useCallback(async (
    userId: string,
    apiaryId: string,
    startDate: string,
    endDate: string
  ): Promise<HarvestRecord[]> => {
    let query = supabase
      .from('harvests')
      .select('harvest_date, honey_weight, wax_weight, frames_harvested, floral_source, notes, hives!inner(hive_number, apiary_id)')
      .eq('user_id', userId)
      .gte('harvest_date', startDate)
      .lte('harvest_date', endDate)

    if (apiaryId) {
      query = query.eq('hives.apiary_id', apiaryId)
    }

    const { data } = await query.order('harvest_date', { ascending: false })

    if (!data) return []

    return data.map((h) => {
      const hive = h.hives as unknown as { hive_number: string } | null
      return {
        harvest_date: h.harvest_date,
        hive_number: hive?.hive_number || '',
        honey_weight: h.honey_weight,
        wax_weight: h.wax_weight,
        frames_harvested: h.frames_harvested,
        floral_source: h.floral_source,
        notes: h.notes
      }
    })
  }, [])

  const fetchArchivedHives = useCallback(async (
    userId: string,
    apiaryId: string,
    startDate: string,
    endDate: string
  ): Promise<ArchivedHiveRecord[]> => {
    let query = supabase
      .from('hives')
      .select(`
        id,
        hive_number,
        archived_at,
        archive_notes,
        apiaries!inner(name),
        archive_reason:dropdown_values!hives_archive_reason_id_fkey(value)
      `)
      .eq('user_id', userId)
      .not('archived_at', 'is', null)
      .gte('archived_at', startDate)
      .lte('archived_at', endDate)

    if (apiaryId) {
      query = query.eq('apiary_id', apiaryId)
    }

    const { data } = await query.order('archived_at', { ascending: false })

    if (!data) return []

    return data.map((h) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiary = h.apiaries as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reason = h.archive_reason as any
      return {
        hive_id: h.id,
        hive_number: h.hive_number,
        apiary_name: apiary?.name || '',
        archived_at: h.archived_at,
        archive_reason: reason?.value || null,
        archive_notes: h.archive_notes
      }
    })
  }, [])

  return {
    apiaries,
    hives,
    profile,
    loading,
    fetchBaseData,
    fetchDAFMTreatments,
    fetchVarroaMonitoring,
    fetchInspectionSummary,
    fetchApiaryOverview,
    fetchHarvestData,
    fetchArchivedHives
  }
}
