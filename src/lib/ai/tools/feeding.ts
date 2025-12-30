import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, getAccessibleApiaryIds, getAccessibleHiveIds, findHiveByName, formatDate } from './utils'

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

// Get feeding history for a hive
export const getFeedingHistory: Tool = {
  name: 'getFeedingHistory',
  description: 'Get feeding records for a specific hive',
  parameters: z.object({
    hiveName: z.string().describe('Name or number of the hive'),
    limit: z.number().optional().describe('Maximum number of feedings to return (default 10)')
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
      .select('feed_date, feed_type, quantity, unit, notes')
      .eq('hive_id', hive.id)
      .order('feed_date', { ascending: false })
      .limit(args.limit || 10)

    if (error) return `Error fetching feedings: ${error.message}`
    if (!data?.length) return `No feeding records found for hive "${hive.hive_number}".`

    return {
      hive: hive.hive_number,
      apiary: hive.apiary_name,
      feedings: data.map(f => ({
        date: formatDate(f.feed_date),
        type: f.feed_type || 'Unknown',
        amount: `${f.quantity} ${f.unit}`,
        notes: f.notes?.substring(0, 50) || 'None'
      }))
    }
  }
}

// Get harvest summary
export const getHarvestSummary: Tool = {
  name: 'getHarvestSummary',
  description: 'Get total honey harvested per hive, apiary, or for a specific year',
  parameters: z.object({
    year: z.number().optional().describe('Filter by year (default current year)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { year?: number }
    const supabase = getSupabase()
    const apiaryIds = await getAccessibleApiaryIds(userId)

    if (apiaryIds.length === 0) {
      return 'No apiaries found.'
    }

    const year = args.year || new Date().getFullYear()
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const { data: harvests, error } = await supabase
      .from('harvests')
      .select('harvest_date, honey_weight, frames_harvested, hives(hive_number, apiaries(name))')
      .gte('harvest_date', startDate)
      .lte('harvest_date', endDate)
      .order('harvest_date', { ascending: false })

    if (error) return `Error fetching harvests: ${error.message}`

    // Filter to accessible hives only
    const accessibleHarvests = harvests?.filter(h => {
      const info = getHiveInfo(h.hives)
      return info.apiary_name !== 'Unknown'
    }) || []

    if (accessibleHarvests.length === 0) {
      return `No harvests recorded for ${year}.`
    }

    const hiveStats: Record<string, { apiary: string; total: number; count: number }> = {}
    const apiaryStats: Record<string, { total: number; count: number }> = {}
    let grandTotal = 0
    let harvestCount = 0

    for (const harvest of accessibleHarvests) {
      const info = getHiveInfo(harvest.hives)
      const weight = harvest.honey_weight || 0

      if (!hiveStats[info.hive_number]) {
        hiveStats[info.hive_number] = { apiary: info.apiary_name, total: 0, count: 0 }
      }
      hiveStats[info.hive_number].total += weight
      hiveStats[info.hive_number].count++

      if (!apiaryStats[info.apiary_name]) {
        apiaryStats[info.apiary_name] = { total: 0, count: 0 }
      }
      apiaryStats[info.apiary_name].total += weight
      apiaryStats[info.apiary_name].count++

      grandTotal += weight
      harvestCount++
    }

    return {
      year,
      totalHarvests: harvestCount,
      totalHoneyKg: grandTotal.toFixed(1),
      byApiary: Object.entries(apiaryStats).map(([name, stats]) => ({
        apiary: name,
        totalKg: stats.total.toFixed(1),
        harvestCount: stats.count
      })),
      byHive: Object.entries(hiveStats).map(([name, stats]) => ({
        hive: name,
        apiary: stats.apiary,
        totalKg: stats.total.toFixed(1),
        harvestCount: stats.count
      })).sort((a, b) => parseFloat(b.totalKg) - parseFloat(a.totalKg))
    }
  }
}

// Get hives needing feeding
export const getHivesNeedingFeeding: Tool = {
  name: 'getHivesNeedingFeeding',
  description: 'Get hives with low honey stores from recent inspections',
  parameters: z.object({
    daysBack: z.number().optional().describe('Look back period for inspections (default 14)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { daysBack?: number }
    const supabase = getSupabase()
    const hiveIds = await getAccessibleHiveIds(userId)

    if (hiveIds.length === 0) {
      return 'No hives found.'
    }

    const daysBack = args.daysBack || 14
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)

    const { data, error } = await supabase
      .from('inspections')
      .select('inspection_date, honey_supers, honey_stores, notes, hives(hive_number, apiaries(name))')
      .in('hive_id', hiveIds)
      .gte('inspection_date', cutoffDate.toISOString().split('T')[0])
      .order('inspection_date', { ascending: false })

    if (error) return `Error fetching inspections: ${error.message}`
    if (!data?.length) return `No inspections found in the last ${daysBack} days.`

    const lowStoresKeywords = ['low', 'empty', 'light', 'needs feeding', 'starving', 'minimal']
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

      if (seenHives.has(info.hive_number)) continue

      const honeySupers = inspection.honey_supers
      const honeyStores = inspection.honey_stores?.toLowerCase() || ''
      const notes = inspection.notes?.toLowerCase() || ''

      const isLowSupers = honeySupers !== null && honeySupers <= 1
      const isLowStores = lowStoresKeywords.some(kw => honeyStores.includes(kw) || notes.includes(kw))

      if (isLowSupers || isLowStores) {
        seenHives.add(info.hive_number)
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
