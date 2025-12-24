'use client'

import { Edit2, Trash2, Search, Camera } from 'lucide-react'
import Image from 'next/image'
import type { Inspection, Hive } from '@/types/records'

interface InspectionCardProps {
  inspection: Inspection
  userId: string | null
  sharedHiveIds: string[]
  userHasActiveSubscription: boolean
  hives: Hive[]
  onEdit: (inspection: Inspection) => void
  onDelete: (id: string) => void
  onImageClick: (url: string) => void
}

// Helper function to render star ratings
function renderStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

export default function InspectionCard({
  inspection,
  userId,
  sharedHiveIds,
  userHasActiveSubscription,
  hives,
  onEdit,
  onDelete,
  onImageClick
}: InspectionCardProps) {
  const hive = hives.find(h => h.id === inspection.hive_id)

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-3 md:p-6 border-l-4 border-blue-500">
      <div className="flex justify-between items-start mb-3 md:mb-4 gap-2 md:gap-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Icon Badge */}
          <div className="w-12 h-12 flex-shrink-0 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
            <Search size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
          {userHasActiveSubscription && inspection.image_url && (
            <div
              className="relative w-16 h-16 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity group"
              onDoubleClick={() => onImageClick(inspection.image_url!)}
              title="Double-click to enlarge"
            >
              <Image
                src={inspection.image_url}
                alt="Inspection"
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
            <h3 className="text-base md:text-lg font-bold">Hive: {inspection.hives?.hive_number || 'Unknown'}</h3>
            <p className="text-xs md:text-sm text-text-tertiary">
              {inspection.inspection_date}
              {inspection.inspection_time && ` at ${inspection.inspection_time}`}
            </p>
            {inspection.profiles && inspection.user_id !== userId && sharedHiveIds.includes(inspection.hive_id) && (
              <p className="text-xs text-text-tertiary mt-1">
                Recorded by: <span className="font-medium text-text-secondary">
                  {(inspection.profiles.first_name && inspection.profiles.last_name)
                    ? `${inspection.profiles.first_name} ${inspection.profiles.last_name}`
                    : inspection.profiles.email}
                </span>
              </p>
            )}
            {inspection.weight && (
              <p className="text-sm text-text-tertiary font-medium mt-1">
                Weight: {inspection.weight} kg
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onEdit(inspection)}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30 active:bg-blue-100 dark:active:bg-blue-900/50 rounded-lg touch-manipulation"
            aria-label="Edit inspection"
          >
            <Edit2 size={20} />
          </button>
          <button
            onClick={() => onDelete(inspection.id)}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 active:bg-red-100 dark:active:bg-red-900/50 rounded-lg touch-manipulation"
            aria-label="Delete inspection"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Queen & Brood Section */}
      <div className="mb-3 overflow-hidden rounded border border-border">
        <div className="bg-surface-elevated dark:bg-surface-elevated px-3 py-1.5 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Queen & Brood</h4>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">Queen:</span>
              <span className="text-base">{inspection.queen_seen ? '✅' : '❌'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">Eggs:</span>
              <span className="text-base">{inspection.eggs_present ? '✅' : '❌'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">Brood:</span>
              <span className="font-bold text-purple-600">{inspection.brood_frames ?? '-'}</span>
            </div>
            {hive?.configuration?.right_sized_broodbox && (
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Right-Sized:</span>
                <span className="font-bold text-amber-600">{inspection.right_sized_frames ?? '-'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Queen Cells Section */}
      {(inspection.queen_cups || inspection.swarm_cells || inspection.supercedure_cells || inspection.emergency_cells) && (
        <div className="mb-3 overflow-hidden rounded border border-border">
          <div className="bg-surface-elevated dark:bg-surface-elevated px-3 py-1.5 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">Queen Cells</h4>
          </div>
          <div className="px-3 py-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {inspection.queen_cups && (
                <span>
                  <span className="text-text-secondary">Queen Cups:</span> <span className="font-medium text-foreground">{inspection.queen_cups_number || 0}</span>
                  {inspection.queen_cups_removed_all !== null && (
                    <span className="text-text-tertiary"> ({inspection.queen_cups_removed_all ? 'All removed' : 'Some remain'})</span>
                  )}
                </span>
              )}
              {inspection.swarm_cells && (
                <span>
                  <span className="text-text-secondary">Swarm Cells:</span> <span className="font-medium text-foreground">{inspection.swarm_cells_number || 0}</span>
                  {inspection.swarm_cells_removed_all !== null && (
                    <span className="text-text-tertiary"> ({inspection.swarm_cells_removed_all ? 'All removed' : 'Some remain'})</span>
                  )}
                </span>
              )}
              {inspection.supercedure_cells && (
                <span>
                  <span className="text-text-secondary">Supercedure Cells:</span> <span className="font-medium text-foreground">{inspection.supercedure_cells_number || 0}</span>
                  {inspection.supercedure_cells_removed_all !== null && (
                    <span className="text-text-tertiary"> ({inspection.supercedure_cells_removed_all ? 'All removed' : 'Some remain'})</span>
                  )}
                </span>
              )}
              {inspection.emergency_cells && (
                <span>
                  <span className="text-text-secondary">Emergency Cells:</span> <span className="font-medium text-foreground">{inspection.emergency_cells_number || 0}</span>
                  {inspection.emergency_cells_removed_all !== null && (
                    <span className="text-text-tertiary"> ({inspection.emergency_cells_removed_all ? 'All removed' : 'Some remain'})</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drones Section */}
      {((inspection.drones_present !== -1 && inspection.drones_present !== null) || inspection.drone_brood_present !== null) && (
        <div className="mb-3 overflow-hidden rounded border border-border">
          <div className="bg-surface-elevated dark:bg-surface-elevated px-3 py-1.5 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">Drones</h4>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {inspection.drones_present !== -1 && inspection.drones_present !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary">Level:</span>
                  <span className="font-semibold text-amber-600">
                    {inspection.drones_present === 0 && 'Low'}
                    {inspection.drones_present === 1 && 'Medium'}
                    {inspection.drones_present === 2 && 'High'}
                    {inspection.drones_present === 3 && 'Extreme'}
                  </span>
                </div>
              )}
              {inspection.drone_brood_present !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary">Brood:</span>
                  <span className="text-base">{inspection.drone_brood_present ? '✅' : '❌'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Behaviour Section */}
      {(inspection.population_strength > 0 || inspection.temperament_rating > 0 ||
        inspection.brood_pattern_rating > 0 || inspection.swarming_tendency > 0 ||
        inspection.calmness > 0) && (
        <div className="mb-3 overflow-hidden rounded border border-border">
          <div className="bg-surface-elevated dark:bg-surface-elevated px-3 py-1.5 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">Behaviour</h4>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-x-3 gap-y-1.5 text-sm">
              {inspection.population_strength > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary whitespace-nowrap">Population:</span>
                  <span>{renderStars(inspection.population_strength)}</span>
                </div>
              )}
              {inspection.temperament_rating > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary whitespace-nowrap">Temperament:</span>
                  <span>{renderStars(inspection.temperament_rating)}</span>
                </div>
              )}
              {inspection.brood_pattern_rating > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary whitespace-nowrap">Brood Pattern:</span>
                  <span>{renderStars(inspection.brood_pattern_rating)}</span>
                </div>
              )}
              {inspection.swarming_tendency > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary whitespace-nowrap">Swarming:</span>
                  <span>{renderStars(inspection.swarming_tendency)}</span>
                </div>
              )}
              {inspection.calmness > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary whitespace-nowrap">Calmness:</span>
                  <span>{renderStars(inspection.calmness)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Given/Taken Section */}
      {(inspection.frames_foundation > 0 || inspection.frames_brood > 0 || inspection.frames_drawn > 0 ||
        inspection.honey_supers > 0 || inspection.drone_frames > 0 || inspection.store_frames > 0) && (
        <div className="mb-3 overflow-hidden rounded border border-border">
          <div className="bg-surface-elevated dark:bg-surface-elevated px-3 py-1.5 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">Given/Taken</h4>
          </div>
          <div className="px-3 py-1.5">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {inspection.frames_foundation > 0 && (
                <span><span className="text-text-secondary">Foundation:</span> <span className="font-bold text-orange-600">{inspection.frames_foundation}</span></span>
              )}
              {inspection.frames_brood > 0 && (
                <span><span className="text-text-secondary">Brood:</span> <span className="font-bold text-orange-600">{inspection.frames_brood}</span></span>
              )}
              {inspection.frames_drawn > 0 && (
                <span><span className="text-text-secondary">Drawn:</span> <span className="font-bold text-orange-600">{inspection.frames_drawn}</span></span>
              )}
              {inspection.honey_supers > 0 && (
                <span><span className="text-text-secondary">Supers:</span> <span className="font-bold text-orange-600">{inspection.honey_supers}</span></span>
              )}
              {inspection.drone_frames > 0 && (
                <span><span className="text-text-secondary">Drone:</span> <span className="font-bold text-orange-600">{inspection.drone_frames}</span></span>
              )}
              {inspection.store_frames > 0 && (
                <span><span className="text-text-secondary">Store:</span> <span className="font-bold text-orange-600">{inspection.store_frames}</span></span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hygienic Behaviour Section */}
      {((inspection.recapping !== 3 && inspection.recapping !== 0) ||
        (inspection.vsh !== 3 && inspection.vsh !== 0) ||
        (inspection.smr !== 3 && inspection.smr !== 0)) && (
        <div className="mb-3 overflow-hidden rounded border border-border">
          <div className="bg-surface-elevated dark:bg-surface-elevated px-3 py-1.5 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">Hygienic Behaviour</h4>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-1.5 text-sm">
              {inspection.recapping !== 3 && inspection.recapping !== 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary">Recapping:</span>
                  <span>{renderStars(inspection.recapping)}</span>
                </div>
              )}
              {inspection.vsh !== 3 && inspection.vsh !== 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary">VSH:</span>
                  <span>{renderStars(inspection.vsh)}</span>
                </div>
              )}
              {inspection.smr !== 3 && inspection.smr !== 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary">SMR:</span>
                  <span>{renderStars(inspection.smr)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weather Section */}
      {(inspection.weather_temp !== null || inspection.weather_condition) && (
        <div className="mb-4 p-3 rounded border border-border hidden md:block">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🌤️</span>
            <span className="text-sm font-medium text-foreground">Weather Conditions</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm ml-7">
            {inspection.weather_temp !== null && (
              <div>
                <span className="font-medium text-text-secondary">Temperature:</span> {inspection.weather_temp}°C
              </div>
            )}
            {inspection.weather_condition && (
              <div>
                <span className="font-medium text-text-secondary">Condition:</span> {inspection.weather_condition}
              </div>
            )}
            {inspection.weather_humidity !== null && (
              <div>
                <span className="font-medium text-text-secondary">Humidity:</span> {inspection.weather_humidity}%
              </div>
            )}
            {inspection.weather_wind_speed !== null && (
              <div>
                <span className="font-medium text-text-secondary">Wind:</span> {inspection.weather_wind_speed} km/h
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disease Section */}
      {(inspection.afb_disease > 0 || inspection.efb_disease > 0 || inspection.chalkbrood_disease > 0 ||
        inspection.nosemosis_disease > 0 || inspection.dwv_disease > 0 || inspection.iapv_cbpv_disease > 0) && (
        <div className="mb-3 overflow-hidden rounded border border-border">
          <div className="bg-surface-elevated dark:bg-surface-elevated px-3 py-1.5 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">Disease</h4>
          </div>
          <div className="bg-surface dark:bg-surface px-3 py-1.5">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {inspection.afb_disease > 0 && (
                <span><span className="text-text-secondary">AFB:</span> {renderStars(inspection.afb_disease)}</span>
              )}
              {inspection.efb_disease > 0 && (
                <span><span className="text-text-secondary">EFB:</span> {renderStars(inspection.efb_disease)}</span>
              )}
              {inspection.chalkbrood_disease > 0 && (
                <span><span className="text-text-secondary">Chalkbrood:</span> {renderStars(inspection.chalkbrood_disease)}</span>
              )}
              {inspection.nosemosis_disease > 0 && (
                <span><span className="text-text-secondary">Nosemosis:</span> {renderStars(inspection.nosemosis_disease)}</span>
              )}
              {inspection.dwv_disease > 0 && (
                <span><span className="text-text-secondary">DWV:</span> {renderStars(inspection.dwv_disease)}</span>
              )}
              {inspection.iapv_cbpv_disease > 0 && (
                <span><span className="text-text-secondary">IAPV & CBPV:</span> {renderStars(inspection.iapv_cbpv_disease)}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {inspection.notes && (
        <div className="p-3 rounded border border-border">
          <span className="text-sm font-medium text-text-secondary">Notes: </span>
          <span className="text-sm text-text-tertiary">{inspection.notes}</span>
        </div>
      )}
    </div>
  )
}
