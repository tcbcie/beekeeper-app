'use client'

import { ReactNode } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Column<T = any> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

interface ReportTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
}

// Shown instead of the table when the report's data failed to load, so a failure never reads as "no records".
export function ReportLoadError() {
  return (
    <div role="alert" className="text-center py-8 text-red-700 dark:text-red-300">
      Couldn&apos;t load this report. Check your connection and try again.
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ReportTable<T = any>({
  columns,
  data,
  emptyMessage = 'No data available'
}: ReportTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full print-table">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`px-4 py-3 text-left text-sm font-semibold text-foreground bg-surface-secondary ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-border hover:bg-surface-secondary"
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`px-4 py-3 text-sm text-foreground ${col.className || ''}`}
                >
                  {col.render
                    ? col.render(row)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    : String((row as any)[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
