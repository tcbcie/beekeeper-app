// BeeBreed-style composite queen identifier: Country-Breeder-QueenNumber-Year,
// e.g. "IE-RZ-7W-2026". Derived (not stored) so it always reflects current data.
//
// Breeder segment = the breeder's registered code when set, else initials of their name
// (matching the existing batch-code convention, e.g. the "RZ" in TQRQB_RZ01). Country
// reflects the holding account and is omitted for distributed queens (breeder country
// unknown to the recipient).

import { fullYearFromDate } from './lineage'

export function initialsFromName(name?: string | null): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export interface QueenCodeParts {
  country?: string | null       // 'IE' | 'GB' | '' (omitted when unknown)
  breederCode?: string | null   // registered code; preferred over initials
  breederName?: string | null   // fallback source for initials
  queenNumber?: string | null
  year?: number | string | null
}

export function buildQueenCode(p: QueenCodeParts): string {
  const breeder = p.breederCode && p.breederCode.trim()
    ? p.breederCode.trim().toUpperCase()
    : initialsFromName(p.breederName)
  return [
    (p.country || '').toUpperCase(),
    breeder,
    (p.queenNumber || '').trim(),
    p.year ? String(p.year) : '',
  ].filter(Boolean).join('-')
}

export interface BreederContext {
  breederCode?: string | null
  name?: string | null
  isUkNi?: boolean | null
}

interface QueenCodeInput {
  distributed_by_name?: string | null
  queen_number?: string | null
  birth_date?: string | null
}

// Build the composite code for a queen given the queen owner's breeder context. For
// distributed queens the original breeder's name drives the (initials) segment and the
// country is omitted, since the breeder's registered code/country are not known locally.
//
// `ctx` MUST belong to the queen's owner. Callers viewing a home-bred queen they do not own
// should pass `null`: rather than stamp the viewer's identity onto someone else's queen, we
// return an empty string (no code) when the breeder is unknown.
export function queenCodeFor(queen: QueenCodeInput, ctx: BreederContext | null): string {
  const distributed = !!queen.distributed_by_name
  const breederName = distributed ? queen.distributed_by_name : ctx?.name
  const breederCode = distributed ? '' : (ctx?.breederCode ?? '')

  // No breeder identity available — don't fabricate a code from defaults.
  if (!distributed && !breederCode && !breederName) return ''

  return buildQueenCode({
    country: distributed ? '' : (ctx?.isUkNi ? 'GB' : 'IE'),
    breederCode,
    breederName,
    queenNumber: queen.queen_number,
    year: fullYearFromDate(queen.birth_date),
  })
}
