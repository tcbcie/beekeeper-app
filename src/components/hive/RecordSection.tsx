'use client'

import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface RecordSectionProps<T> {
  title: string
  icon: LucideIcon
  iconColor: string
  records: T[]
  emptyMessage: string
  renderRecord: (record: T) => ReactNode
}

export function RecordSection<T extends { id: string }>({
  title,
  icon: Icon,
  iconColor,
  records,
  emptyMessage,
  renderRecord,
}: RecordSectionProps<T>) {
  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
        <Icon size={24} className={iconColor} />
        {title} ({records.length})
      </h2>
      {records.length > 0 ? (
        <div className="space-y-3">
          {records.map((record) => renderRecord(record))}
        </div>
      ) : (
        <p className="text-text-tertiary text-center py-4">{emptyMessage}</p>
      )}
    </div>
  )
}
