// Queen-related type definitions

export type QueenRole = 'production' | 'breeder' | 'reference' | 'drone_source'

export const QUEEN_ROLE_OPTIONS: { value: QueenRole; label: string }[] = [
  { value: 'production', label: 'Production' },
  { value: 'breeder', label: 'Breeder' },
  { value: 'reference', label: 'Reference' },
  { value: 'drone_source', label: 'Drone source' },
]

export const queenRoleLabel = (role?: string | null): string =>
  QUEEN_ROLE_OPTIONS.find((r) => r.value === role)?.label ?? 'Production'

export const isProductionQueen = (role?: string | null): boolean =>
  (role ?? 'production') === 'production'

// Life-stage statuses progress cell -> virgin -> active(mated). Centralised badge colour so the
// queen registry, queen detail and hive views render a queen's stage consistently (avoids the
// colour map drifting between call sites).
export const queenStatusBadgeClass = (status?: string | null): string => {
  switch (status) {
    case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700'
    case 'virgin': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
    case 'cell': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
    case 'swarmed': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700'
    case 'superseded': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
    case 'distributed': return 'bg-slate-100 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
    default: return 'bg-surface-secondary text-text-secondary border border-border'
  }
}

export interface Queen {
  id: string
  user_id: string
  queen_number: string
  birth_date: string
  marking_color: string
  source: string
  subspecies: string
  lineage: string
  queen_clipped: boolean
  status: string
  performance_notes: string
  mated_at_eircode: string
  mated_date?: string | null
  drone_source_type?: string | null
  mating_station?: string | null
  lineage_overridden?: boolean | null
  queen_role?: string | null
  origin_breeder_code?: string | null
  distributed_by_name?: string | null
  distributed_batch_name?: string | null
  distributed_mother_queen?: string | null
  distributed_drone_source?: string | null
  created_at?: string
  mother_id?: string | null
  father_id?: string | null
  batch_id?: string | null
  source_graft_id?: string | null
  mother?: {
    id: string
    queen_number: string
    marking_color: string
  } | null
  father?: {
    id: string
    queen_number: string
    marking_color: string
  } | null
  batch?: {
    id: string
    batch_name: string
  } | null
  hives?: {
    id: string
    hive_number: string
    apiaries?: {
      id: string
      name: string
    }
  }
}

// One stint a queen spends in a hive (production) or a mating nuc (parked).
// ended_at === null means it is her current home.
export interface QueenAssignment {
  id: string
  queen_id: string
  location_type: 'hive' | 'nuc'
  hive_id: string | null
  mating_nuc_id: string | null
  apiary_id: string | null
  location_label: string | null
  started_at: string
  ended_at: string | null
  source: 'system' | 'manual' | 'backfill'
  notes: string | null
  user_id: string
  created_at: string
  // Apiary name resolved via embed when available
  apiary_name?: string | null
  // Live hive/nuc number resolved via embed; falls back to the
  // location_label snapshot when the hive/nuc has been deleted
  display_label?: string | null
}

export interface QueenFormData {
  queen_number: string
  birth_date: string
  marking_color: string
  source: string
  subspecies: string
  lineage: string
  queen_clipped: boolean
  status: string
  performance_notes: string
  mated_at_eircode: string
  mated_date: string
  mother_id: string
  father_id: string
  batch_id: string
  drone_source_type: string
  mating_station: string
  lineage_overridden: boolean
  queen_role: string
  origin_breeder_code: string
}

export interface Batch {
  id: string
  batch_name: string
  mother_queen_id?: string | null
}

// Report tab types
export type ReportTimeWindow = 'all' | '30' | '90'

export interface TraitAverages {
  docility: number | null      // temperament_rating
  population: number | null    // population_strength
  brood_pattern: number | null // brood_pattern_rating
  calmness: number | null      // calmness
  swarm_tendency: number | null // swarming_tendency
  n: number                    // sample size (inspections counted)
}

export interface SisterSummary {
  id: string
  queen_number: string
  marking_color: string
  status: string
  mated_date: string | null
  mated_at_eircode: string | null
  hive_id: string | null
  hive_number: string | null
  apiary_name: string | null
}

export interface LatestInspectionSnapshot {
  inspection_date: string
  queen_seen: boolean | null
  eggs_present: boolean | null
  diseases: string[] // names of disease columns with rating > 0
}

export interface QueenReport {
  sisters: SisterSummary[]
  traitAverages: TraitAverages
  sisterAverages: TraitAverages
  latestSnapshot: LatestInspectionSnapshot | null
}

// Single source of truth for a human-readable queen snapshot, e.g. "6W (White 2026 AMM)".
// Used both when a queen is created at distribution time and when an edited queen's
// lineage is back-filled, so the two never drift apart.
export const formatQueenSnapshot = (
  queenNumber: string,
  markingColor?: string | null,
  birthDate?: string | null,
  subspecies?: string | null,
): string => {
  const details: string[] = []
  if (markingColor) details.push(markingColor)
  if (birthDate) {
    const year = new Date(birthDate).getFullYear()
    if (!Number.isNaN(year)) details.push(String(year))
  }
  if (subspecies) details.push(subspecies)
  return details.length > 0 ? `${queenNumber} (${details.join(' ')})` : queenNumber
}

// Calculate queen marking colour based on birth year
// International colour coding: White=1,6 | Yellow=2,7 | Red=3,8 | Green=4,9 | Blue=5,0
export const getQueenColorFromYear = (birthDate: string): string => {
  if (!birthDate) return ''
  const year = new Date(birthDate).getFullYear()
  const lastDigit = year % 10

  switch (lastDigit) {
    case 1:
    case 6:
      return 'White'
    case 2:
    case 7:
      return 'Yellow'
    case 3:
    case 8:
      return 'Red'
    case 4:
    case 9:
      return 'Green'
    case 5:
    case 0:
      return 'Blue'
    default:
      return ''
  }
}

// Calculate queen age from birth date
export const calculateQueenAge = (birthDate: string): string => {
  if (!birthDate) return 'N/A'

  const birth = new Date(birthDate)
  const today = new Date()
  const ageInDays = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))

  if (ageInDays < 0) return 'Not yet emerged'
  if (ageInDays === 0) return 'Today'
  if (ageInDays === 1) return '1 day'
  if (ageInDays < 7) return `${ageInDays} days`
  if (ageInDays < 30) {
    const weeks = Math.floor(ageInDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''}`
  }
  if (ageInDays < 365) {
    const months = Math.floor(ageInDays / 30)
    return `${months} month${months > 1 ? 's' : ''}`
  }

  const years = Math.floor(ageInDays / 365)
  const remainingMonths = Math.floor((ageInDays % 365) / 30)

  if (remainingMonths === 0) {
    return `${years} year${years > 1 ? 's' : ''}`
  }
  return `${years}y ${remainingMonths}m`
}
