import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, findQueenByNumber, findBatchByName, formatDate, daysSince, daysUntil } from './utils'

// Helper to extract hive info from Supabase join
function getHiveInfo(hives: unknown): { hive_number: string; apiary_name: string } {
  if (!hives) return { hive_number: 'None', apiary_name: 'N/A' }
  const h = hives as { hive_number?: string; apiaries?: unknown }
  const apiaries = h.apiaries
  let apiaryName = 'N/A'
  if (apiaries && typeof apiaries === 'object' && 'name' in (apiaries as Record<string, unknown>)) {
    apiaryName = (apiaries as { name: string }).name
  }
  return {
    hive_number: h.hive_number || 'None',
    apiary_name: apiaryName
  }
}

// Get queen inventory
export const getQueenInventory: Tool = {
  name: 'getQueenInventory',
  description: 'Get list of all queens with status, age, and current hive location',
  parameters: z.object({
    status: z.enum(['active', 'all']).optional().describe('Filter by status: active only or all (default active)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { status?: 'active' | 'all' }
    const supabase = getSupabase()

    let query = supabase
      .from('queens')
      .select('queen_number, status, marking_color, breed, source, introduction_date, hives(hive_number, apiaries(name))')
      .eq('user_id', userId)
      .order('queen_number')

    if (args.status !== 'all') {
      query = query.eq('status', 'Active')
    }

    const { data, error } = await query

    if (error) return `Error fetching queens: ${error.message}`
    if (!data?.length) return 'No queens found.'

    return data.map(q => {
      const hiveInfo = getHiveInfo(q.hives)
      return {
        queenNumber: q.queen_number,
        status: q.status || 'Unknown',
        color: q.marking_color || 'Unknown',
        breed: q.breed || 'Unknown',
        source: q.source || 'Unknown',
        introduced: q.introduction_date ? formatDate(q.introduction_date) : 'Unknown',
        ageMonths: q.introduction_date ? Math.floor((daysSince(q.introduction_date) || 0) / 30) : null,
        currentHive: hiveInfo.hive_number,
        apiary: hiveInfo.apiary_name
      }
    })
  }
}

// Get active rearing batches
export const getActiveBatches: Tool = {
  name: 'getActiveBatches',
  description: 'Get queen rearing batches currently in progress',
  parameters: z.object({}),
  execute: async (_args: unknown, userId: string) => {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('rearing_batches')
      .select('batch_name, status, graft_date, expected_hatch_date, expected_mating_date, expected_laying_date, cells_grafted, cells_accepted, queens_mated, queens_laying, notes')
      .eq('user_id', userId)
      .in('status', ['Active', 'In Progress', 'Grafted', 'Cells Capped', 'Virgins', 'Mating'])
      .order('graft_date', { ascending: false })

    if (error) return `Error fetching batches: ${error.message}`
    if (!data?.length) return 'No active rearing batches found.'

    return data.map(b => ({
      batchName: b.batch_name,
      status: b.status,
      graftDate: formatDate(b.graft_date),
      daysSinceGraft: daysSince(b.graft_date),
      expectedHatch: b.expected_hatch_date ? formatDate(b.expected_hatch_date) : 'N/A',
      daysToHatch: daysUntil(b.expected_hatch_date),
      expectedMating: b.expected_mating_date ? formatDate(b.expected_mating_date) : 'N/A',
      daysToMating: daysUntil(b.expected_mating_date),
      expectedLaying: b.expected_laying_date ? formatDate(b.expected_laying_date) : 'N/A',
      daysToLaying: daysUntil(b.expected_laying_date),
      cellsGrafted: b.cells_grafted ?? 0,
      cellsAccepted: b.cells_accepted ?? 0,
      queensMated: b.queens_mated ?? 0,
      queensLaying: b.queens_laying ?? 0,
      notes: b.notes?.substring(0, 100) || 'None'
    }))
  }
}

// Get batch details
export const getBatchDetails: Tool = {
  name: 'getBatchDetails',
  description: 'Get full details of a specific queen rearing batch including timeline',
  parameters: z.object({
    batchName: z.string().describe('Name of the rearing batch')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { batchName: string }
    const supabase = getSupabase()
    const batch = await findBatchByName(userId, args.batchName)

    if (!batch) {
      return `Batch "${args.batchName}" not found.`
    }

    const { data, error } = await supabase
      .from('rearing_batches')
      .select('*')
      .eq('id', batch.id)
      .single()

    if (error || !data) return `Error fetching batch details: ${error?.message || 'Not found'}`

    const { data: queens } = await supabase
      .from('queens')
      .select('queen_number, status, hives(hive_number)')
      .eq('batch_id', batch.id)

    return {
      batchName: data.batch_name,
      status: data.status,
      motherQueen: data.mother_queen || 'Unknown',
      graftDate: formatDate(data.graft_date),
      daysSinceGraft: daysSince(data.graft_date),
      timeline: {
        expectedHatch: data.expected_hatch_date ? formatDate(data.expected_hatch_date) : 'N/A',
        daysToHatch: daysUntil(data.expected_hatch_date),
        expectedMating: data.expected_mating_date ? formatDate(data.expected_mating_date) : 'N/A',
        daysToMating: daysUntil(data.expected_mating_date),
        expectedLaying: data.expected_laying_date ? formatDate(data.expected_laying_date) : 'N/A',
        daysToLaying: daysUntil(data.expected_laying_date)
      },
      progress: {
        cellsGrafted: data.cells_grafted ?? 0,
        cellsAccepted: data.cells_accepted ?? 0,
        acceptanceRate: data.cells_grafted ? `${((data.cells_accepted || 0) / data.cells_grafted * 100).toFixed(0)}%` : 'N/A',
        queensHatched: data.queens_hatched ?? 0,
        queensMated: data.queens_mated ?? 0,
        queensLaying: data.queens_laying ?? 0
      },
      queensProduced: queens?.map(q => {
        const h = q.hives as { hive_number?: string } | null
        return {
          queenNumber: q.queen_number,
          status: q.status,
          currentHive: h?.hive_number || 'None'
        }
      }) || [],
      notes: data.notes || 'None'
    }
  }
}

// Get upcoming batch events
export const getUpcomingBatchEvents: Tool = {
  name: 'getUpcomingBatchEvents',
  description: 'Get next milestone dates for active queen rearing batches',
  parameters: z.object({
    days: z.number().optional().describe('Look ahead period in days (default 7)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { days?: number }
    const supabase = getSupabase()
    const lookAhead = args.days || 7

    const { data, error } = await supabase
      .from('rearing_batches')
      .select('batch_name, status, expected_hatch_date, expected_mating_date, expected_laying_date')
      .eq('user_id', userId)
      .in('status', ['Active', 'In Progress', 'Grafted', 'Cells Capped', 'Virgins', 'Mating'])

    if (error) return `Error fetching batches: ${error.message}`
    if (!data?.length) return 'No active batches found.'

    const today = new Date()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + lookAhead)

    const upcomingEvents: Array<{ batchName: string; event: string; date: string; daysUntil: number }> = []

    for (const batch of data) {
      const events = [
        { type: 'Expected Hatch', date: batch.expected_hatch_date },
        { type: 'Expected Mating', date: batch.expected_mating_date },
        { type: 'Expected Laying', date: batch.expected_laying_date }
      ]

      for (const event of events) {
        if (!event.date) continue
        const eventDate = new Date(event.date)
        if (eventDate >= today && eventDate <= cutoff) {
          upcomingEvents.push({
            batchName: batch.batch_name,
            event: event.type,
            date: formatDate(event.date),
            daysUntil: daysUntil(event.date) || 0
          })
        }
      }
    }

    if (upcomingEvents.length === 0) {
      return `No batch events in the next ${lookAhead} days.`
    }

    upcomingEvents.sort((a, b) => a.daysUntil - b.daysUntil)

    return {
      lookAheadDays: lookAhead,
      events: upcomingEvents
    }
  }
}

// Get queen lineage
export const getQueenLineage: Tool = {
  name: 'getQueenLineage',
  description: 'Get mother and daughter queens for a specific queen',
  parameters: z.object({
    queenNumber: z.string().describe('Queen number or identifier')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { queenNumber: string }
    const supabase = getSupabase()
    const queen = await findQueenByNumber(userId, args.queenNumber)

    if (!queen) {
      return `Queen "${args.queenNumber}" not found.`
    }

    const { data: queenData, error } = await supabase
      .from('queens')
      .select('queen_number, status, breed, marking_color, introduction_date, mother_id, hives(hive_number, apiaries(name))')
      .eq('id', queen.id)
      .single()

    if (error || !queenData) return `Error fetching queen: ${error?.message || 'Not found'}`

    let mother = null
    if (queenData.mother_id) {
      const { data: motherData } = await supabase
        .from('queens')
        .select('queen_number, status, breed')
        .eq('id', queenData.mother_id)
        .single()
      mother = motherData
    }

    const { data: daughters } = await supabase
      .from('queens')
      .select('queen_number, status, breed, hives(hive_number)')
      .eq('mother_id', queen.id)
      .eq('user_id', userId)

    const hiveInfo = getHiveInfo(queenData.hives)

    return {
      queen: {
        number: queenData.queen_number,
        status: queenData.status,
        breed: queenData.breed || 'Unknown',
        color: queenData.marking_color || 'Unknown',
        introduced: queenData.introduction_date ? formatDate(queenData.introduction_date) : 'Unknown',
        currentHive: hiveInfo.hive_number,
        apiary: hiveInfo.apiary_name
      },
      mother: mother ? {
        number: mother.queen_number,
        status: mother.status,
        breed: mother.breed || 'Unknown'
      } : null,
      daughters: daughters?.map(d => {
        const h = d.hives as { hive_number?: string } | null
        return {
          number: d.queen_number,
          status: d.status,
          breed: d.breed || 'Unknown',
          currentHive: h?.hive_number || 'None'
        }
      }) || []
    }
  }
}
