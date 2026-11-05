'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit2, Trash2, MapPin, Map, Camera, Clock } from 'lucide-react'
import type { Apiary } from '@/types/apiary'
import Button from '@/components/ui/Button'
import { normaliseStoragePublicUrl } from '@/lib/storage-url'
import { daysSince } from '@/lib/date-utils'
import { INSPECTION_BADGE_CLASSES, inspectedAgoText, inspectionAgeTone } from '@/lib/inspection-age'

interface ApiaryCardProps {
  apiary: Apiary
  onEdit: (apiary: Apiary) => void
  onDelete: (id: string) => void
  onImageClick: (url: string) => void
  isReadOnly?: boolean
  /** Briefly ringed after the list scrolls back to this apiary. */
  highlighted?: boolean
  /** Called just before navigating to the apiary, so the list can remember this position. */
  onOpen?: (id: string) => void
}

export default function ApiaryCard({ apiary, onEdit, onDelete, onImageClick, isReadOnly, highlighted = false, onOpen }: ApiaryCardProps) {
  const router = useRouter()
  const normalisedImageUrl = normaliseStoragePublicUrl(apiary.image_url)

  // Local calendar days and the Hives badge's rule (src/lib/inspection-age.ts)
  const daysSinceInspection = daysSince(apiary.last_inspection_date)

  return (
    <div
      id={`apiary-card-${apiary.id}`}
      className={`bg-surface dark:bg-surface rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border ${
      highlighted ? 'border-forest-500 ring-2 ring-forest-500/70' : 'border-border'
    } ${
      apiary.is_shared ? 'border-l-4 border-l-blue-500' :
      apiary.team_name ? 'border-l-4 border-l-purple-500' :
      apiary.is_mating_apiary ? 'border-l-4 border-l-purple-500' : ''
    }`}>
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/dashboard/apiaries/${apiary.id}`}
            onClick={() => onOpen?.(apiary.id)}
            className="hover:underline"
          >
            <h3 className="text-2xl font-bold text-foreground">{apiary.name}</h3>
          </Link>
          <p className="text-sm text-text-secondary mt-1">
            {apiary.city && apiary.location ? `${apiary.city} - ${apiary.location}` :
             apiary.city || apiary.location || 'No location specified'}
          </p>
          {apiary.eircode && (
            <p className="text-sm text-forest-800 dark:text-forest-400 font-medium mt-1">
              Eircode: {apiary.eircode}
            </p>
          )}
          {apiary.is_shared && (
            <span className="inline-flex items-center px-2 py-0.5 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full border border-blue-300 dark:border-blue-700 mt-1">
              Shared via {apiary.team_name || 'team'}
            </span>
          )}
          {!apiary.is_shared && apiary.team_name && (
            <span className="inline-flex items-center px-2 py-0.5 text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full border border-purple-300 dark:border-purple-700 mt-1">
              Shared with {apiary.team_name}
            </span>
          )}
          {apiary.is_mating_apiary && !apiary.is_shared && (
            <span className="inline-flex items-center px-2 py-0.5 text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full border border-purple-300 dark:border-purple-700 mt-1">
              Mating Location (Apiary)
            </span>
          )}
          {apiary.share_location && (
            <p className="text-sm text-blue-800 dark:text-blue-400 mt-1 flex items-center gap-1">
              <MapPin size={12} />
              Location shared publicly (~5km radius)
            </p>
          )}
          {apiary.share_location && apiary.latitude && apiary.longitude && (
            <Button
              onClick={() => router.push('/dashboard/community-map')}
              tone="neutral"
              size="xs"
              className="mt-1 inline-flex items-center gap-1"
            >
              <Map size={12} />
              View on community map
            </Button>
          )}
        </div>
        {normalisedImageUrl && (
          <div
            className="relative w-20 h-20 flex-shrink-0 cursor-pointer group"
            onClick={() => onImageClick(normalisedImageUrl)}
            title="Click to enlarge"
          >
            <Image
              src={normalisedImageUrl}
              alt={apiary.name}
              fill
              sizes="160px"
              className="object-cover rounded-lg border border-border shadow-sm"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-lg">
              <Camera size={16} className="text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Hive count and last inspection badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {apiary.hive_count !== undefined && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-700">
            {apiary.hive_count} hive{apiary.hive_count !== 1 ? 's' : ''}
          </span>
        )}
        {(daysSinceInspection !== null || (apiary.hive_count ?? 0) > 0) && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-full border ${INSPECTION_BADGE_CLASSES[inspectionAgeTone(daysSinceInspection)]}`}>
            <Clock size={14} aria-hidden="true" />
            {inspectedAgoText(daysSinceInspection)}
          </span>
        )}
      </div>

      {apiary.notes && (
        <div className="mb-4 p-3 bg-surface-secondary/50 rounded text-sm text-text-primary border border-border">
          {apiary.notes}
        </div>
      )}

      {!isReadOnly && (
        <div className="flex gap-2">
          {/* Edit leads; Delete is smaller red text so the two can't be mistaken for equals */}
          <Button
            onClick={() => onEdit(apiary)}
            tone="neutral"
            className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2"
          >
            <Edit2 size={16} />
            Edit
          </Button>
          <Button
            onClick={() => onDelete(apiary.id)}
            tone="neutral"
            className="flex-none px-4 min-h-[48px] inline-flex items-center justify-center gap-2 text-red-700 dark:text-red-400"
          >
            <Trash2 size={16} />
            Delete
          </Button>
        </div>
      )}
    </div>
  )
}
