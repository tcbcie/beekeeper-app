// BeeBreed-style composite queen identifier: Country-BreederInitials-QueenNumber-Year,
// e.g. "IE-RZ-7W-2026". Derived (not stored) so it always reflects current data.
//
// The country reflects the holding account (omitted for distributed queens, whose breeder
// country is unknown); breeder initials come from the breeder's name (matching the existing
// batch-code convention, e.g. the "RZ" in TQRQB_RZ01).

export function initialsFromName(name?: string | null): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export interface QueenCodeParts {
  country?: string | null       // 'IE' | 'GB' | '' (omitted when unknown)
  breederName?: string | null
  queenNumber?: string | null
  year?: number | string | null
}

export function buildQueenCode(p: QueenCodeParts): string {
  return [
    (p.country || '').toUpperCase(),
    initialsFromName(p.breederName),
    (p.queenNumber || '').trim(),
    p.year ? String(p.year) : '',
  ].filter(Boolean).join('-')
}
