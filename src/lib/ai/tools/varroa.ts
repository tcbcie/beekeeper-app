import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, getAccessibleApiaryIds, findHiveByName, formatDate, daysSince } from './utils'

// Helper to extract apiary name from Supabase join
function getApiaryName(apiaries: unknown): string {
  if (!apiaries) return 'Unknown'
  if (typeof apiaries === 'object' && 'name' in (apiaries as Record<string, unknown>)) {
    return (apiaries as { name: string }).name
  }
  return 'Unknown'
}

// Get latest varroa counts for all hives (sorted by highest infestation rate)
export const getLatestVarroaCounts: Tool = {
  name: 'getLatestVarroaCounts',
  description: 'Get the most recent mite count for each hive, sorted by highest infestation rate. Use this to find which hive has the highest varroa load.',
  parameters: z.object({}),
  execute: async (_args: unknown, userId: string) => {
    const supabase = getSupabase()
    const apiaryIds = await getAccessibleApiaryIds(userId)

    if (apiaryIds.length === 0) {
      return 'No apiaries found.'
    }

    const { data: hives, error } = await supabase
      .from('hives')
      .select('id, hive_number, apiaries(name)')
      .in('apiary_id', apiaryIds)
      .is('archived_at', null)
      .order('hive_number')

    if (error) return `Error fetching hives: ${error.message}`
    if (!hives?.length) return 'No active hives found.'

    const results: Array<{
      hive: string
      apiary: string
      lastCheck: string
      daysAgo: number | null
      miteCount: number | string
      method: string
      infestationRate: string
      infestationRateNum: number
      sampleSize: number | string
    }> = []

    for (const hive of hives) {
      const { data: latestCheck } = await supabase
        .from('varroa_checks')
        .select('check_date, mites_count, method, infestation_rate, sample_size')
        .eq('hive_id', hive.id)
        .order('check_date', { ascending: false })
        .limit(1)
        .single()

      results.push({
        hive: hive.hive_number,
        apiary: getApiaryName(hive.apiaries),
        lastCheck: latestCheck?.check_date ? formatDate(latestCheck.check_date) : 'Never',
        daysAgo: latestCheck?.check_date ? daysSince(latestCheck.check_date) : null,
        miteCount: latestCheck?.mites_count ?? 'N/A',
        method: latestCheck?.method || 'N/A',
        infestationRate: latestCheck?.infestation_rate ? `${latestCheck.infestation_rate.toFixed(1)}%` : 'N/A',
        infestationRateNum: latestCheck?.infestation_rate ?? 0,
        sampleSize: latestCheck?.sample_size ?? 'N/A'
      })
    }

    // Sort by infestation rate (highest first)
    results.sort((a, b) => b.infestationRateNum - a.infestationRateNum)

    // Remove the numeric rate field before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return results.map(({ infestationRateNum, ...rest }) => rest)
  }
}

// Get varroa trend for a hive
export const getVarroaTrend: Tool = {
  name: 'getVarroaTrend',
  description: 'Get varroa check history for a specific hive to see mite count trends',
  parameters: z.object({
    hiveName: z.string().describe('Name or number of the hive'),
    limit: z.number().optional().describe('Maximum number of checks to return (default 10)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { hiveName: string; limit?: number }
    const supabase = getSupabase()
    const hive = await findHiveByName(userId, args.hiveName)

    if (!hive) {
      return `Hive "${args.hiveName}" not found.`
    }

    const { data, error } = await supabase
      .from('varroa_checks')
      .select('check_date, mites_count, method, infestation_rate, sample_size, notes')
      .eq('hive_id', hive.id)
      .order('check_date', { ascending: false })
      .limit(args.limit || 10)

    if (error) return `Error fetching varroa checks: ${error.message}`
    if (!data?.length) return `No varroa checks found for hive "${hive.hive_number}".`

    return {
      hive: hive.hive_number,
      apiary: hive.apiary_name,
      checks: data.map(c => ({
        date: formatDate(c.check_date),
        miteCount: c.mites_count,
        method: c.method || 'Unknown',
        infestationRate: c.infestation_rate ? `${c.infestation_rate.toFixed(1)}%` : 'N/A',
        sampleSize: c.sample_size ?? 'N/A',
        notes: c.notes?.substring(0, 50) || 'None'
      }))
    }
  }
}

// Get hives above varroa threshold
export const getHivesAboveThreshold: Tool = {
  name: 'getHivesAboveThreshold',
  description: 'Get hives with mite counts above a specific treatment threshold percentage (e.g. above 3%). Only use when user asks about hives exceeding a threshold.',
  parameters: z.object({
    threshold: z.number().optional().describe('Infestation rate threshold percentage (default 3)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { threshold?: number }
    const supabase = getSupabase()
    const apiaryIds = await getAccessibleApiaryIds(userId)

    if (apiaryIds.length === 0) {
      return 'No apiaries found.'
    }

    const threshold = args.threshold || 3

    const { data: hives, error } = await supabase
      .from('hives')
      .select('id, hive_number, apiaries(name)')
      .in('apiary_id', apiaryIds)
      .is('archived_at', null)

    if (error) return `Error fetching hives: ${error.message}`
    if (!hives?.length) return 'No active hives found.'

    const aboveThreshold = []

    for (const hive of hives) {
      const { data: latestCheck } = await supabase
        .from('varroa_checks')
        .select('check_date, mites_count, infestation_rate, method')
        .eq('hive_id', hive.id)
        .order('check_date', { ascending: false })
        .limit(1)
        .single()

      if (latestCheck?.infestation_rate && latestCheck.infestation_rate >= threshold) {
        aboveThreshold.push({
          hive: hive.hive_number,
          apiary: getApiaryName(hive.apiaries),
          checkDate: formatDate(latestCheck.check_date),
          miteCount: latestCheck.mites_count,
          infestationRate: `${latestCheck.infestation_rate.toFixed(1)}%`,
          method: latestCheck.method || 'Unknown'
        })
      }
    }

    if (aboveThreshold.length === 0) {
      return `No hives have infestation rates above ${threshold}%.`
    }

    aboveThreshold.sort((a, b) => {
      const rateA = parseFloat(a.infestationRate)
      const rateB = parseFloat(b.infestationRate)
      return rateB - rateA
    })

    return {
      threshold: `${threshold}%`,
      count: aboveThreshold.length,
      hives: aboveThreshold
    }
  }
}

// Get treatment history for a hive
export const getTreatmentHistory: Tool = {
  name: 'getTreatmentHistory',
  description: 'Get varroa treatment history for a specific hive',
  parameters: z.object({
    hiveName: z.string().describe('Name or number of the hive'),
    limit: z.number().optional().describe('Maximum number of treatments to return (default 10)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { hiveName: string; limit?: number }
    const supabase = getSupabase()
    const hive = await findHiveByName(userId, args.hiveName)

    if (!hive) {
      return `Hive "${args.hiveName}" not found.`
    }

    const { data, error } = await supabase
      .from('varroa_treatments')
      .select('treatment_date, treatment_type, product_used, dosage, end_date, notes')
      .eq('hive_id', hive.id)
      .order('treatment_date', { ascending: false })
      .limit(args.limit || 10)

    if (error) return `Error fetching treatments: ${error.message}`
    if (!data?.length) return `No treatments found for hive "${hive.hive_number}".`

    return {
      hive: hive.hive_number,
      apiary: hive.apiary_name,
      treatments: data.map(t => ({
        startDate: formatDate(t.treatment_date),
        endDate: t.end_date ? formatDate(t.end_date) : 'Ongoing',
        type: t.treatment_type || 'Unknown',
        product: t.product_used || 'Unknown',
        dosage: t.dosage || 'N/A',
        notes: t.notes?.substring(0, 50) || 'None'
      }))
    }
  }
}

// Get hives needing treatment
export const getHivesNeedingTreatment: Tool = {
  name: 'getHivesNeedingTreatment',
  description: 'Get hives with high mite counts and no recent treatment',
  parameters: z.object({
    threshold: z.number().optional().describe('Infestation rate threshold (default 3)'),
    treatmentDays: z.number().optional().describe('Days since last treatment to consider (default 30)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { threshold?: number; treatmentDays?: number }
    const supabase = getSupabase()
    const apiaryIds = await getAccessibleApiaryIds(userId)

    if (apiaryIds.length === 0) {
      return 'No apiaries found.'
    }

    const threshold = args.threshold || 3
    const treatmentDays = args.treatmentDays || 30
    const treatmentCutoff = new Date()
    treatmentCutoff.setDate(treatmentCutoff.getDate() - treatmentDays)

    const { data: hives, error } = await supabase
      .from('hives')
      .select('id, hive_number, apiaries(name)')
      .in('apiary_id', apiaryIds)
      .is('archived_at', null)

    if (error) return `Error fetching hives: ${error.message}`
    if (!hives?.length) return 'No active hives found.'

    const needingTreatment = []

    for (const hive of hives) {
      const { data: latestCheck } = await supabase
        .from('varroa_checks')
        .select('check_date, mites_count, infestation_rate')
        .eq('hive_id', hive.id)
        .order('check_date', { ascending: false })
        .limit(1)
        .single()

      if (!latestCheck?.infestation_rate || latestCheck.infestation_rate < threshold) {
        continue
      }

      const { data: lastTreatment } = await supabase
        .from('varroa_treatments')
        .select('treatment_date, treatment_type, end_date')
        .eq('hive_id', hive.id)
        .order('treatment_date', { ascending: false })
        .limit(1)
        .single()

      const treatmentDate = lastTreatment?.treatment_date
      const endDate = lastTreatment?.end_date
      const isOngoing = endDate && new Date(endDate) > new Date()
      const isRecent = treatmentDate && new Date(treatmentDate) > treatmentCutoff

      if (!isOngoing && !isRecent) {
        needingTreatment.push({
          hive: hive.hive_number,
          apiary: getApiaryName(hive.apiaries),
          infestationRate: `${latestCheck.infestation_rate.toFixed(1)}%`,
          lastCheck: formatDate(latestCheck.check_date),
          lastTreatment: treatmentDate ? formatDate(treatmentDate) : 'Never',
          daysSinceTreatment: treatmentDate ? daysSince(treatmentDate) : null
        })
      }
    }

    if (needingTreatment.length === 0) {
      return `No hives need treatment (threshold: ${threshold}%, treatment window: ${treatmentDays} days).`
    }

    needingTreatment.sort((a, b) => {
      const rateA = parseFloat(a.infestationRate)
      const rateB = parseFloat(b.infestationRate)
      return rateB - rateA
    })

    return {
      threshold: `${threshold}%`,
      treatmentWindow: `${treatmentDays} days`,
      count: needingTreatment.length,
      hives: needingTreatment
    }
  }
}

// Get treatment counts per hive
export const getTreatmentCounts: Tool = {
  name: 'getTreatmentCounts',
  description: 'Get the number of varroa treatments per hive, sorted by most treatments first. Use this to find which hive has the most treatment records.',
  parameters: z.object({
    limit: z.number().optional().describe('Maximum number of hives to return (default 10)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { limit?: number }
    const supabase = getSupabase()
    const apiaryIds = await getAccessibleApiaryIds(userId)

    if (apiaryIds.length === 0) {
      return 'No apiaries found.'
    }

    const limit = args.limit || 10

    const { data: hives, error } = await supabase
      .from('hives')
      .select('id, hive_number, apiaries(name)')
      .in('apiary_id', apiaryIds)
      .is('archived_at', null)

    if (error) return `Error fetching hives: ${error.message}`
    if (!hives?.length) return 'No active hives found.'

    const hiveCounts: Array<{
      hive: string
      apiary: string
      treatmentCount: number
      lastTreatment: string | null
    }> = []

    for (const hive of hives) {
      const { count, error: countError } = await supabase
        .from('varroa_treatments')
        .select('*', { count: 'exact', head: true })
        .eq('hive_id', hive.id)

      if (countError) continue

      const { data: lastTreatment } = await supabase
        .from('varroa_treatments')
        .select('treatment_date, treatment_type')
        .eq('hive_id', hive.id)
        .order('treatment_date', { ascending: false })
        .limit(1)
        .single()

      hiveCounts.push({
        hive: hive.hive_number,
        apiary: getApiaryName(hive.apiaries),
        treatmentCount: count || 0,
        lastTreatment: lastTreatment?.treatment_date ? `${formatDate(lastTreatment.treatment_date)} (${lastTreatment.treatment_type || 'Unknown'})` : null
      })
    }

    // Sort by treatment count descending
    hiveCounts.sort((a, b) => b.treatmentCount - a.treatmentCount)

    // Filter out hives with 0 treatments if there are any with treatments
    const withTreatments = hiveCounts.filter(h => h.treatmentCount > 0)
    if (withTreatments.length > 0) {
      return withTreatments.slice(0, limit)
    }

    return hiveCounts.slice(0, limit)
  }
}
