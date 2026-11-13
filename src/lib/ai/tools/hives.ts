import { z } from 'zod'
import { Tool } from './index'
import { harvestWeightKg } from '@/lib/traceability-utils'
import { firstOf } from '@/lib/embed'
import { describeHiveModel } from '@/lib/hive-model'
import type { HiveModelMaterial } from '@/types/hive-model'
import { getSupabase, getOwnApiaryIds, getAccessibleApiaryIds, findHiveByName, formatDate, logToolError, boundedInt } from './utils'

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
  description: 'Get statistics about apiaries and hives: count of apiaries, hives per apiary, total active/archived hives. Includes team apiaries unless the user asks for their own apiaries only.',
  parameters: z.object({
    includeShared: z.boolean().optional().describe('Include shared/team apiaries (default true)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { includeShared?: boolean }
    const supabase = getSupabase()
    // Team apiaries are included unless the question asks for own hives only (as on the Hives page).
    const apiaryIds = args.includeShared === false
      ? await getOwnApiaryIds(userId)
      : await getAccessibleApiaryIds(userId)

    if (apiaryIds.length === 0) {
      return 'No apiaries found.'
    }

    const { data: apiaries, error } = await supabase
      .from('apiaries')
      .select('id, name, hives(id, archived_at)')
      .in('id', apiaryIds)
      .order('name')

    if (error) return `Error fetching apiaries: ${logToolError(error)}`
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
  description: 'Get a list of all hives with their apiary, status, queen info and hive model (the kind of equipment: system, make, material). Includes team apiaries unless the user asks for their own hives only.',
  parameters: z.object({
    includeArchived: z.boolean().optional().describe('Include archived hives'),
    includeShared: z.boolean().optional().describe('Include shared/team hives (default true)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { includeArchived?: boolean; includeShared?: boolean }
    const supabase = getSupabase()
    // Team apiaries are included unless the question asks for own hives only (as on the Hives page).
    const apiaryIds = args.includeShared === false
      ? await getOwnApiaryIds(userId)
      : await getAccessibleApiaryIds(userId)

    if (apiaryIds.length === 0) {
      return 'No apiaries found.'
    }

    let query = supabase
      .from('hives')
      .select(`
        hive_number,
        status,
        colony:colonies!hives_colony_id_fkey(colony_number),
        queen_marked,
        queen_marking_color,
        archived_at,
        hive_model_id,
        apiaries(name)
      `)
      .in('apiary_id', apiaryIds)
      .order('hive_number')

    if (!args.includeArchived) {
      query = query.is('archived_at', null)
    }

    const { data, error } = await query

    if (error) return `Error fetching hives: ${logToolError(error)}`
    if (!data?.length) return 'No hives found.'

    // Hive models by id, in one lookup (RLS returns own models and those on shared hives).
    const modelIds = Array.from(new Set(data.map(h => h.hive_model_id).filter((id): id is string => Boolean(id))))
    const modelLabels = new Map<string, string>()
    if (modelIds.length > 0) {
      const { data: models, error: modelsError } = await supabase
        .from('hive_models')
        .select('id, name, manufacturer, material, hive_size, hive_system_id, hive_systems(name)')
        .in('id', modelIds)
      if (modelsError) {
        // The overview still answers without models; the model column then says so.
        logToolError(modelsError)
      } else {
        for (const m of models ?? []) {
          // hive_models.hive_system_id -> hive_systems is a to-one embed: normalise its shape.
          const system = firstOf(m.hive_systems as { name: string } | { name: string }[] | null)
          const detail = describeHiveModel(
            { name: m.name, manufacturer: m.manufacturer, material: m.material as HiveModelMaterial | null, hive_size: m.hive_size === 'nuc' ? 'nuc' : 'full' },
            system
          )
          modelLabels.set(m.id, detail ? `${m.name} (${detail})` : m.name)
        }
      }
    }

    return data.map(h => ({
      hive: h.hive_number,
      apiary: getApiaryName(h.apiaries),
      status: h.status || 'Unknown',
      // The colony's number, never its raw ID.
      colony: (Array.isArray(h.colony) ? h.colony[0] : h.colony)?.colony_number || 'None',
      queenMarked: h.queen_marked ? 'Yes' : 'No',
      queenColor: h.queen_marking_color || 'None',
      hiveModel: h.hive_model_id ? (modelLabels.get(h.hive_model_id) ?? 'Set, but could not be read') : 'Not set',
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
    limit: boundedInt(100).optional().describe('Maximum number of records to return (default 20)')
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
      supabase.from('feedings').select('id, feed_date, feed_type, syrup_inverted, quantity, unit').eq('hive_id', hive.id).order('feed_date', { ascending: false }).limit(limit),
      supabase.from('harvests').select('id, harvest_date, honey_weight, unit, notes').eq('hive_id', hive.id).order('harvest_date', { ascending: false }).limit(limit)
    ])

    const failed = [inspections, varroaChecks, treatments, feedings, harvests].find(r => r.error)
    if (failed) return `Error fetching hive records: ${logToolError(failed.error)}`

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
        details: `${f.feed_type}${f.syrup_inverted ? ' (inverted)' : ''}: ${f.quantity != null ? `${f.quantity} ${f.unit}` : 'quantity not recorded'}`
      })
    })

    harvests.data?.forEach(h => {
      timeline.push({
        date: h.harvest_date,
        type: 'Harvest',
        details: `${harvestWeightKg(h).toFixed(1)} kg${h.notes ? `, Notes: ${h.notes.substring(0, 50)}` : ''}`
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

// Where a hive stands on its apiary map (the layout the beekeeper arranged by hand)
const COMPASS_POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'] as const

export const getHiveMapPosition: Tool = {
  name: 'getHiveMapPosition',
  description: 'Find where a hive stands on its apiary map: whether it has been placed, how far it is from the apiary entrance, whether it is on a bench (hive stand) and in which place, and which hives stand nearest to it. Use for questions like "where is hive 12?", "which hive is next to hive 3?" or "is hive 7 on a bench?". Only knows what the beekeeper arranged on the apiary map.',
  parameters: z.object({
    hiveName: z.string().describe('The hive number or name, as the user said it'),
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { hiveName: string }
    const supabase = getSupabase()

    const found = await findHiveByName(userId, args.hiveName)
    if (!found) return `No hive found matching "${args.hiveName}".`
    const apiaryIds = await getAccessibleApiaryIds(userId)

    const { data: hive, error: hiveError } = await supabase
      .from('hives')
      .select('id, hive_number, apiary_id, archived_at')
      .eq('id', found.id)
      .in('apiary_id', apiaryIds)
      .maybeSingle()
    if (hiveError) return `Error fetching the hive: ${logToolError(hiveError)}`
    if (!hive || !hive.apiary_id) return `Hive ${found.hive_number} is not in an apiary, so it has no place on a map.`
    if (hive.archived_at) return `Hive ${found.hive_number} is archived, so it is not shown on the apiary map.`

    const [apiaryRes, hivesRes, benchesRes] = await Promise.all([
      supabase.from('apiaries')
        .select('name, yard_width_m, yard_depth_m, yard_entrance_x, yard_entrance_y, north_angle_deg')
        .eq('id', hive.apiary_id).maybeSingle(),
      supabase.from('hives')
        .select('id, hive_number, map_x, map_y, bench_id, bench_slot')
        .eq('apiary_id', hive.apiary_id).is('archived_at', null).limit(500),
      supabase.from('yard_benches')
        .select('id, capacity')
        .eq('apiary_id', hive.apiary_id).limit(200),
    ])
    if (apiaryRes.error) return `Error fetching the apiary map: ${logToolError(apiaryRes.error)}`
    if (hivesRes.error) return `Error fetching the apiary map: ${logToolError(hivesRes.error)}`
    if (benchesRes.error) return `Error fetching the apiary map: ${logToolError(benchesRes.error)}`
    if (!apiaryRes.data) return `The apiary map for hive ${found.hive_number} could not be found.`

    const apiary = apiaryRes.data
    // Positions are stored as a percentage of the map's width and depth; turn them into metres.
    const widthM = Number(apiary.yard_width_m) || 5
    const depthM = Number(apiary.yard_depth_m) || 3.33
    const north = Number(apiary.north_angle_deg) || 0
    const benchCapacity = new Map((benchesRes.data ?? []).map(b => [b.id as string, Number(b.capacity)]))
    type Row = { id: string; hive_number: string; map_x: number | string | null; map_y: number | string | null; bench_id: string | null; bench_slot: number | null }
    const rows = (hivesRes.data ?? []) as Row[]
    // The same test as the map: ground coordinates, or a complete link to a bench that exists.
    const isPlaced = (row: Row) => row.map_x != null && row.map_y != null
      || (row.bench_id != null && row.bench_slot != null && benchCapacity.has(row.bench_id))
    const metres = (row: Row) => ({ x: (Number(row.map_x) / 100) * widthM, y: (Number(row.map_y) / 100) * depthM })
    // Compass direction from one point to another; "up" on the map is turned by where north points.
    const direction = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const mapBearing = (Math.atan2(to.x - from.x, -(to.y - from.y)) * 180) / Math.PI
      const bearing = (((mapBearing - north) % 360) + 360) % 360
      return COMPASS_POINTS[Math.round(bearing / 45) % 8]
    }
    const round = (value: number) => Math.round(value * 10) / 10

    const self = rows.find(row => row.id === hive.id)
    const placedCount = rows.filter(isPlaced).length
    if (!self || !isPlaced(self) || self.map_x == null || self.map_y == null) {
      return {
        hive: found.hive_number,
        apiary: apiary.name,
        onMap: false,
        note: `Hive ${found.hive_number} has not been placed on the apiary map yet. ${placedCount} of ${rows.length} hives in this apiary are on the map.`,
      }
    }

    const here = metres(self)
    const nearest = rows
      .filter(row => row.id !== self.id && isPlaced(row) && row.map_x != null && row.map_y != null)
      .map(row => {
        const there = metres(row)
        return {
          hive: row.hive_number,
          distanceMetres: round(Math.hypot(there.x - here.x, there.y - here.y)),
          direction: direction(here, there),
          sameBench: self.bench_id != null && row.bench_id === self.bench_id,
        }
      })
      .sort((a, b) => a.distanceMetres - b.distanceMetres)
      .slice(0, 4)

    const capacity = self.bench_id != null ? benchCapacity.get(self.bench_id) : undefined
    const entrance = apiary.yard_entrance_x != null && apiary.yard_entrance_y != null
      ? { x: (Number(apiary.yard_entrance_x) / 100) * widthM, y: (Number(apiary.yard_entrance_y) / 100) * depthM }
      : null

    return {
      hive: found.hive_number,
      apiary: apiary.name,
      onMap: true,
      mapSizeMetres: `${widthM} wide by ${depthM} deep`,
      standsOn: capacity != null && self.bench_slot != null
        ? `a bench for ${capacity} ${capacity === 1 ? 'hive' : 'hives'}, place ${self.bench_slot + 1} of ${capacity}`
        : 'the ground',
      fromApiaryEntrance: entrance
        ? `${round(Math.hypot(here.x - entrance.x, here.y - entrance.y))} m to the ${direction(entrance, here)} of the entrance`
        : 'The apiary entrance has not been marked on the map.',
      nearestHives: nearest.length > 0 ? nearest : 'No other hives are on the map.',
    }
  },
}
