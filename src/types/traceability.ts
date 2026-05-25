// Types for honey traceability module

export interface BulkContainer {
  id: string
  user_id: string
  container_code: string
  container_type: string
  extraction_date: string
  total_weight_kg: number | null
  moisture_content: number | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined data
  harvests?: ContainerHarvest[]
}

export interface ContainerHarvest {
  id: string
  container_id: string
  harvest_id: string
  created_at: string
  // Joined harvest data
  harvest?: {
    id: string
    harvest_date: string
    honey_weight: number | null
    unit: string
    floral_source: string | null
    hive_id: string
    hives?: {
      hive_number: string
      apiary_id: string | null
      apiaries?: {
        id: string
        name: string
        city: string | null
      }
    }
  }
}

export interface BatchRun {
  id: string
  user_id: string
  batch_code: string
  trace_code: string
  batch_date: string
  total_weight_kg: number | null
  jar_size_ml: number | null
  jar_weight_g: number | null
  jar_count: number | null
  best_before_date: string | null
  notes: string | null
  is_public: boolean
  is_creamed: boolean
  show_apiary_image: boolean
  show_feedback: boolean
  public_title: string | null
  public_origin: string | null
  public_story: string | null
  created_at: string
  updated_at: string
  // Joined data
  containers?: BatchContainer[]
}

export interface BatchContainer {
  id: string
  batch_id: string
  container_id: string
  weight_used_kg: number | null
  created_at: string
  // Joined container data
  container?: BulkContainer
}

// Form data types
export interface ContainerFormData {
  container_code: string
  container_type: string
  extraction_date: string
  total_weight_kg: string
  moisture_content: string
  notes: string
  harvest_ids: string[]
  bucket_count: string
}

export interface BatchFormData {
  batch_date: string
  total_weight_kg: string
  jar_size_ml: string
  jar_weight_g: string
  jar_count: string
  best_before_date: string
  notes: string
  is_public: boolean
  is_creamed: boolean
  show_apiary_image: boolean
  show_feedback: boolean
  public_title: string
  public_origin: string
  public_story: string
  container_ids: string[]
}

// Origin tracking for batch labels
export interface OriginPercentage {
  apiary_name: string
  city: string | null
  percentage: number
  weight_kg: number
}

// Harvest with apiary info for selection
export interface HarvestWithApiary {
  id: string
  harvest_date: string
  honey_weight: number | null
  unit: string
  hive_number: string
  apiary_name: string | null
  apiary_city: string | null
  already_linked: boolean
}
