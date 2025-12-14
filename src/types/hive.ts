// Hive-related type definitions

export interface HiveConfiguration {
  brood_boxes?: number
  brood_boxes_full?: number
  brood_boxes_half?: number
  honey_supers?: number
  queen_excluder?: boolean
  feeder?: boolean
  feeder_type?: string
  entrance_reducer?: boolean
  varroa_mesh_floor?: string
  right_sized_broodbox?: boolean
}

export interface Hive {
  id: string
  hive_number: string
  apiary_id: string | null
  queen_id: string | null
  queen_marked: boolean
  queen_marking_color: string | null
  queen_mated: boolean
  queen_clipped: boolean
  status: string
  notes: string | null
  colony_established_date: string | null
  queen_installed_date: string | null
  hive_type: string | null
  configuration: HiveConfiguration | null
  queen_last_seen?: string | null
  eggs_last_present?: string | null
  archived_at?: string | null
  archive_reason_id?: string | null
  archive_notes?: string | null
  user_id: string
  is_shared?: boolean
  shared_with_team?: string
  archive_reason_value?: {
    value?: string
  }
  apiaries?: {
    name: string
  }
  queens?: {
    id: string
    queen_number: string
    marking_color?: string
    status?: string
    source?: string
    subspecies?: string
    birth_date?: string
    queen_clipped?: boolean
    performance_notes?: string
  }
}

export interface InspectionAverages {
  brood_frames: number | null
  right_sized_frames: number | null
  brood_pattern: number | null
  temperament: number | null
  population: number | null
  inspection_count: number
}

export interface HiveInspection {
  id: string
  inspection_date: string
  hive_id: string
  brood_frames: number | null
  right_sized_frames: number | null
  brood_pattern_rating: number | null
  temperament_rating: number | null
  population_strength: number | null
  queen_seen: boolean
  eggs_present: boolean
  notes: string | null
  weight: number | null
}

export interface HiveVarroaCheck {
  id: string
  check_date: string
  hive_id: string
  mite_count: number | null
  check_method: string | null
  notes: string | null
}

export interface HiveVarroaTreatment {
  id: string
  treatment_date: string
  hive_id: string
  treatment_type: string
  dosage: string | null
  notes: string | null
}

export interface HiveFeeding {
  id: string
  feed_date: string
  hive_id: string
  feed_type: string
  amount: number | null
  notes: string | null
}

export interface HiveHarvest {
  id: string
  harvest_date: string
  hive_id: string
  frames_harvested: number | null
  honey_weight: number | null
  notes: string | null
}

export interface HiveTask {
  id: string
  title: string
  description: string | null
  event_type: 'task' | 'event' | 'reminder'
  category: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  start_date: string
  completed: boolean
  hive_id: string | null
}
