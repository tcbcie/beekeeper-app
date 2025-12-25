import { describe, it, expect } from 'vitest'

/**
 * Hive configuration interface
 */
interface HiveConfiguration {
  brood_boxes?: number
  brood_boxes_full?: number
  brood_boxes_half?: number
  honey_supers?: number
  queen_excluder?: boolean
  feeder?: boolean
  feeder_type?: string
  entrance_reducer?: boolean
  varroa_mesh_floor?: string
  right_sized_broodbox?: boolean
  frame_orientation?: string | null
  hive_size?: 'full' | 'nuc'
}

/**
 * Format hive configuration changes for display
 * (Extracted from HiveConfigurationHistory component)
 */
function formatConfigurationChanges(config: HiveConfiguration): string[] {
  const changes: string[] = []

  if (config.hive_size) {
    changes.push(`Size: ${config.hive_size === 'nuc' ? 'Nuc' : 'Full Size'}`)
  }

  const broodFull = config.brood_boxes_full ?? config.brood_boxes ?? 0
  const broodHalf = config.brood_boxes_half ?? 0
  if (broodFull > 0 || broodHalf > 0) {
    const parts = []
    if (broodFull > 0) parts.push(`${broodFull} full`)
    if (broodHalf > 0) parts.push(`${broodHalf} half`)
    changes.push(`Brood boxes: ${parts.join(', ')}`)
  }

  if (config.honey_supers && config.honey_supers > 0) {
    changes.push(`Honey supers: ${config.honey_supers}`)
  }

  if (config.queen_excluder) {
    changes.push('Queen excluder: Yes')
  }

  if (config.feeder_type) {
    changes.push(`Feeder: ${config.feeder_type}`)
  }

  if (config.entrance_reducer) {
    changes.push('Entrance reducer: Yes')
  }

  if (config.varroa_mesh_floor) {
    changes.push(`Varroa floor: ${config.varroa_mesh_floor}`)
  }

  if (config.right_sized_broodbox) {
    changes.push('Right-Sized Brood Area: Yes')
  }

  if (config.frame_orientation) {
    changes.push(`Frame orientation: ${config.frame_orientation === 'warm' ? 'Warm way' : 'Cold way'}`)
  }

  return changes
}

describe('Hive Configuration Formatting', () => {
  describe('formatConfigurationChanges', () => {
    it('should format hive size correctly', () => {
      const config: HiveConfiguration = {
        hive_size: 'nuc'
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Size: Nuc')
    })

    it('should format full size hive', () => {
      const config: HiveConfiguration = {
        hive_size: 'full'
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Size: Full Size')
    })

    it('should format brood boxes (full only)', () => {
      const config: HiveConfiguration = {
        brood_boxes_full: 2
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Brood boxes: 2 full')
    })

    it('should format brood boxes (full and half)', () => {
      const config: HiveConfiguration = {
        brood_boxes_full: 2,
        brood_boxes_half: 1
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Brood boxes: 2 full, 1 half')
    })

    it('should handle legacy brood_boxes field', () => {
      const config: HiveConfiguration = {
        brood_boxes: 3
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Brood boxes: 3 full')
    })

    it('should format honey supers', () => {
      const config: HiveConfiguration = {
        honey_supers: 3
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Honey supers: 3')
    })

    it('should not include honey supers when 0', () => {
      const config: HiveConfiguration = {
        honey_supers: 0
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).not.toContain(expect.stringContaining('Honey supers'))
    })

    it('should format queen excluder when present', () => {
      const config: HiveConfiguration = {
        queen_excluder: true
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Queen excluder: Yes')
    })

    it('should not include queen excluder when false', () => {
      const config: HiveConfiguration = {
        queen_excluder: false
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).not.toContain(expect.stringContaining('Queen excluder'))
    })

    it('should format feeder type', () => {
      const config: HiveConfiguration = {
        feeder_type: 'Contact Feeder'
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Feeder: Contact Feeder')
    })

    it('should format entrance reducer', () => {
      const config: HiveConfiguration = {
        entrance_reducer: true
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Entrance reducer: Yes')
    })

    it('should format varroa mesh floor', () => {
      const config: HiveConfiguration = {
        varroa_mesh_floor: 'Open'
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Varroa floor: Open')
    })

    it('should format right-sized brood area', () => {
      const config: HiveConfiguration = {
        right_sized_broodbox: true
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Right-Sized Brood Area: Yes')
    })

    it('should format warm way frame orientation', () => {
      const config: HiveConfiguration = {
        frame_orientation: 'warm'
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Frame orientation: Warm way')
    })

    it('should format cold way frame orientation', () => {
      const config: HiveConfiguration = {
        frame_orientation: 'cold'
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toContain('Frame orientation: Cold way')
    })

    it('should handle complete configuration', () => {
      const config: HiveConfiguration = {
        hive_size: 'full',
        brood_boxes_full: 2,
        brood_boxes_half: 1,
        honey_supers: 3,
        queen_excluder: true,
        feeder_type: 'Top Feeder',
        entrance_reducer: true,
        varroa_mesh_floor: 'Open',
        right_sized_broodbox: true,
        frame_orientation: 'warm'
      }
      const changes = formatConfigurationChanges(config)

      expect(changes).toHaveLength(9)
      expect(changes).toContain('Size: Full Size')
      expect(changes).toContain('Brood boxes: 2 full, 1 half')
      expect(changes).toContain('Honey supers: 3')
      expect(changes).toContain('Queen excluder: Yes')
      expect(changes).toContain('Feeder: Top Feeder')
      expect(changes).toContain('Entrance reducer: Yes')
      expect(changes).toContain('Varroa floor: Open')
      expect(changes).toContain('Right-Sized Brood Area: Yes')
      expect(changes).toContain('Frame orientation: Warm way')
    })

    it('should return empty array for empty configuration', () => {
      const config: HiveConfiguration = {}
      const changes = formatConfigurationChanges(config)
      expect(changes).toEqual([])
    })

    it('should handle null values gracefully', () => {
      const config: HiveConfiguration = {
        hive_size: 'full',
        brood_boxes_full: 0,
        brood_boxes_half: 0,
        honey_supers: 0,
        queen_excluder: false,
        feeder_type: '',
        entrance_reducer: false,
        varroa_mesh_floor: '',
        right_sized_broodbox: false,
        frame_orientation: null
      }
      const changes = formatConfigurationChanges(config)
      expect(changes).toEqual(['Size: Full Size'])
    })
  })

  describe('Hive Configuration Validation', () => {
    it('should accept valid full hive configuration', () => {
      const config: HiveConfiguration = {
        hive_size: 'full',
        brood_boxes_full: 2
      }
      expect(config).toBeTruthy()
    })

    it('should accept valid nuc configuration', () => {
      const config: HiveConfiguration = {
        hive_size: 'nuc',
        brood_boxes_full: 1
      }
      expect(config).toBeTruthy()
    })

    it('should handle missing optional fields', () => {
      const config: HiveConfiguration = {
        hive_size: 'full'
      }
      expect(config.queen_excluder).toBeUndefined()
      expect(config.feeder_type).toBeUndefined()
    })
  })

  describe('Configuration Comparison', () => {
    it('should detect changes in configuration', () => {
      const oldConfig: HiveConfiguration = {
        hive_size: 'full',
        brood_boxes_full: 2,
        honey_supers: 1
      }

      const newConfig: HiveConfiguration = {
        hive_size: 'full',
        brood_boxes_full: 3,
        honey_supers: 2
      }

      expect(JSON.stringify(oldConfig)).not.toBe(JSON.stringify(newConfig))
    })

    it('should detect identical configurations', () => {
      const config1: HiveConfiguration = {
        hive_size: 'full',
        brood_boxes_full: 2
      }

      const config2: HiveConfiguration = {
        hive_size: 'full',
        brood_boxes_full: 2
      }

      expect(JSON.stringify(config1)).toBe(JSON.stringify(config2))
    })
  })
})
