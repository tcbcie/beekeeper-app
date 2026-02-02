'use client'

import { Download, Printer, Image as ImageIcon } from 'lucide-react'

interface ReportExportBarProps {
  onExportCSV: () => void
  onPrint: () => void
  onExportImage?: () => void
  disabled?: boolean
}

export default function ReportExportBar({
  onExportCSV,
  onPrint,
  onExportImage,
  disabled = false
}: ReportExportBarProps) {
  return (
    <div className="flex flex-wrap gap-2 no-print">
      <button
        onClick={onExportCSV}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Download size={18} />
        Export CSV
      </button>
      <button
        onClick={onPrint}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-sage-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Printer size={18} />
        Print / PDF
      </button>
      {onExportImage && (
        <button
          onClick={onExportImage}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-sage-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ImageIcon size={18} />
          Export Image
        </button>
      )}
    </div>
  )
}
