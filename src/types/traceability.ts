// Types for honey traceability module

export interface BulkContainer {
  id: string
  user_id: string
  container_code: string
  container_type: string
  extraction_date: string
  total_weight_kg: number | null
  moisture_content: number | null
  excluded: boolean
  excluded_reason: string | null
  excluded_note: string | null
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
  jars?: BatchJar[]
}

export interface BatchJar {
  id: string
  batch_id: string
  jar_size_ml: number | null
  jar_weight_g: number | null
  jar_count: number | null
  created_at: string
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
  excluded_reason: string
  excluded_note: string
  notes: string
  harvest_ids: string[]
  bucket_count: string
}

export interface JarConfig {
  jar_size_ml: string
  jar_weight_g: string
  jar_count: string
}

export interface BatchFormData {
  batch_date: string
  total_weight_kg: string
  jars: JarConfig[]
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

// --- Jar labels -------------------------------------------------------------
// A printed label design carries a permanent code; the label points at whichever
// batch is currently bottled into that jar size. This is what lets labels be
// printed in bulk, ahead of the batches they will end up on.

// Only 'current' is rendered today. 'pick' and 'landing' exist in the DB CHECK
// so they can be switched on later without a migration or a reprint.
export type ResolveMode = 'current' | 'pick' | 'landing'

export interface TraceLabel {
  id: string
  user_id: string
  code: string
  name: string
  // Printed on the label, so never rendered on the public page. Kept because
  // they identify the design and key the lot chooser.
  jar_size_ml: number | null
  jar_weight_g: number | null
  current_batch_id: string | null
  resolve_mode: ResolveMode
  is_active: boolean
  // Presentation overrides — the label sits between the batch and the producer
  // default, so a design can carry its own copy without retyping it per batch.
  public_title: string | null
  public_origin: string | null
  public_story: string | null
  show_story: boolean
  show_origin_map: boolean
  show_apiary_image: boolean
  show_floral: boolean
  show_lot_details: boolean
  show_feedback: boolean
  created_at: string
  updated_at: string
  assigned_at: string | null
  // Joined data
  current_batch?: Pick<BatchRun, 'id' | 'batch_code' | 'batch_date' | 'is_public'> | null
}

export interface TraceLabelFormData {
  name: string
  jar_size_ml: string
  jar_weight_g: string
  resolve_mode: ResolveMode
  is_active: boolean
  public_title: string
  public_origin: string
  public_story: string
  show_story: boolean
  show_origin_map: boolean
  show_apiary_image: boolean
  show_floral: boolean
  show_lot_details: boolean
  show_feedback: boolean
}

// The consumer-safe batch payload returned by get_public_batch_info, and
// re-used verbatim inside get_public_jar_label_info.
export interface PublicBatchInfo {
  batch_code: string
  trace_code: string
  batch_date: string
  best_before_date: string | null
  jar_size_ml: number | null
  jar_weight_g: number | null
  jars: {
    jar_size_ml: number | null
    jar_weight_g: number | null
    jar_count: number | null
  }[]
  beekeeper_name: string
  floral_sources: string[]
  origins: {
    apiary_name: string
    city: string | null
    percentage: number
    latitude: number | null
    longitude: number | null
    show_map: boolean
  }[]
  public_title: string | null
  public_origin: string | null
  public_story: string | null
  apiary_image_url: string | null
  show_feedback: boolean
}

// The label half of get_public_jar_label_info — the batch half reuses whatever
// shape get_public_batch_info already returns, so the public page does not fork.
export interface PublicTraceLabel {
  code: string
  name: string
  resolve_mode: ResolveMode
  public_title: string | null
  public_origin: string | null
  public_story: string | null
  show_story: boolean
  show_origin_map: boolean
  show_apiary_image: boolean
  show_floral: boolean
  show_lot_details: boolean
  show_feedback: boolean
}

// Just enough of a label for the batch form to warn that editing this batch
// changes what a printed QR already in circulation resolves to.
export interface BatchLabelPointer {
  id: string
  name: string
  code: string
  current_batch_id: string | null
  is_active: boolean
}

export interface PublicLabelLot {
  batch_code: string
  batch_date: string
  best_before_date: string | null
}

// batch is null when the label is unassigned, or points at a batch that is not
// public. requested_lot/lot_found let the page say "we could not find that lot"
// rather than silently showing a different one.
export interface PublicJarLabelInfo<TBatch = unknown> {
  label: PublicTraceLabel
  batch: TBatch | null
  requested_lot: string | null
  lot_found: boolean
}
