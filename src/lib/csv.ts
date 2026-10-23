// Minimal CSV helpers for client-side data export (bookkeeping, spreadsheets).

// Any cell value: text, numbers, booleans, dates, or lists/objects (written as JSON).
type CsvValue = unknown

// A plain number such as -8.12 (an Irish longitude, a sub-zero temperature) or the
// "-" placeholder. Spreadsheets don't run these as formulas, and a leading quote
// would turn the number into text, so the formula guard leaves them alone.
const PLAIN_NUMBER = /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i

export function escapeCsvField(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  // An invalid Date would make toISOString() throw and abort the whole export.
  let s = value instanceof Date ? (Number.isNaN(value.getTime()) ? '' : value.toISOString())
    : typeof value === 'object' ? JSON.stringify(value)
    : String(value)
  // Mitigate CSV/formula injection: a leading =, +, -, @ (or control char) can
  // be executed as a formula in Excel/Sheets. Neutralise with a leading quote.
  if (/^[=+\-@\t\r]/.test(s) && s !== '-' && !PLAIN_NUMBER.test(s)) s = `'${s}`
  // Quote fields containing a delimiter, quote, or newline; double inner quotes.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Build a CSV string (CRLF line endings, Excel-friendly) from headers + rows. */
export function toCsv(headers: string[], rows: CsvValue[][]): string {
  return [headers, ...rows]
    .map((row) => row.map(escapeCsvField).join(','))
    .join('\r\n')
}

/** Trigger a browser download of `csv` as `filename`. */
export function downloadCsv(filename: string, csv: string): void {
  // Prepend a UTF-8 BOM (﻿) so Excel reads accented characters correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
