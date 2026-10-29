/**
 * Scale alerts for the dashboard's To do list (Phase 2, agreed with the owner 29 October 2026).
 *
 * - Possible swarm: from 1 April to 31 July, the scale lost between 1.5 and 5 kg within 3 hours
 *   in the last 48 hours. More than 5 kg is a super taken off, not a swarm.
 * - Getting light: all year, the scale lost 2 kg or more in 7 days (Mel's "may need feeding" rule
 *   in src/lib/ai/tools/scales.ts).
 */

export const SWARM_DROP_WINDOW_HOURS = 3
export const SWARM_DROP_MIN_KG = 1.5
export const SWARM_DROP_MAX_KG = 5
/** Months (1–12) in which a sudden drop is read as a possible swarm */
export const SWARM_SEASON_MONTHS = [4, 5, 6, 7] as const
export const GETTING_LIGHT_7D_KG = -2

export interface WeightReading {
  /** Any string Date.parse understands */
  time: string
  weight: number
}

export interface WeightDrop {
  /** Kilograms lost, a positive number */
  kg: number
  /** When the lower reading was taken (ISO) */
  at: string
  /** How much is still missing at the latest reading (weight before the drop minus the latest) */
  stillDownKg: number
}

/**
 * The biggest loss between any two readings no more than `hours` apart, or null when nothing
 * was lost. Works on whatever the summary routes already downloaded: no extra vendor calls.
 */
export function largestDropWithin(readings: WeightReading[], hours: number = SWARM_DROP_WINDOW_HOURS): WeightDrop | null {
  const points = readings
    .map(r => ({ t: Date.parse(r.time), weight: r.weight, time: r.time }))
    .filter(p => Number.isFinite(p.t) && Number.isFinite(p.weight))
    .sort((a, b) => a.t - b.t)
  const windowMs = hours * 60 * 60 * 1000

  let best: { kg: number; t: number; before: number } | null = null
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length && points[j].t - points[i].t <= windowMs; j++) {
      const kg = points[i].weight - points[j].weight
      if (kg > 0 && (!best || kg > best.kg)) best = { kg, t: points[j].t, before: points[i].weight }
    }
  }
  if (!best) return null
  const latest = points[points.length - 1].weight
  const round = (n: number) => Math.round(n * 100) / 100
  return { kg: round(best.kg), at: new Date(best.t).toISOString(), stillDownKg: round(best.before - latest) }
}

/**
 * A drop the dashboard should report as a possible swarm, judged in the month it happened. At
 * least half of it must still be missing at the latest reading: an inspection takes supers off
 * and puts them back, so its drop comes back within the hour; a swarm's does not.
 */
export function isPossibleSwarm(drop: WeightDrop | null | undefined): drop is WeightDrop {
  if (!drop || drop.kg < SWARM_DROP_MIN_KG || drop.kg > SWARM_DROP_MAX_KG) return false
  if (!(drop.stillDownKg >= drop.kg / 2)) return false
  const month = new Date(drop.at).getMonth() + 1
  return (SWARM_SEASON_MONTHS as readonly number[]).includes(month)
}

export function isGettingLight(change7d: number | null | undefined): change7d is number {
  return typeof change7d === 'number' && Number.isFinite(change7d) && change7d <= GETTING_LIGHT_7D_KG
}
