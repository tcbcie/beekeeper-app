'use client'

import { Archive } from 'lucide-react'
import type { ArchiveRecord } from '@/types/records'

interface ArchiveCardProps {
  archiveRecord: ArchiveRecord
}

export default function ArchiveCard({ archiveRecord }: ArchiveCardProps) {
  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-6 border-l-4 border-forest-500 dark:border-forest-500">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Icon Badge */}
          <div className="w-12 h-12 flex-shrink-0 bg-surface-secondary rounded-lg flex items-center justify-center">
            <Archive size={24} className="text-text-tertiary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold">Hive Archived: {archiveRecord.hive_number}</h3>
            <p className="text-sm text-text-tertiary">
              {new Date(archiveRecord.archived_at).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              {' at '}
              {new Date(archiveRecord.archived_at).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
            </p>
          </div>
        </div>
      </div>

      {archiveRecord.archive_reason_value && (
        <div className="p-4 bg-surface/50 dark:bg-surface-elevated rounded-lg border border-border mb-3">
          <span className="text-xs text-text-tertiary mb-1 block">Reason</span>
          <span className="text-sm font-medium text-foreground">{archiveRecord.archive_reason_value}</span>
        </div>
      )}

      {archiveRecord.archive_notes && (
        <div className="p-4 bg-surface/50 dark:bg-surface-elevated rounded-lg border border-border">
          <span className="text-xs text-text-tertiary mb-1 block">Additional Notes</span>
          <span className="text-sm text-text-secondary">{archiveRecord.archive_notes}</span>
        </div>
      )}
    </div>
  )
}
