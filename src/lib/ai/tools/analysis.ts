import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, getAccessibleApiaryIds, getAccessibleHiveIds, findHiveByName, formatDate } from './utils'

// Helper to extract apiary name from Supabase join
function getApiaryName(apiaries: unknown): string {
  if (!apiaries) return 'Unknown'
  if (typeof apiaries === 'object' && 'name' in (apiaries as Record<string, unknown>)) {
    return (apiaries as { name: string }).name
  }
  return 'Unknown'
}

// Helper to extract hive number from Supabase join
function getHiveNumber(hives: unknown): string {
  if (!hives) return 'Unknown'
  if (typeof hives === 'object' && 'hive_number' in (hives as Record<string, unknown>)) {
    return (hives as { hive_number: string }).hive_number
  }
  return 'Unknown'
}

// Compare two hives side by side
export const compareHives: Tool = {
  name: 'compareHives',
  description: 'Get a side-by-side comparison of two hives including recent inspections, varroa, and performance',
  parameters: z.object({
    hive1: z.string().describe('Name or number of the first hive'),
    hive2: z.string().describe('Name or number of the second hive')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { hive1: string; hive2: string }
    const supabase = getSupabase()

    const [hive1Data, hive2Data] = await Promise.all([
      findHiveByName(userId, args.hive1),
      findHiveByName(userId, args.hive2)
    ])

    if (!hive1Data) return `Hive "${args.hive1}" not found.`
    if (!hive2Data) return `Hive "${args.hive2}" not found.`

    const [
      hive1Info, hive2Info,
      hive1Inspection, hive2Inspection,
      hive1Varroa, hive2Varroa,
      hive1Harvests, hive2Harvests
    ] = await Promise.all([
      supabase.from('hives').select('status, queen_marked, queen_marking_color').eq('id', hive1Data.id).single(),
      supabase.from('hives').select('status, queen_marked, queen_marking_color').eq('id', hive2Data.id).single(),
      supabase.from('inspections').select('inspection_date, temperament, laying_pattern, brood_frames, honey_frames, population').eq('hive_id', hive1Data.id).order('inspection_date', { ascending: false }).limit(1).single(),
      supabase.from('inspections').select('inspection_date, temperament, laying_pattern, brood_frames, honey_frames, population').eq('hive_id', hive2Data.id).order('inspection_date', { ascending: false }).limit(1).single(),
      supabase.from('varroa_checks').select('check_date, mites_count, infestation_rate').eq('hive_id', hive1Data.id).order('check_date', { ascending: false }).limit(1).single(),
      supabase.from('varroa_checks').select('check_date, mites_count, infestation_rate').eq('hive_id', hive2Data.id).order('check_date', { ascending: false }).limit(1).single(),
      supabase.from('harvests').select('honey_weight').eq('hive_id', hive1Data.id),
      supabase.from('harvests').select('honey_weight').eq('hive_id', hive2Data.id)
    ])

    const totalHarvest1 = hive1Harvests.data?.reduce((sum, h) => sum + (h.honey_weight || 0), 0) || 0
    const totalHarvest2 = hive2Harvests.data?.reduce((sum, h) => sum + (h.honey_weight || 0), 0) || 0

    return {
      hive1: {
        name: hive1Data.hive_number,
        apiary: hive1Data.apiary_name,
        status: hive1Info.data?.status || 'Unknown',
        queenMarked: hive1Info.data?.queen_marked ? 'Yes' : 'No',
        queenColor: hive1Info.data?.queen_marking_color || 'None',
        lastInspection: hive1Inspection.data?.inspection_date ? formatDate(hive1Inspection.data.inspection_date) : 'Never',
        temperament: hive1Inspection.data?.temperament || 'N/A',
        layingPattern: hive1Inspection.data?.laying_pattern || 'N/A',
        broodFrames: hive1Inspection.data?.brood_frames ?? 'N/A',
        honeyFrames: hive1Inspection.data?.honey_frames ?? 'N/A',
        population: hive1Inspection.data?.population || 'N/A',
        lastVarroaCheck: hive1Varroa.data?.check_date ? formatDate(hive1Varroa.data.check_date) : 'Never',
        miteCount: hive1Varroa.data?.mites_count ?? 'N/A',
        infestationRate: hive1Varroa.data?.infestation_rate ? `${hive1Varroa.data.infestation_rate.toFixed(1)}%` : 'N/A',
        totalHarvestKg: totalHarvest1.toFixed(1)
      },
      hive2: {
        name: hive2Data.hive_number,
        apiary: hive2Data.apiary_name,
        status: hive2Info.data?.status || 'Unknown',
        queenMarked: hive2Info.data?.queen_marked ? 'Yes' : 'No',
        queenColor: hive2Info.data?.queen_marking_color || 'None',
        lastInspection: hive2Inspection.data?.inspection_date ? formatDate(hive2Inspection.data.inspection_date) : 'Never',
        temperament: hive2Inspection.data?.temperament || 'N/A',
        layingPattern: hive2Inspection.data?.laying_pattern || 'N/A',
        broodFrames: hive2Inspection.data?.brood_frames ?? 'N/A',
        honeyFrames: hive2Inspection.data?.honey_frames ?? 'N/A',
        population: hive2Inspection.data?.population || 'N/A',
        lastVarroaCheck: hive2Varroa.data?.check_date ? formatDate(hive2Varroa.data.check_date) : 'Never',
        miteCount: hive2Varroa.data?.mites_count ?? 'N/A',
        infestationRate: hive2Varroa.data?.infestation_rate ? `${hive2Varroa.data.infestation_rate.toFixed(1)}%` : 'N/A',
        totalHarvestKg: totalHarvest2.toFixed(1)
      }
    }
  }
}

// Get best performing hives
export const getBestPerformingHives: Tool = {
  name: 'getBestPerformingHives',
  description: 'Get hives ranked by a specific metric: temperament, laying_pattern, honey_production, or population',
  parameters: z.object({
    metric: z.enum(['temperament', 'laying_pattern', 'honey_production', 'population']).describe('Metric to rank hives by'),
    limit: z.number().optional().describe('Number of top hives to return (default 5)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { metric: string; limit?: number }
    const supabase = getSupabase()
    const apiaryIds = await getAccessibleApiaryIds(userId)

    if (apiaryIds.length === 0) {
      return 'No apiaries found.'
    }

    const limit = args.limit || 5

    const { data: hives, error } = await supabase
      .from('hives')
      .select('id, hive_number, apiaries(name)')
      .in('apiary_id', apiaryIds)
      .is('archived_at', null)

    if (error) return `Error fetching hives: ${error.message}`
    if (!hives?.length) return 'No active hives found.'

    if (args.metric === 'honey_production') {
      const hiveScores: Array<{ hive: string; apiary: string; value: number; display: string }> = []

      for (const hive of hives) {
        const { data: harvests } = await supabase
          .from('harvests')
          .select('honey_weight')
          .eq('hive_id', hive.id)

        const total = harvests?.reduce((sum, h) => sum + (h.honey_weight || 0), 0) || 0
        hiveScores.push({
          hive: hive.hive_number,
          apiary: getApiaryName(hive.apiaries),
          value: total,
          display: `${total.toFixed(1)} kg`
        })
      }

      hiveScores.sort((a, b) => b.value - a.value)

      return {
        metric: 'Honey Production (Total)',
        topHives: hiveScores.slice(0, limit)
      }
    }

    const scoreMap: Record<string, number> = {
      'Calm': 5, 'Gentle': 4, 'Moderate': 3, 'Nervous': 2, 'Aggressive': 1,
      'Excellent': 5, 'Good': 4, 'Average': 3, 'Fair': 2, 'Poor': 1, 'Spotty': 2,
      'Strong': 5, 'Medium': 3, 'Weak': 1, 'Very Strong': 5, 'Building': 4
    }

    const hiveScores: Array<{ hive: string; apiary: string; value: number; display: string }> = []

    for (const hive of hives) {
      const { data: inspection } = await supabase
        .from('inspections')
        .select('temperament, laying_pattern, population')
        .eq('hive_id', hive.id)
        .order('inspection_date', { ascending: false })
        .limit(1)
        .single()

      if (!inspection) continue

      let value = 0
      let display = 'N/A'

      if (args.metric === 'temperament' && inspection.temperament) {
        value = scoreMap[inspection.temperament] || 0
        display = inspection.temperament
      } else if (args.metric === 'laying_pattern' && inspection.laying_pattern) {
        value = scoreMap[inspection.laying_pattern] || 0
        display = inspection.laying_pattern
      } else if (args.metric === 'population' && inspection.population) {
        value = scoreMap[inspection.population] || 0
        display = inspection.population
      }

      if (value > 0) {
        hiveScores.push({
          hive: hive.hive_number,
          apiary: getApiaryName(hive.apiaries),
          value,
          display
        })
      }
    }

    hiveScores.sort((a, b) => b.value - a.value)

    if (hiveScores.length === 0) {
      return `No hives have ${args.metric} data recorded.`
    }

    return {
      metric: args.metric.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      topHives: hiveScores.slice(0, limit)
    }
  }
}

// Get recent activity summary
export const getRecentActivitySummary: Tool = {
  name: 'getRecentActivitySummary',
  description: 'Get a summary of recent beekeeping activity: inspections, treatments, feedings, harvests',
  parameters: z.object({
    days: z.number().optional().describe('Look back period in days (default 7)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { days?: number }
    const supabase = getSupabase()
    const hiveIds = await getAccessibleHiveIds(userId)

    if (hiveIds.length === 0) {
      return 'No hives found.'
    }

    const days = args.days || 7
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoff = cutoffDate.toISOString().split('T')[0]

    const [inspections, varroaChecks, treatments, feedings, harvests] = await Promise.all([
      supabase.from('inspections').select('id, inspection_date, hives(hive_number)').in('hive_id', hiveIds).gte('inspection_date', cutoff),
      supabase.from('varroa_checks').select('id, check_date, hives(hive_number)').in('hive_id', hiveIds).gte('check_date', cutoff),
      supabase.from('varroa_treatments').select('id, treatment_date, hives(hive_number)').in('hive_id', hiveIds).gte('treatment_date', cutoff),
      supabase.from('feedings').select('id, feed_date, hives(hive_number)').in('hive_id', hiveIds).gte('feed_date', cutoff),
      supabase.from('harvests').select('id, harvest_date, honey_weight, hives(hive_number)').in('hive_id', hiveIds).gte('harvest_date', cutoff)
    ])

    const totalHoneyKg = harvests.data?.reduce((sum, h) => sum + (h.honey_weight || 0), 0) || 0

    const hivesInspected = new Set(inspections.data?.map(i => getHiveNumber(i.hives)).filter(n => n !== 'Unknown'))

    return {
      period: `Last ${days} days`,
      summary: {
        inspections: inspections.data?.length || 0,
        hivesInspected: hivesInspected.size,
        varroaChecks: varroaChecks.data?.length || 0,
        treatments: treatments.data?.length || 0,
        feedings: feedings.data?.length || 0,
        harvests: harvests.data?.length || 0,
        totalHoneyKg: totalHoneyKg.toFixed(1)
      },
      recentInspections: inspections.data?.slice(0, 5).map(i => ({
        date: formatDate(i.inspection_date),
        hive: getHiveNumber(i.hives)
      })) || [],
      recentTreatments: treatments.data?.slice(0, 5).map(t => ({
        date: formatDate(t.treatment_date),
        hive: getHiveNumber(t.hives)
      })) || []
    }
  }
}
