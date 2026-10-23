// Irish (Europe/Dublin) dates and times for the edge functions, which run in UTC. Task dates
// and times are entered as Irish wall-clock values, so they must be read in this time zone.
// The app side has the same rules in src/lib/dublin-date.ts.

const TIME_ZONE = 'Europe/Dublin'

/** The date in Ireland at a moment (default now), as YYYY-MM-DD. */
export function dublinDate(at: Date = new Date()): string {
  return at.toLocaleDateString('en-CA', { timeZone: TIME_ZONE })
}

/** A YYYY-MM-DD date plus a number of days (calendar arithmetic, no time zone involved). */
export function addDaysISO(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// How far Irish clock time is ahead of UTC at a moment: 0 in winter, one hour in summer.
function dublinOffsetMs(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE,
      hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(at).map((part) => [part.type, part.value])
  )
  const wallClockAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  )
  return wallClockAsUtc - (at.getTime() - at.getUTCMilliseconds())
}

/** The real moment of an Irish date and time (HH:MM), correct in summer and winter. */
export function dublinLocalToInstant(isoDate: string, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const wallClockAsUtc = Date.UTC(
    Number(isoDate.slice(0, 4)), Number(isoDate.slice(5, 7)) - 1, Number(isoDate.slice(8, 10)),
    hours || 0, minutes || 0
  )
  // Take the offset at the first guess, then once more in case the guess crossed a clock change.
  const guess = wallClockAsUtc - dublinOffsetMs(new Date(wallClockAsUtc))
  return new Date(wallClockAsUtc - dublinOffsetMs(new Date(guess)))
}

/** DD/MM/YYYY from a YYYY-MM-DD date, without a Date object (so no time zone shift). */
export function formatDateIrish(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}
