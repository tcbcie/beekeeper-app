import { describe, it, expect, vi } from 'vitest'

/**
 * Mel's record lookup (C9b-15): "1" must never quietly become Hive 12. An exact match wins, a
 * single partial match is fine, and several partial matches raise a "which one?" question.
 */

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
})
vi.mock('@/lib/server/api-auth', () => ({ getServiceSupabase: vi.fn() }))

import { resolveByLabel, AmbiguousMatchError, ToolLookupError } from '@/lib/ai/tools/utils'

type Hive = { hive_number: string }
const HIVES: Hive[] = ['1', '10', '12', '3'].map(n => ({ hive_number: n }))

// A stand-in for the database: ilike with % as "contains", without it as "equals".
function fakeQuery(rows: Hive[]) {
  return vi.fn(async (pattern: string, limit: number) => {
    const contains = pattern.startsWith('%')
    const text = pattern.replace(/%/g, '').toLowerCase()
    const data = rows
      .filter(r => (contains ? r.hive_number.toLowerCase().includes(text) : r.hive_number.toLowerCase() === text))
      .slice(0, limit)
    return { data, error: null }
  })
}

const describeHive = (row: Hive) => `Hive ${row.hive_number}`

describe('resolveByLabel', () => {
  it('prefers the exact match over longer numbers that contain it', async () => {
    const run = fakeQuery(HIVES)
    expect(await resolveByLabel('hive', '1', run, describeHive)).toEqual({ hive_number: '1' })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('accepts a partial match when it is the only one', async () => {
    const run = fakeQuery([{ hive_number: 'Orchard 3' }, { hive_number: '12' }])
    expect(await resolveByLabel('hive', 'orchard', run, describeHive)).toEqual({ hive_number: 'Orchard 3' })
  })

  it('asks which one when several partial matches fit', async () => {
    const run = fakeQuery([{ hive_number: '10' }, { hive_number: '12' }])
    await expect(resolveByLabel('hive', '1', run, describeHive)).rejects.toThrow(AmbiguousMatchError)
    await expect(resolveByLabel('hive', '1', run, describeHive)).rejects.toThrow('Hive 10, Hive 12')
  })

  it('returns null when nothing matches', async () => {
    expect(await resolveByLabel('hive', '99', fakeQuery(HIVES), describeHive)).toBeNull()
  })

  it('reports a database failure instead of "not found"', async () => {
    const run = vi.fn(async () => ({ data: null, error: { message: 'boom' } }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(resolveByLabel('hive', '1', run, describeHive)).rejects.toThrow(ToolLookupError)
  })
})
