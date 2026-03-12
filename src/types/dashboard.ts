// Dashboard-related type definitions

export interface Inspection {
  id: string
  hive_id: string
  inspection_date: string
  queen_seen: boolean
  hives?: {
    hive_number: string
    apiaries?: { name: string } | null
  }
}

export interface VarroaTreatment {
  id: string
  hive_id: string
  treatment_date: string
  treatment_type: string
  hives?: {
    hive_number: string
    apiaries?: { name: string } | null
  }
}

export interface VarroaCheck {
  id: string
  hive_id: string
  check_date: string
  method: string
  infestation_rate: number | null
  hives?: {
    hive_number: string
    apiaries?: { name: string } | null
  }
}

export interface Feeding {
  id: string
  hive_id: string
  feed_date: string
  feed_type: string
  quantity: number | null
  hives?: {
    hive_number: string
    apiaries?: { name: string } | null
  }
}

export interface Harvest {
  id: string
  hive_id: string
  harvest_date: string
  honey_weight: number | null
  frames_harvested: number | null
  hives?: {
    hive_number: string
    apiaries?: { name: string } | null
  }
}

// Unified record type for displaying all records together
export type RecentActivityRecord =
  | (Inspection & { record_type: 'inspection'; date: string })
  | (VarroaTreatment & { record_type: 'varroa_treatment'; date: string })
  | (VarroaCheck & { record_type: 'varroa_check'; date: string })
  | (Feeding & { record_type: 'feeding'; date: string })
  | (Harvest & { record_type: 'harvest'; date: string })

export interface Team {
  id: string
  name: string
  owner_id: string
  created_at: string
  member_count?: number
  user_role?: string
}

export interface TeamMember {
  user_id: string
  team_id: string
  role: string
  teams?: {
    name: string
  }
  profiles?: {
    full_name: string
    email: string
  }
}

export interface TeamApiaryWithOwner {
  apiary_id: string
  apiaries: {
    user_id: string
  } | {
    user_id: string
  }[] | null
}

export interface DashboardApiaryScale {
  hiveId: string
  type: 'beep' | 'wolf'
  deviceId: string
}

export interface DashboardApiary {
  id: string
  name: string
  location: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  hiveCount: number
  lastInspectionDate: string | null
  scales: DashboardApiaryScale[]
}

export interface DashboardStats {
  apiaries: number
  hives: number
  recentInspections: number
  queens: number
  activeTasks: number
}

export interface AttentionAlerts {
  overdueInspections: number
  oldQueens: number
  highVarroa: number
  todayTasks: number
}

export interface TeamStats {
  queens: number
  activeQueens: number
  hives: number
  inspections: number
}

export interface TicketStatus {
  open: number
  in_progress: number
  resolved: number
  has_response: number
}
