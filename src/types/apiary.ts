// Apiary-related type definitions

export interface Apiary {
  id: string
  name: string
  location: string | null
  city: string | null
  eircode: string | null
  latitude: number | null
  longitude: number | null
  elevation: number | null
  grid_reference: string | null
  notes: string | null
  is_uk_ni?: boolean
  share_location: boolean
  image_url: string | null
  created_at?: string
  hive_count?: number
  last_inspection_date?: string
  user_id?: string
  is_mating_apiary?: boolean
  is_shared?: boolean
  team_name?: string | null
  /** Yard map entrance marker, 0-100 % of canvas (NULL = unset). */
  yard_entrance_x?: number | null
  yard_entrance_y?: number | null
  /** Yard map north direction, degrees clockwise from canvas-up. */
  north_angle_deg?: number
  /** Apiary map dimensions in metres (1 scene unit = 0.5 m). */
  yard_width_m?: number
  yard_depth_m?: number
}

export interface ApiaryFormData {
  name: string
  location: string
  city: string
  eircode: string
  latitude: string
  longitude: string
  elevation: string
  grid_reference: string
  notes: string
  is_uk_ni: boolean
  share_location: boolean
  is_conservation_area: boolean
  ca_radius_km: string
  is_mating_apiary: boolean
}

export interface UserOption {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
}
