'use client'

import { Edit2, Trash2, Star, Calendar, Clock, Thermometer, Bug, Users, User } from 'lucide-react'
import Image from 'next/image'
import { WildColonyInspection, getPopulationLabel, getColonyStatusLabel, getWeatherLabel } from '@/types/wild-colonies'

interface WildColonyInspectionCardProps {
  inspection: WildColonyInspection
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
  onImageClick?: (url: string) => void
}

const StarRating = ({ value, max = 5 }: { value: number; max?: number }) => {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < value ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}
        />
      ))}
    </div>
  )
}

export default function WildColonyInspectionCard({
  inspection,
  isOwner,
  onEdit,
  onDelete,
  onImageClick
}: WildColonyInspectionCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null
    return timeStr.slice(0, 5)
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUserDisplayName = () => {
    if (!inspection.profiles) return null
    const { full_name, first_name, last_name } = inspection.profiles
    if (full_name) return full_name
    if (first_name || last_name) return `${first_name || ''} ${last_name || ''}`.trim()
    return null
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-4">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Calendar size={14} />
              <span className="font-medium">{formatDate(inspection.inspection_date)}</span>
            </div>
            {inspection.inspection_time && (
              <div className="flex items-center gap-1 text-sm text-text-tertiary">
                <Clock size={12} />
                <span>{formatTime(inspection.inspection_time)}</span>
              </div>
            )}
            {inspection.colony_status && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                inspection.colony_status === 'active' || inspection.colony_status === 'strong'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : inspection.colony_status === 'weak'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                  : inspection.colony_status === 'dead' || inspection.colony_status === 'absconded'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
              }`}>
                {getColonyStatusLabel(inspection.colony_status)}
              </span>
            )}
          </div>

          {/* Observations Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {/* Activity Level */}
            {inspection.activity_level > 0 && (
              <div>
                <span className="text-text-tertiary text-xs">Activity</span>
                <div className="flex items-center gap-1">
                  <StarRating value={inspection.activity_level} />
                </div>
              </div>
            )}

            {/* Forager Traffic */}
            {inspection.forager_traffic > 0 && (
              <div>
                <span className="text-text-tertiary text-xs">Foragers</span>
                <div className="flex items-center gap-1">
                  <StarRating value={inspection.forager_traffic} />
                </div>
              </div>
            )}

            {/* Temperament */}
            {inspection.temperament > 0 && (
              <div>
                <span className="text-text-tertiary text-xs">Temperament</span>
                <div className="flex items-center gap-1">
                  <StarRating value={inspection.temperament} />
                </div>
              </div>
            )}

            {/* Population */}
            {inspection.population_estimate && (
              <div>
                <span className="text-text-tertiary text-xs">Population</span>
                <div className="flex items-center gap-1 text-text-primary">
                  <Users size={12} />
                  <span>{getPopulationLabel(inspection.population_estimate)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Boolean Indicators */}
          <div className="flex flex-wrap gap-2 mt-3">
            {inspection.pollen_observed && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded">
                Pollen
              </span>
            )}
            {inspection.drones_observed && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                Drones
              </span>
            )}
            {inspection.orientation_flights && (
              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                Orientation Flights
              </span>
            )}
            {inspection.robbing_activity && (
              <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded">
                Robbing
              </span>
            )}
            {inspection.swarm_activity_observed && (
              <span className="px-2 py-0.5 text-xs bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 rounded">
                Swarm Activity
              </span>
            )}
          </div>

          {/* Health Indicators */}
          {(inspection.dead_bees_observed || inspection.deformed_wings_observed) && (
            <div className="flex items-center gap-3 mt-3 text-sm">
              <Bug size={14} className="text-red-500" />
              {inspection.dead_bees_observed && (
                <span className="text-red-600 dark:text-red-400">
                  Dead bees{inspection.dead_bees_count ? ` (${inspection.dead_bees_count})` : ''}
                </span>
              )}
              {inspection.deformed_wings_observed && (
                <span className="text-red-600 dark:text-red-400">Deformed wings</span>
              )}
            </div>
          )}

          {/* Weather */}
          {(inspection.weather_temp || inspection.weather_condition) && (
            <div className="flex items-center gap-2 mt-2 text-xs text-text-tertiary">
              <Thermometer size={12} />
              {inspection.weather_temp && <span>{inspection.weather_temp}°C</span>}
              {inspection.weather_condition && <span>{getWeatherLabel(inspection.weather_condition)}</span>}
            </div>
          )}

          {/* Notes */}
          {inspection.notes && (
            <div className="mt-3 p-2 bg-sage-50 dark:bg-slate-700/50 rounded text-sm text-text-secondary">
              {inspection.notes}
            </div>
          )}

          {/* Record Info: Created by and timestamp */}
          <div className="mt-3 pt-2 border-t border-border/50 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary">
            {getUserDisplayName() && (
              <div className="flex items-center gap-1">
                <User size={12} />
                <span>Recorded by {getUserDisplayName()}</span>
              </div>
            )}
            {inspection.created_at && (
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>Created {formatDateTime(inspection.created_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Photo + Actions */}
        <div className="flex flex-col items-end gap-2">
          {/* Actions */}
          {isOwner && (
            <div className="flex gap-1">
              <button
                onClick={onEdit}
                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {/* Photo */}
          {inspection.image_url && (
            <Image
              src={inspection.image_url}
              alt="Inspection"
              width={64}
              height={64}
              className="w-16 h-16 object-cover rounded border border-border cursor-pointer"
              onClick={() => onImageClick?.(inspection.image_url!)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
