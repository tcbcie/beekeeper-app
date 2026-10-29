import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, findQueenByNumber, findBatchByName, formatDate, daysSince, daysUntil, logToolError, todayInDublin, addDaysISO, boundedInt } from './utils'

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
      .select('queen_number, status, marking_color, subspecies, source, birth_date, hives(hive_number, apiaries(name))')
      .eq('user_id', userId)
      .order('queen_number')

    if (args.status !== 'all') {
      // Stored lower case; the same meaning as the Queens page's default filter.
      query = query.eq('status', 'active')
    }

    const { data, error } = await query

    if (error) return `Error fetching queens: ${logToolError(error)}`
    if (!data?.length) return 'No queens found.'

    return data.map(q => {
      const hiveInfo = getHiveInfo(q.hives)
      return {
        queenNumber: q.queen_number,
        status: q.status || 'Unknown',
        color: q.marking_color || 'Unknown',
        subspecies: q.subspecies || 'Unknown',
        source: q.source || 'Unknown',
        birthDate: q.birth_date ? formatDate(q.birth_date) : 'Unknown',
        ageMonths: q.birth_date ? Math.floor((daysSince(q.birth_date) || 0) / 30) : null,
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
      .select('batch_name, status, graft_date, emergence_date, cell_count, grafts_accepted, queens_hatched, queens_mated, notes')
      .eq('user_id', userId)
      // Any batch not completed is running, the same rule as the Batches page.
      .neq('status', 'completed')
      .order('graft_date', { ascending: false })

    if (error) return `Error fetching batches: ${logToolError(error)}`
    if (!data?.length) return 'No active rearing batches found.'

    return data.map(b => ({
      batchName: b.batch_name,
      status: b.status,
      graftDate: formatDate(b.graft_date),
      daysSinceGraft: daysSince(b.graft_date),
      emergenceDate: b.emergence_date ? formatDate(b.emergence_date) : 'N/A',
      daysToEmergence: daysUntil(b.emergence_date),
      cellCount: b.cell_count ?? 0,
      graftsAccepted: b.grafts_accepted ?? 0,
      queensHatched: b.queens_hatched ?? 0,
      queensMated: b.queens_mated ?? 0,
      notes: b.notes?.substring(0, 100) || 'None'
    }))
  }
}

// Get batch details
// Named apart from traceability's getBatchDetails (honey bottling batches): both used to be
// called getBatchDetails and the registry spread kept only the traceability one.
export const getRearingBatchDetails: Tool = {
  name: 'getRearingBatchDetails',
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
      // Explicit columns: the mother is sent as her queen number, never as a raw ID.
      .select('batch_name, status, graft_date, emergence_date, acceptance_check_date, cell_count, grafts_accepted, queens_hatched, queens_mated, notes, mother:queens!rearing_batches_mother_queen_id_fkey(queen_number)')
      .eq('id', batch.id)
      .single()

    if (error || !data) return `Error fetching batch details: ${logToolError(error)}`

    const { data: queens } = await supabase
      .from('queens')
      .select('queen_number, status, hives(hive_number)')
      .eq('batch_id', batch.id)

    const mother = (Array.isArray(data.mother) ? data.mother[0] : data.mother) as { queen_number?: string } | null | undefined
    return {
      batchName: data.batch_name,
      status: data.status,
      motherQueen: mother?.queen_number || 'Unknown',
      graftDate: formatDate(data.graft_date),
      daysSinceGraft: daysSince(data.graft_date),
      timeline: {
        emergenceDate: data.emergence_date ? formatDate(data.emergence_date) : 'N/A',
        daysToEmergence: daysUntil(data.emergence_date),
        acceptanceCheckDate: data.acceptance_check_date ? formatDate(data.acceptance_check_date) : 'N/A'
      },
      progress: {
        cellCount: data.cell_count ?? 0,
        graftsAccepted: data.grafts_accepted ?? 0,
        acceptanceRate: data.cell_count ? `${((data.grafts_accepted || 0) / data.cell_count * 100).toFixed(0)}%` : 'N/A',
        queensHatched: data.queens_hatched ?? 0,
        queensMated: data.queens_mated ?? 0
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
    days: boundedInt(365).optional().describe('Look ahead period in days (default 7)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { days?: number }
    const supabase = getSupabase()
    const lookAhead = args.days || 7

    const { data, error } = await supabase
      .from('rearing_batches')
      .select('batch_name, status, emergence_date, acceptance_check_date, first_option_to_cage_date, second_option_to_cage_date')
      .eq('user_id', userId)
      .neq('status', 'completed')

    if (error) return `Error fetching batches: ${logToolError(error)}`
    if (!data?.length) return 'No active batches found.'

    // Calendar dates in Ireland, so an event due today is included.
    const today = todayInDublin()
    const cutoff = addDaysISO(today, lookAhead)

    const upcomingEvents: Array<{ batchName: string; event: string; date: string; daysUntil: number }> = []

    for (const batch of data) {
      const events = [
        { type: 'Emergence', date: batch.emergence_date },
        { type: 'Acceptance Check', date: batch.acceptance_check_date },
        { type: 'First Cage Option', date: batch.first_option_to_cage_date },
        { type: 'Second Cage Option', date: batch.second_option_to_cage_date }
      ]

      for (const event of events) {
        if (!event.date) continue
        if (event.date >= today && event.date <= cutoff) {
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

    // Ancestors are fetched one generation per query (never a queens->queens embed): 4 round
    // trips instead of 10. Scoped to the requesting user so ancestors / descendants belonging to
    // other users (e.g. a sold queen whose lineage points at one of theirs) are NOT returned.
    type LineageQueen = { id: string; queen_number: string; status: string; marking_color: string; subspecies: string; mother_id: string | null; father_id: string | null }
    const fetchQueens = async (ids: (string | null)[]): Promise<Map<string, LineageQueen>> => {
      const wanted = ids.filter((id): id is string => Boolean(id))
      const byId = new Map<string, LineageQueen>()
      if (wanted.length === 0) return byId
      const { data } = await supabase
        .from('queens')
        .select('id, queen_number, status, marking_color, subspecies, mother_id, father_id')
        .in('id', wanted)
        .eq('user_id', userId)
      for (const q of (data || []) as LineageQueen[]) byId.set(q.id, q)
      return byId
    }

    // Fetch the main queen with all details
    const { data: queenData, error } = await supabase
      .from('queens')
      .select('id, queen_number, status, subspecies, marking_color, birth_date, lineage, mother_id, father_id, batch_id, hives(hive_number, apiaries(name))')
      .eq('id', queen.id)
      .eq('user_id', userId)
      .single()

    if (error || !queenData) return `Error fetching queen: ${logToolError(error)}`

    // Parents, daughters, siblings and the source batch all depend only on this queen.
    // Daughters and siblings are scoped so a queen sold to another user whose lineage points back
    // here doesn't surface in this user's lists.
    const [parents, { data: daughters }, { data: siblingsData }, { data: batchData }] = await Promise.all([
      fetchQueens([queenData.mother_id, queenData.father_id]),
      supabase
        .from('queens')
        .select('queen_number, status, marking_color, hives(hive_number)')
        .eq('mother_id', queen.id)
        .eq('user_id', userId)
        .order('birth_date', { ascending: false }),
      queenData.mother_id
        ? supabase
            .from('queens')
            .select('queen_number, status, marking_color')
            .eq('mother_id', queenData.mother_id)
            .eq('user_id', userId)
            .neq('id', queen.id)
            .limit(10)
        : Promise.resolve({ data: null }),
      queenData.batch_id
        ? supabase
            .from('rearing_batches')
            .select('batch_name, graft_date, status')
            .eq('id', queenData.batch_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const mother = queenData.mother_id ? parents.get(queenData.mother_id) ?? null : null
    const father = queenData.father_id ? parents.get(queenData.father_id) ?? null : null

    // Grandparents (mother's parents)
    const grandparents = mother ? await fetchQueens([mother.mother_id, mother.father_id]) : new Map<string, LineageQueen>()
    const grandmother = mother?.mother_id ? grandparents.get(mother.mother_id) ?? null : null
    const grandfather = mother?.father_id ? grandparents.get(mother.father_id) ?? null : null

    // Great-grandparents (grandmother's parents)
    const greatGrandparents = grandmother ? await fetchQueens([grandmother.mother_id, grandmother.father_id]) : new Map<string, LineageQueen>()
    const greatGrandmother = grandmother?.mother_id ? greatGrandparents.get(grandmother.mother_id) ?? null : null
    const greatGrandfather = grandmother?.father_id ? greatGrandparents.get(grandmother.father_id) ?? null : null

    const siblings: { queen_number: string; status: string; marking_color: string }[] = siblingsData || []
    const sourceBatch = batchData

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
