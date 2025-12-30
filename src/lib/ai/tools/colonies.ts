import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, formatDate, daysSince } from './utils'

// Helper to get hive info from join
function getHiveInfo(hive: unknown): { hive_number: string; apiary_name: string } {
  if (!hive) return { hive_number: 'None', apiary_name: 'N/A' }
  const h = hive as { hive_number?: string; apiaries?: unknown }
  let apiaryName = 'N/A'
  if (h.apiaries && typeof h.apiaries === 'object' && 'name' in (h.apiaries as Record<string, unknown>)) {
    apiaryName = (h.apiaries as { name: string }).name
  }
  return {
    hive_number: h.hive_number || 'None',
    apiary_name: apiaryName
  }
}

// Helper to find colony by number
async function findColonyByNumber(userId: string, colonyNumber: string): Promise<{
  id: string
  colony_number: string
} | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('colonies')
    .select('id, colony_number')
    .eq('user_id', userId)
    .ilike('colony_number', `%${colonyNumber}%`)
    .limit(1)
    .maybeSingle()

  return data
}

// Get current hive for a colony (most recent movement with to_hive_id)
async function getCurrentHiveForColony(colonyId: string): Promise<{
  hive_id: string
  hive_number: string
  apiary_name: string
  moved_date: string
} | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('colony_movements')
    .select('to_hive_id, movement_date, hives:to_hive_id(hive_number, apiaries(name))')
    .eq('colony_id', colonyId)
    .not('to_hive_id', 'is', null)
    .order('movement_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data || !data.to_hive_id) return null

  const hiveInfo = getHiveInfo(data.hives)
  return {
    hive_id: data.to_hive_id,
    hive_number: hiveInfo.hive_number,
    apiary_name: hiveInfo.apiary_name,
    moved_date: data.movement_date
  }
}

// Get overview of all colonies
export const getColonyOverview: Tool = {
  name: 'getColonyOverview',
  description: 'Get a list of all colonies with their current status, location, and origin. Use this to answer questions about colonies.',
  parameters: z.object({
    status: z.enum(['active', 'all']).optional().describe('Filter by status: active only or all (default active)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { status?: 'active' | 'all' }
    const supabase = getSupabase()

    let query = supabase
      .from('colonies')
      .select('id, colony_number, origin_type, origin_date, status, status_date, status_reason, notes')
      .eq('user_id', userId)
      .order('colony_number')

    if (args.status !== 'all') {
      query = query.eq('status', 'active')
    }

    const { data, error } = await query

    if (error) return `Error fetching colonies: ${error.message}`
    if (!data?.length) return 'No colonies found.'

    const results = []
    for (const colony of data) {
      const currentHive = await getCurrentHiveForColony(colony.id)

      results.push({
        colonyNumber: colony.colony_number,
        status: colony.status,
        originType: colony.origin_type,
        originDate: formatDate(colony.origin_date),
        ageMonths: Math.floor((daysSince(colony.origin_date) || 0) / 30),
        currentHive: currentHive?.hive_number || 'Not assigned',
        apiary: currentHive?.apiary_name || 'N/A',
        statusReason: colony.status_reason || null,
        notes: colony.notes?.substring(0, 80) || null
      })
    }

    return {
      count: results.length,
      colonies: results
    }
  }
}

// Get detailed info about a specific colony
export const getColonyDetails: Tool = {
  name: 'getColonyDetails',
  description: 'Get full details about a specific colony including origin, status, current location, and parent colonies',
  parameters: z.object({
    colonyNumber: z.string().describe('Colony number or identifier')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { colonyNumber: string }
    const supabase = getSupabase()
    const colony = await findColonyByNumber(userId, args.colonyNumber)

    if (!colony) {
      return `Colony "${args.colonyNumber}" not found.`
    }

    const { data, error } = await supabase
      .from('colonies')
      .select(`
        id, colony_number, origin_type, origin_date, status, status_date, status_reason, notes,
        parent:colonies!colonies_parent_colony_id_fkey(colony_number, status),
        secondary_parent:colonies!colonies_secondary_parent_colony_id_fkey(colony_number, status)
      `)
      .eq('id', colony.id)
      .single()

    if (error || !data) return `Error fetching colony: ${error?.message || 'Not found'}`

    // Get current hive
    const currentHive = await getCurrentHiveForColony(data.id)

    // Get child colonies (colonies where this is a parent)
    const { data: children } = await supabase
      .from('colonies')
      .select('colony_number, status, origin_type, origin_date')
      .or(`parent_colony_id.eq.${data.id},secondary_parent_colony_id.eq.${data.id}`)

    // Get movement count
    const { count: movementCount } = await supabase
      .from('colony_movements')
      .select('*', { count: 'exact', head: true })
      .eq('colony_id', data.id)

    // Handle self-referencing joins (returns array or object depending on Supabase version)
    const parentRaw = data.parent as unknown
    const parent = Array.isArray(parentRaw) ? parentRaw[0] as { colony_number: string; status: string } | undefined : parentRaw as { colony_number: string; status: string } | null
    const secondaryParentRaw = data.secondary_parent as unknown
    const secondaryParent = Array.isArray(secondaryParentRaw) ? secondaryParentRaw[0] as { colony_number: string; status: string } | undefined : secondaryParentRaw as { colony_number: string; status: string } | null

    return {
      colonyNumber: data.colony_number,
      status: data.status,
      statusDate: data.status_date ? formatDate(data.status_date) : null,
      statusReason: data.status_reason || null,
      origin: {
        type: data.origin_type,
        date: formatDate(data.origin_date),
        ageMonths: Math.floor((daysSince(data.origin_date) || 0) / 30)
      },
      currentLocation: currentHive ? {
        hive: currentHive.hive_number,
        apiary: currentHive.apiary_name,
        since: formatDate(currentHive.moved_date)
      } : null,
      parentColony: parent ? {
        colonyNumber: parent.colony_number,
        status: parent.status
      } : null,
      secondaryParent: secondaryParent ? {
        colonyNumber: secondaryParent.colony_number,
        status: secondaryParent.status
      } : null,
      childColonies: children?.map(c => ({
        colonyNumber: c.colony_number,
        status: c.status,
        originType: c.origin_type,
        originDate: formatDate(c.origin_date)
      })) || [],
      movementCount: movementCount || 0,
      notes: data.notes || null
    }
  }
}

// Get colony movement history
export const getColonyHistory: Tool = {
  name: 'getColonyHistory',
  description: 'Get the movement history for a colony - all the hives it has lived in over time',
  parameters: z.object({
    colonyNumber: z.string().describe('Colony number or identifier'),
    limit: z.number().optional().describe('Maximum number of movements to return (default 20)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { colonyNumber: string; limit?: number }
    const supabase = getSupabase()
    const colony = await findColonyByNumber(userId, args.colonyNumber)

    if (!colony) {
      return `Colony "${args.colonyNumber}" not found.`
    }

    const limit = args.limit || 20

    const { data, error } = await supabase
      .from('colony_movements')
      .select(`
        movement_date, movement_type, notes,
        from_hive:from_hive_id(hive_number, apiaries(name)),
        to_hive:to_hive_id(hive_number, apiaries(name))
      `)
      .eq('colony_id', colony.id)
      .order('movement_date', { ascending: false })
      .limit(limit)

    if (error) return `Error fetching movements: ${error.message}`
    if (!data?.length) return `No movement history found for colony "${colony.colony_number}".`

    return {
      colonyNumber: colony.colony_number,
      movementCount: data.length,
      movements: data.map(m => {
        const fromHive = getHiveInfo(m.from_hive)
        const toHive = getHiveInfo(m.to_hive)
        return {
          date: formatDate(m.movement_date),
          type: m.movement_type,
          from: fromHive.hive_number !== 'None' ? `${fromHive.hive_number} (${fromHive.apiary_name})` : null,
          to: toHive.hive_number !== 'None' ? `${toHive.hive_number} (${toHive.apiary_name})` : null,
          notes: m.notes?.substring(0, 80) || null
        }
      })
    }
  }
}

// Get colony lineage (parents and children)
export const getColonyLineage: Tool = {
  name: 'getColonyLineage',
  description: 'Get the family tree for a colony - parent colonies and all offspring (splits)',
  parameters: z.object({
    colonyNumber: z.string().describe('Colony number or identifier')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { colonyNumber: string }
    const supabase = getSupabase()
    const colony = await findColonyByNumber(userId, args.colonyNumber)

    if (!colony) {
      return `Colony "${args.colonyNumber}" not found.`
    }

    // Get colony with parent info
    const { data: colonyData, error } = await supabase
      .from('colonies')
      .select(`
        id, colony_number, origin_type, origin_date, status,
        parent:colonies!colonies_parent_colony_id_fkey(id, colony_number, status, origin_type, origin_date),
        secondary_parent:colonies!colonies_secondary_parent_colony_id_fkey(id, colony_number, status, origin_type, origin_date)
      `)
      .eq('id', colony.id)
      .single()

    if (error || !colonyData) return `Error fetching colony: ${error?.message || 'Not found'}`

    // Handle self-referencing joins
    type ParentType = { id: string; colony_number: string; status: string; origin_type: string; origin_date: string }
    const parentRaw = colonyData.parent as unknown
    const parent = Array.isArray(parentRaw) ? parentRaw[0] as ParentType | undefined : parentRaw as ParentType | null

    // Get grandparent if parent exists
    let grandparent: { colony_number: string; status: string } | null = null
    if (parent?.id) {
      const { data: gpData } = await supabase
        .from('colonies')
        .select('parent:colonies!colonies_parent_colony_id_fkey(colony_number, status)')
        .eq('id', parent.id)
        .maybeSingle()
      if (gpData?.parent) {
        const gpRaw = gpData.parent as unknown
        grandparent = Array.isArray(gpRaw) ? gpRaw[0] as { colony_number: string; status: string } : gpRaw as { colony_number: string; status: string }
      }
    }

    // Get all descendants (children and grandchildren)
    const { data: children } = await supabase
      .from('colonies')
      .select('id, colony_number, status, origin_type, origin_date')
      .or(`parent_colony_id.eq.${colonyData.id},secondary_parent_colony_id.eq.${colonyData.id}`)
      .order('origin_date', { ascending: true })

    // Get grandchildren
    const grandchildren = []
    if (children?.length) {
      const childIds = children.map(c => c.id)
      const { data: gcData } = await supabase
        .from('colonies')
        .select('colony_number, status, origin_type, origin_date, parent:colonies!colonies_parent_colony_id_fkey(colony_number)')
        .in('parent_colony_id', childIds)

      if (gcData) {
        grandchildren.push(...gcData.map(gc => {
          const parentRaw = gc.parent as unknown
          const parentData = Array.isArray(parentRaw) ? parentRaw[0] as { colony_number: string } | undefined : parentRaw as { colony_number: string } | null
          return {
            colonyNumber: gc.colony_number,
            status: gc.status,
            originType: gc.origin_type,
            originDate: formatDate(gc.origin_date),
            parentColony: parentData?.colony_number || 'Unknown'
          }
        }))
      }
    }

    // Get siblings (same parent)
    let siblings: Array<{ colony_number: string; status: string; origin_date: string }> = []
    if (parent) {
      const { data: siblingData } = await supabase
        .from('colonies')
        .select('colony_number, status, origin_date')
        .eq('parent_colony_id', parent.id)
        .neq('id', colonyData.id)
        .limit(10)
      siblings = siblingData || []
    }

    const secondaryParentRaw = colonyData.secondary_parent as unknown
    const secondaryParent = Array.isArray(secondaryParentRaw) ? secondaryParentRaw[0] as { colony_number: string; status: string } | undefined : secondaryParentRaw as { colony_number: string; status: string } | null

    return {
      colony: {
        colonyNumber: colonyData.colony_number,
        status: colonyData.status,
        originType: colonyData.origin_type,
        originDate: formatDate(colonyData.origin_date)
      },
      ancestors: {
        parent: parent ? {
          colonyNumber: parent.colony_number,
          status: parent.status,
          originType: parent.origin_type
        } : null,
        secondaryParent: secondaryParent ? {
          colonyNumber: secondaryParent.colony_number,
          status: secondaryParent.status
        } : null,
        grandparent: grandparent ? {
          colonyNumber: grandparent.colony_number,
          status: grandparent.status
        } : null
      },
      siblings: siblings.map(s => ({
        colonyNumber: s.colony_number,
        status: s.status,
        originDate: formatDate(s.origin_date)
      })),
      children: children?.map(c => ({
        colonyNumber: c.colony_number,
        status: c.status,
        originType: c.origin_type,
        originDate: formatDate(c.origin_date)
      })) || [],
      grandchildren,
      summary: {
        childCount: children?.length || 0,
        grandchildCount: grandchildren.length,
        siblingCount: siblings.length
      }
    }
  }
}

// Get which colony is in a specific hive
export const getColonyInHive: Tool = {
  name: 'getColonyInHive',
  description: 'Find which colony is currently residing in a specific hive',
  parameters: z.object({
    hiveName: z.string().describe('Hive number or name')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { hiveName: string }
    const supabase = getSupabase()

    // First find the hive
    const { data: hive } = await supabase
      .from('hives')
      .select('id, hive_number, apiaries(name)')
      .eq('user_id', userId)
      .ilike('hive_number', `%${args.hiveName}%`)
      .limit(1)
      .maybeSingle()

    if (!hive) {
      return `Hive "${args.hiveName}" not found.`
    }

    // Find most recent movement TO this hive
    const { data: movement } = await supabase
      .from('colony_movements')
      .select(`
        movement_date, movement_type,
        colonies(id, colony_number, status, origin_type, origin_date)
      `)
      .eq('to_hive_id', hive.id)
      .order('movement_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!movement?.colonies) {
      return `No colony currently assigned to hive "${hive.hive_number}".`
    }

    // Handle join returning array or object
    type ColonyType = { id: string; colony_number: string; status: string; origin_type: string; origin_date: string }
    const coloniesRaw = movement.colonies as unknown
    const colony = Array.isArray(coloniesRaw) ? coloniesRaw[0] as ColonyType | undefined : coloniesRaw as ColonyType | null

    if (!colony) {
      return `No colony currently assigned to hive "${hive.hive_number}".`
    }

    // Check if colony has moved OUT of this hive since
    const { data: laterMovement } = await supabase
      .from('colony_movements')
      .select('movement_date, to_hive_id')
      .eq('colony_id', colony.id)
      .eq('from_hive_id', hive.id)
      .gt('movement_date', movement.movement_date)
      .limit(1)
      .maybeSingle()

    if (laterMovement) {
      return `Colony "${colony.colony_number}" was in hive "${hive.hive_number}" but moved out on ${formatDate(laterMovement.movement_date)}.`
    }

    const hiveInfo = getHiveInfo(hive)

    return {
      hive: hive.hive_number,
      apiary: hiveInfo.apiary_name,
      colony: {
        colonyNumber: colony.colony_number,
        status: colony.status,
        originType: colony.origin_type,
        originDate: formatDate(colony.origin_date),
        ageMonths: Math.floor((daysSince(colony.origin_date) || 0) / 30),
        inHiveSince: formatDate(movement.movement_date)
      }
    }
  }
}

// Get deceased/dead colonies with reasons
export const getDeceasedColonies: Tool = {
  name: 'getDeceasedColonies',
  description: 'Get colonies that have died or been lost, with reasons and dates',
  parameters: z.object({
    limit: z.number().optional().describe('Maximum number to return (default 20)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { limit?: number }
    const supabase = getSupabase()
    const limit = args.limit || 20

    const { data, error } = await supabase
      .from('colonies')
      .select('colony_number, status, status_date, status_reason, origin_type, origin_date, notes')
      .eq('user_id', userId)
      .neq('status', 'active')
      .order('status_date', { ascending: false })
      .limit(limit)

    if (error) return `Error fetching colonies: ${error.message}`
    if (!data?.length) return 'No deceased or lost colonies found.'

    return {
      count: data.length,
      colonies: data.map(c => ({
        colonyNumber: c.colony_number,
        status: c.status,
        statusDate: c.status_date ? formatDate(c.status_date) : 'Unknown',
        reason: c.status_reason || 'Unknown',
        originType: c.origin_type,
        lifespan: c.status_date && c.origin_date
          ? `${Math.floor((new Date(c.status_date).getTime() - new Date(c.origin_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months`
          : 'Unknown',
        notes: c.notes?.substring(0, 80) || null
      }))
    }
  }
}

// Get colony statistics summary
export const getColonyStats: Tool = {
  name: 'getColonyStats',
  description: 'Get statistics about colonies: counts by status, origin type, and average lifespan',
  parameters: z.object({}),
  execute: async (_args: unknown, userId: string) => {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('colonies')
      .select('status, origin_type, origin_date, status_date')
      .eq('user_id', userId)

    if (error) return `Error fetching colonies: ${error.message}`
    if (!data?.length) return 'No colonies found.'

    // Count by status
    const statusCounts: Record<string, number> = {}
    const originCounts: Record<string, number> = {}
    let totalLifespanDays = 0
    let deceasedCount = 0

    for (const colony of data) {
      statusCounts[colony.status] = (statusCounts[colony.status] || 0) + 1
      originCounts[colony.origin_type] = (originCounts[colony.origin_type] || 0) + 1

      if (colony.status !== 'active' && colony.status_date && colony.origin_date) {
        const lifespan = new Date(colony.status_date).getTime() - new Date(colony.origin_date).getTime()
        totalLifespanDays += lifespan / (1000 * 60 * 60 * 24)
        deceasedCount++
      }
    }

    return {
      totalColonies: data.length,
      byStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      byOrigin: Object.entries(originCounts).map(([origin, count]) => ({ origin, count })),
      averageLifespanMonths: deceasedCount > 0
        ? Math.round(totalLifespanDays / deceasedCount / 30)
        : null,
      activeCount: statusCounts['active'] || 0,
      lostCount: data.length - (statusCounts['active'] || 0)
    }
  }
}
