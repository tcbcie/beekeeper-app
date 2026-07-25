// Hive-related type definitions

export interface HiveConfiguration {
  brood_boxes?: number
  brood_boxes_full?: number
  brood_boxes_half?: number
  /** Number of frames a full-depth brood box holds (drives inspection frame picker). */
  frames_per_full_box?: number
  /** Number of frames a half-depth brood box holds (drives inspection frame picker). */
  frames_per_half_box?: number
  honey_supers?: number
  queen_excluder?: boolean
  feeder?: boolean
  feeder_type?: string
  entrance_reducer?: boolean
  varroa_mesh_floor?: string
  right_sized_broodbox?: boolean
  frame_orientation?: string | null
  hive_size?: 'full' | 'nuc'
}

export interface Colony {
  id: string
  colony_number: string
  origin_type: string
  origin_date: string
  status: string
}

export interface HiveFormData {
  hive_number: string
  apiary_id: string
  order_in_apiary: number | null
  row_in_apiary: number | null
  order_direction: 'entrances' | 'backs'
  queen_id: string
  queen_marked: boolean
  queen_marking_color: string
  queen_mated: boolean
  queen_clipped: boolean
  is_queenless: boolean
  queenless_reason: string
  status: string
  notes: string
  colony_established_date: string
  queen_installed_date: string
  hive_type: string
  configuration: HiveConfiguration
}

export interface Hive {
  id: string
  hive_number: string
  apiary_id: string | null
  order_in_apiary?: number | null
  row_in_apiary?: number | null
  order_direction?: 'entrances' | 'backs' | null
  map_x?: number | null
  map_y?: number | null
  /** Yard map body rotation, degrees clockwise from canvas-up (entrance = front face). */
  rotation_deg?: number | null
  /** Yard map bench the hive stands on (NULL = on the ground). */
  bench_id?: string | null
  bench_slot?: number | null
  /** @deprecated Superseded by rotation_deg; kept one release as a safety net. */
  entrance_direction?: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | null
  queen_id: string | null
  queen_marked: boolean
  queen_marking_color: string | null
  queen_mated: boolean
  queen_clipped: boolean
  is_queenless: boolean
  queenless_reason: string | null
  status: string
  notes: string | null
  colony_established_date: string | null
  queen_installed_date: string | null
  hive_type: string | null
  configuration: HiveConfiguration | null
  colony_id?: string | null
  queen_last_seen?: string | null
  eggs_last_present?: string | null
  archived_at?: string | null
  archive_reason_id?: string | null
  archive_notes?: string | null
  user_id: string
  is_shared?: boolean
  shared_with_team?: string | null
  beep_device_id?: string | null
  beep_device_name?: string | null
  wolf_scale_id?: string | null
  wolf_scale_name?: string | null
  qr_tag_code?: string | null
  configuration_changed_at?: string | null
  configuration_changed_by?: string | null
  configuration_changer?: {
    full_name: string | null
    email: string
  } | null
  team_name?: string | null
  last_record?: {
    date: string
    type: string
  } | null
  last_inspection_date?: string | null
  active_tasks_count?: number
  /** Per-super fullness (0-100) from the most recent inspection; null when not recorded. */
  last_super_fullness?: number[] | null
  /** Per-super fullness from the inspection before the most recent one that recorded it. */
  previous_super_fullness?: number[] | null
  /** Date of that previous fullness reading (all supers share the one prior inspection). */
  previous_super_fullness_date?: string | null
  colonies?: Colony
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
