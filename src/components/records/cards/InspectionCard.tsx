'use client'

import { useEffect, useState } from 'react'
import { Edit2, Trash2, Search, Camera, QrCode } from 'lucide-react'
import Image from 'next/image'
import type { Inspection, Hive, Apiary } from '@/types/records'
import { getLevelLabel } from '@/types/records'
import IconButton from '@/components/ui/IconButton'
import { normaliseStoragePublicUrl } from '@/lib/storage-url'
import ModalShell from '@/components/ui/ModalShell'
import HiveQRCode from '@/components/hive/HiveQRCode'

interface InspectionCardProps {
  inspection: Inspection
  userId: string | null
  sharedHiveIds: string[]
  userHasActiveSubscription: boolean
  hives: Hive[]
  apiaries: Apiary[]
  onEdit: (inspection: Inspection) => void
  onDelete: (id: string) => void
  onImageClick: (url: string) => void
}

function renderStars(rating: number): string {
  const clamped = Math.max(0, Math.min(5, Math.trunc(rating) || 0))
  return '★'.repeat(clamped) + '☆'.repeat(5 - clamped)
}

function formatInspectionDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown date'
  const d = new Date(dateStr + 'T00:00:00')
  return isNaN(d.getTime())
    ? 'Unknown date'
    : d.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function formatSignedAdjustment(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

function isNonZeroAdjustment(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value !== 0
}

export default function InspectionCard({
  inspection,
  userId,
  sharedHiveIds,
  userHasActiveSubscription,
  hives,
  apiaries,
  onEdit,
  onDelete,
  onImageClick
}: InspectionCardProps) {
  const hive = hives.find(h => h.id === inspection.hive_id)
  const apiary = apiaries.find(a => a.id === hive?.apiary_id)
  const normalisedImageUrl = normaliseStoragePublicUrl(inspection.image_url)
  const [thumbnailLoadFailed, setThumbnailLoadFailed] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)

  const givenTakenItems = [
    { label: 'Foundation', value: inspection.frames_foundation },
    { label: 'Brood', value: inspection.frames_brood },
    { label: 'Drawn', value: inspection.frames_drawn },
    { label: 'Supers', value: inspection.honey_supers },
    { label: 'Drone', value: inspection.drone_frames },
    { label: 'Store', value: inspection.store_frames },
  ].filter((item): item is { label: string; value: number } => isNonZeroAdjustment(item.value))

  useEffect(() => {
    setThumbnailLoadFailed(false)
  }, [normalisedImageUrl])

  const droneLabel = getLevelLabel(inspection.drones_present)
  const propolisLabel = getLevelLabel(inspection.propolis_level)

  const superFullness = Array.isArray(inspection.honey_super_fullness) ? inspection.honey_super_fullness : []

  const hasQueenCells = inspection.queen_cups || inspection.swarm_cells || inspection.supercedure_cells || inspection.emergency_cells
  const hasBehaviour = inspection.population_strength > 0 || inspection.temperament_rating > 0 || inspection.brood_pattern_rating > 0 || inspection.swarming_tendency > 0 || inspection.calmness > 0
  const hasHygienic = (inspection.recapping !== 3 && inspection.recapping !== 0) || (inspection.vsh !== 3 && inspection.vsh !== 0) || (inspection.smr !== 3 && inspection.smr !== 0)
  const hasVarroa = inspection.varroa_disease > 0 || inspection.varroa_seen_on_bees || inspection.varroa_seen_in_brood
  const hasDisease = inspection.afb_disease > 0 || inspection.efb_disease > 0 || inspection.chalkbrood_disease > 0 || inspection.nosemosis_disease > 0 || inspection.dwv_disease > 0 || inspection.iapv_cbpv_disease > 0 || hasVarroa
  const varroaLocations = [
    inspection.varroa_seen_on_bees ? 'bees' : null,
    inspection.varroa_seen_in_brood && inspection.varroa_brood_worker ? 'worker brood' : null,
    inspection.varroa_seen_in_brood && inspection.varroa_brood_drone ? 'drone brood' : null,
    inspection.varroa_seen_in_brood && !inspection.varroa_brood_worker && !inspection.varroa_brood_drone ? 'brood' : null,
  ].filter((v): v is string => Boolean(v))
  const hasWeather = inspection.weather_temp !== null || !!inspection.weather_condition

  const formattedDate = formatInspectionDate(inspection.inspection_date)

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-3 border-l-4 border-blue-500">

      {/* Header */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">

          {/* Photo thumbnail — only when available */}
          {userHasActiveSubscription && normalisedImageUrl && !thumbnailLoadFailed && (
            <div
              className="relative w-12 h-12 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity group rounded-lg overflow-hidden border border-border"
              onDoubleClick={() => onImageClick(normalisedImageUrl)}
              title="Double-click to enlarge"
            >
              <Image
                src={normalisedImageUrl}
                alt="Inspection"
                fill
                className="object-cover"
                sizes="48px"
                onError={() => setThumbnailLoadFailed(true)}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-40">
                <Camera size={16} className="text-white" />
              </div>
            </div>
          )}
          {userHasActiveSubscription && normalisedImageUrl && thumbnailLoadFailed && (
            <div className="w-12 h-12 flex-shrink-0 rounded-lg border border-dashed border-border bg-surface-elevated flex items-center justify-center">
              <Camera size={16} className="text-text-tertiary" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <h3 className="text-base font-bold flex flex-wrap items-center gap-x-1.5 gap-y-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Search size={14} className="text-blue-500 flex-shrink-0" />
                  <span className="break-words">
                    Hive: {inspection.hives?.hive_number || 'Unknown'}
                    {apiary && (
                      <span className="font-normal text-text-tertiary"> ({apiary.name})</span>
                    )}
                  </span>
                </span>
                {hive?.qr_tag_code && (
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-semibold bg-surface-secondary text-text-primary border border-border hover:bg-surface-elevated transition-colors max-w-full whitespace-nowrap"
                    title={`QR tag: ${hive.qr_tag_code} — tap to view`}
                    aria-label={`Show QR code ${hive.qr_tag_code}`}
                  >
                    <QrCode size={12} className="flex-shrink-0 text-blue-500" />
                    <span className="truncate">{hive.qr_tag_code}</span>
                  </button>
                )}
              </h3>
              <span className="text-sm text-text-tertiary">
                {formattedDate}
                {inspection.inspection_time && ` at ${inspection.inspection_time.slice(0, 5)}`}
              </span>
              {inspection.weight != null && (
                <span className="text-sm text-text-tertiary font-medium">{inspection.weight} kg</span>
              )}
            </div>
            {inspection.profiles && inspection.user_id !== userId && sharedHiveIds.includes(inspection.hive_id) && (
              <p className="text-sm text-text-tertiary mt-0.5">
                By: <span className="font-medium text-text-secondary">
                  {(inspection.profiles.first_name && inspection.profiles.last_name)
                    ? `${inspection.profiles.first_name} ${inspection.profiles.last_name}`
                    : inspection.profiles.email}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 flex-shrink-0">
          <IconButton
            onClick={() => onEdit(inspection)}
            tone="blue"
            className="min-h-[44px] min-w-[44px] touch-manipulation"
            aria-label="Edit inspection"
          >
            <Edit2 size={18} />
          </IconButton>
          <IconButton
            onClick={() => onDelete(inspection.id)}
            tone="danger"
            className="min-h-[44px] min-w-[44px] touch-manipulation"
            aria-label="Delete inspection"
          >
            <Trash2 size={18} />
          </IconButton>
        </div>
      </div>

      <div className="border-t border-border mb-2" />

      {/* Data rows */}
      <div className="space-y-1.5 text-sm">

        {/* Queen & Brood + Drones + Propolis */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          <span><span className="text-text-secondary">Queen:</span> {inspection.queen_seen ? '✅' : '❌'}</span>
          <span><span className="text-text-secondary">Eggs:</span> {inspection.eggs_present ? '✅' : '❌'}</span>
          {inspection.brood_frames !== null && (
            <span>
              <span className="text-text-secondary">Brood:</span>{' '}
              <span className="font-bold text-purple-800">{inspection.brood_frames}</span>
              {inspection.brood_frames_per_box && inspection.brood_frames_per_box.length > 1 && (
                <span className="text-text-tertiary">
                  {' '}({inspection.brood_frames_per_box.map(b => `B${b.box ?? '?'} ${b.frames ?? 0}`).join(', ')})
                </span>
              )}
            </span>
          )}
          {hive?.configuration?.right_sized_broodbox && inspection.right_sized_frames !== null && (
            <span><span className="text-text-secondary">Right-Sized:</span> <span className="font-bold text-amber-800">{inspection.right_sized_frames}</span></span>
          )}
          {droneLabel !== null && (
            <span><span className="text-text-secondary">Drones:</span> <span className="font-semibold text-amber-800">{droneLabel}</span></span>
          )}
          {inspection.drone_brood_present !== null && (
            <span><span className="text-text-secondary">Drone Brood:</span> {inspection.drone_brood_present ? '✅' : '❌'}</span>
          )}
          {propolisLabel !== null && (
            <span><span className="text-text-secondary">Propolis:</span> <span className="font-semibold text-amber-800">{propolisLabel}</span></span>
          )}
        </div>

        {/* Queen Cells */}
        {hasQueenCells && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-sm font-semibold text-text-tertiary uppercase tracking-wide self-center">Cells:</span>
            {inspection.queen_cups && (
              <span>
                <span className="text-text-secondary">Cups:</span> <span className="font-medium">{inspection.queen_cups_number || 0}</span>
                {inspection.queen_cups_removed_all !== null && <span className="text-text-tertiary text-sm"> ({inspection.queen_cups_removed_all ? 'removed' : 'remain'})</span>}
              </span>
            )}
            {inspection.swarm_cells && (
              <span>
                <span className="text-text-secondary">Swarm:</span> <span className="font-medium">{inspection.swarm_cells_number || 0}</span>
                {inspection.swarm_cells_removed_all !== null && <span className="text-text-tertiary text-sm"> ({inspection.swarm_cells_removed_all ? 'removed' : 'remain'})</span>}
              </span>
            )}
            {inspection.supercedure_cells && (
              <span>
                <span className="text-text-secondary">Supercedure:</span> <span className="font-medium">{inspection.supercedure_cells_number || 0}</span>
                {inspection.supercedure_cells_removed_all !== null && <span className="text-text-tertiary text-sm"> ({inspection.supercedure_cells_removed_all ? 'removed' : 'remain'})</span>}
              </span>
            )}
            {inspection.emergency_cells && (
              <span>
                <span className="text-text-secondary">Emergency:</span> <span className="font-medium">{inspection.emergency_cells_number || 0}</span>
                {inspection.emergency_cells_removed_all !== null && <span className="text-text-tertiary text-sm"> ({inspection.emergency_cells_removed_all ? 'removed' : 'remain'})</span>}
              </span>
            )}
          </div>
        )}

        {/* Behaviour */}
        {hasBehaviour && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {inspection.population_strength > 0 && (
              <span><span className="text-text-secondary">Population:</span> {renderStars(inspection.population_strength)}</span>
            )}
            {inspection.temperament_rating > 0 && (
              <span><span className="text-text-secondary">Temperament:</span> {renderStars(inspection.temperament_rating)}</span>
            )}
            {inspection.brood_pattern_rating > 0 && (
              <span><span className="text-text-secondary">Brood Pattern:</span> {renderStars(inspection.brood_pattern_rating)}</span>
            )}
            {inspection.swarming_tendency > 0 && (
              <span><span className="text-text-secondary">Swarming:</span> {renderStars(inspection.swarming_tendency)}</span>
            )}
            {inspection.calmness > 0 && (
              <span><span className="text-text-secondary">Calmness:</span> {renderStars(inspection.calmness)}</span>
            )}
          </div>
        )}

        {/* Given/Taken */}
        {givenTakenItems.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-sm font-semibold text-text-tertiary uppercase tracking-wide self-center">Given/Taken:</span>
            {givenTakenItems.map(item => (
              <span key={item.label}>
                <span className="text-text-secondary">{item.label}:</span>{' '}
                <span className={`font-bold ${item.value > 0 ? 'text-forest-700 dark:text-forest-400' : 'text-red-700 dark:text-red-400'}`}>
                  {formatSignedAdjustment(item.value)}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Honey Super Fullness */}
        {superFullness.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-sm font-semibold text-text-tertiary uppercase tracking-wide self-center">Super Fullness:</span>
            {superFullness.map((value, i) => (
              <span key={`super-fullness-${i}`}>
                <span className="text-text-secondary">Super {i + 1}:</span>{' '}
                <span className="font-bold text-amber-700 dark:text-amber-400">{value}%</span>
              </span>
            ))}
          </div>
        )}

        {/* Hygienic Behaviour */}
        {hasHygienic && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-sm font-semibold text-text-tertiary uppercase tracking-wide self-center">Hygienic:</span>
            {inspection.recapping !== 3 && inspection.recapping !== 0 && (
              <span><span className="text-text-secondary">Recapping:</span> {renderStars(inspection.recapping)}</span>
            )}
            {inspection.vsh !== 3 && inspection.vsh !== 0 && (
              <span><span className="text-text-secondary">VSH:</span> {renderStars(inspection.vsh)}</span>
            )}
            {inspection.smr !== 3 && inspection.smr !== 0 && (
              <span><span className="text-text-secondary">SMR:</span> {renderStars(inspection.smr)}</span>
            )}
          </div>
        )}

        {/* Disease */}
        {hasDisease && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-sm font-semibold text-text-tertiary uppercase tracking-wide self-center">Disease:</span>
            {inspection.afb_disease > 0 && <span><span className="text-text-secondary">AFB:</span> {renderStars(inspection.afb_disease)}</span>}
            {inspection.efb_disease > 0 && <span><span className="text-text-secondary">EFB:</span> {renderStars(inspection.efb_disease)}</span>}
            {inspection.chalkbrood_disease > 0 && <span><span className="text-text-secondary">Chalkbrood:</span> {renderStars(inspection.chalkbrood_disease)}</span>}
            {inspection.nosemosis_disease > 0 && <span><span className="text-text-secondary">Nosemosis:</span> {renderStars(inspection.nosemosis_disease)}</span>}
            {inspection.dwv_disease > 0 && <span><span className="text-text-secondary">DWV:</span> {renderStars(inspection.dwv_disease)}</span>}
            {inspection.iapv_cbpv_disease > 0 && <span><span className="text-text-secondary">IAPV & CBPV:</span> {renderStars(inspection.iapv_cbpv_disease)}</span>}
            {hasVarroa && (
              <span>
                <span className="text-text-secondary">Varroa:</span>{' '}
                {inspection.varroa_disease > 0 && renderStars(inspection.varroa_disease)}
                {varroaLocations.length > 0 && (
                  <span className="text-text-tertiary">{inspection.varroa_disease > 0 ? ' ' : ''}({varroaLocations.join(', ')})</span>
                )}
              </span>
            )}
          </div>
        )}

        {/* Weather — single compact line */}
        {hasWeather && (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-text-tertiary">
            <span>🌤️</span>
            {inspection.weather_temp !== null && <span>{inspection.weather_temp}°C</span>}
            {inspection.weather_condition && <><span>·</span><span>{inspection.weather_condition}</span></>}
            {inspection.weather_humidity !== null && <><span>·</span><span>{inspection.weather_humidity}%</span></>}
            {inspection.weather_wind_speed !== null && <><span>·</span><span>{inspection.weather_wind_speed} km/h</span></>}
          </div>
        )}

        {/* Notes */}
        {inspection.notes && (
          <p className="text-sm text-text-tertiary">
            <span className="font-medium text-text-secondary">Notes: </span>
            {inspection.notes}
          </p>
        )}

      </div>

      {qrModalOpen && hive?.qr_tag_code && (
        <ModalShell
          title={`Hive ${inspection.hives?.hive_number || hive.hive_number} — QR Code`}
          onClose={() => setQrModalOpen(false)}
          closeOnBackdrop
          maxWidthClassName="max-w-sm"
        >
          <HiveQRCode tagCode={hive.qr_tag_code} hiveNumber={inspection.hives?.hive_number || hive.hive_number} />
        </ModalShell>
      )}
    </div>
  )
}
