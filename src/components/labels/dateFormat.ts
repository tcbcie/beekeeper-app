// Returns a UK-formatted day-month-year ("02 May 2026") for ISO date strings.
// Accepts plain DB dates ("YYYY-MM-DD") and full ISO timestamps. Appending
// "T00:00:00" to bare dates avoids the UTC-midnight gotcha where dates in
// negative-offset locales render as the previous day. Invalid / empty input
// returns null so callers can skip the label line instead of printing
// "Invalid Date".
export function formatDateGB(input: string | null | undefined): string | null {
  if (!input) return null
  const normalised = input.includes('T') ? input : `${input}T00:00:00`
  const parsed = new Date(normalised)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
