import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, formatDate, daysSince } from './utils'

// Get all mating nucs with status summary
export const getMatingNucs: Tool = {
  name: 'getMatingNucs',
  description: 'Get list of active mating nucs with their status, queen info, and inspection counts (excludes retired nucs)',
  parameters: z.object({
    status: z.enum(['all', 'active', 'laying', 'failed']).optional().describe('Filter by status (default all active)'),
    includeRetired: z.boolean().optional().describe('Include retired nucs (default false)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { status?: string; includeRetired?: boolean }
    const supabase = getSupabase()

    let query = supabase
      .from('mating_nucs')
      .select(`
        nuc_number, status, setup_date, mating_location, updated_at, retired_at,
        batch_grafts(cell_number, status),
        rearing_batches(batch_name),
        queens(queen_number),
        mating_nuc_inspections(count)
      `)
      .eq('user_id', userId)

    // Only show active (non-retired) nucs by default
    if (!args.includeRetired) {
      query = query.is('retired_at', null)
    }

    if (args.status && args.status !== 'all') {
      query = query.eq('status', args.status)
    }

    const { data, error } = await query.order('setup_date', { ascending: false })

    if (error) return `Error fetching mating nucs: ${error.message}`
    if (!data?.length) return 'No mating nucs found.'

    return data.map(nuc => {
      const graft = nuc.batch_grafts as { cell_number: number; status: string } | null
      const batch = nuc.rearing_batches as { batch_name: string } | null
      const queen = nuc.queens as { queen_number: string } | null
      const inspections = nuc.mating_nuc_inspections as { count: number }[] | null

      return {
        nucNumber: nuc.nuc_number,
        status: nuc.status,
        setupDate: formatDate(nuc.setup_date),
        daysSinceSetup: daysSince(nuc.setup_date),
        matingLocation: nuc.mating_location || 'Not specified',
        batchName: batch?.batch_name || 'None',
        cellNumber: graft?.cell_number || null,
        graftedFrom: queen?.queen_number || null,
        inspectionCount: inspections?.[0]?.count || 0
      }
    })
  }
}

// Get mating nuc status summary
export const getMatingNucSummary: Tool = {
  name: 'getMatingNucSummary',
  description: 'Get summary counts of active mating nucs by status (excludes retired)',
  parameters: z.object({}),
  execute: async (_args: unknown, userId: string) => {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('mating_nucs')
      .select('status')
      .eq('user_id', userId)
      .is('retired_at', null)

    if (error) return `Error fetching mating nucs: ${error.message}`
    if (!data?.length) return 'No mating nucs found.'

    const statusCounts: Record<string, number> = {}
    for (const nuc of data) {
      statusCounts[nuc.status] = (statusCounts[nuc.status] || 0) + 1
    }

    return {
      total: data.length,
      byStatus: statusCounts
    }
  }
}

// Get details of a specific nuc including inspections
export const getNucDetails: Tool = {
  name: 'getNucDetails',
  description: 'Get full details of a specific mating nuc including all inspections',
  parameters: z.object({
    nucNumber: z.string().describe('The nuc number/identifier')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { nucNumber: string }
    const supabase = getSupabase()

    // Find the nuc
    const { data: nuc, error } = await supabase
      .from('mating_nucs')
      .select(`
        id, nuc_number, status, setup_date, mating_location, notes, updated_at,
        batch_grafts(cell_number, status),
        rearing_batches(batch_name),
        queens(queen_number)
      `)
      .eq('user_id', userId)
      .ilike('nuc_number', `%${args.nucNumber}%`)
      .limit(1)
      .single()

    if (error || !nuc) return `Nuc "${args.nucNumber}" not found.`

    // Fetch inspections for this nuc
    const { data: inspections } = await supabase
      .from('mating_nuc_inspections')
      .select('inspection_date, queen_seen, queen_status, eggs_present, larvae_present, population, temperament, notes')
      .eq('nuc_id', nuc.id)
      .order('inspection_date', { ascending: false })

    const graft = nuc.batch_grafts as { cell_number: number; status: string } | null
    const batch = nuc.rearing_batches as { batch_name: string } | null
    const queen = nuc.queens as { queen_number: string } | null

    return {
      nucNumber: nuc.nuc_number,
      status: nuc.status,
      setupDate: formatDate(nuc.setup_date),
      daysSinceSetup: daysSince(nuc.setup_date),
      matingLocation: nuc.mating_location || 'Not specified',
      batchName: batch?.batch_name || 'None',
      cellNumber: graft?.cell_number || null,
      graftedFrom: queen?.queen_number || null,
      notes: nuc.notes || 'None',
      inspections: inspections?.map(i => ({
        date: formatDate(i.inspection_date),
        queenSeen: i.queen_seen,
        queenStatus: i.queen_status || 'Unknown',
        eggsPresent: i.eggs_present,
        larvaePresent: i.larvae_present,
        population: i.population || 'Unknown',
        temperament: i.temperament || 'Unknown',
        notes: i.notes?.substring(0, 100) || 'None'
      })) || [],
      inspectionCount: inspections?.length || 0
    }
  }
}

// Get nucs ready for queen introduction/harvest
export const getNucsReadyForHarvest: Tool = {
  name: 'getNucsReadyForHarvest',
  description: 'Get active mating nucs where queens are confirmed laying and ready for harvest/introduction',
  parameters: z.object({}),
  execute: async (_args: unknown, userId: string) => {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('mating_nucs')
      .select(`
        nuc_number, setup_date, mating_location, updated_at,
        rearing_batches(batch_name),
        queens(queen_number)
      `)
      .eq('user_id', userId)
      .eq('status', 'laying')
      .is('retired_at', null)
      .order('updated_at', { ascending: true })

    if (error) return `Error fetching nucs: ${error.message}`
    if (!data?.length) return 'No laying queens ready for harvest.'

    return data.map(nuc => {
      const batch = nuc.rearing_batches as { batch_name: string } | null
      const queen = nuc.queens as { queen_number: string } | null

      return {
        nucNumber: nuc.nuc_number,
        setupDate: formatDate(nuc.setup_date),
        daysSinceSetup: daysSince(nuc.setup_date),
        matingLocation: nuc.mating_location || 'Not specified',
        batchName: batch?.batch_name || 'None',
        graftedFrom: queen?.queen_number || null,
        confirmedLaying: formatDate(nuc.updated_at)
      }
    })
  }
}

// Get nucs needing inspection
export const getNucsNeedingInspection: Tool = {
  name: 'getNucsNeedingInspection',
  description: 'Get active mating nucs that have not been inspected recently',
  parameters: z.object({
    days: z.number().optional().describe('Days since last inspection to consider overdue (default 7)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { days?: number }
    const cutoffDays = args.days || 7
    const supabase = getSupabase()

    // Get all active nucs (not failed, not laying, not retired)
    const { data: nucs, error } = await supabase
      .from('mating_nucs')
      .select('id, nuc_number, status, setup_date, mating_location')
      .eq('user_id', userId)
      .in('status', ['pending', 'virgin', 'mating'])
      .is('retired_at', null)
      .order('setup_date')

    if (error) return `Error fetching nucs: ${error.message}`
    if (!nucs?.length) return 'No active mating nucs found.'

    const overdue: Array<{
      nucNumber: string
      status: string
      daysSinceSetup: number | null
      daysSinceLastInspection: number | null
      matingLocation: string
    }> = []

    for (const nuc of nucs) {
      // Get last inspection date
      const { data: lastInspection } = await supabase
        .from('mating_nuc_inspections')
        .select('inspection_date')
        .eq('nuc_id', nuc.id)
        .order('inspection_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      const daysSinceInspection = lastInspection
        ? daysSince(lastInspection.inspection_date)
        : daysSince(nuc.setup_date)

      if (daysSinceInspection === null || daysSinceInspection >= cutoffDays) {
        overdue.push({
          nucNumber: nuc.nuc_number,
          status: nuc.status,
          daysSinceSetup: daysSince(nuc.setup_date),
          daysSinceLastInspection: daysSinceInspection,
          matingLocation: nuc.mating_location || 'Not specified'
        })
      }
    }

    if (overdue.length === 0) {
      return `All active nucs have been inspected within the last ${cutoffDays} days.`
    }

    return {
      cutoffDays,
      nucsNeedingInspection: overdue
    }
  }
}
