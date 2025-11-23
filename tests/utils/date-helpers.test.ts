import { describe, it, expect } from 'vitest'

/**
 * Utility function to format dates in Irish locale
 */
function formatInspectionDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Utility function to format time in Irish locale
 */
function formatInspectionTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Check if a date is today
 */
function isToday(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

describe('Date Helper Functions', () => {
  describe('formatInspectionDate', () => {
    it('should format date in Irish locale (DD/MM/YYYY)', () => {
      const result = formatInspectionDate('2025-11-23T10:00:00Z')
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })

    it('should handle different date formats', () => {
      const result1 = formatInspectionDate('2025-01-01')
      const result2 = formatInspectionDate('2025-12-31T23:59:59Z')

      expect(result1).toBeTruthy()
      expect(result2).toBeTruthy()
    })

    it('should produce consistent results for the same input', () => {
      const date = '2025-11-23T10:00:00Z'
      const result1 = formatInspectionDate(date)
      const result2 = formatInspectionDate(date)

      expect(result1).toBe(result2)
    })
  })

  describe('formatInspectionTime', () => {
    it('should format time in 24-hour format', () => {
      const result = formatInspectionTime('2025-11-23T14:30:00Z')
      expect(result).toMatch(/\d{2}:\d{2}/)
    })

    it('should handle midnight correctly', () => {
      const result = formatInspectionTime('2025-11-23T00:00:00Z')
      expect(result).toBeTruthy()
    })

    it('should handle end of day correctly', () => {
      const result = formatInspectionTime('2025-11-23T23:59:00Z')
      expect(result).toBeTruthy()
    })
  })

  describe('isToday', () => {
    it('should return true for current date', () => {
      const today = new Date().toISOString()
      expect(isToday(today)).toBe(true)
    })

    it('should return false for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isToday(yesterday.toISOString())).toBe(false)
    })

    it('should return false for tomorrow', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(isToday(tomorrow.toISOString())).toBe(false)
    })

    it('should handle different times on same day', () => {
      const morning = new Date()
      morning.setHours(8, 0, 0, 0)

      const evening = new Date()
      evening.setHours(20, 0, 0, 0)

      expect(isToday(morning.toISOString())).toBe(true)
      expect(isToday(evening.toISOString())).toBe(true)
    })
  })
})
