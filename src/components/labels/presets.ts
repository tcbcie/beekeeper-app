import type { LabelPreset, LabelPresetId } from './types'

export const LABEL_PRESETS: Record<LabelPresetId, LabelPreset> = {
  brother_dk22251_queen: {
    id: 'brother_dk22251_queen',
    name: 'Queen label (62 × 32 mm)',
    widthMm: 62,
    heightMm: 32,
    description: 'Brother QL-820 with DK-22251 continuous roll. Cut at 32 mm. The full-height left stripe carries the international year-colour code; ♀ ♂ lineage symbols print red on a P-touch driver configured for the DK-22251 two-colour track.',
  },
  brother_dk22251_balkani: {
    id: 'brother_dk22251_balkani',
    name: 'Balkani label (62 × 22 mm)',
    widthMm: 62,
    heightMm: 22,
    description: 'Brother QL-820 with DK-22251 continuous roll. Cut at 22 mm. Solid red header band uses the DK-22251 two-colour track when the P-touch driver is configured for it; falls back to black on standard drivers.',
  },
}

export function getPreset(id: LabelPresetId): LabelPreset {
  return LABEL_PRESETS[id]
}
