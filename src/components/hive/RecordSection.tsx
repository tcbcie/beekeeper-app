'use client'

import { ReactNode, useState } from 'react'
import { LucideIcon } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useIsPhone } from '@/hooks/useIsPhone'

/** A hive's full history ran to about 25 phone screens, so a phone starts with the latest few. */
const PHONE_RECORD_LIMIT = 3

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
  const isPhone = useIsPhone()
  const [showAll, setShowAll] = useState(false)
  const visible = isPhone && !showAll ? records.slice(0, PHONE_RECORD_LIMIT) : records

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-4 md:p-6 border border-border">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
        <Icon size={24} className={iconColor} />
        {title} ({records.length})
      </h2>
      {records.length > 0 ? (
        <div className="space-y-3">
          {visible.map((record) => renderRecord(record))}
          {visible.length < records.length && (
            <Button tone="neutral" fullWidth onClick={() => setShowAll(true)}>
              Show all {records.length}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-text-tertiary text-center py-4">{emptyMessage}</p>
      )}
    </div>
  )
}
