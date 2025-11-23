import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatInspectionDate,
  formatInspectionTime,
  isToday,
  isPast,
  isFuture,
  daysBetween,
  formatRelativeTime,
  getCurrentDate,
  getCurrentTime
} from '@/lib/date-utils'

describe('Date Utility Functions', () => {
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

  describe('isPast', () => {
    it('should return true for dates in the past', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)
      expect(isPast(pastDate.toISOString())).toBe(true)
    })

    it('should return false for dates in the future', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      expect(isPast(futureDate.toISOString())).toBe(false)
    })
  })

  describe('isFuture', () => {
    it('should return true for dates in the future', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      expect(isFuture(futureDate.toISOString())).toBe(true)
    })

    it('should return false for dates in the past', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)
      expect(isFuture(pastDate.toISOString())).toBe(false)
    })
  })

  describe('daysBetween', () => {
    it('should calculate days between two dates', () => {
      const date1 = '2025-01-01T00:00:00Z'
      const date2 = '2025-01-08T00:00:00Z'
      expect(daysBetween(date1, date2)).toBe(7)
    })

    it('should return 0 for the same date', () => {
      const date = '2025-01-01T00:00:00Z'
      expect(daysBetween(date, date)).toBe(0)
    })

    it('should work regardless of date order', () => {
      const date1 = '2025-01-01T00:00:00Z'
      const date2 = '2025-01-08T00:00:00Z'
      expect(daysBetween(date1, date2)).toBe(daysBetween(date2, date1))
    })

    it('should handle different months', () => {
      const date1 = '2025-01-31T00:00:00Z'
      const date2 = '2025-02-28T00:00:00Z'
      const days = daysBetween(date1, date2)
      expect(days).toBeGreaterThan(0)
      expect(days).toBeLessThan(31)
    })
  })

  describe('formatRelativeTime', () => {
    it('should format recent times correctly', () => {
      const now = Date.now()
      const twoMinutesAgo = new Date(now - 2 * 60 * 1000)
      const result = formatRelativeTime(twoMinutesAgo.toISOString())
      expect(result).toContain('minute')
    })

    it('should format hours ago correctly', () => {
      const now = Date.now()
      const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000)
      const result = formatRelativeTime(twoHoursAgo.toISOString())
      expect(result).toContain('hour')
    })

    it('should format days ago correctly', () => {
      const now = Date.now()
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000)
      const result = formatRelativeTime(threeDaysAgo.toISOString())
      expect(result).toContain('day')
    })

    it('should return a string', () => {
      const now = Date.now()
      const pastDate = new Date(now - 1000)
      const result = formatRelativeTime(pastDate.toISOString())
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('getCurrentDate', () => {
    it('should return current date in ISO format', () => {
      const result = getCurrentDate()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should be parseable as a date', () => {
      const result = getCurrentDate()
      const date = new Date(result)
      expect(date).toBeInstanceOf(Date)
      expect(date.toString()).not.toBe('Invalid Date')
    })
  })

  describe('getCurrentTime', () => {
    it('should return current time in HH:MM format', () => {
      const result = getCurrentTime()
      expect(result).toMatch(/^\d{2}:\d{2}$/)
    })

    it('should have valid hour and minute values', () => {
      const result = getCurrentTime()
      const [hour, minute] = result.split(':').map(Number)
      expect(hour).toBeGreaterThanOrEqual(0)
      expect(hour).toBeLessThan(24)
      expect(minute).toBeGreaterThanOrEqual(0)
      expect(minute).toBeLessThan(60)
    })
  })
})
