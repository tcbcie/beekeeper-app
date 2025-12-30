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

// Get queen lineage - comprehensive 3-generation ancestry
export const getQueenLineage: Tool = {
  name: 'getQueenLineage',
  description: 'Get full lineage for a queen including 3 generations of ancestors (parents, grandparents, great-grandparents), daughters, siblings, and source batch',
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

    // Helper to fetch a queen by ID
    const fetchQueen = async (id: string | null) => {
      if (!id) return null
      const { data } = await supabase
        .from('queens')
        .select('id, queen_number, status, marking_color, subspecies, mother_id, father_id')
        .eq('id', id)
        .maybeSingle()
      return data
    }

    // Fetch the main queen with all details
    const { data: queenData, error } = await supabase
      .from('queens')
      .select('id, queen_number, status, subspecies, marking_color, birth_date, lineage, mother_id, father_id, batch_id, hives(hive_number, apiaries(name))')
      .eq('id', queen.id)
      .single()

    if (error || !queenData) return `Error fetching queen: ${error?.message || 'Not found'}`

    // Fetch 3 generations of ancestors
    const mother = await fetchQueen(queenData.mother_id)
    const father = await fetchQueen(queenData.father_id)

    // Grandparents (mother's parents)
    const grandmother = mother ? await fetchQueen(mother.mother_id) : null
    const grandfather = mother ? await fetchQueen(mother.father_id) : null

    // Great-grandparents (grandmother's parents)
    const greatGrandmother = grandmother ? await fetchQueen(grandmother.mother_id) : null
    const greatGrandfather = grandmother ? await fetchQueen(grandmother.father_id) : null

    // Fetch daughters (queens where mother_id = this queen)
    const { data: daughters } = await supabase
      .from('queens')
      .select('queen_number, status, marking_color, hives(hive_number)')
      .eq('mother_id', queen.id)
      .order('birth_date', { ascending: false })

    // Fetch siblings (same mother, excluding self)
    let siblings: { queen_number: string; status: string; marking_color: string }[] = []
    if (queenData.mother_id) {
      const { data: siblingsData } = await supabase
        .from('queens')
        .select('queen_number, status, marking_color')
        .eq('mother_id', queenData.mother_id)
        .neq('id', queen.id)
        .limit(10)
      siblings = siblingsData || []
    }

    // Fetch source batch if exists
    let sourceBatch = null
    if (queenData.batch_id) {
      const { data: batchData } = await supabase
        .from('rearing_batches')
        .select('batch_name, graft_date, status')
        .eq('id', queenData.batch_id)
        .maybeSingle()
      sourceBatch = batchData
    }

    const hiveInfo = getHiveInfo(queenData.hives)

    // Format queen info helper
    const formatQueenInfo = (q: { queen_number: string; status: string; marking_color: string; subspecies?: string } | null) => {
      if (!q) return null
      return {
        number: q.queen_number,
        status: q.status || 'Unknown',
        color: q.marking_color || 'Unknown',
        subspecies: q.subspecies || 'Unknown'
      }
    }

    return {
      queen: {
        number: queenData.queen_number,
        status: queenData.status || 'Unknown',
        color: queenData.marking_color || 'Unknown',
        subspecies: queenData.subspecies || 'Unknown',
        birthDate: queenData.birth_date ? formatDate(queenData.birth_date) : 'Unknown',
        lineage: queenData.lineage || 'Not recorded',
        currentHive: hiveInfo.hive_number,
        apiary: hiveInfo.apiary_name
      },
      ancestry: {
        mother: formatQueenInfo(mother),
        father: formatQueenInfo(father),
        grandmother: formatQueenInfo(grandmother),
        grandfather: formatQueenInfo(grandfather),
        greatGrandmother: formatQueenInfo(greatGrandmother),
        greatGrandfather: formatQueenInfo(greatGrandfather)
      },
      sourceBatch: sourceBatch ? {
        name: sourceBatch.batch_name,
        graftDate: sourceBatch.graft_date ? formatDate(sourceBatch.graft_date) : 'Unknown',
        status: sourceBatch.status
      } : null,
      daughters: daughters?.map(d => {
        const h = d.hives as { hive_number?: string } | null
        return {
          number: d.queen_number,
          status: d.status || 'Unknown',
          color: d.marking_color || 'Unknown',
          currentHive: h?.hive_number || 'None'
        }
      }) || [],
      daughterCount: daughters?.length || 0,
      siblings: siblings.map(s => ({
        number: s.queen_number,
        status: s.status || 'Unknown',
        color: s.marking_color || 'Unknown'
      })),
      siblingCount: siblings.length
    }
  }
}
