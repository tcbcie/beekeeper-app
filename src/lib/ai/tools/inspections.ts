import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, getAccessibleApiaryIds, getAccessibleHiveIds, findHiveByName, formatDate, daysSince } from './utils'

// Helper to extract names from Supabase joins
function getApiaryName(apiaries: unknown): string {
  if (!apiaries) return 'Unknown'
  if (typeof apiaries === 'object' && 'name' in (apiaries as Record<string, unknown>)) {
    return (apiaries as { name: string }).name
  }
  return 'Unknown'
}

function getHiveInfo(hives: unknown): { hive_number: string; apiary_name: string } {
  if (!hives) return { hive_number: 'Unknown', apiary_name: 'Unknown' }
  const h = hives as { hive_number?: string; apiaries?: unknown }
  return {
    hive_number: h.hive_number || 'Unknown',
    apiary_name: getApiaryName(h.apiaries)
  }
}

// Get last inspection for a hive
export const getLastInspection: Tool = {
  name: 'getLastInspection',
  description: 'Get the most recent inspection for a specific hive with all details',
  parameters: z.object({
    hiveName: z.string().describe('Name or number of the hive')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { hiveName: string }
    const supabase = getSupabase()
    const hive = await findHiveByName(userId, args.hiveName)

    if (!hive) {
      return `Hive "${args.hiveName}" not found.`
    }

    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('hive_id', hive.id)
      .order('inspection_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return `No inspections found for hive "${hive.hive_number}".`
    }

    return {
      hive: hive.hive_number,
      apiary: hive.apiary_name,
      date: formatDate(data.inspection_date),
      daysAgo: daysSince(data.inspection_date),
      temperament: data.temperament || 'Not recorded',
      layingPattern: data.laying_pattern || 'Not recorded',
      queenSeen: data.queen_seen ? 'Yes' : 'No',
      queenCells: data.queen_cells ? 'Yes' : 'No',
      swarmCells: data.swarm_cells ? 'Yes' : 'No',
      broodFrames: data.brood_frames,
      honeyFrames: data.honey_frames,
      pollenFrames: data.pollen_frames,
      population: data.population,
      diseasesSigns: data.diseases_signs || 'None',
      notes: data.notes || 'None'
    }
  }
}

// Get inspection history for a hive
export const getInspectionHistory: Tool = {
  name: 'getInspectionHistory',
  description: 'Get inspection history for a specific hive over time',
  parameters: z.object({
    hiveName: z.string().describe('Name or number of the hive'),
    limit: z.number().optional().describe('Maximum number of inspections to return (default 10)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { hiveName: string; limit?: number }
    const supabase = getSupabase()
    const hive = await findHiveByName(userId, args.hiveName)

    if (!hive) {
      return `Hive "${args.hiveName}" not found.`
    }

    const { data, error } = await supabase
      .from('inspections')
      .select('inspection_date, temperament, laying_pattern, queen_seen, brood_frames, honey_frames, population, notes')
      .eq('hive_id', hive.id)
      .order('inspection_date', { ascending: false })
      .limit(args.limit || 10)

    if (error) return `Error fetching inspections: ${error.message}`
    if (!data?.length) return `No inspections found for hive "${hive.hive_number}".`

    return {
      hive: hive.hive_number,
      apiary: hive.apiary_name,
      inspections: data.map(i => ({
        date: formatDate(i.inspection_date),
        temperament: i.temperament || 'N/A',
        laying: i.laying_pattern || 'N/A',
        queenSeen: i.queen_seen ? 'Yes' : 'No',
        brood: i.brood_frames,
        honey: i.honey_frames,
        population: i.population || 'N/A',
        notes: i.notes ? i.notes.substring(0, 100) : 'None'
      }))
    }
  }
}

// Get hives needing inspection
export const getHivesNeedingInspection: Tool = {
  name: 'getHivesNeedingInspection',
  description: 'Get hives that have not been inspected within a specified number of days',
  parameters: z.object({
    daysSinceInspection: z.number().optional().describe('Days since last inspection threshold (default 14)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { daysSinceInspection?: number }
    const supabase = getSupabase()
    const apiaryIds = await getAccessibleApiaryIds(userId)

    if (apiaryIds.length === 0) {
      return 'No apiaries found.'
    }

    const threshold = args.daysSinceInspection || 14

    const { data: hives, error: hivesError } = await supabase
      .from('hives')
      .select('id, hive_number, apiaries(name)')
      .in('apiary_id', apiaryIds)
      .is('archived_at', null)

    if (hivesError) return `Error fetching hives: ${hivesError.message}`
    if (!hives?.length) return 'No active hives found.'

    const hivesNeedingInspection: Array<{
      hive: string
      apiary: string
      lastInspection: string
      daysAgo: number | null
    }> = []

    for (const hive of hives) {
      const { data: lastInspection } = await supabase
        .from('inspections')
        .select('inspection_date')
        .eq('hive_id', hive.id)
        .order('inspection_date', { ascending: false })
        .limit(1)
        .single()

      const lastDate = lastInspection?.inspection_date
      const days = daysSince(lastDate)

      if (!lastDate || (days !== null && days >= threshold)) {
        hivesNeedingInspection.push({
          hive: hive.hive_number,
          apiary: getApiaryName(hive.apiaries),
          lastInspection: lastDate ? formatDate(lastDate) : 'Never',
          daysAgo: days
        })
      }
    }

    if (hivesNeedingInspection.length === 0) {
      return `All hives have been inspected within the last ${threshold} days.`
    }

    hivesNeedingInspection.sort((a, b) => {
      if (a.daysAgo === null) return -1
      if (b.daysAgo === null) return 1
      return b.daysAgo - a.daysAgo
    })

    return {
      threshold: `${threshold} days`,
      count: hivesNeedingInspection.length,
      hives: hivesNeedingInspection
    }
  }
}

// Get queen status for all hives
export const getQueenStatus: Tool = {
  name: 'getQueenStatus',
  description: 'Get queen status for each hive: when last seen, when eggs last seen, days since',
  parameters: z.object({}),
  execute: async (_args: unknown, userId: string) => {
    const supabase = getSupabase()
    const apiaryIds = await getAccessibleApiaryIds(userId)

    if (apiaryIds.length === 0) {
      return 'No apiaries found.'
    }

    const { data: hives, error } = await supabase
      .from('hives')
      .select('id, hive_number, queen_marked, queen_marking_color, apiaries(name)')
      .in('apiary_id', apiaryIds)
      .is('archived_at', null)
      .order('hive_number')

    if (error) return `Error fetching hives: ${error.message}`
    if (!hives?.length) return 'No active hives found.'

    const results = []

    for (const hive of hives) {
      const { data: queenSeen } = await supabase
        .from('inspections')
        .select('inspection_date')
        .eq('hive_id', hive.id)
        .eq('queen_seen', true)
        .order('inspection_date', { ascending: false })
        .limit(1)
        .single()

      const { data: eggsSeen } = await supabase
        .from('inspections')
        .select('inspection_date')
        .eq('hive_id', hive.id)
        .eq('eggs_present', true)
        .order('inspection_date', { ascending: false })
        .limit(1)
        .single()

      results.push({
        hive: hive.hive_number,
        apiary: getApiaryName(hive.apiaries),
        queenMarked: hive.queen_marked ? 'Yes' : 'No',
        queenColor: hive.queen_marking_color || 'None',
        queenLastSeen: queenSeen?.inspection_date ? formatDate(queenSeen.inspection_date) : 'Never',
        daysSinceQueenSeen: daysSince(queenSeen?.inspection_date || null),
        eggsLastSeen: eggsSeen?.inspection_date ? formatDate(eggsSeen.inspection_date) : 'Never',
        daysSinceEggsSeen: daysSince(eggsSeen?.inspection_date || null)
      })
    }

    return results
  }
}

// Get disease alerts
export const getDiseaseAlerts: Tool = {
  name: 'getDiseaseAlerts',
  description: 'Get hives with any disease signs noted in recent inspections',
  parameters: z.object({
    days: z.number().optional().describe('Look back period in days (default 30)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { days?: number }
    const supabase = getSupabase()
    const hiveIds = await getAccessibleHiveIds(userId)

    if (hiveIds.length === 0) {
      return 'No hives found.'
    }

    const lookback = args.days || 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookback)

    const { data, error } = await supabase
      .from('inspections')
      .select('inspection_date, disease_issues, notes, hives(hive_number, apiaries(name))')
      .in('hive_id', hiveIds)
      .gte('inspection_date', cutoffDate.toISOString().split('T')[0])
      .not('disease_issues', 'is', null)
      .neq('disease_issues', '')
      .order('inspection_date', { ascending: false })

    if (error) return `Error fetching inspections: ${error.message}`
    if (!data?.length) return `No disease signs reported in the last ${lookback} days.`

    return {
      lookbackDays: lookback,
      alerts: data.map(i => {
        const info = getHiveInfo(i.hives)
        return {
          date: formatDate(i.inspection_date),
          hive: info.hive_number,
          apiary: info.apiary_name,
          diseaseSigns: i.disease_issues,
          notes: i.notes?.substring(0, 100) || 'None'
        }
      })
    }
  }
}

// Get swarm risk hives
export const getSwarmRiskHives: Tool = {
  name: 'getSwarmRiskHives',
  description: 'Get hives with queen cells or swarm cells in recent inspections indicating swarm risk',
  parameters: z.object({
    days: z.number().optional().describe('Look back period in days (default 14)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { days?: number }
    const supabase = getSupabase()
    const hiveIds = await getAccessibleHiveIds(userId)

    if (hiveIds.length === 0) {
      return 'No hives found.'
    }

    const lookback = args.days || 14
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookback)

    const { data, error } = await supabase
      .from('inspections')
      .select('inspection_date, queen_cups, swarm_cells, supercedure_cells, notes, hives(hive_number, apiaries(name))')
      .in('hive_id', hiveIds)
      .gte('inspection_date', cutoffDate.toISOString().split('T')[0])
      .or('queen_cups.eq.true,swarm_cells.eq.true,supercedure_cells.eq.true')
      .order('inspection_date', { ascending: false })

    if (error) return `Error fetching inspections: ${error.message}`
    if (!data?.length) return `No swarm risk indicators in the last ${lookback} days.`

    return {
      lookbackDays: lookback,
      riskHives: data.map(i => {
        const info = getHiveInfo(i.hives)
        return {
          date: formatDate(i.inspection_date),
          hive: info.hive_number,
          apiary: info.apiary_name,
          queenCups: i.queen_cups ? 'Yes' : 'No',
          swarmCells: i.swarm_cells ? 'Yes' : 'No',
          supercedureCells: i.supercedure_cells ? 'Yes' : 'No',
          notes: i.notes?.substring(0, 100) || 'None'
        }
      })
    }
  }
}
