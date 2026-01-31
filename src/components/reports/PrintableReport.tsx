'use client'

import { ReactNode } from 'react'

interface PrintableReportProps {
  title: string
  subtitle?: string
  beekeeperName?: string
  dateRange?: string
  children: ReactNode
}

export default function PrintableReport({
  title,
  subtitle,
  beekeeperName,
  dateRange,
  children
}: PrintableReportProps) {
  return (
    <div className="print-container">
      {/* Header - visible in print */}
      <div className="mb-6 pb-4 border-b border-border print-header">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-text-secondary mt-1">{subtitle}</p>
        )}
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-text-secondary">
          {beekeeperName && (
            <span>Beekeeper: <strong>{beekeeperName}</strong></span>
          )}
          {dateRange && (
            <span>Period: <strong>{dateRange}</strong></span>
          )}
          <span>Generated: <strong>{new Date().toLocaleDateString('en-GB')}</strong></span>
        </div>
      </div>

      {/* Report Content */}
      {children}
    </div>
  )
}
