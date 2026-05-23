export type LabelPresetId = 'queen_label' | 'balkani_label'

export interface LabelDatum {
  id: string
  primaryText: string
  secondaryLines?: string[]
  yearColour?: QueenYearColour | null
  // Right-aligned hero text on supporting presets (e.g. balkani weight).
  // Ignored by presets that don't lay out a hero row with a co-primary value.
  accentText?: string
  // Structured fields used by the queen preset so the renderer can style
  // lineage / mated / eircode rows differently. Other presets ignore this.
  queenExtras?: QueenLabelExtras
}

export interface QueenLabelExtras {
  motherNumber?: string
  fatherNumber?: string
  matedDate?: string
  eircode?: string
  // Two-digit birth year (e.g. "26"). Printed alongside the queen number so
  // that on a B&W thermal printer — where every year-colour fill collapses
  // to identical solid black — the year is still legible from the label.
  birthYear?: string
}

export type QueenYearColour = 'White' | 'Yellow' | 'Red' | 'Green' | 'Blue'

export const QUEEN_YEAR_COLOUR_HEX: Record<QueenYearColour, { fill: string; border: string }> = {
  White: { fill: '#ffffff', border: '#9ca3af' },
  Yellow: { fill: '#fde047', border: '#a16207' },
  Red: { fill: '#dc2626', border: '#7f1d1d' },
  Green: { fill: '#16a34a', border: '#14532d' },
  Blue: { fill: '#2563eb', border: '#1e3a8a' },
}

export interface LabelPreset {
  id: LabelPresetId
  name: string
  widthMm: number
  heightMm: number
  description: string
}
