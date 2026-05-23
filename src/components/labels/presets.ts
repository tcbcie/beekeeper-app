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
    name: 'Balkani wholesale label (62 × 75 mm)',
    widthMm: 62,
    heightMm: 75,
    description: 'Brother QL-820 with a 62 mm continuous roll (DK-22251 black/red or DK-22205 monochrome — design is monochrome so either works, red track on DK-22251 just goes unused). Cut at 75 mm per label. Wholesale-grade: sales name, locality-tight origin (city + Ireland) aggregated from linked apiaries, net weight, lot, dates, producer block. No consumer-protection disclaimers — these buckets move via wholesale channels, not retail.',
  },
}

export function getPreset(id: LabelPresetId): LabelPreset {
  return LABEL_PRESETS[id]
}
