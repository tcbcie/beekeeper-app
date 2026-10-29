// Irish calendar dates for server code (API routes, Mel's tools), which runs in UTC. "Today",
// day counts and day boundaries must follow the beekeeper's calendar in Ireland, or they are a
// day out around midnight and an hour out all summer. Client code uses src/lib/date-utils.ts
// (the browser's own zone); the edge functions use supabase/functions/_shared/dublin-time.ts.

export const BEEKEEPER_TIME_ZONE = 'Europe/Dublin'
const dublinDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BEEKEEPER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})
const dublinClockFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: BEEKEEPER_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
})

// Calendar date (YYYY-MM-DD) in Ireland for an instant
export function toDublinDate(instant: Date = new Date()): string {
  return dublinDateFormat.format(instant)
}

// Today's calendar date in Ireland (YYYY-MM-DD)
export function todayInDublin(): string {
  return toDublinDate()
}

// Add whole days to a YYYY-MM-DD date
export function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// How far Irish clock time is ahead of UTC at an instant: 0 in winter, one hour in summer
function dublinOffsetMs(instant: Date): number {
  const parts = Object.fromEntries(dublinClockFormat.formatToParts(instant).map((p) => [p.type, p.value]))
  const wallClockAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  )
  return wallClockAsUtc - (instant.getTime() - instant.getUTCMilliseconds())
}

// The instant an Irish calendar day (YYYY-MM-DD, or an ISO string starting with one) begins:
// 23:00 UTC the day before in summer, 00:00 UTC in winter.
export function dublinDayStartUtc(isoDate: string): Date {
  const midnightAsUtc = Date.parse(`${isoDate.slice(0, 10)}T00:00:00Z`)
  // Offset at the first guess, then once more in case the guess crossed a clock change
  const guess = midnightAsUtc - dublinOffsetMs(new Date(midnightAsUtc))
  return new Date(midnightAsUtc - dublinOffsetMs(new Date(guess)))
}

// A YYYY-MM-DD date that really exists (2026-02-31 is refused, not rolled over to March).
export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}

// What is wrong with a custom date range sent to an API route, or null when it is fine: both
// real dates, start not after end, and at most `maxDays` apart (a year by default).
export function customRangeError(start: string | null, end: string | null, maxDays = 366): string | null {
  if (!isIsoDate(start) || !isIsoDate(end)) return 'Dates must be real dates written as YYYY-MM-DD'
  if (start > end) return 'The start date must be on or before the end date'
  if ((Date.parse(end) - Date.parse(start)) / 86_400_000 > maxDays) return `The range can be at most ${maxDays} days`
  return null
}
