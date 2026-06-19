/**
 * Formats a CRM date string (ISO `YYYY-MM-DD` from PostgREST) for display in
 * British English. Returns an em dash for null/empty/unparseable values so the
 * UI never shows "Invalid Date".
 */
export function formatCrmDate(d: string | null | undefined): string {
  if (!d) return '—'
  const parsed = new Date(d)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('en-GB')
}
