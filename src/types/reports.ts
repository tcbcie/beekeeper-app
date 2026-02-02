// Type definitions for the Reports feature

import type { Apiary, Hive } from './records'

export type ReportType = 'dafm-varroa' | 'varroa-monitoring' | 'hive-inspection' | 'apiary-overview' | 'harvest' | 'archived-hives'

export type TimePeriod = 'all' | '3months' | '6months' | '1year' | 'custom'

export interface ReportFilters {
  apiaryId: string
  hiveId: string
  timePeriod: TimePeriod
  startDate: string
  endDate: string
}

// Extended apiary with eircode for DAFM report
export interface ApiaryWithEircode extends Apiary {
  eircode?: string | null
  location?: string | null
}

// Profile info for beekeeper details
export interface BeekeeperProfile {
  first_name: string | null
  last_name: string | null
  email: string
  phone?: string | null
  address?: string | null
}

// DAFM Varroa Treatment Report data
export interface DAFMTreatmentRecord {
  treatment_date: string
  hive_number: string
  apiary_name: string
  eircode: string | null
  treatment_type: string
  batch_number: string | null
  dosage: string
  application_method: string | null
  notes: string
}

// Varroa Monitoring Report data
export interface VarroaMonitoringRecord {
  date: string
  type: 'check' | 'treatment'
  hive_number: string
  method?: string
  mites_count?: number | null
  infestation_rate?: number | null
  treatment_type?: string
  dosage?: string
  action_threshold_reached?: boolean
}

// Hive Inspection Summary data
export interface InspectionSummaryRecord {
  inspection_date: string
  queen_seen: boolean
  eggs_present: boolean
  brood_pattern_rating: number
  temperament_rating: number
  population_strength: number
  honey_supers: number
  notes: string
}

// Apiary Overview data
export interface HiveOverviewRecord {
  hive_id: string
  hive_number: string
  status: string
  last_inspection_date: string | null
  queen_seen: boolean | null
  population_strength: number | null
  notes: string | null
}

// Harvest Report data
export interface HarvestRecord {
  harvest_date: string
  hive_number: string
  honey_weight: number | null
  wax_weight: number | null
  frames_harvested: number | null
  floral_source: string | null
  notes: string
}

// Archived Hives Report data
export interface ArchivedHiveRecord {
  hive_id: string
  hive_number: string
  apiary_name: string
  archived_at: string
  archive_reason: string | null
  archive_notes: string | null
}

// Report data state
export interface ReportsDataState {
  apiaries: ApiaryWithEircode[]
  hives: Hive[]
  profile: BeekeeperProfile | null
  loading: boolean
}

// Helper to get default report filters
export function getDefaultReportFilters(): ReportFilters {
  const today = new Date()
  const oneYearAgo = new Date(today)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  return {
    apiaryId: '',
    hiveId: '',
    timePeriod: '1year',
    startDate: oneYearAgo.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0]
  }
}
