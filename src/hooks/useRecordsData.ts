'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  Inspection,
  VarroaTreatment,
  VarroaCheck,
  Feeding,
  Harvest,
  ArchiveRecord,
  Hive,
  Apiary,
  TreatmentProduct,
  OwnershipFilter,
  DropdownValue
} from '@/types/records'

interface UseRecordsDataReturn {
  // Data
  inspections: Inspection[]
  varroaTreatments: VarroaTreatment[]
  varroaChecks: VarroaCheck[]
  feedings: Feeding[]
  harvests: Harvest[]
  archiveRecords: ArchiveRecord[]
  hives: Hive[]
  apiaries: Apiary[]

  // Options for dropdowns
  checkMethodOptions: string[]
  feedTypeOptions: string[]
  treatmentProducts: TreatmentProduct[]
  archiveReasons: Array<{ id: string; value: string }>
  applicationMethods: DropdownValue[]

  // State
  loading: boolean
  isTeamMember: boolean
  sharedHiveIds: string[]

  // Fetch functions
  fetchInspections: (userId: string, ownershipFilter: OwnershipFilter) => Promise<void>
  fetchVarroaTreatments: (userId: string) => Promise<void>
  fetchVarroaChecks: (userId: string) => Promise<void>
  fetchFeedings: (userId: string) => Promise<void>
  fetchHarvests: (userId: string) => Promise<void>
  fetchArchiveRecords: (userId: string) => Promise<void>
  fetchHives: (userId: string) => Promise<void>
  fetchApiaries: (userId: string) => Promise<void>
  fetchAllOptions: () => Promise<void>
  fetchAllData: (userId: string, ownershipFilter: OwnershipFilter) => Promise<void>
}

// Helper to extract team hive IDs from nested Supabase response
type TeamData = {
  teams?: {
    team_apiaries?: Array<{
      apiaries?: {
        hives?: Array<{ id: string; user_id?: string }>
      }
    }>
  }
}

function extractTeamHiveIds(sharedHiveData: TeamData[] | null, currentUserId?: string): {
  teamHiveIds: string[]
  allTeamHiveIds: string[]
} {
  const teamHiveIds: string[] = []
  const allTeamHiveIds: string[] = []

  if (sharedHiveData) {
    sharedHiveData.forEach(tm => {
      if (tm.teams?.team_apiaries) {
        tm.teams.team_apiaries.forEach(ta => {
          if (ta.apiaries?.hives) {
            ta.apiaries.hives.forEach(h => {
              if (h.id) {
                allTeamHiveIds.push(h.id)
                if (currentUserId && h.user_id !== currentUserId) {
                  teamHiveIds.push(h.id)
                } else if (!currentUserId) {
                  teamHiveIds.push(h.id)
                }
              }
            })
          }
        })
      }
    })
  }

  return { teamHiveIds, allTeamHiveIds }
}

async function getAccessibleHiveIds(userId: string): Promise<{
  ownHiveIds: string[]
  teamHiveIds: string[]
  allTeamHiveIds: string[]
}> {
  // Fetch user's own hive IDs
  const { data: ownHivesData } = await supabase
    .from('hives')
    .select('id')
    .eq('user_id', userId)

  const ownHiveIds = ownHivesData?.map(h => h.id) || []

  // Get shared hive IDs (hives in team apiaries)
  const { data: sharedHiveData } = await supabase
    .from('team_members')
    .select(`
      team_id,
      teams!inner(
        team_apiaries!inner(
          apiary_id,
          apiaries!inner(
            hives!inner(id, user_id)
          )
        )
      )
    `)
    .eq('user_id', userId)

  const { teamHiveIds, allTeamHiveIds } = extractTeamHiveIds(
    sharedHiveData as TeamData[] | null,
    userId
  )

  return { ownHiveIds, teamHiveIds, allTeamHiveIds }
}

export function useRecordsData(): UseRecordsDataReturn {
  // Data state
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [varroaTreatments, setVarroaTreatments] = useState<VarroaTreatment[]>([])
  const [varroaChecks, setVarroaChecks] = useState<VarroaCheck[]>([])
  const [feedings, setFeedings] = useState<Feeding[]>([])
  const [harvests, setHarvests] = useState<Harvest[]>([])
  const [archiveRecords, setArchiveRecords] = useState<ArchiveRecord[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])

  // Options state
  const [checkMethodOptions, setCheckMethodOptions] = useState<string[]>([])
  const [feedTypeOptions, setFeedTypeOptions] = useState<string[]>([])
  const [treatmentProducts, setTreatmentProducts] = useState<TreatmentProduct[]>([])
  const [archiveReasons, setArchiveReasons] = useState<Array<{ id: string; value: string }>>([])
  const [applicationMethods, setApplicationMethods] = useState<DropdownValue[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [isTeamMember, setIsTeamMember] = useState(false)
  const [sharedHiveIds, setSharedHiveIds] = useState<string[]>([])

  const fetchInspections = useCallback(async (userId: string, ownershipFilter: OwnershipFilter) => {
    const { ownHiveIds, teamHiveIds, allTeamHiveIds } = await getAccessibleHiveIds(userId)

    setSharedHiveIds(allTeamHiveIds)

    let query = supabase
      .from('inspections')
      .select('*, hives(hive_number, apiaries(eircode)), profiles!inspections_user_id_fkey(first_name, last_name, email)')

    // Apply ownership filter
    if (ownershipFilter === 'my') {
      if (ownHiveIds.length === 0) {
        setInspections([])
        setLoading(false)
        return
      }
      query = query.in('hive_id', ownHiveIds)
    } else if (ownershipFilter === 'team') {
      if (teamHiveIds.length === 0) {
        setInspections([])
        setLoading(false)
        return
      }
      query = query.in('hive_id', teamHiveIds)
    } else {
      const allAccessibleHiveIds = [...ownHiveIds, ...teamHiveIds]
      if (allAccessibleHiveIds.length === 0) {
        setInspections([])
        setLoading(false)
        return
      }
      query = query.in('hive_id', allAccessibleHiveIds)
    }

    const { data } = await query
      .order('inspection_date', { ascending: false })
      .limit(500)

    // Fallback profile fetch if foreign key fails
    if (data && data.length > 0 && !data[0].profiles) {
      const userIds = [...new Set(data.map(i => i.user_id).filter(Boolean))]
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds)

        if (profilesData) {
          const profilesMap = new Map(profilesData.map(p => [p.id, p]))
          data.forEach((inspection: Inspection) => {
            if (inspection.user_id) {
              const profile = profilesMap.get(inspection.user_id)
              if (profile) {
                inspection.profiles = {
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                  email: profile.email
                }
              }
            }
          })
        }
      }
    }

    if (data) setInspections(data as Inspection[])
    setLoading(false)
  }, [])

  const fetchVarroaTreatments = useCallback(async (userId: string) => {
    const { ownHiveIds, allTeamHiveIds } = await getAccessibleHiveIds(userId)
    setSharedHiveIds(allTeamHiveIds)

    const allAccessibleHiveIds = [...ownHiveIds, ...allTeamHiveIds]
    if (allAccessibleHiveIds.length === 0) {
      setVarroaTreatments([])
      return
    }

    const { data } = await supabase
      .from('varroa_treatments')
      .select('*, hives(hive_number, apiary_id), profiles(first_name, last_name, email), application_method:dropdown_values!varroa_treatments_application_method_id_fkey(value)')
      .in('hive_id', allAccessibleHiveIds)
      .order('treatment_date', { ascending: false })
      .limit(500)

    if (data) setVarroaTreatments(data as VarroaTreatment[])
  }, [])

  const fetchVarroaChecks = useCallback(async (userId: string) => {
    const { ownHiveIds, allTeamHiveIds } = await getAccessibleHiveIds(userId)
    setSharedHiveIds(allTeamHiveIds)

    const allAccessibleHiveIds = [...ownHiveIds, ...allTeamHiveIds]
    if (allAccessibleHiveIds.length === 0) {
      setVarroaChecks([])
      return
    }

    const { data } = await supabase
      .from('varroa_checks')
      .select('*, hives(hive_number), profiles(first_name, last_name, email)')
      .in('hive_id', allAccessibleHiveIds)
      .order('check_date', { ascending: false })
      .limit(500)

    if (data) setVarroaChecks(data as VarroaCheck[])
  }, [])

  const fetchFeedings = useCallback(async (userId: string) => {
    const { ownHiveIds, allTeamHiveIds } = await getAccessibleHiveIds(userId)
    setSharedHiveIds(allTeamHiveIds)

    const allAccessibleHiveIds = [...ownHiveIds, ...allTeamHiveIds]
    if (allAccessibleHiveIds.length === 0) {
      setFeedings([])
      return
    }

    const { data } = await supabase
      .from('feedings')
      .select('*, hives(hive_number), profiles(first_name, last_name, email)')
      .in('hive_id', allAccessibleHiveIds)
      .order('feed_date', { ascending: false })
      .limit(500)

    if (data) setFeedings(data as Feeding[])
  }, [])

  const fetchHarvests = useCallback(async (userId: string) => {
    const { ownHiveIds, allTeamHiveIds } = await getAccessibleHiveIds(userId)
    setSharedHiveIds(allTeamHiveIds)

    const allAccessibleHiveIds = [...ownHiveIds, ...allTeamHiveIds]
    if (allAccessibleHiveIds.length === 0) {
      setHarvests([])
      return
    }

    const { data } = await supabase
      .from('harvests')
      .select('*, hives(hive_number), profiles(first_name, last_name, email)')
      .in('hive_id', allAccessibleHiveIds)
      .order('harvest_date', { ascending: false })
      .limit(500)

    if (data) setHarvests(data as Harvest[])
  }, [])

  const fetchArchiveRecords = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('hives')
      .select(`
        id,
        hive_id:id,
        hive_number,
        archived_at,
        archive_reason_id,
        archive_notes,
        archive_reason_value:dropdown_values(value)
      `)
      .eq('user_id', userId)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('Error fetching archive records:', error)
      return
    }

    if (data) {
      const records = data.map(record => ({
        id: record.id,
        hive_id: record.hive_id,
        hive_number: record.hive_number,
        archived_at: record.archived_at || '',
        archive_reason_id: record.archive_reason_id,
        archive_notes: record.archive_notes,
        archive_reason_value: Array.isArray(record.archive_reason_value)
          ? record.archive_reason_value[0]?.value
          : (record.archive_reason_value as { value?: string } | undefined)?.value
      }))
      setArchiveRecords(records)
    }
  }, [])

  const fetchHives = useCallback(async (userId: string) => {
    // Fetch user's own hives
    const { data: ownHives } = await supabase
      .from('hives')
      .select('*')
      .eq('user_id', userId)
      .order('hive_number')

    // Fetch team memberships
    const { data: teamMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)

    const teamIds = teamMemberships?.map(tm => tm.team_id) || []
    setIsTeamMember(teamIds.length > 0)

    let sharedHives: Hive[] = []
    if (teamIds.length > 0) {
      const { data: teamApiaryData } = await supabase
        .from('team_apiaries')
        .select('apiary_id')
        .in('team_id', teamIds)

      const sharedApiaryIds = teamApiaryData?.map(ta => ta.apiary_id) || []

      if (sharedApiaryIds.length > 0) {
        const { data: sharedHivesData } = await supabase
          .from('hives')
          .select('*')
          .in('apiary_id', sharedApiaryIds)
          .order('hive_number')

        sharedHives = sharedHivesData || []
      }
    }

    // Combine and deduplicate
    const allHives = [...(ownHives || []), ...sharedHives]
    const uniqueHives = Array.from(
      new Map(allHives.map(h => [h.id, h])).values()
    ).sort((a, b) => a.hive_number.localeCompare(b.hive_number))

    setHives(uniqueHives as Hive[])
  }, [])

  const fetchApiaries = useCallback(async (userId: string) => {
    // Fetch user's own apiaries
    const { data: ownApiaries } = await supabase
      .from('apiaries')
      .select('id, name, user_id')
      .eq('user_id', userId)
      .order('name')

    // Fetch team memberships
    const { data: teamMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)

    const teamIds = teamMemberships?.map(tm => tm.team_id) || []

    let sharedApiaries: Apiary[] = []
    if (teamIds.length > 0) {
      const { data: teamApiaryData } = await supabase
        .from('team_apiaries')
        .select('apiary_id, apiaries(id, name, user_id)')
        .in('team_id', teamIds)

      if (teamApiaryData) {
        sharedApiaries = teamApiaryData
          .filter(ta => ta.apiaries)
          .map(ta => {
            const apiary = Array.isArray(ta.apiaries) ? ta.apiaries[0] : ta.apiaries
            return {
              id: apiary!.id,
              name: apiary!.name,
              is_shared: apiary!.user_id !== userId
            }
          })
          .filter(apiary => apiary.is_shared)
      }
    }

    const allApiaries = [
      ...(ownApiaries || []).map(a => ({ ...a, is_shared: false })),
      ...sharedApiaries
    ].sort((a, b) => a.name.localeCompare(b.name))

    setApiaries(allApiaries)
  }, [])

  const fetchCheckMethods = useCallback(async () => {
    try {
      const { data: category } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_key', 'varroa_check_method')
        .single()

      if (category) {
        const { data: values } = await supabase
          .from('dropdown_values')
          .select('value')
          .eq('category_id', category.id)
          .eq('is_active', true)
          .order('display_order')

        if (values) {
          setCheckMethodOptions(values.map(v => v.value))
        }
      }
    } catch {
      // Silently handle error
    }
  }, [])

  const fetchFeedTypes = useCallback(async () => {
    try {
      const { data: category } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_key', 'feed_type')
        .single()

      if (category) {
        const { data: values } = await supabase
          .from('dropdown_values')
          .select('value')
          .eq('category_id', category.id)
          .eq('is_active', true)
          .order('display_order')

        if (values) {
          setFeedTypeOptions(values.map(v => v.value))
        }
      }
    } catch {
      // Silently handle error
    }
  }, [])

  const fetchTreatmentProducts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('varroa_treatment_products')
        .select('*')
        .order('product_name')

      if (data) {
        setTreatmentProducts(data)
      }
    } catch {
      // Silently handle error
    }
  }, [])

  const fetchArchiveReasons = useCallback(async () => {
    try {
      const { data: category } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_key', 'archive_reason')
        .single()

      if (category) {
        const { data: values } = await supabase
          .from('dropdown_values')
          .select('id, value')
          .eq('category_id', category.id)
          .eq('is_active', true)
          .order('display_order')

        if (values) {
          setArchiveReasons(values)
        }
      }
    } catch {
      // Silently handle error
    }
  }, [])

  const fetchApplicationMethods = useCallback(async () => {
    try {
      const { data: category } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_key', 'application_method')
        .single()

      if (category) {
        const { data: values } = await supabase
          .from('dropdown_values')
          .select('id, value')
          .eq('category_id', category.id)
          .eq('is_active', true)
          .order('display_order')

        if (values) {
          setApplicationMethods(values)
        }
      }
    } catch {
      // Silently handle error
    }
  }, [])

  const fetchAllOptions = useCallback(async () => {
    await Promise.all([
      fetchCheckMethods(),
      fetchFeedTypes(),
      fetchTreatmentProducts(),
      fetchArchiveReasons(),
      fetchApplicationMethods()
    ])
  }, [fetchCheckMethods, fetchFeedTypes, fetchTreatmentProducts, fetchArchiveReasons, fetchApplicationMethods])

  const fetchAllData = useCallback(async (userId: string, ownershipFilter: OwnershipFilter) => {
    setLoading(true)
    await Promise.all([
      fetchInspections(userId, ownershipFilter),
      fetchVarroaTreatments(userId),
      fetchVarroaChecks(userId),
      fetchFeedings(userId),
      fetchHarvests(userId),
      fetchArchiveRecords(userId),
      fetchHives(userId),
      fetchApiaries(userId),
      fetchAllOptions()
    ])
    setLoading(false)
  }, [
    fetchInspections,
    fetchVarroaTreatments,
    fetchVarroaChecks,
    fetchFeedings,
    fetchHarvests,
    fetchArchiveRecords,
    fetchHives,
    fetchApiaries,
    fetchAllOptions
  ])

  return {
    // Data
    inspections,
    varroaTreatments,
    varroaChecks,
    feedings,
    harvests,
    archiveRecords,
    hives,
    apiaries,

    // Options
    checkMethodOptions,
    feedTypeOptions,
    treatmentProducts,
    archiveReasons,
    applicationMethods,

    // State
    loading,
    isTeamMember,
    sharedHiveIds,

    // Fetch functions
    fetchInspections,
    fetchVarroaTreatments,
    fetchVarroaChecks,
    fetchFeedings,
    fetchHarvests,
    fetchArchiveRecords,
    fetchHives,
    fetchApiaries,
    fetchAllOptions,
    fetchAllData
  }
}
