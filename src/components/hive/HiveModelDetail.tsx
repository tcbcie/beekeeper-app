'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getCurrentUserId } from '@/lib/auth'
import { useHiveModels } from '@/hooks/useHiveModels'
import { describeHiveModel, hivePhotoUrl, modelFramesPerBox } from '@/lib/hive-model'
import { normaliseStoragePublicUrl } from '@/lib/storage-url'
import ImageZoomModal from '@/components/ui/ImageZoomModal'

/** The hive's model and photo on the hive page. Renders nothing when the hive has neither. */
export default function HiveModelDetail({ hive }: { hive: { hive_model_id?: string | null; image_url?: string | null } }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCurrentUserId().then((id) => { if (!cancelled) setUserId(id) })
    return () => { cancelled = true }
  }, [])

  const { modelsById, systemsById, frameStandardsById } = useHiveModels(hive.hive_model_id ? userId : null)
  const model = hive.hive_model_id ? modelsById.get(hive.hive_model_id) : undefined
  const system = model?.hive_system_id ? systemsById.get(model.hive_system_id) : undefined
  const frames = model ? modelFramesPerBox(model, system) : null
  const broodFrame = system?.brood_frame_standard_id ? frameStandardsById.get(system.brood_frame_standard_id) : undefined
  const photo = normaliseStoragePublicUrl(hivePhotoUrl(hive, model))

  if (!model && !photo) return null

  return (
    <div className="pt-2 space-y-2">
      {model && (
        <div className="flex justify-between gap-3">
          <span className="text-text-tertiary">Hive model:</span>
          <span className="text-right">
            <span className="block font-medium text-text-primary">{model.name}</span>
            {describeHiveModel(model, system) && (
              <span className="block text-sm text-text-secondary">{describeHiveModel(model, system)}</span>
            )}
            {(broodFrame || frames) && (
              <span className="block text-sm text-text-secondary">
                {[broodFrame?.label && `${broodFrame.label} frames`, frames && `${frames} per box`].filter(Boolean).join(', ')}
              </span>
            )}
          </span>
        </div>
      )}
      {model?.notes && <p className="text-sm text-text-secondary">{model.notes}</p>}
      {photo && (
        <button
          type="button"
          onClick={() => setZoomUrl(photo)}
          className="relative block h-40 w-full max-w-xs overflow-hidden rounded-lg border border-border"
          aria-label="Enlarge hive photo"
        >
          <Image src={photo} alt="" fill className="object-cover" unoptimized />
        </button>
      )}
      <ImageZoomModal isOpen={zoomUrl !== null} imageUrl={zoomUrl} onClose={() => setZoomUrl(null)} />
    </div>
  )
}
