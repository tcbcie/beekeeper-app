import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase before importing changelog
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn()
    }
  }
}))

import {
  getEntryTypeIcon,
  getEntryTypeColor,
  formatChangelogDate,
  type ChangelogEntry
} from '@/lib/changelog'

describe('Changelog Utilities', () => {
  describe('getEntryTypeIcon', () => {
    it('should return star icon for feature', () => {
      expect(getEntryTypeIcon('feature')).toBe('★')
    })

    it('should return checkmark icon for bugfix', () => {
      expect(getEntryTypeIcon('bugfix')).toBe('✓')
    })

    it('should return lightning icon for improvement', () => {
      expect(getEntryTypeIcon('improvement')).toBe('⚡')
    })

    it('should return wrench icon for documentation', () => {
      expect(getEntryTypeIcon('documentation')).toBe('🔧')
    })

    it('should return bullet point for unknown type', () => {
      expect(getEntryTypeIcon('unknown')).toBe('•')
      expect(getEntryTypeIcon('')).toBe('•')
      expect(getEntryTypeIcon('random-type')).toBe('•')
    })
  })

  describe('getEntryTypeColor', () => {
    it('should return emerald color for feature', () => {
      expect(getEntryTypeColor('feature')).toBe('text-emerald-600')
    })

    it('should return green color for bugfix', () => {
      expect(getEntryTypeColor('bugfix')).toBe('text-green-600')
    })

    it('should return blue color for improvement', () => {
      expect(getEntryTypeColor('improvement')).toBe('text-blue-600')
    })

    it('should return purple color for documentation', () => {
      expect(getEntryTypeColor('documentation')).toBe('text-purple-600')
    })

    it('should return gray color for unknown type', () => {
      expect(getEntryTypeColor('unknown')).toBe('text-gray-600')
      expect(getEntryTypeColor('')).toBe('text-gray-600')
      expect(getEntryTypeColor('random-type')).toBe('text-gray-600')
    })
  })

  describe('formatChangelogDate', () => {
    it('should format ISO date string correctly', () => {
      const result = formatChangelogDate('2025-01-15T10:00:00Z')
      expect(result).toBe('January 15, 2025')
    })

    it('should format date-only string correctly', () => {
      const result = formatChangelogDate('2025-03-20')
      expect(result).toContain('March')
      expect(result).toContain('2025')
    })

    it('should handle different date formats', () => {
      const result1 = formatChangelogDate('2025-11-23')
      const result2 = formatChangelogDate('2025-11-23T12:30:00Z')

      // Both should contain the month and year
      expect(result1).toContain('November')
      expect(result1).toContain('2025')
      expect(result2).toContain('November')
      expect(result2).toContain('2025')
    })

    it('should handle leap year dates', () => {
      const result = formatChangelogDate('2024-02-29')
      expect(result).toBe('February 29, 2024')
    })

    it('should format US locale correctly', () => {
      const result = formatChangelogDate('2025-12-31')
      expect(result).toBe('December 31, 2025')
    })
  })
})
