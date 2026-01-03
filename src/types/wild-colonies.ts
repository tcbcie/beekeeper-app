// Types for wild colony inspections

export interface WildColonyInspection {
  id: string
  wild_colony_id: string
  user_id: string
  inspection_date: string
  inspection_time: string | null

  // Observable Signs
  activity_level: number
  population_estimate: string | null
  forager_traffic: number
  pollen_observed: boolean

  // Queen/Brood Signs
  drones_observed: boolean
  orientation_flights: boolean

  // Behavior
  temperament: number
  robbing_activity: boolean

  // Health Indicators
  dead_bees_observed: boolean
  dead_bees_count: number | null
  deformed_wings_observed: boolean

  // Status
  colony_status: string | null
  swarm_activity_observed: boolean

  // Weather
  weather_temp: number | null
  weather_condition: string | null

  // Media & Notes
  notes: string | null
  image_url: string | null

  created_at: string
  updated_at: string
}

export interface WildColonyInspectionFormData {
  inspection_date: string
  inspection_time: string

  // Observable Signs
  activity_level: number
  population_estimate: string
  forager_traffic: number
  pollen_observed: boolean

  // Queen/Brood Signs
  drones_observed: boolean
  orientation_flights: boolean

  // Behavior
  temperament: number
  robbing_activity: boolean

  // Health Indicators
  dead_bees_observed: boolean
  dead_bees_count: number | null
  deformed_wings_observed: boolean

  // Status
  colony_status: string
  swarm_activity_observed: boolean

  // Weather
  weather_temp: number | null
  weather_condition: string

  // Notes
  notes: string
}

export const getDefaultInspectionFormData = (): WildColonyInspectionFormData => ({
  inspection_date: new Date().toISOString().split('T')[0],
  inspection_time: new Date().toTimeString().slice(0, 5),
  activity_level: 0,
  population_estimate: '',
  forager_traffic: 0,
  pollen_observed: false,
  drones_observed: false,
  orientation_flights: false,
  temperament: 0,
  robbing_activity: false,
  dead_bees_observed: false,
  dead_bees_count: null,
  deformed_wings_observed: false,
  colony_status: '',
  swarm_activity_observed: false,
  weather_temp: null,
  weather_condition: '',
  notes: '',
})

export const POPULATION_ESTIMATES = [
  { value: '', label: 'Select estimate...' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'very_large', label: 'Very Large' },
]

export const COLONY_STATUS_OPTIONS = [
  { value: '', label: 'Select status...' },
  { value: 'active', label: 'Active' },
  { value: 'strong', label: 'Strong' },
  { value: 'weak', label: 'Weak' },
  { value: 'absconded', label: 'Absconded' },
  { value: 'dead', label: 'Dead' },
  { value: 'swarmed', label: 'Swarmed' },
  { value: 'unknown', label: 'Unknown' },
]

export const WEATHER_CONDITIONS = [
  { value: '', label: 'Select weather...' },
  { value: 'sunny', label: 'Sunny' },
  { value: 'partly_cloudy', label: 'Partly Cloudy' },
  { value: 'cloudy', label: 'Cloudy' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'light_rain', label: 'Light Rain' },
  { value: 'rain', label: 'Rain' },
  { value: 'windy', label: 'Windy' },
]

export const getPopulationLabel = (value: string | null): string => {
  const option = POPULATION_ESTIMATES.find(o => o.value === value)
  return option?.label || value || 'Not specified'
}

export const getColonyStatusLabel = (value: string | null): string => {
  const option = COLONY_STATUS_OPTIONS.find(o => o.value === value)
  return option?.label || value || 'Not specified'
}

export const getWeatherLabel = (value: string | null): string => {
  const option = WEATHER_CONDITIONS.find(o => o.value === value)
  return option?.label || value || '-'
}
