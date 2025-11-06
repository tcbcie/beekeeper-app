// Colony tracking types

export type ColonyOriginType =
  | 'purchased'
  | 'split'
  | 'swarm'
  | 'caught_swarm'
  | 'nuc'
  | 'package'
  | 'combine'
  | 'other'

export type ColonyStatus =
  | 'active'
  | 'deceased'
  | 'swarmed'
  | 'combined'
  | 'sold'
  | 'given_away'

export type ColonyMovementType =
  | 'full_move'
  | 'split_from'
  | 'split_to'
  | 'combine'
  | 'new_colony'
  | 'removed'

export interface Colony {
  id: string
  colony_number: string
  user_id: string

  // Origin
  origin_type: ColonyOriginType
  origin_date: string  // ISO date string
  parent_colony_id?: string | null
  secondary_parent_colony_id?: string | null

  // Status
  status: ColonyStatus
  status_date?: string | null  // ISO date string
  status_reason?: string | null

  // Metadata
  notes?: string | null
  created_at: string
  updated_at: string

  // Joined data (when fetching with relations)
  hives?: {
    id: string
    hive_number: string
    apiaries?: {
      name: string
    }
  }
  parent_colony?: {
    colony_number: string
  }
  secondary_parent_colony?: {
    colony_number: string
  }
}

export interface ColonyMovement {
  id: string
  colony_id: string
  user_id: string

  // Movement details
  from_hive_id?: string | null
  to_hive_id?: string | null
  movement_date: string  // ISO date string
  movement_type: ColonyMovementType

  // Context
  notes?: string | null
  created_at: string

  // Joined data (when fetching with relations)
  colony?: {
    colony_number: string
  }
  from_hive?: {
    hive_number: string
    apiaries?: {
      name: string
    }
  }
  to_hive?: {
    hive_number: string
    apiaries?: {
      name: string
    }
  }
}

export interface ColonyFormData {
  colony_number: string
  origin_type: ColonyOriginType
  origin_date: string
  parent_colony_id: string
  secondary_parent_colony_id: string
  status: ColonyStatus
  status_date: string
  status_reason: string
  notes: string
}

export interface ColonyWithHistory extends Colony {
  movements: ColonyMovement[]
  current_hive?: {
    id: string
    hive_number: string
    apiary_id?: string | null
    apiaries?: {
      name: string
    }
  }
  record_counts?: {
    inspections: number
    treatments: number
    checks: number
    feedings: number
    harvests: number
  }
}
