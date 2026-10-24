import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { entranceRelation } from '@/components/apiaries/HiveInspectorPanel'
import type { MapHive } from '@/hooks/useApiaryMap'

/**
 * The entrance direction must use the apiary's real proportions (C7a-15). Positions are stored as
 * % of width and % of depth, which are different distances unless the apiary is square.
 */

const hive = (rotation: number) => ({ map_x: 50, map_y: 50, rotation_deg: rotation }) as unknown as MapHive

describe('entranceRelation', () => {
  // 20 m × 10 m apiary; entrance 10% right (2 m) and 10% forward (1 m): true bearing 63.4°
  const wide = { widthUnits: 40, depthUnits: 20 }
  const entrance = { x: 60, y: 40 }

  it('uses real distances on a non-square apiary', () => {
    // Facing 95°: 31.6° off the true bearing (towards). On raw %, 45° gave a 50° gap ("left").
    expect(entranceRelation(hive(95), entrance, wide)).toBe('Faces towards the apiary entrance')
  })

  it('still reads left and right correctly', () => {
    expect(entranceRelation(hive(160), entrance, wide)).toBe('Apiary entrance is to its left')
    expect(entranceRelation(hive(330), entrance, wide)).toBe('Apiary entrance is to its right')
  })

  it('needs a placed, turned hive and an entrance', () => {
    expect(entranceRelation(hive(95), null, wide)).toBeNull()
  })
})
