'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit2, Trash2, MapPin, Map, Camera, Clock } from 'lucide-react'
import type { Apiary } from '@/types/apiary'
import Button from '@/components/ui/Button'

interface ApiaryCardProps {
  apiary: Apiary
  onEdit: (apiary: Apiary) => void
  onDelete: (id: string) => void
  onImageClick: (url: string) => void
  isReadOnly?: boolean
}

export default function ApiaryCard({ apiary, onEdit, onDelete, onImageClick, isReadOnly }: ApiaryCardProps) {
  const router = useRouter()

  const daysSinceInspection = apiary.last_inspection_date
    ? Math.floor((Date.now() - new Date(apiary.last_inspection_date).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className={`bg-surface dark:bg-surface rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-border ${
      apiary.is_shared ? 'border-l-4 border-l-blue-500' :
      apiary.is_mating_apiary ? 'border-l-4 border-l-purple-500' : ''
    }`}>
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex-1 min-w-0">
          <Link href={`/dashboard/apiaries/${apiary.id}`} className="hover:underline">
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
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full border border-blue-300 dark:border-blue-700 mt-1">
              Shared via {apiary.team_name || 'team'}
            </span>
          )}
          {apiary.is_mating_apiary && !apiary.is_shared && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full border border-purple-300 dark:border-purple-700 mt-1">
              Mating Location (Apiary)
            </span>
          )}
          {apiary.share_location && (
            <p className="text-xs text-blue-800 dark:text-blue-400 mt-1 flex items-center gap-1">
              <MapPin size={12} />
              Location shared publicly (~5km radius)
            </p>
          )}
          {apiary.share_location && apiary.latitude && apiary.longitude && (
            <Button
              onClick={() => router.push('/dashboard/community-map')}
              tone="purple"
              size="xs"
              className="mt-1 inline-flex items-center gap-1"
            >
              <Map size={12} />
              View on community map
            </Button>
          )}
        </div>
        {apiary.image_url && (
          <div
            className="relative w-20 h-20 flex-shrink-0 cursor-pointer group"
            onClick={() => onImageClick(apiary.image_url!)}
            title="Click to enlarge"
          >
            <Image
              src={apiary.image_url}
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
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-700">
            {apiary.hive_count} hive{apiary.hive_count !== 1 ? 's' : ''}
          </span>
        )}
        {daysSinceInspection !== null ? (
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${
            daysSinceInspection < 7
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
              : daysSinceInspection < 14
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
          }`}>
            <Clock size={10} />
            Inspected {daysSinceInspection}d ago
          </span>
        ) : apiary.hive_count && apiary.hive_count > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-surface-secondary text-text-secondary rounded-full border border-border">
            <Clock size={10} />
            Never inspected
          </span>
        ) : null}
      </div>

      {apiary.notes && (
        <div className="mb-4 p-3 bg-surface-secondary/50 rounded text-sm text-text-primary border border-border">
          {apiary.notes}
        </div>
      )}

      {!isReadOnly && (
        <div className="flex gap-2">
          <Button
            onClick={() => onEdit(apiary)}
            tone="blue"
            className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2"
          >
            <Edit2 size={16} />
            Edit
          </Button>
          <Button
            onClick={() => onDelete(apiary.id)}
            tone="danger"
            className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Delete
          </Button>
        </div>
      )}
    </div>
  )
}
