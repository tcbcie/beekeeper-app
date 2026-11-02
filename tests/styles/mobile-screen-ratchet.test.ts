import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'

/**
 * Keeps desktop patterns from creeping back onto the screens beekeepers use in the field. See the
 * mobile-screen skill. Counts may fall, never rise.
 */

const SRC = path.resolve(__dirname, '../../src')

const FIELD_SCREENS = [
  'app/dashboard/hives/page.tsx',
  'app/dashboard/hives/[id]/page.tsx',
  'app/dashboard/apiaries/[id]/page.tsx',
  'app/dashboard/records/page.tsx',
  'app/dashboard/tasks/page.tsx',
  'components/hive/HiveListRow.tsx',
  'components/hive/ScaleSelectionModal.tsx',
  'components/hive/WolfScaleSelectionModal.tsx',
  'components/records/RecordFiltersBar.tsx',
  'components/records/forms/InspectionForm.tsx',
  'components/shared/VegetationInfoModal.tsx',
]

function countInFieldScreens(pattern: RegExp): number {
  return FIELD_SCREENS.reduce(
    (total, file) => total + (readFileSync(path.join(SRC, file), 'utf-8').match(pattern)?.length ?? 0),
    0
  )
}

function allSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const full = path.join(directory, name)
    if (statSync(full).isDirectory()) return allSourceFiles(full)
    return full.endsWith('.tsx') ? [full] : []
  })
}

describe('field screens stay built for a phone', () => {
  // The one left is the Visit Checklist on Tasks, which has its own print layout.
  it('does not add a hand-rolled dialog', () => {
    expect(countInFieldScreens(/fixed inset-0/g)).toBeLessThanOrEqual(1)
  })

  // The two left are inside that same printable checklist.
  it('does not add a table', () => {
    expect(countInFieldScreens(/<table\b/g)).toBeLessThanOrEqual(2)
  })
})

describe('viewport units', () => {
  // vh and min-h-screen run past the visible screen when a phone's browser bars show.
  it('uses dvh in class names', () => {
    const offenders = allSourceFiles(SRC).filter(file =>
      /\bmin-h-screen\b|\b(?:min-h|max-h|h)-\[\d+vh\]|\bh-screen\b/.test(readFileSync(file, 'utf-8'))
    )
    expect(offenders).toEqual([])
  })
})
