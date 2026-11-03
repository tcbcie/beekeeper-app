'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import Image from 'next/image'
import { Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useHiveModels } from '@/hooks/useHiveModels'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useSubmitLock } from '@/hooks/useSubmitLock'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { deleteUploadedImages } from '@/lib/upload-image'
import { normaliseStoragePublicUrl } from '@/lib/storage-url'
import {
  HIVE_MAKE_SUGGESTIONS,
  HIVE_MODEL_MATERIALS,
  describeHiveModel,
  modelFramesPerBox,
} from '@/lib/hive-model'
import type { HiveModel, HiveModelInput, HiveModelMaterial } from '@/types/hive-model'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import ModalShell from '@/components/ui/ModalShell'
import TextInput from '@/components/ui/TextInput'
import SelectField from '@/components/ui/SelectField'
import TextAreaField from '@/components/ui/TextAreaField'
import SegmentedControl from '@/components/ui/SegmentedControl'
import ImageZoomModal from '@/components/ui/ImageZoomModal'
import { SkeletonRow } from '@/components/ui/Skeleton'
import PhotoField from '@/components/hive/PhotoField'

interface FormState {
  name: string
  hive_system_id: string
  hive_size: 'full' | 'nuc'
  manufacturer: string
  material: HiveModelMaterial | ''
  frames_per_box: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: '',
  hive_system_id: '',
  hive_size: 'full',
  manufacturer: '',
  material: '',
  frames_per_box: '',
  notes: '',
}

const SIZE_OPTIONS = [
  { value: 'full', label: 'Full hive' },
  { value: 'nuc', label: 'Nuc' },
] as const

function toForm(model: HiveModel): FormState {
  return {
    name: model.name,
    hive_system_id: model.hive_system_id ?? '',
    hive_size: model.hive_size,
    manufacturer: model.manufacturer ?? '',
    material: model.material ?? '',
    frames_per_box: model.frames_per_box ? String(model.frames_per_box) : '',
    notes: model.notes ?? '',
  }
}

/** Parse the frames field: blank means "use the system default"; anything else must be 1 to 20. */
function parseFrames(value: string): number | null | 'invalid' {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : 'invalid'
}

/** Add, edit and delete the signed-in user's hive models. */
export default function HiveModelManager({ userId }: { userId: string }) {
  const toast = useToast()
  const confirm = useConfirm()
  const { ownModels, activeSystems, systemsById, loading, error, reload } = useHiveModels(userId)
  const { submitting, run } = useSubmitLock()
  const makeListId = useId()

  const [usage, setUsage] = useState<Map<string, number>>(new Map())
  const [editing, setEditing] = useState<HiveModel | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)

  const {
    imageFile,
    imagePreview,
    uploading,
    handleImageChange,
    handleRemoveImage,
    uploadImage,
    reset: resetImage,
    setPreviewFromUrl,
  } = useImageUpload({
    bucket: 'apiary-images',
    folder: `${userId}/hive-models`,
    onError: (message) => toast.error(message),
  })

  // How many of the user's hives use each model, for the list and the delete warning.
  const loadUsage = useCallback(async () => {
    const { data, error: usageError } = await supabase
      .from('hives')
      .select('hive_model_id')
      .eq('user_id', userId)
      .not('hive_model_id', 'is', null)
    if (usageError) {
      // Counts are a hint only; keep the last ones rather than showing zeros.
      console.error('Failed to count hive model use:', usageError)
      return
    }
    const counts = new Map<string, number>()
    for (const row of (data ?? []) as { hive_model_id: string }[]) {
      counts.set(row.hive_model_id, (counts.get(row.hive_model_id) ?? 0) + 1)
    }
    setUsage(counts)
  }, [userId])

  useEffect(() => {
    loadUsage()
  }, [loadUsage])

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    resetImage()
    setFormOpen(true)
  }

  const openEdit = (model: HiveModel) => {
    setEditing(model)
    setForm(toForm(model))
    resetImage()
    setPreviewFromUrl(normaliseStoragePublicUrl(model.image_url))
    setFormOpen(true)
  }

  const closeForm = () => {
    if (submitting) return
    setFormOpen(false)
    setEditing(null)
    resetImage()
  }

  const selectedSystem = form.hive_system_id ? systemsById.get(form.hive_system_id) : undefined
  const defaultFrames = selectedSystem
    ? (form.hive_size === 'nuc' ? selectedSystem.default_frames_nuc : selectedSystem.default_frames_full)
    : null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    run(async () => {
      const name = form.name.trim()
      if (!name) {
        toast.error('Please give the hive model a name')
        return
      }
      const frames = parseFrames(form.frames_per_box)
      if (frames === 'invalid') {
        toast.error('Frames per box must be a whole number from 1 to 20')
        return
      }

      let uploadedUrl: string | null = null
      let imageUrl: string | null = editing?.image_url ?? null
      if (imageFile) {
        uploadedUrl = await uploadImage(imageFile)
        if (!uploadedUrl) return // uploadImage has already said why
        imageUrl = uploadedUrl
      } else if (!imagePreview) {
        // Removed: the old file is queued for deletion by the database trigger.
        imageUrl = null
      }

      const row: HiveModelInput & { image_url: string | null } = {
        name,
        hive_system_id: form.hive_system_id || null,
        hive_size: form.hive_size,
        manufacturer: form.manufacturer.trim() || null,
        material: form.material || null,
        frames_per_box: frames,
        notes: form.notes.trim() || null,
        image_url: imageUrl,
      }

      const result = editing
        ? await supabase.from('hive_models').update(row).eq('id', editing.id).select('id')
        : await supabase.from('hive_models').insert(row).select('id')

      if (result.error || !result.data?.length) {
        if (uploadedUrl) await deleteUploadedImages([uploadedUrl])
        if (result.error?.code === '23505') {
          toast.error('You already have a hive model with this name')
        } else {
          console.error('Failed to save hive model:', result.error)
          toast.error(result.error?.message || 'The hive model could not be saved')
        }
        return
      }

      toast.success(editing ? 'Hive model saved' : 'Hive model added')
      setFormOpen(false)
      setEditing(null)
      resetImage()
      await reload()
    })
  }

  const handleDelete = async (model: HiveModel) => {
    const used = usage.get(model.id) ?? 0
    const ok = await confirm({
      title: `Delete ${model.name}?`,
      message: used > 0
        ? `${used} ${used === 1 ? 'hive uses' : 'hives use'} this model. ${used === 1 ? 'It' : 'They'} will show no hive model. This can't be undone.`
        : "This can't be undone.",
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    await run(async () => {
      const { data, error: deleteError } = await supabase
        .from('hive_models')
        .delete()
        .eq('id', model.id)
        .select('id')
      if (deleteError || !data?.length) {
        console.error('Failed to delete hive model:', deleteError)
        toast.error(deleteError?.message || 'The hive model could not be deleted')
        return
      }
      toast.success('Hive model deleted')
      await Promise.all([reload(), loadUsage()])
    })
  }

  const showSkeleton = loading && ownModels.length === 0

  return (
    <div className="space-y-4">
      <p className="text-base text-text-secondary">
        Describe each kind of hive you use once, then pick it on each hive. The hive card then shows
        the system, make and frames, so you know what gear fits.
      </p>

      {error && ownModels.length === 0 && !loading && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-base text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          Hive models could not be loaded. <button type="button" className="underline min-h-[48px]" onClick={() => reload()}>Try again</button>
        </div>
      )}

      {showSkeleton ? (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : ownModels.length === 0 && !error ? (
        <EmptyState
          icon={Package}
          title="No hive models yet"
          description="Add the kinds of hive you use, for example Abelo poly National or Payne's poly nuc."
          actionLabel="Add a hive model"
          actionOnClick={openNew}
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface dark:bg-surface-elevated">
          {ownModels.map((model) => {
            const system = model.hive_system_id ? systemsById.get(model.hive_system_id) : undefined
            const description = describeHiveModel(model, system)
            const frames = modelFramesPerBox(model, system)
            const used = usage.get(model.id) ?? 0
            const photo = normaliseStoragePublicUrl(model.image_url)
            return (
              <li key={model.id} className="flex items-center gap-3 p-3">
                {photo ? (
                  <button
                    type="button"
                    onClick={() => setZoomUrl(photo)}
                    className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border border-border"
                    aria-label={`Enlarge photo of ${model.name}`}
                  >
                    <Image src={photo} alt="" fill className="object-cover" unoptimized />
                  </button>
                ) : (
                  <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-surface-secondary text-text-tertiary">
                    <Package size={24} aria-hidden="true" />
                  </span>
                )}
                <button type="button" onClick={() => openEdit(model)} className="min-w-0 flex-1 text-left min-h-[48px]">
                  <span className="block text-base font-semibold text-foreground truncate">{model.name}</span>
                  {description && <span className="block text-sm text-text-secondary truncate">{description}</span>}
                  <span className="block text-sm text-text-tertiary">
                    {frames ? `${frames} frames per box · ` : ''}
                    {used === 0 ? 'Not on any hive' : `On ${used} ${used === 1 ? 'hive' : 'hives'}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(model)}
                  className="fj-icon-btn min-h-[48px] min-w-[48px]"
                  aria-label={`Edit ${model.name}`}
                >
                  <Pencil size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(model)}
                  disabled={submitting}
                  className="fj-icon-btn fj-icon-btn-danger min-h-[48px] min-w-[48px]"
                  aria-label={`Delete ${model.name}`}
                >
                  <Trash2 size={20} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {(ownModels.length > 0 || error) && (
        <Button tone="success" fullWidth className="min-h-[56px]" onClick={openNew}>
          <Plus size={20} className="mr-2" aria-hidden="true" />
          Add a hive model
        </Button>
      )}

      {formOpen && (
        <ModalShell
          title={editing ? 'Edit hive model' : 'New hive model'}
          onClose={closeForm}
          closeDisabled={submitting}
          maxWidthClassName="md:max-w-lg"
          bodyClassName="p-4 md:p-6"
          footer={
            <div className="flex gap-3 border-t border-border p-4">
              <Button onClick={closeForm} disabled={submitting} className="flex-1 min-h-[56px]">
                Cancel
              </Button>
              <Button
                type="submit"
                form="hive-model-form"
                tone="success"
                disabled={submitting || uploading}
                className="flex-1 min-h-[56px]"
              >
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          }
        >
          <form id="hive-model-form" onSubmit={handleSave} className="space-y-4">
            <TextInput
              label="Name"
              required
              value={form.name}
              maxLength={80}
              placeholder="e.g. Abelo poly National"
              enterKeyHint="next"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <SelectField
              label="Hive system"
              value={form.hive_system_id}
              onChange={(e) => setForm({ ...form, hive_system_id: e.target.value })}
            >
              <option value="">Not set</option>
              {activeSystems.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              {/* Keep a retired system selectable on a model that already uses it */}
              {selectedSystem && !selectedSystem.is_active && (
                <option value={selectedSystem.id}>{selectedSystem.name}</option>
              )}
            </SelectField>
            <SegmentedControl
              label="Size"
              options={SIZE_OPTIONS}
              value={form.hive_size}
              onChange={(value) => setForm({ ...form, hive_size: value })}
            />
            <div>
              <TextInput
                label="Make"
                value={form.manufacturer}
                maxLength={80}
                list={makeListId}
                placeholder="e.g. Abelo, Payne's, Maismore"
                enterKeyHint="next"
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              />
              <datalist id={makeListId}>
                {HIVE_MAKE_SUGGESTIONS.map((make) => <option key={make} value={make} />)}
              </datalist>
            </div>
            <SelectField
              label="Material"
              value={form.material}
              onChange={(e) => setForm({ ...form, material: e.target.value as HiveModelMaterial | '' })}
            >
              <option value="">Not set</option>
              {HIVE_MODEL_MATERIALS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </SelectField>
            <TextInput
              label="Frames per box"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={form.frames_per_box}
              placeholder={defaultFrames ? String(defaultFrames) : ''}
              helpText={defaultFrames ? `Leave blank to use ${defaultFrames}, the usual for this system` : undefined}
              onChange={(e) => setForm({ ...form, frames_per_box: e.target.value })}
            />
            <PhotoField
              label="Photo"
              preview={imagePreview}
              uploading={uploading}
              onChange={handleImageChange}
              onRemove={handleRemoveImage}
              onEnlarge={setZoomUrl}
            />
            <TextAreaField
              label="Notes"
              value={form.notes}
              maxLength={2000}
              rows={3}
              placeholder="e.g. Takes National supers; use a poly crown board"
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </form>
        </ModalShell>
      )}

      <ImageZoomModal isOpen={zoomUrl !== null} imageUrl={zoomUrl} onClose={() => setZoomUrl(null)} />
    </div>
  )
}
