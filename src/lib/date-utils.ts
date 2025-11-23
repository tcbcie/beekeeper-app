/**
 * Date utility functions for the Beekeeper app
 */

/**
 * Format a date in Irish locale (DD/MM/YYYY)
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatInspectionDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Format time in Irish locale (24-hour format)
 * @param dateString - ISO date string
 * @returns Formatted time string (HH:MM)
 */
export function formatInspectionTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Check if a date is today
 * @param dateString - ISO date string
 * @returns true if the date is today, false otherwise
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Check if a date is in the past
 * @param dateString - ISO date string
 * @returns true if the date is in the past, false otherwise
 */
export function isPast(dateString: string): boolean {
  return new Date(dateString) < new Date()
}

/**
 * Check if a date is in the future
 * @param dateString - ISO date string
 * @returns true if the date is in the future, false otherwise
 */
export function isFuture(dateString: string): boolean {
  return new Date(dateString) > new Date()
}

/**
 * Get the number of days between two dates
 * @param date1 - First date (ISO string)
 * @param date2 - Second date (ISO string)
 * @returns Number of days between the dates
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format a relative time (e.g., "2 days ago", "in 3 weeks")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  if (diffWeek < 4) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`
  if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`
  return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`
}

/**
 * Get current date in ISO format (YYYY-MM-DD)
 * @returns Current date string
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get current time in HH:MM format
 * @returns Current time string
 */
export function getCurrentTime(): string {
  return new Date().toTimeString().slice(0, 5)
}
