import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, getOwnApiaryIds, getAccessibleApiaryIds, findHiveByName, formatDate } from './utils'

// Helper to extract apiary name from Supabase join
function getApiaryName(apiaries: unknown): string {
  if (!apiaries) return 'Unknown'
  if (typeof apiaries === 'object' && 'name' in (apiaries as Record<string, unknown>)) {
    return (apiaries as { name: string }).name
  }
  return 'Unknown'
}

// Get apiary statistics
export const getApiaryStats: Tool = {
  name: 'getApiaryStats',
  description: 'Get statistics about apiaries and hives: count of apiaries, hives per apiary, total active/archived hives. By default shows only your own apiaries.',
  parameters: z.object({
    includeShared: z.boolean().optional().describe('Include shared/team apiaries (default false)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { includeShared?: boolean }
    const supabase = getSupabase()
    const apiaryIds = args.includeShared
      ? await getAccessibleApiaryIds(userId)
      : await getOwnApiaryIds(userId)

    if (apiaryIds.length === 0) {
      return 'No apiaries found.'
    }

    const { data: apiaries, error } = await supabase
      .from('apiaries')
      .select('id, name, hives(id, archived_at)')
      .in('id', apiaryIds)
      .order('name')

    if (error) return `Error fetching apiaries: ${error.message}`
    if (!apiaries?.length) return 'No apiaries found.'

    let totalActive = 0
    let totalArchived = 0
    const apiaryStats = apiaries.map(a => {
      const hives = (a.hives || []) as Array<{ archived_at: string | null }>
      const active = hives.filter(h => !h.archived_at).length
      const archived = hives.filter(h => h.archived_at).length
      totalActive += active
      totalArchived += archived
      return {
        apiary: a.name,
        activeHives: active,
        archivedHives: archived
      }
    })

    return {
      totalApiaries: apiaries.length,
      totalActiveHives: totalActive,
      totalArchivedHives: totalArchived,
      apiaries: apiaryStats
    }
  }
}

// Get hive overview
export const getHiveOverview: Tool = {
  name: 'getHiveOverview',
  description: 'Get a list of all hives with their apiary, status, and queen info. By default shows only your own hives.',
  parameters: z.object({
    includeArchived: z.boolean().optional().describe('Include archived hives'),
    includeShared: z.boolean().optional().describe('Include shared/team hives (default false)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { includeArchived?: boolean; includeShared?: boolean }
    const supabase = getSupabase()
    const apiaryIds = args.includeShared
      ? await getAccessibleApiaryIds(userId)
      : await getOwnApiaryIds(userId)

    if (apiaryIds.length === 0) {
      return 'No apiaries found.'
    }

    let query = supabase
      .from('hives')
      .select(`
        hive_number,
        status,
        colony_id,
        queen_marked,
        queen_marking_color,
        archived_at,
        apiaries(name)
      `)
      .in('apiary_id', apiaryIds)
      .order('hive_number')

    if (!args.includeArchived) {
      query = query.is('archived_at', null)
    }

    const { data, error } = await query

    if (error) return `Error fetching hives: ${error.message}`
    if (!data?.length) return 'No hives found.'

    return data.map(h => ({
      hive: h.hive_number,
      apiary: getApiaryName(h.apiaries),
      status: h.status || 'Unknown',
      colonyId: h.colony_id || 'None',
      queenMarked: h.queen_marked ? 'Yes' : 'No',
      queenColor: h.queen_marking_color || 'None',
      archived: h.archived_at ? 'Yes' : 'No'
    }))
  }
}

// Get hive timeline
export const getHiveTimeline: Tool = {
  name: 'getHiveTimeline',
  description: 'Get all records for a specific hive in chronological order (inspections, treatments, feedings, harvests)',
  parameters: z.object({
    hiveName: z.string().describe('Name or number of the hive'),
    limit: z.number().optional().describe('Maximum number of records to return (default 20)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { hiveName: string; limit?: number }
    const supabase = getSupabase()
    const hive = await findHiveByName(userId, args.hiveName)

    if (!hive) {
      return `Hive "${args.hiveName}" not found.`
    }

    const limit = args.limit || 20

    const [inspections, varroaChecks, treatments, feedings, harvests] = await Promise.all([
      supabase.from('inspections').select('id, inspection_date, temperament_rating, brood_pattern_rating, notes').eq('hive_id', hive.id).order('inspection_date', { ascending: false }).limit(limit),
      supabase.from('varroa_checks').select('id, check_date, mites_count, method, infestation_rate').eq('hive_id', hive.id).order('check_date', { ascending: false }).limit(limit),
      supabase.from('varroa_treatments').select('id, treatment_date, treatment_type').eq('hive_id', hive.id).order('treatment_date', { ascending: false }).limit(limit),
      supabase.from('feedings').select('id, feed_date, feed_type, quantity, unit').eq('hive_id', hive.id).order('feed_date', { ascending: false }).limit(limit),
      supabase.from('harvests').select('id, harvest_date, honey_weight, notes').eq('hive_id', hive.id).order('harvest_date', { ascending: false }).limit(limit)
    ])

    const timeline: Array<{ date: string; type: string; details: string }> = []

    inspections.data?.forEach(i => {
      timeline.push({
        date: i.inspection_date,
        type: 'Inspection',
        details: `Temperament: ${i.temperament_rating || 'N/A'}, Brood: ${i.brood_pattern_rating || 'N/A'}${i.notes ? `, Notes: ${i.notes.substring(0, 50)}...` : ''}`
      })
    })

    varroaChecks.data?.forEach(v => {
      timeline.push({
        date: v.check_date,
        type: 'Varroa Check',
        details: `${v.mites_count} mites (${v.method || 'Unknown method'}), Rate: ${v.infestation_rate?.toFixed(1) || 'N/A'}%`
      })
    })

    treatments.data?.forEach(t => {
      timeline.push({
        date: t.treatment_date,
        type: 'Treatment',
        details: t.treatment_type || 'Unknown treatment'
      })
    })

    feedings.data?.forEach(f => {
      timeline.push({
        date: f.feed_date,
        type: 'Feeding',
        details: `${f.feed_type}: ${f.quantity} ${f.unit}`
      })
    })

    harvests.data?.forEach(h => {
      timeline.push({
        date: h.harvest_date,
        type: 'Harvest',
        details: `${h.honey_weight} kg${h.notes ? `, Notes: ${h.notes.substring(0, 50)}` : ''}`
      })
    })

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (timeline.length === 0) {
      return `No records found for hive "${hive.hive_number}" in ${hive.apiary_name}.`
    }

    return {
      hive: hive.hive_number,
      apiary: hive.apiary_name,
      records: timeline.slice(0, limit).map(r => ({
        date: formatDate(r.date),
        type: r.type,
        details: r.details
      }))
    }
  }
}
