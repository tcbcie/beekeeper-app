// Hive models: one kind of equipment a user owns, picked per hive.
// See docs/features/hive-model-plan.md.

export type HiveModelMaterial = 'cedar' | 'pine' | 'poly' | 'plywood' | 'other'

/** Global, admin-managed hive system (National, Langstroth, ...). */
export interface HiveSystem {
  id: string
  name: string
  brood_frame_standard_id: string | null
  super_frame_standard_id: string | null
  default_frames_full: number | null
  default_frames_nuc: number | null
  display_order: number
  is_active: boolean
}

/** A frame size from the existing frame_standards table. */
export interface FrameStandardLabel {
  id: string
  label: string
}

export interface HiveModel {
  id: string
  user_id: string
  name: string
  hive_system_id: string | null
  hive_size: 'full' | 'nuc'
  manufacturer: string | null
  material: HiveModelMaterial | null
  frames_per_box: number | null
  image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** The fields a user edits; id, owner and timestamps come from the database. */
export type HiveModelInput = Pick<
  HiveModel,
  'name' | 'hive_system_id' | 'hive_size' | 'manufacturer' | 'material' | 'frames_per_box' | 'notes'
>
