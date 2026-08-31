import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

/**
 * Token-level contrast checks for the Phase 1 accessibility work.
 *
 * These read the real globals.css rather than restating the hex values, so a
 * future edit that lightens a brand shade fails here instead of silently
 * reintroducing an unreadable button.
 */

const css = readFileSync(path.resolve(__dirname, '../../src/app/globals.css'), 'utf-8')

function readToken(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`Token --${name} not found in globals.css`)
  return match[1]
}

function relativeLuminance(hex: string): number {
  const value = parseInt(hex.slice(1), 16)
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  const [r, g, b] = channels.map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la]
  return (lighter + 0.05) / (darker + 0.05)
}

const WHITE = '#ffffff'
const AA_NORMAL = 4.5
const AAA_NORMAL = 7

describe('contrast helper', () => {
  it('matches known reference ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })
})

describe('brand fills that carry white text', () => {
  // The shades Phase 1 moved resting backgrounds onto.
  it.each([
    ['forest-800'],
    ['amber-800'],
  ])('%s clears WCAG AAA against white', (token) => {
    const ratio = contrastRatio(readToken(token), WHITE)
    expect(ratio).toBeGreaterThanOrEqual(AAA_NORMAL)
  })

  // Regression guards: these are the shades that failed and must never be
  // reinstated as a resting background behind white text.
  it.each([
    ['forest-500'],
    ['forest-600'],
    ['amber-500'],
    ['amber-600'],
  ])('%s is known to fail AA against white, so must not be used as a fill', (token) => {
    const ratio = contrastRatio(readToken(token), WHITE)
    expect(ratio).toBeLessThan(AA_NORMAL)
  })
})

describe('shared button tones in globals.css', () => {
  function readToneBackground(tone: string): string {
    const match = css.match(
      new RegExp(`:where\\(\\.fj-btn-${tone}\\)\\s*\\{[^}]*background:\\s*(#[0-9a-fA-F]{6})`)
    )
    if (!match) throw new Error(`.fj-btn-${tone} background not found`)
    return match[1]
  }

  it.each([['success'], ['amber']])(
    '.fj-btn-%s renders white text at AAA',
    (tone) => {
      expect(contrastRatio(readToneBackground(tone), WHITE)).toBeGreaterThanOrEqual(AAA_NORMAL)
    }
  )
})

describe('white-on-fill override block', () => {
  it('covers the light-theme pairings', () => {
    expect(css).toContain('.bg-forest-600.text-white')
    expect(css).toContain('.bg-forest-500.text-white')
    expect(css).toContain('.bg-amber-600.text-white')
    expect(css).toContain('.bg-amber-500.text-white')
  })

  it('restates hover, which Tailwind would otherwise win at equal specificity', () => {
    expect(css).toContain('.bg-forest-600.text-white:hover')
    expect(css).toContain('.bg-amber-600.text-white:hover')
  })

  it('covers dark-variant class tokens, which the plain selectors cannot match', () => {
    // dark:bg-forest-500 is a different class name entirely, so without these
    // the worst pairing in the codebase (2.28:1) survives in dark mode.
    expect(css).toContain('.dark\\:bg-forest-500.text-white')
    expect(css).toContain('.dark\\:bg-amber-500.text-white')
  })
})

describe('dark variant strategy', () => {
  it('binds dark: to the .dark class rather than the OS preference', () => {
    // Tailwind v4 defaults dark: to prefers-color-scheme, which reports the
    // operating system and ignores the in-app theme control.
    expect(css).toContain('@custom-variant dark')
    expect(css).toContain('.dark, .dark *')
  })
})

describe('reduced motion', () => {
  it('declares a reduced-motion block that also disables smooth scrolling', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[\s\S]*scroll-behavior:\s*auto/)
  })

  it('exempts spinners, which communicate loading rather than decoration', () => {
    expect(css).toContain(':not(.animate-spin)')
  })
})

describe('shared control size floors', () => {
  function ruleBody(selector: string): string {
    const index = css.indexOf(selector)
    if (index === -1) throw new Error(`${selector} not found`)
    const open = css.indexOf('{', index)
    const close = css.indexOf('}', open)
    return css.slice(open, close)
  }

  it('normal buttons are at least 48px', () => {
    expect(ruleBody(':where(.fj-btn)')).toContain('min-height: 3rem')
  })

  it('compact buttons are at least 44px', () => {
    expect(ruleBody(':where(.fj-btn-sm)')).toContain('min-height: 2.75rem')
    expect(ruleBody(':where(.fj-btn-xs)')).toContain('min-height: 2.75rem')
  })

  it('compact buttons meet the 14px type floor', () => {
    expect(ruleBody(':where(.fj-btn-sm)')).toContain('font-size: 0.875rem')
    expect(ruleBody(':where(.fj-btn-xs)')).toContain('font-size: 0.875rem')
  })

  it('icon buttons have a 44px hit area', () => {
    const body = ruleBody('.fj-icon-btn {')
    expect(body).toContain('min-width: 2.75rem')
    expect(body).toContain('min-height: 2.75rem')
  })

  it('form controls are at least 48px', () => {
    expect(ruleBody('.fj-control {')).toContain('min-height: 3rem')
  })
})
