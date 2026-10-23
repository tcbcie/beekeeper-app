import { getCurrentDate } from '@/lib/date-utils'
import { downloadCsv, toCsv } from '@/lib/csv'

/**
 * Utility functions for exporting data to CSV format
 */

/**
 * Converts an array of objects to CSV format and triggers download
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param columns - Optional array of column names to include (defaults to all keys)
 */
export function exportToCSV<T extends object>(
  data: T[],
  filename: string,
  columns?: Array<keyof T | string>
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  const headers = (columns || Object.keys(data[0])).map(String)
  // The shared helper quotes cells, neutralises formulas (a report can hold a
  // team-mate's text) and adds the BOM Excel needs for accented letters.
  const rows = data.map(row => headers.map(header => (row as Record<string, unknown>)[header]))
  downloadCsv(`${filename}-${getCurrentDate()}.csv`, toCsv(headers, rows))
}

/**
 * Triggers browser print dialog
 */
export function printReport(): void {
  window.print()
}

/**
 * Exports an HTML element as a PNG/JPEG image
 * @param element - The HTML element to capture
 * @param filename - Name of the file (without extension)
 * @param format - Image format ('png' or 'jpeg')
 */
export async function exportToImage(
  element: HTMLElement,
  filename: string,
  format: 'png' | 'jpeg' = 'png'
): Promise<void> {
  try {
    const htmlToImage = await import('html-to-image')

    // Temporarily hide scrollbars
    const style = document.createElement('style')
    style.textContent = `
      .export-capture, .export-capture * {
        overflow: visible !important;
        scrollbar-width: none !important;
      }
      .export-capture::-webkit-scrollbar, .export-capture *::-webkit-scrollbar {
        display: none !important;
      }
    `
    document.head.appendChild(style)
    element.classList.add('export-capture')

    const dataUrl = format === 'jpeg'
      ? await htmlToImage.toJpeg(element, { quality: 0.95, backgroundColor: '#ffffff' })
      : await htmlToImage.toPng(element, { backgroundColor: '#ffffff' })

    // Restore scrollbars
    element.classList.remove('export-capture')
    document.head.removeChild(style)

    const link = document.createElement('a')
    link.download = `${filename}-${getCurrentDate()}.${format}`
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('Failed to export image:', error)
    throw error
  }
}

/**
 * Format a value for CSV export (used for custom formatting)
 */
export function formatForCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().split('T')[0]
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toString()
  return String(value)
}
