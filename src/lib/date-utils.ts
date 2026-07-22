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

/**
 * Get the local calendar date in ISO format (YYYY-MM-DD)
 * @param date - Date object in the user's local timezone
 * @returns Local date string
 */
export function toLocalDateString(date: Date): string {
  return date.toLocaleDateString('en-CA')
}

/**
 * Get the local date-time value used by `datetime-local` inputs
 * @param date - Date object in the user's local timezone
 * @returns Local date-time string
 */
export function toLocalDateTimeInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Parse a date-only string as a local calendar day instead of UTC midnight
 * @param dateString - YYYY-MM-DD
 * @returns Local Date object
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get the difference between two local calendar dates in whole days
 * @param fromDate - Start date
 * @param toDate - End date
 * @returns Number of calendar days
 */
export function differenceInCalendarDays(fromDate: Date, toDate: Date): number {
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Format a local date-only string without letting the browser treat it as UTC
 * @param dateString - YYYY-MM-DD
 * @param locale - Output locale
 * @param options - Intl formatting options
 * @returns Formatted date string
 */
export function formatLocalDate(
  dateString: string,
  locale: string = 'en-IE',
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string {
  return parseLocalDate(dateString).toLocaleDateString(locale, options)
}

/**
 * Format an ISO date (or timestamp) as Irish DD/MM/YYYY. Returns '-' for
 * empty values and the raw input when it is not a parseable date.
 * Single source of truth — previously duplicated in four batch components.
 */
export const formatDateIrish = (dateString: string | null): string => {
  if (!dateString) return '-'
  const parts = dateString.split('T')[0].split('-')
  if (parts.length !== 3) return dateString
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

/**
 * Format a Date as YYYY-MM-DD for date input fields. Note: UTC-based
 * (toISOString), kept as-is to preserve existing input behaviour; use
 * toLocalDateString when the local calendar date is required.
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}
