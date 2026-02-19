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
}

export interface UserOption {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
}
