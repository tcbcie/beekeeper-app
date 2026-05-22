import type { LabelPreset, LabelPresetId } from './types'

export const LABEL_PRESETS: Record<LabelPresetId, LabelPreset> = {
  brother_dk22251_queen: {
    id: 'brother_dk22251_queen',
    name: 'Queen label (62 × 30 mm)',
    widthMm: 62,
    heightMm: 30,
    description: 'Brother QL-820 with DK-22251 continuous roll. Cut at 30 mm.',
  },
  brother_dk22251_balkani: {
    id: 'brother_dk22251_balkani',
    name: 'Balkani label (62 × 30 mm)',
    widthMm: 62,
    heightMm: 30,
    description: 'Brother QL-820 with DK-22251 continuous roll. Cut at 30 mm.',
  },
}

export function getPreset(id: LabelPresetId): LabelPreset {
  return LABEL_PRESETS[id]
}
