/**
 * Utility functions for exporting data to CSV format
 */

/**
 * Converts an array of objects to CSV format and triggers download
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param columns - Optional array of column names to include (defaults to all keys)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToCSV<T extends object = any>(
  data: T[],
  filename: string,
  columns?: Array<keyof T | string>
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Determine which columns to include
  const headers = columns || Object.keys(data[0])

  // Create CSV header row
  const headerRow = headers.map(header => `"${String(header)}"`).join(',')

  // Create CSV data rows
  const dataRows = data.map(row =>
    headers.map(header => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (row as any)[header]
      // Handle null/undefined
      if (value === null || value === undefined) return '""'
      // Handle dates
      if (value instanceof Date) return `"${value.toISOString()}"`
      // Handle strings with quotes or commas
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '""')}"` // Escape quotes
      }
      // Handle numbers and booleans
      return `"${String(value)}"`
    }).join(',')
  )

  // Combine header and data
  const csvContent = [headerRow, ...dataRows].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    // Create download link
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }
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
    const html2canvas = (await import('html2canvas')).default

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    })

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    const dataUrl = canvas.toDataURL(mimeType, 0.95)

    const link = document.createElement('a')
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.${format}`
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
