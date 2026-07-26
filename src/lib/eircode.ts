// Eircode (Irish postcode) helpers — single source of truth for validation/normalisation.
//
// An Eircode is 7 characters: a 3-character routing key + a 4-character unique identifier,
// conventionally shown with a space between them (e.g. "H91 E6K2"). The Eircode alphabet
// excludes the easily-confused letters B, G, I, J, L, M, O, Q, S, U and Z. The only routing
// key that is not "letter + two digits" is the Dublin 6W special case, "D6W".
const EIRCODE_REGEX = /^(?:[AC-FHKNPRTV-Y][0-9]{2}|D6W)\s?[0-9AC-FHKNPRTV-Y]{4}$/i

/** Strip whitespace and upper-case, so "h91 e6k2" and "H91E6K2" compare equal. */
export function normaliseEircode(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

/** True when the value is a structurally valid Eircode. Empty/whitespace is treated as invalid. */
export function isValidEircode(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed.length === 0) return false
  return EIRCODE_REGEX.test(trimmed)
}

/**
 * Canonical form: routing key, single space, unique identifier (e.g. "H91ADP9" → "H91 ADP9").
 *
 * Geocoders resolve Eircodes far more reliably in this spaced form than in the run-together form
 * people typically type, so use this whenever an Eircode is sent to an external lookup. Values that
 * are not structurally valid Eircodes are returned trimmed but otherwise untouched.
 */
export function formatEircode(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!isValidEircode(trimmed)) return trimmed
  const compact = normaliseEircode(trimmed)
  return `${compact.slice(0, 3)} ${compact.slice(3)}`
}
