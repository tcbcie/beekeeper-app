import type { LabelPreset, LabelPresetId } from './types'

export const LABEL_PRESETS: Record<LabelPresetId, LabelPreset> = {
  queen_label: {
    id: 'queen_label',
    name: 'Queen label (90 × 29 mm)',
    widthMm: 90,
    heightMm: 29,
    description: 'Brother QL-820 with DK-1201 standard address roll (29 × 90 mm die-cut, landscape). Monochrome — uses typography hierarchy and the year-colour stripe for identity.',
  },
  balkani_label: {
    id: 'balkani_label',
    name: 'Balkani label (90 × 29 mm)',
    widthMm: 90,
    heightMm: 29,
    description: 'Brother QL-820 with DK-1201 standard address roll (29 × 90 mm die-cut, landscape). Monochrome — masthead wordmark + rule, code and weight as co-headlines.',
  },
}

export function getPreset(id: LabelPresetId): LabelPreset {
  return LABEL_PRESETS[id]
}
