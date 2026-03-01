'use client'

import { Edit2, Trash2, Wheat } from 'lucide-react'
import type { Feeding } from '@/types/records'
import IconButton from '@/components/ui/IconButton'

interface FeedingCardProps {
  feeding: Feeding
  userId: string | null
  sharedHiveIds: string[]
  onEdit: (feeding: Feeding) => void
  onDelete: (feeding: Feeding) => void
}

export default function FeedingCard({
  feeding,
  userId,
  sharedHiveIds,
  onEdit,
  onDelete
}: FeedingCardProps) {
  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-3 border-l-4 border-yellow-500">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-start gap-2 flex-1">
          {/* Icon Badge */}
          <div className="w-10 h-10 flex-shrink-0 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg flex items-center justify-center">
            <Wheat size={20} className="text-yellow-800 dark:text-yellow-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-900 dark:bg-yellow-900/45 dark:text-yellow-100 border border-yellow-200 dark:border-yellow-700/60 text-xs font-medium rounded">
                Feeding
              </span>
              <h3 className="text-base font-bold">Hive: {feeding.hives?.hive_number || 'Unknown'}</h3>
            </div>
            <p className="text-xs text-text-tertiary">
              {new Date(feeding.feed_date + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </p>
            {feeding.profiles && feeding.user_id !== userId && sharedHiveIds.includes(feeding.hive_id) && (
              <p className="text-xs text-text-tertiary mt-0.5">
                Recorded by: <span className="font-medium text-text-secondary">
                  {(feeding.profiles.first_name && feeding.profiles.last_name)
                    ? `${feeding.profiles.first_name} ${feeding.profiles.last_name}`
                    : feeding.profiles.email}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 flex-shrink-0">
          <IconButton
            onClick={() => onEdit(feeding)}
            tone="blue"
            className="min-h-[40px] min-w-[40px] touch-manipulation"
            aria-label="Edit feeding"
          >
            <Edit2 size={18} />
          </IconButton>
          <IconButton
            onClick={() => onDelete(feeding)}
            tone="danger"
            className="min-h-[40px] min-w-[40px] touch-manipulation"
            aria-label="Delete feeding"
          >
            <Trash2 size={18} />
          </IconButton>
        </div>
      </div>

      {/* Details Section */}
      <div className="rounded px-3 py-2 border border-border">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            <span className="text-text-tertiary">Feed Type:</span>{' '}
            <span className="font-medium text-foreground">{feeding.feed_type}</span>
          </span>
          {feeding.quantity !== null && (
            <span>
              <span className="text-text-tertiary">Quantity:</span>{' '}
              <span className="font-medium text-foreground">{feeding.quantity} {feeding.unit}</span>
            </span>
          )}
        </div>
      </div>

      {/* Notes */}
      {feeding.notes && (
        <div className="mt-2 px-3 py-2 bg-surface/50 dark:bg-surface-elevated rounded border border-border">
          <span className="text-xs text-text-tertiary">Notes:</span>{' '}
          <span className="text-sm text-text-secondary">{feeding.notes}</span>
        </div>
      )}
    </div>
  )
}
