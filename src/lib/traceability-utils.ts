// Utility functions for honey traceability

import type { OriginPercentage, ContainerHarvest } from '@/types/traceability'

/**
 * Calculate origin percentages from container harvests
 * Groups harvests by apiary and calculates weight percentages
 */
export function calculateOriginPercentages(
  containerHarvests: ContainerHarvest[]
): OriginPercentage[] {
  // Group by apiary with weight totals
  const apiaryWeights: Record<string, {
    apiary_name: string
    city: string | null
    weight_kg: number
  }> = {}

  let totalWeight = 0

  for (const ch of containerHarvests) {
    // Handle Supabase returning arrays for joined data
    const harvestRaw = ch.harvest as unknown
    const harvest = Array.isArray(harvestRaw) ? harvestRaw[0] : harvestRaw
    if (!harvest) continue

    // Convert weight to kg if needed
    let weightKg = harvest.honey_weight || 0
    if (harvest.unit === 'lb') {
      weightKg = weightKg * 0.453592
    }

    totalWeight += weightKg

    // Handle nested arrays from Supabase joins
    const hivesRaw = harvest.hives as unknown
    const hive = Array.isArray(hivesRaw) ? hivesRaw[0] : hivesRaw
    const apiariesRaw = hive?.apiaries as unknown
    const apiary = Array.isArray(apiariesRaw) ? apiariesRaw[0] : apiariesRaw

    const apiaryKey = apiary?.id || 'unknown'
    const apiaryName = apiary?.name || 'Unknown Apiary'
    const city = apiary?.city || null

    if (!apiaryWeights[apiaryKey]) {
      apiaryWeights[apiaryKey] = {
        apiary_name: apiaryName,
        city,
        weight_kg: 0
      }
    }
    apiaryWeights[apiaryKey].weight_kg += weightKg
  }

  // Convert to percentages
  const origins: OriginPercentage[] = Object.values(apiaryWeights).map(origin => ({
    apiary_name: origin.apiary_name,
    city: origin.city,
    weight_kg: Math.round(origin.weight_kg * 100) / 100,
    percentage: totalWeight > 0
      ? Math.round((origin.weight_kg / totalWeight) * 100)
      : 0
  }))

  // Sort by percentage descending
  origins.sort((a, b) => b.percentage - a.percentage)

  return origins
}

/**
 * Format origin percentages for display
 * e.g., "60% Co. Cork, 40% Co. Kerry"
 */
export function formatOrigins(origins: OriginPercentage[]): string {
  if (origins.length === 0) return 'Unknown origin'

  return origins
    .map(o => {
      const location = o.city || o.apiary_name
      return `${o.percentage}% ${location}`
    })
    .join(', ')
}

/**
 * Calculate total weight from container harvests in kg
 */
export function calculateTotalWeight(containerHarvests: ContainerHarvest[]): number {
  let total = 0

  for (const ch of containerHarvests) {
    // Handle Supabase returning arrays for joined data
    const harvestRaw = ch.harvest as unknown
    const harvest = Array.isArray(harvestRaw) ? harvestRaw[0] : harvestRaw
    if (!harvest) continue

    let weightKg = harvest.honey_weight || 0
    if (harvest.unit === 'lb') {
      weightKg = weightKg * 0.453592
    }
    total += weightKg
  }

  return Math.round(total * 100) / 100
}

/**
 * Calculate best before date (default: 2 years from batch date)
 */
export function calculateBestBeforeDate(batchDate: Date, yearsAhead: number = 2): Date {
  const bestBefore = new Date(batchDate)
  bestBefore.setFullYear(bestBefore.getFullYear() + yearsAhead)
  return bestBefore
}

/**
 * Format date as YYYY-MM-DD for input fields
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}
