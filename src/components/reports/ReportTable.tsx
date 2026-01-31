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
                className={`px-4 py-3 text-left text-sm font-semibold text-foreground bg-sage-50 dark:bg-slate-800 ${col.className || ''}`}
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
              className="border-b border-border hover:bg-sage-50 dark:hover:bg-slate-800/50"
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
