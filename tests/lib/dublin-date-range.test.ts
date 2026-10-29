import { describe, it, expect } from 'vitest'
import { isIsoDate, customRangeError } from '@/lib/dublin-date'

// The scale routes check custom dates before calling BEEP or Wolf (C2-08).
describe('isIsoDate', () => {
  it('accepts real YYYY-MM-DD dates', () => {
    expect(isIsoDate('2026-10-29')).toBe(true)
    expect(isIsoDate('2024-02-29')).toBe(true)
  })

  it('refuses impossible dates, other formats and empty values', () => {
    expect(isIsoDate('2026-02-31')).toBe(false)
    expect(isIsoDate('2025-02-29')).toBe(false)
    expect(isIsoDate('29/10/2026')).toBe(false)
    expect(isIsoDate('abc')).toBe(false)
    expect(isIsoDate('')).toBe(false)
    expect(isIsoDate(null)).toBe(false)
  })
})

describe('customRangeError', () => {
  it('accepts a range of up to a year, including a single day', () => {
    expect(customRangeError('2026-10-01', '2026-10-29')).toBeNull()
    expect(customRangeError('2026-10-29', '2026-10-29')).toBeNull()
    expect(customRangeError('2025-10-29', '2026-10-29')).toBeNull()
  })

  it('refuses bad dates, a back-to-front range and more than a year', () => {
    expect(customRangeError('abc', '2026-10-29')).toMatch(/real dates/)
    expect(customRangeError('2026-10-29', null)).toMatch(/real dates/)
    expect(customRangeError('2026-10-29', '2026-10-01')).toMatch(/on or before/)
    expect(customRangeError('2016-01-01', '2026-10-29')).toMatch(/at most 366 days/)
  })
})
