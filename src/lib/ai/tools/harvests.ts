import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, getAccessibleHiveIds } from './utils'

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

// Get harvest summary for a year
export const getHarvestSummary: Tool = {
  name: 'getHarvestSummary',
  description: 'Get honey harvest data including totals per hive/apiary, highest yield, best producing colony, harvest records for a year. Use for questions about honey production, yields, and harvests.',
  parameters: z.object({
    year: z.number().optional().describe('Filter by year (default current year)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { year?: number }
    const supabase = getSupabase()
    const hiveIds = await getAccessibleHiveIds(userId)

    if (hiveIds.length === 0) {
      return 'No hives found.'
    }

    const year = args.year || new Date().getFullYear()
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const { data: harvests, error } = await supabase
      .from('harvests')
      .select('harvest_date, honey_weight, frames_harvested, hives(hive_number, apiaries(name))')
      .in('hive_id', hiveIds)
      .gte('harvest_date', startDate)
      .lte('harvest_date', endDate)
      .order('harvest_date', { ascending: false })

    if (error) return `Error fetching harvests: ${error.message}`

    if (!harvests?.length) {
      return `No harvests recorded for ${year}.`
    }

    const hiveStats: Record<string, { apiary: string; total: number; count: number }> = {}
    const apiaryStats: Record<string, { total: number; count: number }> = {}
    let grandTotal = 0
    let harvestCount = 0

    for (const harvest of harvests) {
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
