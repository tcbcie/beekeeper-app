import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, getAccessibleHiveIds, getAccessibleApiaryIds, getOwnApiaryIds, findHiveByName, formatDate, logToolError, todayInDublin, addDaysISO, boundedInt } from './utils'

// Helper to extract hive info from Supabase join
function getHiveInfo(hives: unknown): { hive_number: string; apiary_name: string } {
  if (!hives) return { hive_number: 'Unknown', apiary_name: 'Unknown' }
  const h = hives as { hive_number?: string; apiaries?: unknown }
  const apiaries = h.apiaries
  let apiaryName = 'Unknown'
  if (apiaries && typeof apiaries === 'object' && 'name' in (apiaries as Record<string, unknown>)) {
    apiaryName = (apiaries as { name: string }).name
  }
  return {
    hive_number: h.hive_number || 'Unknown',
    apiary_name: apiaryName
  }
}

// The form stores "L" and older records "liters", so one hive's litres add up as one amount
function normaliseUnit(unit: string | null): string {
  const text = unit?.trim() ?? ''
  return /^(l|lit(er|re)s?)$/i.test(text) ? 'L' : text
}

// Some older records have no unit: say so, rather than let Mel present a bare number
const describeUnit = (unit: string) => (unit ? ` ${unit}` : ' (unit not recorded)')

// Get feeding history for a hive
export const getFeedingHistory: Tool = {
  name: 'getFeedingHistory',
  description: 'Get feeding records for one specific named hive. For feeding across all hives over a period, use getRecentFeedings.',
  parameters: z.object({
    hiveName: z.string().describe('Name or number of the hive'),
    limit: boundedInt(100).optional().describe('Maximum number of feedings to return (default 10)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { hiveName: string; limit?: number }
    const supabase = getSupabase()
    const hive = await findHiveByName(userId, args.hiveName)

    if (!hive) {
      return `Hive "${args.hiveName}" not found.`
    }

    const { data, error } = await supabase
      .from('feedings')
      .select('feed_date, feed_type, syrup_inverted, quantity, unit, notes')
      .eq('hive_id', hive.id)
      .order('feed_date', { ascending: false })
      .limit(args.limit || 10)

    if (error) return `Error fetching feedings: ${logToolError(error)}`
    if (!data?.length) return `No feeding records found for hive "${hive.hive_number}".`

    return {
      hive: hive.hive_number,
      apiary: hive.apiary_name,
      feedings: data.map(f => ({
        date: formatDate(f.feed_date),
        type: `${f.feed_type || 'Unknown'}${f.syrup_inverted ? ' (inverted)' : ''}`,
        amount: f.quantity != null ? `${f.quantity}${describeUnit(normaliseUnit(f.unit))}` : 'Not recorded',
        notes: f.notes?.substring(0, 50) || 'None'
      }))
    }
  }
}

// The most rows Supabase returns at once; reaching it means the period's figures may be incomplete
const MAX_FEEDING_ROWS = 1000

const roundAmount = (value: number) => Math.round(value * 100) / 100

// Amounts are only added within the same feed and unit: litres of syrup and kilos of fondant don't sum
function addAmount(totals: Map<string, number>, feed: string, unit: string, quantity: number) {
  const key = `${feed}|${unit}`
  totals.set(key, (totals.get(key) ?? 0) + quantity)
}

function describeAmounts(totals: Map<string, number>): string[] {
  return Array.from(totals, ([key, total]) => {
    // From the last bar: a feed's name is free text and could contain one
    const split = key.lastIndexOf('|')
    const feed = key.slice(0, split)
    const unit = key.slice(split + 1)
    return `${roundAmount(total)}${describeUnit(unit)} of ${feed}`
  })
}

// Which hives were fed over a period, and how much
export const getRecentFeedings: Tool = {
  name: 'getRecentFeedings',
  description: 'List which hives were fed over a recent period, across all hives, and how much each one got, with totals. Use for questions like "which hives did I feed in the last six weeks and how much". Give the period in days (six weeks is 42). Includes team apiaries unless the user asks for their own hives only.',
  parameters: z.object({
    daysBack: boundedInt(365).optional().describe('Look back period in days (default 42)'),
    includeShared: z.boolean().optional().describe('Include shared/team hives (default true)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { daysBack?: number; includeShared?: boolean }
    const supabase = getSupabase()
    const apiaryIds = args.includeShared === false
      ? await getOwnApiaryIds(userId)
      : await getAccessibleApiaryIds(userId)

    if (apiaryIds.length === 0) return 'No hives found.'

    // Archived hives count too: a hive fed and then archived was still fed in this period
    const { data: hives, error: hivesError } = await supabase
      .from('hives')
      .select('id, hive_number, apiaries(name)')
      .in('apiary_id', apiaryIds)

    if (hivesError) return `Error fetching hives: ${logToolError(hivesError)}`
    if (!hives?.length) return 'No hives found.'

    const daysBack = args.daysBack || 42
    const cutoffDate = addDaysISO(todayInDublin(), -daysBack)

    const { data: feedings, error } = await supabase
      .from('feedings')
      .select('hive_id, feed_date, feed_type, syrup_inverted, quantity, unit')
      .in('hive_id', hives.map(h => h.id))
      .gte('feed_date', cutoffDate)
      .order('feed_date', { ascending: false })
      .limit(MAX_FEEDING_ROWS)

    if (error) return `Error fetching feedings: ${logToolError(error)}`
    if (!feedings?.length) return `No feedings recorded in the last ${daysBack} days.`

    const hiveById = new Map(hives.map(h => [h.id, getHiveInfo(h)]))
    const overall = new Map<string, number>()
    let withoutAmount = 0
    // Keyed by hive id, as hive numbers can repeat between apiaries. Rows are newest first, so
    // hives keep the order they were last fed and lastFed is each hive's first row.
    const byHive = new Map<string, { lastFed: string; timesFed: number; withoutAmount: number; amounts: Map<string, number> }>()

    for (const row of feedings) {
      const hive = byHive.get(row.hive_id) ?? { lastFed: row.feed_date, timesFed: 0, withoutAmount: 0, amounts: new Map<string, number>() }
      hive.timesFed += 1
      const feed = `${row.feed_type || 'Unknown feed'}${row.syrup_inverted ? ' (inverted)' : ''}`
      const quantity = row.quantity == null ? NaN : Number(row.quantity)
      if (Number.isFinite(quantity)) {
        const unit = normaliseUnit(row.unit)
        addAmount(hive.amounts, feed, unit, quantity)
        addAmount(overall, feed, unit, quantity)
      } else {
        hive.withoutAmount += 1
        withoutAmount += 1
      }
      byHive.set(row.hive_id, hive)
    }

    return {
      period: `Last ${daysBack} days, since ${formatDate(cutoffDate)}`,
      hivesFed: byHive.size,
      totalFeedings: feedings.length,
      feedingsWithNoAmountRecorded: withoutAmount,
      totals: describeAmounts(overall),
      hives: Array.from(byHive, ([hiveId, hive]) => {
        const info = hiveById.get(hiveId)
        return {
          hive: info?.hive_number ?? 'Unknown',
          apiary: info?.apiary_name ?? 'Unknown',
          timesFed: hive.timesFed,
          lastFed: formatDate(hive.lastFed),
          amounts: describeAmounts(hive.amounts),
          feedingsWithNoAmountRecorded: hive.withoutAmount
        }
      }),
      ...(feedings.length >= MAX_FEEDING_ROWS
        ? { note: 'There were too many feedings to read them all, so these figures cover only the most recent ones. Say so, and suggest a shorter period.' }
        : {})
    }
  }
}

// Get hives needing feeding
export const getHivesNeedingFeeding: Tool = {
  name: 'getHivesNeedingFeeding',
  description: 'Get hives with low honey stores from recent inspections',
  parameters: z.object({
    daysBack: boundedInt(365).optional().describe('Look back period for inspections (default 14)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { daysBack?: number }
    const supabase = getSupabase()
    const hiveIds = await getAccessibleHiveIds(userId)

    if (hiveIds.length === 0) {
      return 'No hives found.'
    }

    const daysBack = args.daysBack || 14
    const cutoffDate = addDaysISO(todayInDublin(), -daysBack)

    const { data, error } = await supabase
      .from('inspections')
      .select('inspection_date, honey_supers, honey_stores, notes, hives(hive_number, apiaries(name))')
      .in('hive_id', hiveIds)
      .gte('inspection_date', cutoffDate)
      .order('inspection_date', { ascending: false })

    if (error) return `Error fetching inspections: ${logToolError(error)}`
    if (!data?.length) return `No inspections found in the last ${daysBack} days.`

    // Whole words only: a plain "low" would also match "flow", "slow" and "below", and "light" "flight".
    const lowStoresPattern = /\b(low|empty|light|starving|minimal)\b|needs feeding/
    const needsFeeding: Array<{
      hive: string
      apiary: string
      date: string
      honeySupers: number | null
      honeyStores: string | null
      notes: string
    }> = []

    const seenHives = new Set<string>()

    for (const inspection of data) {
      const info = getHiveInfo(inspection.hives)

      // Rows are newest first: only each hive's latest inspection counts, so an old "low stores"
      // note can't flag a hive whose latest inspection was fine.
      const hiveKey = `${info.apiary_name}|${info.hive_number}`
      if (seenHives.has(hiveKey)) continue
      seenHives.add(hiveKey)

      const honeySupers = inspection.honey_supers
      const honeyStores = inspection.honey_stores?.toLowerCase() || ''
      const notes = inspection.notes?.toLowerCase() || ''

      const isLowSupers = honeySupers !== null && honeySupers <= 1
      const isLowStores = lowStoresPattern.test(honeyStores) || lowStoresPattern.test(notes)

      if (isLowSupers || isLowStores) {
        needsFeeding.push({
          hive: info.hive_number,
          apiary: info.apiary_name,
          date: formatDate(inspection.inspection_date),
          honeySupers: inspection.honey_supers,
          honeyStores: inspection.honey_stores || 'N/A',
          notes: inspection.notes?.substring(0, 100) || 'None'
        })
      }
    }

    if (needsFeeding.length === 0) {
      return `No hives with low honey stores found in the last ${daysBack} days.`
    }

    return {
      lookbackDays: daysBack,
      count: needsFeeding.length,
      hives: needsFeeding
    }
  }
}
