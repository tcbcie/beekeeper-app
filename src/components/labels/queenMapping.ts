import { getQueenColorFromYear } from '@/types/queen'
import type { Queen } from '@/types/queen'
import type { LabelDatum, QueenYearColour } from './types'
import { formatDateGB } from './dateFormat'

const QUEEN_COLOUR_SET: ReadonlySet<string> = new Set(['White', 'Yellow', 'Red', 'Green', 'Blue'])

export function queenToLabelDatum(queen: Queen): LabelDatum {
  const colourName = queen.birth_date ? getQueenColorFromYear(queen.birth_date) : ''
  const yearColour: QueenYearColour | null = QUEEN_COLOUR_SET.has(colourName)
    ? (colourName as QueenYearColour)
    : null

  return {
    id: queen.id,
    primaryText: queen.queen_number || '—',
    yearColour,
    queenExtras: {
      motherNumber: queen.mother?.queen_number || undefined,
      fatherNumber: queen.father?.queen_number || undefined,
      matedDate: formatDateGB(queen.mated_date) ?? undefined,
      eircode: queen.mated_at_eircode || undefined,
    },
  }
}
