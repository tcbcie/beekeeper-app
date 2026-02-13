// Apiary-related type definitions

export interface Apiary {
  id: string
  name: string
  location: string | null
  city: string | null
  eircode: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
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
  notes: string
  is_uk_ni: boolean
  share_location: boolean
}

export interface UserOption {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
}
