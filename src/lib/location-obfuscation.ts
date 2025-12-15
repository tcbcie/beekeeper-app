/**
 * Location Obfuscation Utility
 *
 * Obfuscates GPS coordinates to protect user privacy while still providing
 * useful information about apiary density in an area.
 *
 * The obfuscation adds a random offset within a specified radius (default ~5km)
 * using a deterministic seed based on the apiary ID, so the same apiary always
 * gets the same obfuscated location.
 */

// Simple seeded random number generator for deterministic obfuscation
function seededRandom(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Convert to 0-1 range
  const x = Math.sin(hash) * 10000
  return x - Math.floor(x)
}

/**
 * Obfuscate coordinates by adding a random offset within a radius
 * @param latitude Original latitude
 * @param longitude Original longitude
 * @param seed Unique seed for deterministic randomization (e.g., apiary ID)
 * @param radiusKm Obfuscation radius in kilometers (default 5km)
 * @returns Obfuscated coordinates
 */
export function obfuscateCoordinates(
  latitude: number,
  longitude: number,
  seed: string,
  radiusKm: number = 5
): { latitude: number; longitude: number } {
  // Generate deterministic random values based on seed
  const rand1 = seededRandom(seed + '_angle')
  const rand2 = seededRandom(seed + '_distance')

  // Random angle (0 to 2π)
  const angle = rand1 * 2 * Math.PI

  // Random distance (0 to radiusKm), with sqrt for uniform distribution in circle
  const distance = Math.sqrt(rand2) * radiusKm

  // Convert distance to degrees
  // 1 degree latitude ≈ 111km
  const latOffset = (distance * Math.cos(angle)) / 111

  // 1 degree longitude varies by latitude
  const lngOffset = (distance * Math.sin(angle)) / (111 * Math.cos(latitude * Math.PI / 180))

  return {
    latitude: latitude + latOffset,
    longitude: longitude + lngOffset
  }
}

/**
 * Round coordinates to reduce precision (additional privacy measure)
 * @param coord Coordinate value
 * @param decimals Number of decimal places (default 3 = ~111m precision)
 */
export function roundCoordinate(coord: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals)
  return Math.round(coord * factor) / factor
}
