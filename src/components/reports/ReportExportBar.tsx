'use client'

import { Download, Printer, Image as ImageIcon } from 'lucide-react'
import Button from '@/components/ui/Button'

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
      <Button
        onClick={onExportCSV}
        disabled={disabled}
        tone="success"
        className="inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download size={18} />
        Export CSV
      </Button>
      <Button
        onClick={onPrint}
        disabled={disabled}
        tone="neutral"
        className="inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Printer size={18} />
        Print / PDF
      </Button>
      {onExportImage && (
        <Button
          onClick={onExportImage}
          disabled={disabled}
          tone="neutral"
          className="inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ImageIcon size={18} />
          Export Image
        </Button>
      )}
    </div>
  )
}
