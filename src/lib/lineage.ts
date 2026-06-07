// Queen lineage: single source of truth for the derived pedigree string.
//
// Standards-aligned grammar (BeeBreed / BIBBA / Buckfast conventions):
//   <Dam> × <drone-source>[ @ <station>][ <eircode>] (<year>) · <subspecies> · Breeder: <name>
// The sire is a population, not an individual, so the drone side records the mating
// method (+ station/place) rather than a single father — except for instrumental
// insemination, where an optional drone line may be named.

import { formatQueenSnapshot } from '@/types/queen'

export type DroneSourceType = 'open' | 'station' | 'ii' | 'unknown'

export const DRONE_SOURCE_OPTIONS: { value: DroneSourceType; label: string }[] = [
  { value: 'open', label: 'Open-mated' },
  { value: 'station', label: 'Station-mated' },
  { value: 'ii', label: 'Instrumental insemination' },
  { value: 'unknown', label: 'Unknown' },
]

const DRONE_PHRASE: Record<DroneSourceType, string> = {
  open: 'open-mated',
  station: 'station-mated',
  ii: 'II',
  unknown: '',
}

// "Apis mellifera mellifera (AMM)" -> "AMM"; otherwise the trimmed input.
export function shortSubspecies(subspecies?: string | null): string {
  if (!subspecies) return ''
  const m = subspecies.match(/\(([^)]+)\)\s*$/)
  return (m ? m[1] : subspecies).trim()
}

// Collapse a full subspecies phrase embedded in any text to its short code, e.g.
// "76-DA (Blue 2025 Apis mellifera mellifera (AMM))" -> "76-DA (Blue 2025 AMM)".
export function shortenSubspeciesInText(text: string): string {
  return text.replace(/Apis mellifera\s+[A-Za-z.]+\s*\(([A-Za-z]+)\)/g, '$1')
}

// Parse a 4-digit year from a DB date string ('YYYY-MM-DD' or ISO) without going through
// Date(), which interprets a bare date as UTC midnight and can roll the year back a day in
// sub-UTC timezones.
export function fullYearFromDate(date?: string | null): number | null {
  if (!date) return null
  const year = Number.parseInt(String(date).slice(0, 4), 10)
  return Number.isFinite(year) && year >= 1000 ? year : null
}

// Best mating/birth year for the lineage string.
export function lineageYear(matedDate?: string | null, birthDate?: string | null): number | null {
  return fullYearFromDate(matedDate) ?? fullYearFromDate(birthDate)
}

// Dam label with the short subspecies form, from a stored snapshot or live components.
export function damLabelFromSnapshot(snapshot?: string | null): string {
  return snapshot ? shortenSubspeciesInText(snapshot).trim() : ''
}

export function damLabelFromQueen(
  queenNumber: string,
  markingColor?: string | null,
  birthDate?: string | null,
  subspecies?: string | null,
): string {
  return shortenSubspeciesInText(formatQueenSnapshot(queenNumber, markingColor, birthDate, subspecies)).trim()
}

export interface LineageParts {
  damLabel?: string | null        // already short, e.g. "76-DA (Blue 2025 AMM)"
  droneSourceType?: DroneSourceType
  droneLine?: string | null       // optional, only meaningful for 'ii'
  matingStation?: string | null
  eircode?: string | null
  year?: number | string | null
  subspecies?: string | null      // the queen's own subspecies; rendered short
  breeder?: string | null
}

export function buildLineageString(p: LineageParts): string {
  const dam = p.damLabel?.trim() || ''

  const dsType: DroneSourceType = p.droneSourceType ?? 'open'
  let drone = DRONE_PHRASE[dsType] || ''
  if (dsType === 'ii' && p.droneLine?.trim()) drone = `II ${p.droneLine.trim()}`

  const droneBits: string[] = [drone]
  if (p.matingStation?.trim()) droneBits.push(`@ ${p.matingStation.trim()}`)
  if (p.eircode?.trim()) droneBits.push(p.eircode.trim())
  const droneFull = droneBits.filter(Boolean).join(' ')

  let head = ''
  if (dam && droneFull) head = `${dam} × ${droneFull}`
  else head = dam || droneFull

  const tail: string[] = []
  if (p.year) tail.push(`(${p.year})`)
  const sub = shortSubspecies(p.subspecies)
  if (sub) tail.push(`· ${sub}`)
  if (p.breeder?.trim()) tail.push(`· Breeder: ${p.breeder.trim()}`)

  return [head, ...tail].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}
