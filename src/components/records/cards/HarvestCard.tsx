'use client'

import { Edit2, Trash2, Droplet } from 'lucide-react'
import type { Harvest } from '@/types/records'

interface HarvestCardProps {
  harvest: Harvest
  userId: string | null
  sharedHiveIds: string[]
  onEdit: (harvest: Harvest) => void
  onDelete: (harvest: Harvest) => void
}

export default function HarvestCard({
  harvest,
  userId,
  sharedHiveIds,
  onEdit,
  onDelete
}: HarvestCardProps) {
  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-3 border-l-4 border-amber-500">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-start gap-2 flex-1">
          {/* Icon Badge */}
          <div className="w-10 h-10 flex-shrink-0 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
            <Droplet size={20} className="text-amber-800 dark:text-amber-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-gray-900 dark:text-green-200 text-xs font-medium rounded">
                Harvest
              </span>
              <h3 className="text-base font-bold">Hive: {harvest.hives?.hive_number || 'Unknown'}</h3>
            </div>
            <p className="text-xs text-text-tertiary">
              {new Date(harvest.harvest_date + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </p>
            {harvest.profiles && harvest.user_id !== userId && sharedHiveIds.includes(harvest.hive_id) && (
              <p className="text-xs text-text-tertiary mt-0.5">
                Recorded by: <span className="font-medium text-text-secondary">
                  {(harvest.profiles.first_name && harvest.profiles.last_name)
                    ? `${harvest.profiles.first_name} ${harvest.profiles.last_name}`
                    : harvest.profiles.email}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(harvest)}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-blue-800 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30 active:bg-blue-100 dark:active:bg-blue-900/50 rounded-lg touch-manipulation transition-colors"
            aria-label="Edit harvest"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(harvest)}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-red-800 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 active:bg-red-100 dark:active:bg-red-900/50 rounded-lg touch-manipulation transition-colors"
            aria-label="Delete harvest"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Details Section */}
      <div className="rounded px-3 py-2 border border-border">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {harvest.honey_weight !== null && (
            <span>
              <span className="text-text-tertiary">Honey:</span>{' '}
              <span className="font-medium text-foreground">{harvest.honey_weight} {harvest.unit}</span>
            </span>
          )}
          {harvest.wax_weight !== null && (
            <span>
              <span className="text-text-tertiary">Wax:</span>{' '}
              <span className="font-medium text-foreground">{harvest.wax_weight} {harvest.unit}</span>
            </span>
          )}
          {harvest.frames_harvested !== null && (
            <span>
              <span className="text-text-tertiary">Frames:</span>{' '}
              <span className="font-medium text-foreground">{harvest.frames_harvested}</span>
            </span>
          )}
          {harvest.floral_source && (
            <span>
              <span className="text-text-tertiary">Floral:</span>{' '}
              <span className="font-medium text-foreground">{harvest.floral_source}</span>
            </span>
          )}
          {harvest.moisture_content !== null && (
            <span>
              <span className="text-text-tertiary">Moisture:</span>{' '}
              <span className={`font-medium ${harvest.moisture_content > 20 ? 'text-red-800' : 'text-green-800'}`}>
                {harvest.moisture_content}%
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Notes */}
      {harvest.notes && (
        <div className="mt-2 px-3 py-2 bg-surface/50 dark:bg-surface-elevated rounded border border-border">
          <span className="text-xs text-text-tertiary">Notes:</span>{' '}
          <span className="text-sm text-text-secondary">{harvest.notes}</span>
        </div>
      )}
    </div>
  )
}
