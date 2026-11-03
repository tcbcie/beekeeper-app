// Labels and small pure helpers for hive models. See docs/features/hive-model-plan.md.
import type { FrameStandardLabel, HiveModel, HiveModelMaterial, HiveSystem } from '@/types/hive-model'

export const HIVE_MODEL_MATERIALS: ReadonlyArray<{ value: HiveModelMaterial; label: string }> = [
  { value: 'cedar', label: 'Cedar' },
  { value: 'pine', label: 'Pine' },
  { value: 'poly', label: 'Poly' },
  { value: 'plywood', label: 'Plywood' },
  { value: 'other', label: 'Other' },
]

/** Common makes in Ireland and the UK, offered as suggestions; any text is allowed. */
export const HIVE_MAKE_SUGGESTIONS: readonly string[] = [
  'Abelo',
  'Lyson',
  'Maismore',
  'Modern Beekeeping',
  "Payne's",
  'Swienty',
  'Thorne',
]

export function materialLabel(material: HiveModelMaterial | null | undefined): string | null {
  if (!material) return null
  return HIVE_MODEL_MATERIALS.find(m => m.value === material)?.label ?? null
}

type ModelFacts = Pick<HiveModel, 'manufacturer' | 'material' | 'hive_size'>

/** Lower case, with punctuation as spaces and padded, so whole words can be matched ("Warré", "Payne's"). */
function words(text: string): string {
  return ` ${text.toLowerCase().replace(/[^\p{L}\p{N}']+/gu, ' ').trim()} `
}

/**
 * The line shown under a model's name, e.g. "National · Abelo · Poly · Nuc". Anything the name
 * already says is left out, so "Dadant US" never sits above "Dadant US". Empty when nothing is left.
 */
export function describeHiveModel(
  model: ModelFacts & Pick<HiveModel, 'name'>,
  system: Pick<HiveSystem, 'name'> | null | undefined
): string {
  const name = words(model.name)
  return [
    system?.name,
    model.manufacturer?.trim() || null,
    materialLabel(model.material),
    model.hive_size === 'nuc' ? 'Nuc' : null,
  ]
    .filter((part): part is string => Boolean(part))
    .filter(part => !name.includes(words(part)))
    .join(' · ')
}

/** A name built from the model's details, e.g. "Abelo Poly National Nuc". Empty when nothing is set. */
export function buildHiveModelName(model: ModelFacts, system: Pick<HiveSystem, 'name'> | null | undefined): string {
  return [
    model.manufacturer?.trim() || null,
    materialLabel(model.material),
    system?.name,
    model.hive_size === 'nuc' ? 'Nuc' : null,
  ].filter(Boolean).join(' ')
}

/** Frames a box of this model holds: the model's own figure, else the system default for its size. */
export function modelFramesPerBox(model: HiveModel, system: HiveSystem | null | undefined): number | null {
  if (model.frames_per_box) return model.frames_per_box
  if (!system) return null
  return (model.hive_size === 'nuc' ? system.default_frames_nuc : system.default_frames_full) ?? null
}

/** The photo to show for a hive: its own, otherwise its model's. */
export function hivePhotoUrl(
  hive: { image_url?: string | null },
  model: HiveModel | null | undefined
): string | null {
  return hive.image_url || model?.image_url || null
}

export interface HiveModelSummaryRow {
  modelId: string
  name: string
  description: string
  count: number
}

export interface FrameNeedRow {
  label: string
  count: number
}

export interface HiveModelSummary {
  models: HiveModelSummaryRow[]
  /** Brood frame sizes in use, with the number of hives taking each. */
  broodFrames: FrameNeedRow[]
  /** Hives with no model chosen, or whose model can't be read. */
  unassigned: number
}

/**
 * What equipment an apiary holds: hives per model, and which brood frame sizes they take,
 * so a beekeeper knows what compatible gear to bring on a visit.
 */
export function summariseHiveModels(
  hives: ReadonlyArray<{ hive_model_id?: string | null }>,
  modelsById: ReadonlyMap<string, HiveModel>,
  systemsById: ReadonlyMap<string, HiveSystem>,
  frameStandardsById: ReadonlyMap<string, FrameStandardLabel>
): HiveModelSummary {
  const modelCounts = new Map<string, number>()
  const frameCounts = new Map<string, number>()
  let unassigned = 0

  for (const hive of hives) {
    const model = hive.hive_model_id ? modelsById.get(hive.hive_model_id) : undefined
    if (!model) {
      unassigned++
      continue
    }
    modelCounts.set(model.id, (modelCounts.get(model.id) ?? 0) + 1)
    const system = model.hive_system_id ? systemsById.get(model.hive_system_id) : undefined
    const frame = system?.brood_frame_standard_id
      ? frameStandardsById.get(system.brood_frame_standard_id)
      : undefined
    if (frame) frameCounts.set(frame.label, (frameCounts.get(frame.label) ?? 0) + 1)
  }

  const models = [...modelCounts.entries()]
    .map(([modelId, count]) => {
      const model = modelsById.get(modelId)!
      const system = model.hive_system_id ? systemsById.get(model.hive_system_id) : undefined
      return { modelId, name: model.name, description: describeHiveModel(model, system), count }
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  const broodFrames = [...frameCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  return { models, broodFrames, unassigned }
}
