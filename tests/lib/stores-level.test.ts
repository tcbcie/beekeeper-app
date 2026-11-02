import { describe, it, expect } from 'vitest'
import { storesBand, storesSeasonStart, storesWord } from '@/lib/stores-level'

describe('storesBand', () => {
  it('puts each boundary in the better band', () => {
    expect(storesBand(0)).toBe('low')
    expect(storesBand(39)).toBe('low')
    expect(storesBand(40)).toBe('top_up')
    expect(storesBand(79)).toBe('top_up')
    expect(storesBand(80)).toBe('enough')
    expect(storesBand(100)).toBe('enough')
  })

  it('gives each band its word', () => {
    expect(storesWord(25)).toBe('Low')
    expect(storesWord(65)).toBe('Top up')
    expect(storesWord(90)).toBe('Enough')
  })
})

describe('storesSeasonStart', () => {
  it('starts on 1 August this year from August to December', () => {
    expect(storesSeasonStart('2026-08-01')).toBe('2026-08-01')
    expect(storesSeasonStart('2026-12-31')).toBe('2026-08-01')
  })

  it('keeps last August until the end of April', () => {
    expect(storesSeasonStart('2027-01-01')).toBe('2026-08-01')
    expect(storesSeasonStart('2027-04-30')).toBe('2026-08-01')
  })

  it('is out of season from May to July', () => {
    expect(storesSeasonStart('2027-05-01')).toBeNull()
    expect(storesSeasonStart('2027-07-31')).toBeNull()
  })
})
