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

  const parents: string[] = []
  if (queen.mother?.queen_number) parents.push(`♀ ${queen.mother.queen_number}`)
  if (queen.father?.queen_number) parents.push(`♂ ${queen.father.queen_number}`)

  const lines: string[] = []
  if (parents.length > 0) lines.push(parents.join('  '))

  const mated = formatDateGB(queen.mated_date)
  if (mated) lines.push(`Mated ${mated}`)

  if (queen.mated_at_eircode) {
    lines.push(queen.mated_at_eircode)
  }

  return {
    id: queen.id,
    primaryText: queen.queen_number || '—',
    secondaryLines: lines,
    yearColour,
  }
}
