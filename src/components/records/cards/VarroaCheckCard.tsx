'use client'

import { Edit2, Trash2, Bug, Camera } from 'lucide-react'
import Image from 'next/image'
import type { VarroaCheck } from '@/types/records'
import IconButton from '@/components/ui/IconButton'

interface VarroaCheckCardProps {
  check: VarroaCheck
  userId: string | null
  sharedHiveIds: string[]
  userHasActiveSubscription: boolean
  onEdit: (check: VarroaCheck) => void
  onDelete: (check: VarroaCheck) => void
  onImageClick: (url: string) => void
}

export default function VarroaCheckCard({
  check,
  userId,
  sharedHiveIds,
  userHasActiveSubscription,
  onEdit,
  onDelete,
  onImageClick
}: VarroaCheckCardProps) {
  const isNaturalDrop = check.method === 'Natural Mite Drop' || check.method === 'Screening Board'

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-3 border-l-4 border-orange-500">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-start gap-2 flex-1">
          {/* Icon Badge */}
          <div className="w-10 h-10 flex-shrink-0 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center">
            <Bug size={20} className="text-orange-800 dark:text-orange-400" />
          </div>

          {/* Image thumbnail */}
          {userHasActiveSubscription && check.image_url && (
            <div
              className="relative w-16 h-16 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity group"
              onDoubleClick={() => onImageClick(check.image_url!)}
              title="Double-click to enlarge"
            >
              <Image
                src={check.image_url}
                alt="Varroa Check"
                fill
                className="object-cover rounded-lg border-2 border-border shadow-sm"
                sizes="64px"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-40 rounded-lg">
                <Camera size={20} className="text-white" />
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-foreground dark:text-orange-200 text-xs font-medium rounded">
                Varroa Check
              </span>
              <h3 className="text-base font-bold">Hive: {check.hives?.hive_number || 'Unknown'}</h3>
            </div>
            <p className="text-xs text-text-tertiary">
              {new Date(check.check_date).toLocaleDateString('en-GB', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
              {' at '}
              {new Date(check.check_date).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
            </p>
            {check.profiles && check.user_id !== userId && sharedHiveIds.includes(check.hive_id) && (
              <p className="text-xs text-text-tertiary mt-0.5">
                Recorded by: <span className="font-medium text-text-secondary">
                  {(check.profiles.first_name && check.profiles.last_name)
                    ? `${check.profiles.first_name} ${check.profiles.last_name}`
                    : check.profiles.email}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 flex-shrink-0">
          <IconButton
            onClick={() => onEdit(check)}
            tone="blue"
            className="min-h-[40px] min-w-[40px] touch-manipulation"
            aria-label="Edit check"
          >
            <Edit2 size={18} />
          </IconButton>
          <IconButton
            onClick={() => onDelete(check)}
            tone="danger"
            className="min-h-[40px] min-w-[40px] touch-manipulation"
            aria-label="Delete check"
          >
            <Trash2 size={18} />
          </IconButton>
        </div>
      </div>

      {/* Details Section */}
      <div className="rounded px-3 py-2 border border-border">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            <span className="text-text-tertiary">Method:</span>{' '}
            <span className="font-medium text-foreground">{check.method}</span>
          </span>
          {check.mites_count !== null && (
            <span>
              <span className="text-text-tertiary">
                {isNaturalDrop ? 'Total Mite Drop:' : 'Mites Count:'}
              </span>{' '}
              <span className="font-medium text-foreground">{check.mites_count}</span>
            </span>
          )}
          {check.sample_size !== null && (
            <span>
              <span className="text-text-tertiary">
                {isNaturalDrop ? 'Days:' : 'Sample Size:'}
              </span>{' '}
              <span className="font-medium text-foreground">{check.sample_size}</span>
            </span>
          )}
          {check.infestation_rate !== null && (
            <span>
              <span className="text-text-tertiary">
                {isNaturalDrop ? 'Daily Mite Drop:' : 'Infestation Rate:'}
              </span>{' '}
              <span className={`font-bold ${check.infestation_rate > 3 ? 'text-red-800' : 'text-green-800'}`}>
                {isNaturalDrop ? check.infestation_rate : `${check.infestation_rate}%`}
              </span>
            </span>
          )}
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-orange-200">
          <span className="text-text-tertiary text-sm">Action Threshold: </span>
          <span className={`text-sm font-bold ${check.action_threshold_reached ? 'text-red-800' : 'text-green-800'}`}>
            {check.action_threshold_reached ? '⚠️ Reached - Treatment Needed' : '✓ Not Reached'}
          </span>
        </div>
      </div>

      {/* Notes */}
      {check.notes && (
        <div className="mt-2 px-3 py-2 bg-surface/50 dark:bg-surface-elevated rounded border border-border">
          <span className="text-xs text-text-tertiary">Notes:</span>{' '}
          <span className="text-sm text-text-secondary">{check.notes}</span>
        </div>
      )}
    </div>
  )
}
