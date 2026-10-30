/**
 * The beekeeping year as the dashboard's top card splits it (agreed with the owner, 30 October 2026).
 */
export type Season = 'autumn' | 'winter' | 'spring' | 'swarm'

export function getSeason(now: Date = new Date()): Season {
  const month = now.getMonth() + 1
  if (month >= 8 && month <= 10) return 'autumn'
  if (month >= 3 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'swarm'
  return 'winter'
}
