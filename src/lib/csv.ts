// Minimal CSV helpers for client-side data export (bookkeeping, spreadsheets).

type CsvValue = string | number | null | undefined

function escapeCsvField(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  let s = String(value)
  // Mitigate CSV/formula injection: a leading =, +, -, @ (or control char) can
  // be executed as a formula in Excel/Sheets. Neutralise with a leading quote.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
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
