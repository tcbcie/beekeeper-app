import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, formatDate } from './utils'

// Get all bulk honey containers for user
export const getBulkContainers: Tool = {
  name: 'getBulkContainers',
  description: 'List bulk honey containers (buckets, drums) with extraction dates, weights, and linked harvests. Use for questions about stored honey, containers, or raw honey inventory.',
  parameters: z.object({
    year: z.number().optional().describe('Filter by extraction year (optional)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { year?: number }
    const supabase = getSupabase()

    let query = supabase
      .from('bulk_containers')
      .select(`
        id, container_code, container_type, extraction_date, total_weight_kg, notes,
        container_harvests(
          harvest:harvests(
            harvest_date, honey_weight, unit,
            hives(hive_number, apiaries(name))
          )
        )
      `)
      .eq('user_id', userId)
      .order('extraction_date', { ascending: false })

    if (args.year) {
      query = query
        .gte('extraction_date', `${args.year}-01-01`)
        .lte('extraction_date', `${args.year}-12-31`)
    }

    const { data: containers, error } = await query

    if (error) return `Error fetching containers: ${error.message}`
    if (!containers?.length) return 'No bulk containers found.'

    return {
      totalContainers: containers.length,
      totalWeightKg: containers.reduce((sum, c) => sum + (c.total_weight_kg || 0), 0).toFixed(1),
      containers: containers.map(c => {
        const harvests = (c.container_harvests as Array<{ harvest: unknown }>)?.map(ch => {
          const h = ch.harvest as { harvest_date: string; honey_weight: number | null; hives: unknown } | null
          if (!h) return null
          const hives = h.hives as { hive_number: string; apiaries: { name: string } | null } | null
          return {
            date: formatDate(h.harvest_date),
            weightKg: h.honey_weight,
            hive: hives?.hive_number || 'Unknown',
            apiary: hives?.apiaries?.name || 'Unknown'
          }
        }).filter(Boolean) || []

        return {
          code: c.container_code,
          type: c.container_type,
          extractionDate: formatDate(c.extraction_date),
          weightKg: c.total_weight_kg,
          harvestCount: harvests.length,
          harvests
        }
      })
    }
  }
}

// Get details of a specific bulk container by code
export const getContainerDetails: Tool = {
  name: 'getContainerDetails',
  description: 'Get detailed information about a specific bulk honey container by its code, including all linked harvests and origin breakdown.',
  parameters: z.object({
    containerCode: z.string().describe('The container code (e.g., BKT-2025-001)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { containerCode: string }
    const supabase = getSupabase()

    const { data: container, error } = await supabase
      .from('bulk_containers')
      .select(`
        id, container_code, container_type, extraction_date, total_weight_kg, notes,
        container_harvests(
          harvest:harvests(
            harvest_date, honey_weight, unit, floral_source, moisture_content,
            hives(hive_number, apiaries(name, city))
          )
        )
      `)
      .eq('user_id', userId)
      .ilike('container_code', `%${args.containerCode}%`)
      .limit(1)
      .single()

    if (error) return `Container not found: ${error.message}`
    if (!container) return `No container found matching "${args.containerCode}"`

    // Calculate origin percentages
    const origins: Record<string, { weight: number; city: string | null }> = {}
    let totalWeight = 0

    const harvests = (container.container_harvests as Array<{ harvest: unknown }>)?.map(ch => {
      const h = ch.harvest as {
        harvest_date: string
        honey_weight: number | null
        floral_source: string | null
        moisture_content: number | null
        hives: { hive_number: string; apiaries: { name: string; city: string | null } | null } | null
      } | null
      if (!h) return null

      const weight = h.honey_weight || 0
      const apiaryName = h.hives?.apiaries?.name || 'Unknown'
      const city = h.hives?.apiaries?.city || null

      if (!origins[apiaryName]) {
        origins[apiaryName] = { weight: 0, city }
      }
      origins[apiaryName].weight += weight
      totalWeight += weight

      return {
        date: formatDate(h.harvest_date),
        weightKg: h.honey_weight,
        floralSource: h.floral_source,
        moistureContent: h.moisture_content,
        hive: h.hives?.hive_number || 'Unknown',
        apiary: apiaryName
      }
    }).filter(Boolean) || []

    const originBreakdown = Object.entries(origins).map(([name, data]) => ({
      apiary: name,
      city: data.city,
      weightKg: data.weight.toFixed(1),
      percentage: totalWeight > 0 ? ((data.weight / totalWeight) * 100).toFixed(1) : '0'
    })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))

    return {
      code: container.container_code,
      type: container.container_type,
      extractionDate: formatDate(container.extraction_date),
      totalWeightKg: container.total_weight_kg,
      notes: container.notes,
      harvestCount: harvests.length,
      originBreakdown,
      harvests
    }
  }
}

// Get all batch runs (bottling batches)
export const getBatchRuns: Tool = {
  name: 'getBatchRuns',
  description: 'List honey bottling batches with batch codes, dates, jar counts, and weights. Use for questions about bottled honey, jar batches, or packaged honey inventory.',
  parameters: z.object({
    year: z.number().optional().describe('Filter by batch year (optional)'),
    includePublic: z.boolean().optional().describe('Only show batches marked as public (optional)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { year?: number; includePublic?: boolean }
    const supabase = getSupabase()

    let query = supabase
      .from('batch_runs')
      .select(`
        id, batch_code, trace_code, batch_date, total_weight_kg, jar_size_ml,
        jar_weight_g, jar_count, best_before_date, is_public, is_creamed,
        public_title, public_origin, notes
      `)
      .eq('user_id', userId)
      .order('batch_date', { ascending: false })

    if (args.year) {
      query = query
        .gte('batch_date', `${args.year}-01-01`)
        .lte('batch_date', `${args.year}-12-31`)
    }

    if (args.includePublic) {
      query = query.eq('is_public', true)
    }

    const { data: batches, error } = await query

    if (error) return `Error fetching batches: ${error.message}`
    if (!batches?.length) return 'No batch runs found.'

    const totalJars = batches.reduce((sum, b) => sum + (b.jar_count || 0), 0)
    const totalWeight = batches.reduce((sum, b) => sum + (b.total_weight_kg || 0), 0)

    return {
      totalBatches: batches.length,
      totalJars,
      totalWeightKg: totalWeight.toFixed(1),
      batches: batches.map(b => ({
        batchCode: b.batch_code,
        traceCode: b.trace_code,
        batchDate: formatDate(b.batch_date),
        weightKg: b.total_weight_kg,
        jarSize: b.jar_size_ml ? `${b.jar_size_ml}ml` : null,
        jarCount: b.jar_count,
        bestBefore: formatDate(b.best_before_date),
        isPublic: b.is_public,
        isCreamed: b.is_creamed,
        title: b.public_title
      }))
    }
  }
}

// Get details of a specific batch by code
export const getBatchDetails: Tool = {
  name: 'getBatchDetails',
  description: 'Get detailed information about a specific bottling batch by batch code or trace code, including linked containers, origin percentages, and public profile info.',
  parameters: z.object({
    batchCode: z.string().describe('The batch code (L-YYYY-MM-NNN) or trace code')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { batchCode: string }
    const supabase = getSupabase()

    // Try to find by batch_code or trace_code
    const { data: batch, error } = await supabase
      .from('batch_runs')
      .select(`
        id, batch_code, trace_code, batch_date, total_weight_kg, jar_size_ml,
        jar_weight_g, jar_count, best_before_date, is_public, is_creamed,
        public_title, public_origin, public_story, notes,
        batch_containers(
          weight_used_kg,
          container:bulk_containers(
            container_code, container_type, total_weight_kg,
            container_harvests(
              harvest:harvests(
                honey_weight,
                hives(apiaries(name, city))
              )
            )
          )
        )
      `)
      .eq('user_id', userId)
      .or(`batch_code.ilike.%${args.batchCode}%,trace_code.ilike.%${args.batchCode}%`)
      .limit(1)
      .single()

    if (error) return `Batch not found: ${error.message}`
    if (!batch) return `No batch found matching "${args.batchCode}"`

    // Calculate origin percentages from linked containers
    const origins: Record<string, { weight: number; city: string | null }> = {}
    let totalOriginWeight = 0

    const containers = (batch.batch_containers as Array<{
      weight_used_kg: number | null
      container: unknown
    }>)?.map(bc => {
      const c = bc.container as {
        container_code: string
        container_type: string
        total_weight_kg: number | null
        container_harvests: Array<{ harvest: unknown }>
      } | null
      if (!c) return null

      // Calculate origins from this container's harvests
      c.container_harvests?.forEach(ch => {
        const h = ch.harvest as {
          honey_weight: number | null
          hives: { apiaries: { name: string; city: string | null } | null } | null
        } | null
        if (!h) return

        const weight = h.honey_weight || 0
        const apiaryName = h.hives?.apiaries?.name || 'Unknown'
        const city = h.hives?.apiaries?.city || null

        if (!origins[apiaryName]) {
          origins[apiaryName] = { weight: 0, city }
        }
        origins[apiaryName].weight += weight
        totalOriginWeight += weight
      })

      return {
        code: c.container_code,
        type: c.container_type,
        weightUsedKg: bc.weight_used_kg,
        totalWeightKg: c.total_weight_kg
      }
    }).filter(Boolean) || []

    const originBreakdown = Object.entries(origins).map(([name, data]) => ({
      apiary: name,
      city: data.city,
      weightKg: data.weight.toFixed(1),
      percentage: totalOriginWeight > 0 ? ((data.weight / totalOriginWeight) * 100).toFixed(1) : '0'
    })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))

    return {
      batchCode: batch.batch_code,
      traceCode: batch.trace_code,
      batchDate: formatDate(batch.batch_date),
      totalWeightKg: batch.total_weight_kg,
      jarSize: batch.jar_size_ml ? `${batch.jar_size_ml}ml` : null,
      jarWeight: batch.jar_weight_g ? `${batch.jar_weight_g}g` : null,
      jarCount: batch.jar_count,
      bestBefore: formatDate(batch.best_before_date),
      isPublic: batch.is_public,
      isCreamed: batch.is_creamed,
      publicProfile: batch.is_public ? {
        title: batch.public_title,
        origin: batch.public_origin,
        story: batch.public_story
      } : null,
      notes: batch.notes,
      containerCount: containers.length,
      containers,
      originBreakdown
    }
  }
}

// Get traceability summary
export const getTraceabilitySummary: Tool = {
  name: 'getTraceabilitySummary',
  description: 'Get an overview of honey traceability data including total containers, batches, and weight statistics. Use for questions about honey inventory, traceability status, or production overview.',
  parameters: z.object({
    year: z.number().optional().describe('Filter by year (optional)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { year?: number }
    const supabase = getSupabase()
    const year = args.year || new Date().getFullYear()

    // Get containers
    const { data: containers } = await supabase
      .from('bulk_containers')
      .select('id, total_weight_kg, extraction_date')
      .eq('user_id', userId)
      .gte('extraction_date', `${year}-01-01`)
      .lte('extraction_date', `${year}-12-31`)

    // Get batches
    const { data: batches } = await supabase
      .from('batch_runs')
      .select('id, total_weight_kg, jar_count, batch_date, is_public')
      .eq('user_id', userId)
      .gte('batch_date', `${year}-01-01`)
      .lte('batch_date', `${year}-12-31`)

    const containerCount = containers?.length || 0
    const containerWeight = containers?.reduce((sum, c) => sum + (c.total_weight_kg || 0), 0) || 0

    const batchCount = batches?.length || 0
    const batchWeight = batches?.reduce((sum, b) => sum + (b.total_weight_kg || 0), 0) || 0
    const totalJars = batches?.reduce((sum, b) => sum + (b.jar_count || 0), 0) || 0
    const publicBatches = batches?.filter(b => b.is_public).length || 0

    return {
      year,
      bulkContainers: {
        count: containerCount,
        totalWeightKg: containerWeight.toFixed(1)
      },
      bottlingBatches: {
        count: batchCount,
        totalWeightKg: batchWeight.toFixed(1),
        totalJars,
        publicBatches
      },
      unbottledWeightKg: (containerWeight - batchWeight).toFixed(1)
    }
  }
}
