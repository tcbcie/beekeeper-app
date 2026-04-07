// Queen-related type definitions

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
  distributed_by_name?: string | null
  distributed_batch_name?: string | null
  distributed_mother_queen?: string | null
  distributed_drone_source?: string | null
  created_at?: string
  mother_id?: string | null
  father_id?: string | null
  batch_id?: string | null
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
      name: string
    }
  }
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
}

export interface Batch {
  id: string
  batch_name: string
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
