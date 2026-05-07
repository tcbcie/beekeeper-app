// Shared type definitions for the Records page and related components

// Sentinel value used in form state to mean "not recorded" (stored as NULL in DB)
export const LEVEL_NOT_RECORDED = -1

// Shared label map for integer level fields (drones_present, propolis_level)
export const LEVEL_LABELS: Readonly<Record<number, string>> = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
  3: 'Extreme',
}

export function getLevelLabel(value: number | null | undefined): string | null {
  if (value === null || value === undefined || value === LEVEL_NOT_RECORDED) return null
  return LEVEL_LABELS[value] ?? null
}

export interface HiveConfiguration {
  brood_boxes?: number
  brood_boxes_full?: number
  brood_boxes_half?: number
  honey_supers?: number
  queen_excluder?: boolean
  feeder?: boolean
  feeder_type?: string
  entrance_reducer?: boolean
  varroa_mesh_floor?: string
  right_sized_broodbox?: boolean
}

export interface Hive {
  id: string
  hive_number: string
  apiary_id: string | null
  configuration: HiveConfiguration | null
  status: string
  archived_at: string | null
  user_id: string
  qr_tag_code?: string | null
}

export interface Apiary {
  id: string
  name: string
  is_shared?: boolean
}

export interface ProfileInfo {
  first_name: string | null
  last_name: string | null
  email: string
}

export type BroodBoxType = 'full' | 'half'

export interface BroodBoxFrames {
  box: number
  type: BroodBoxType
  frames: number
}

export interface Inspection {
  id: string
  hive_id: string
  user_id: string
  inspection_date: string
  inspection_time: string | null
  weight: number | null
  queen_seen: boolean
  eggs_present: boolean
  drones_present: number
  drone_brood_present: boolean | null
  propolis_level: number
  brood_frames: number | null
  brood_frames_per_box: BroodBoxFrames[] | null
  right_sized_frames: number | null
  brood_pattern_rating: number
  temperament_rating: number
  population_strength: number
  swarming_tendency: number
  calmness: number
  frames_foundation: number
  frames_brood: number
  frames_drawn: number
  honey_supers: number
  drone_frames: number
  store_frames: number
  recapping: number
  vsh: number
  smr: number
  afb_disease: number
  efb_disease: number
  chalkbrood_disease: number
  nosemosis_disease: number
  dwv_disease: number
  iapv_cbpv_disease: number
  varroa_disease: number
  varroa_seen_on_bees: boolean
  varroa_seen_in_brood: boolean
  varroa_brood_worker: boolean
  varroa_brood_drone: boolean
  queen_cups: boolean
  queen_cups_number: number
  queen_cups_removed_all: boolean
  swarm_cells: boolean
  swarm_cells_number: number
  swarm_cells_removed_all: boolean
  supercedure_cells: boolean
  supercedure_cells_number: number
  supercedure_cells_removed_all: boolean
  emergency_cells: boolean
  emergency_cells_number: number
  emergency_cells_removed_all: boolean
  removed_cells: number
  remaining_cells: number
  queen_cells_notes: string
  notes: string
  image_url: string | null
  weather_temp: number | null
  weather_condition: string | null
  weather_humidity: number | null
  weather_wind_speed: number | null
  hives?: {
    hive_number: string
    apiaries?: {
      eircode: string | null
    }
  }
  profiles?: ProfileInfo
}

export interface VarroaTreatment {
  id: string
  hive_id: string
  user_id: string
  treatment_date: string
  treatment_time: string | null
  treatment_type: string
  dosage: string
  temperature: number | null
  weather_conditions: string
  notes: string
  application_method_id: string | null
  batch_number?: string | null
  hives?: {
    hive_number: string
    apiary_id: string | null
  }
  profiles?: ProfileInfo
  application_method?: { value: string } | null
}

export interface VarroaCheck {
  id: string
  hive_id: string
  user_id: string
  check_date: string
  method: string
  mites_count: number | null
  sample_size: number | null
  infestation_rate: number | null
  action_threshold_reached: boolean
  notes: string
  image_url: string | null
  hives?: {
    hive_number: string
  }
  profiles?: ProfileInfo
}

export interface Feeding {
  id: string
  hive_id: string
  user_id: string
  feed_date: string
  feed_type: string
  quantity: number | null
  unit: string
  notes: string
  hives?: {
    hive_number: string
  }
  profiles?: ProfileInfo
}

export interface Harvest {
  id: string
  hive_id: string
  user_id: string
  harvest_date: string
  honey_weight: number | null
  wax_weight: number | null
  unit: string
  frames_harvested: number | null
  floral_source: string | null
  moisture_content: number | null
  notes: string
  hives?: {
    hive_number: string
  }
  profiles?: ProfileInfo
}

export interface ArchiveRecord {
  id: string
  hive_id: string
  hive_number: string
  archived_at: string
  archive_reason_id: string | null
  archive_notes: string | null
  archive_reason_value?: string
}

export interface TreatmentProduct {
  id: string
  product_name: string
  active_ingredients: string | null
  application_method: string | null
  treatment_duration: string | null
  temperature_range: string | null
  honey_flow_restrictions: string | null
  withdrawal_period_days: number | null
  approved_in_ireland: boolean
  approved_in_uk: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

// Unified record type for displaying all records together
export type UnifiedRecord =
  | (Inspection & { record_type: 'inspection'; date: string })
  | (VarroaTreatment & { record_type: 'varroa_treatment'; date: string })
  | (VarroaCheck & { record_type: 'varroa_check'; date: string })
  | (Feeding & { record_type: 'feeding'; date: string })
  | (Harvest & { record_type: 'harvest'; date: string })
  | (ArchiveRecord & { record_type: 'archive'; date: string })

export type RecordType = 'inspection' | 'varroa_treatment' | 'varroa_check' | 'feeding' | 'harvest' | 'archive'
export type OwnershipFilter = 'my' | 'team' | 'all'
export type TimePeriod = 'all' | '3months' | '6months' | '1year' | 'custom'

// Form data for inspection form
export interface InspectionFormData {
  hive_id: string
  inspection_date: string
  inspection_time: string
  weight: number | null
  queen_seen: boolean
  eggs_present: boolean
  drones_present: number
  drone_brood_present: boolean | null
  propolis_level: number
  brood_frames: number | null
  brood_frames_per_box: BroodBoxFrames[] | null
  right_sized_frames: number | null
  brood_pattern_rating: number
  temperament_rating: number
  population_strength: number
  swarming_tendency: number
  calmness: number
  frames_foundation: number
  frames_brood: number
  frames_drawn: number
  honey_supers: number
  drone_frames: number
  store_frames: number
  recapping: number
  vsh: number
  smr: number
  afb_disease: number
  efb_disease: number
  chalkbrood_disease: number
  nosemosis_disease: number
  dwv_disease: number
  iapv_cbpv_disease: number
  varroa_disease: number
  varroa_seen_on_bees: boolean
  varroa_seen_in_brood: boolean
  varroa_brood_worker: boolean
  varroa_brood_drone: boolean
  queen_cups: boolean
  queen_cups_number: number
  queen_cups_removed_all: boolean
  swarm_cells: boolean
  swarm_cells_number: number
  swarm_cells_removed_all: boolean
  supercedure_cells: boolean
  supercedure_cells_number: number
  supercedure_cells_removed_all: boolean
  emergency_cells: boolean
  emergency_cells_number: number
  emergency_cells_removed_all: boolean
  removed_cells: number
  remaining_cells: number
  queen_cells_notes: string
  notes: string
  image_url: string | null
}

// Archive form data
export interface ArchiveFormData {
  hive_id: string
  archive_reason_id: string
  archive_notes: string
}

// Transient draft for follow-up tasks captured at the end of an inspection.
// These are NOT persisted on the inspections table — each draft is inserted
// into tasks_events at submit time and then forgotten.
export type FollowUpTaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface FollowUpTaskDraft {
  title: string
  description: string
  due_date: string
  priority: FollowUpTaskPriority
  equipment_needed: string
}

export const getDefaultFollowUpTaskDraft = (defaultDate: string): FollowUpTaskDraft => ({
  title: '',
  description: '',
  due_date: defaultDate,
  priority: 'normal',
  equipment_needed: '',
})

// Filter state
export interface FilterState {
  hiveId: string
  apiaryId: string
  showArchivedHives: boolean
  timePeriod: TimePeriod
  customStartDate: string
  customEndDate: string
  ownershipFilter: OwnershipFilter
  recordTypeFilter: RecordType | 'all'
}

// Records data state
export interface RecordsDataState {
  inspections: Inspection[]
  varroaTreatments: VarroaTreatment[]
  varroaChecks: VarroaCheck[]
  feedings: Feeding[]
  harvests: Harvest[]
  archiveRecords: ArchiveRecord[]
  allRecords: UnifiedRecord[]
  hives: Hive[]
  apiaries: Apiary[]
}

// Form state
export interface FormState {
  isOpen: boolean
  type: RecordType
  editingInspection: Inspection | null
  editingTreatment: VarroaTreatment | null
  editingCheck: VarroaCheck | null
  editingFeeding: Feeding | null
  editingHarvest: Harvest | null
}

// UI state
export interface UIState {
  showDropdown: boolean
  imageModalOpen: boolean
  modalImageUrl: string | null
  givenTakenExpanded: boolean
  dronesExpanded: boolean
  diseaseExpanded: boolean
  hygienicBehaviourExpanded: boolean
  queenCellsExpanded: boolean
  showIpmTips: boolean
}

// Dropdown value from dropdown_values table
export interface DropdownValue {
  id: string
  value: string
}

// Financial record for P&L tracking
export interface FinancialRecord {
  id: string
  user_id: string
  record_type: 'income' | 'expense'
  transaction_date: string
  amount: number
  category_id: string
  description: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
  // Joined data from dropdown_values
  category?: { value: string }
}

// Purchase list item
export interface PurchaseItem {
  id: string
  user_id: string
  name: string
  quantity: number | null
  unit: string | null
  category_id: string | null
  supplier: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'purchased' | 'cancelled'
  estimated_price: number | null
  actual_price: number | null
  notes: string | null
  due_date: string | null
  purchased_date: string | null
  created_at?: string
  updated_at?: string
  // Joined data from dropdown_values
  category?: { value: string }
}

// Options state for dynamic dropdowns
export interface OptionsState {
  checkMethodOptions: string[]
  feedTypeOptions: string[]
  treatmentProducts: TreatmentProduct[]
  archiveReasons: Array<{ id: string; value: string }>
  applicationMethods: DropdownValue[]
}

// Helper to get default inspection form data
export function getDefaultInspectionFormData(): InspectionFormData {
  return {
    hive_id: '',
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_time: new Date().toTimeString().slice(0, 5),
    weight: null,
    queen_seen: false,
    eggs_present: false,
    drones_present: -1,
    drone_brood_present: null,
    propolis_level: -1,
    brood_frames: null,
    brood_frames_per_box: null,
    right_sized_frames: null,
    brood_pattern_rating: 0,
    temperament_rating: 0,
    population_strength: 0,
    swarming_tendency: 0,
    calmness: 0,
    frames_foundation: 0,
    frames_brood: 0,
    frames_drawn: 0,
    honey_supers: 0,
    drone_frames: 0,
    store_frames: 0,
    recapping: 0,
    vsh: 0,
    smr: 0,
    afb_disease: 0,
    efb_disease: 0,
    chalkbrood_disease: 0,
    nosemosis_disease: 0,
    dwv_disease: 0,
    iapv_cbpv_disease: 0,
    varroa_disease: 0,
    varroa_seen_on_bees: false,
    varroa_seen_in_brood: false,
    varroa_brood_worker: false,
    varroa_brood_drone: false,
    queen_cups: false,
    queen_cups_number: 0,
    queen_cups_removed_all: false,
    swarm_cells: false,
    swarm_cells_number: 0,
    swarm_cells_removed_all: false,
    supercedure_cells: false,
    supercedure_cells_number: 0,
    supercedure_cells_removed_all: false,
    emergency_cells: false,
    emergency_cells_number: 0,
    emergency_cells_removed_all: false,
    removed_cells: 0,
    remaining_cells: 0,
    queen_cells_notes: '',
    notes: '',
    image_url: null
  }
}

// Helper to get default archive form data
export function getDefaultArchiveFormData(): ArchiveFormData {
  return {
    hive_id: '',
    archive_reason_id: '',
    archive_notes: ''
  }
}

// Helper to get default filter state
export function getDefaultFilterState(): FilterState {
  return {
    hiveId: '',
    apiaryId: '',
    showArchivedHives: false,
    timePeriod: 'all',
    customStartDate: '',
    customEndDate: '',
    ownershipFilter: 'my',
    recordTypeFilter: 'all'
  }
}

// Helper to get default UI state
export function getDefaultUIState(): UIState {
  return {
    showDropdown: false,
    imageModalOpen: false,
    modalImageUrl: null,
    givenTakenExpanded: false,
    dronesExpanded: false,
    diseaseExpanded: false,
    hygienicBehaviourExpanded: false,
    queenCellsExpanded: false,
    showIpmTips: false
  }
}
