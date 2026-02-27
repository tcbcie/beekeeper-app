'use client'

import { Edit2, Trash2, Syringe } from 'lucide-react'
import type { VarroaTreatment } from '@/types/records'
import IconButton from '@/components/ui/IconButton'

interface TreatmentCardProps {
  treatment: VarroaTreatment
  userId: string | null
  sharedHiveIds: string[]
  onEdit: (treatment: VarroaTreatment) => void
  onDelete: (treatment: VarroaTreatment) => void
}

export default function TreatmentCard({
  treatment,
  userId,
  sharedHiveIds,
  onEdit,
  onDelete
}: TreatmentCardProps) {
  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-3 border-l-4 border-red-500">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-start gap-2 flex-1">
          {/* Icon Badge */}
          <div className="w-10 h-10 flex-shrink-0 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
            <Syringe size={20} className="text-red-800 dark:text-red-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-foreground dark:text-red-200 text-xs font-medium rounded">
                Varroa Treatment
              </span>
              <h3 className="text-base font-bold">Hive: {treatment.hives?.hive_number || 'Unknown'}</h3>
            </div>
            <p className="text-xs text-text-tertiary">
              {new Date(treatment.treatment_date + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
              {treatment.treatment_time && ` at ${treatment.treatment_time.slice(0, 5)}`}
            </p>
            {treatment.profiles && treatment.user_id !== userId && sharedHiveIds.includes(treatment.hive_id) && (
              <p className="text-xs text-text-tertiary mt-0.5">
                Recorded by: <span className="font-medium text-text-secondary">
                  {(treatment.profiles.first_name && treatment.profiles.last_name)
                    ? `${treatment.profiles.first_name} ${treatment.profiles.last_name}`
                    : treatment.profiles.email}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 flex-shrink-0">
          <IconButton
            onClick={() => onEdit(treatment)}
            tone="blue"
            className="min-h-[40px] min-w-[40px] touch-manipulation"
            aria-label="Edit treatment"
          >
            <Edit2 size={18} />
          </IconButton>
          <IconButton
            onClick={() => onDelete(treatment)}
            tone="danger"
            className="min-h-[40px] min-w-[40px] touch-manipulation"
            aria-label="Delete treatment"
          >
            <Trash2 size={18} />
          </IconButton>
        </div>
      </div>

      {/* Details Section */}
      <div className="rounded px-3 py-2 border border-border">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            <span className="text-text-tertiary">Product:</span>{' '}
            <span className="font-medium text-foreground">{treatment.treatment_type}</span>
          </span>
          <span>
            <span className="text-text-tertiary">Dosage:</span>{' '}
            <span className="font-medium text-foreground">{treatment.dosage}</span>
          </span>
          {treatment.application_method?.value && (
            <span>
              <span className="text-text-tertiary">Method:</span>{' '}
              <span className="font-medium text-foreground">{treatment.application_method.value}</span>
            </span>
          )}
          {treatment.temperature && (
            <span>
              <span className="text-text-tertiary">Temp:</span>{' '}
              <span className="font-medium text-foreground">{treatment.temperature}°C</span>
            </span>
          )}
          {treatment.weather_conditions && (
            <span>
              <span className="text-text-tertiary">Weather:</span>{' '}
              <span className="font-medium text-foreground">{treatment.weather_conditions}</span>
            </span>
          )}
        </div>
      </div>

      {/* Notes */}
      {treatment.notes && (
        <div className="mt-2 px-3 py-2 bg-surface/50 dark:bg-surface-elevated rounded border border-border">
          <span className="text-xs text-text-tertiary">Notes:</span>{' '}
          <span className="text-sm text-text-secondary">{treatment.notes}</span>
        </div>
      )}
    </div>
  )
}
