import { describe, expect, it, vi } from 'vitest'
import type { Hive } from '@/types/hive'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { isConfigurationChanged } from '@/components/hive/HiveFormSection'

// Keys in the order Postgres returns jsonb (shortest first), and without the frame-count
// keys the form fills in with defaults: the shape that made every save look like a change.
const hive = {
  id: 'hive-1',
  hive_number: 'H1',
  configuration: {
    feeder: false,
    hive_size: 'full',
    brood_boxes: 2,
    honey_supers: 1,
    queen_excluder: true,
  },
} as unknown as Hive

// The same configuration as the edit form holds it, in the form's key order.
const formConfiguration = {
  brood_boxes: 2,
  brood_boxes_full: 2,
  brood_boxes_half: 0,
  frames_per_full_box: 10,
  frames_per_half_box: 10,
  honey_supers: 1,
  queen_excluder: true,
  feeder: false,
  feeder_type: '',
  entrance_reducer: false,
  varroa_mesh_floor: 'closed',
  right_sized_broodbox: false,
  frame_orientation: null,
  hive_size: 'full' as const,
}

describe('isConfigurationChanged', () => {
  it('ignores key order and defaulted keys', () => {
    expect(isConfigurationChanged(hive, formConfiguration)).toBe(false)
  })

  it('reports a real change', () => {
    expect(isConfigurationChanged(hive, { ...formConfiguration, honey_supers: 2 })).toBe(true)
  })
})
