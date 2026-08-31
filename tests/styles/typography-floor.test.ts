import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'

/**
 * Guardrails for the mobile-first typography floor.
 *
 * Two jobs. The first is a stylesheet integrity check: a stray comment
 * delimiter in globals.css silently deletes every rule until the next valid
 * one, with no error reported anywhere. That is how `:where(.above-bottom-nav)`
 * was lost for the whole of Phase 2, taking seven fixed-position surfaces with
 * it on mobile.
 *
 * The second is a ratchet on small text. The counts below are the state after
 * stages T1 to T6; they may fall, never rise. New 12px text fails here rather
 * than accumulating unnoticed, which is exactly how the count reached 971.
 */

const SRC = path.resolve(__dirname, '../../src')
const cssPath = path.resolve(__dirname, '../../src/app/globals.css')
const css = readFileSync(cssPath, 'utf-8')

/**
 * Walks the comment state machine rather than counting delimiters, because a
 * `/*` inside a comment is ordinary text and must not be treated as an opener.
 */
function scanComments(source: string) {
  const strayClosers: number[] = []
  let unclosedOpener = -1
  let inComment = false
  let i = 0

  while (i < source.length - 1) {
    const pair = source[i] + source[i + 1]
    if (!inComment && pair === '/*') {
      inComment = true
      unclosedOpener = i
      i += 2
      continue
    }
    if (inComment && pair === '*/') {
      inComment = false
      unclosedOpener = -1
      i += 2
      continue
    }
    if (!inComment && pair === '*/') {
      strayClosers.push(i)
      i += 2
      continue
    }
    i += 1
  }

  return { strayClosers, unclosedOpener: inComment ? unclosedOpener : -1 }
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) sourceFiles(full, found)
    else if (/\.tsx?$/.test(entry)) found.push(full)
  }
  return found
}

function countMatches(pattern: RegExp): number {
  return sourceFiles(SRC).reduce((total, file) => {
    const matches = readFileSync(file, 'utf-8').match(pattern)
    return total + (matches ? matches.length : 0)
  }, 0)
}

describe('globals.css integrity', () => {
  it('has no comment closer without a matching opener', () => {
    const { strayClosers } = scanComments(css)
    const lines = strayClosers.map((index) => lineOf(css, index))
    expect(
      lines,
      `A stray "*/" makes the CSS parser read everything up to the next "{" as one ` +
        `invalid selector and drop that rule entirely. Lines: ${lines.join(', ')}`,
    ).toEqual([])
  })

  it('has no comment left unclosed', () => {
    const { unclosedOpener } = scanComments(css)
    expect(
      unclosedOpener === -1 ? null : lineOf(css, unclosedOpener),
      'An unclosed "/*" swallows the rest of the stylesheet.',
    ).toBeNull()
  })
})

describe('typography floor in shared primitives', () => {
  const floors: Array<[string, string]> = [
    ['.fj-badge', 'font-size'],
    ['.fj-chip-xs', 'font-size'],
    ['.fj-chip-sm', 'font-size'],
  ]

  it.each(floors)('%s sets a font size of at least 14px', (selector) => {
    const block = css.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))
    expect(block, `${selector} not found in globals.css`).toBeTruthy()
    const size = block![1].match(/font-size:\s*([0-9.]+)rem/)
    expect(size, `${selector} declares no font-size`).toBeTruthy()
    expect(parseFloat(size![1])).toBeGreaterThanOrEqual(0.875)
  })

  const primitives = [
    'components/ui/PageHeader.tsx',
    'components/ui/RadioChoiceGroup.tsx',
    'components/ui/RatingButtons.tsx',
  ]

  it.each(primitives)('%s renders nothing below 14px', (relative) => {
    const source = readFileSync(path.join(SRC, relative), 'utf-8')
    expect(source).not.toMatch(/\btext-xs\b/)
    expect(source).not.toMatch(/text-\[(?:[0-9]|1[0-3])px\]/)
  })
})

describe('small text ratchet', () => {
  // State after T1-T6. These may fall as the deferred long tail is cleaned;
  // raising either means new sub-14px text has been introduced.
  const TEXT_XS_CEILING = 393
  const ARBITRARY_CEILING = 4

  it('does not introduce new text-xs', () => {
    expect(countMatches(/\btext-xs\b/g)).toBeLessThanOrEqual(TEXT_XS_CEILING)
  })

  it('does not introduce new arbitrary sizes below 14px', () => {
    expect(countMatches(/text-\[(?:[0-9]|1[0-3])px\]/g)).toBeLessThanOrEqual(
      ARBITRARY_CEILING,
    )
  })
})
