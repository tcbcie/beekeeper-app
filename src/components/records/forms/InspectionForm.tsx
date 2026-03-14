'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, ChevronUp, Camera, X } from 'lucide-react'
import Image from 'next/image'
import type { Hive, Apiary, InspectionFormData } from '@/types/records'
import { getDefaultInspectionFormData } from '@/types/records'
import { useImageUpload } from '@/hooks/useImageUpload'
import Button from '@/components/ui/Button'

interface InspectionFormProps {
  initialData: InspectionFormData | null
  hives: Hive[]
  apiaries: Apiary[]
  previousRightSizedFramesByHive?: Record<string, number | null>
  selectedApiaryId?: string
  selectedHiveId?: string
  isEditing?: boolean
  userHasActiveSubscription: boolean
  onSubmit: (formData: InspectionFormData, imageFile: File | null) => Promise<void>
  onCancel: () => void
  onHiveChange: (hiveId: string) => Promise<void>
  onImageClick: (url: string) => void
  fetchingWeather?: boolean
}

const numberSelectorSelectedClasses = {
  purple: 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300',
  forest: 'bg-forest-600 text-white shadow-lg ring-2 ring-forest-300'
} as const

type NumberSelectorTheme = keyof typeof numberSelectorSelectedClasses
type GivenTakenFieldKey =
  | 'frames_foundation'
  | 'frames_brood'
  | 'frames_drawn'
  | 'honey_supers'
  | 'drone_frames'
  | 'store_frames'

const givenTakenFields: Array<{ key: GivenTakenFieldKey; label: string }> = [
  { key: 'frames_foundation', label: 'Foundation' },
  { key: 'frames_brood', label: 'Brood' },
  { key: 'frames_drawn', label: 'Drawn' },
  { key: 'honey_supers', label: 'Honey Supers' },
  { key: 'drone_frames', label: 'Drone Frames' },
  { key: 'store_frames', label: 'Store Frames' },
]

function parseSignedInteger(value: string): number {
  if (value.trim() === '' || value === '-') {
    return 0
  }

  const parsedValue = Number.parseInt(value, 10)
  return Number.isNaN(parsedValue) ? 0 : parsedValue
}

function createGivenTakenDrafts(data: Pick<InspectionFormData, GivenTakenFieldKey>): Record<GivenTakenFieldKey, string> {
  return givenTakenFields.reduce((drafts, field) => {
    drafts[field.key] = String(data[field.key] ?? 0)
    return drafts
  }, {} as Record<GivenTakenFieldKey, string>)
}

function normaliseGivenTakenValues(
  data: InspectionFormData,
  drafts: Record<GivenTakenFieldKey, string>
): InspectionFormData {
  const nextData = { ...data }

  for (const field of givenTakenFields) {
    nextData[field.key] = parseSignedInteger(drafts[field.key])
  }

  return nextData
}

export default function InspectionForm({
  initialData,
  hives,
  apiaries,
  previousRightSizedFramesByHive = {},
  selectedApiaryId = '',
  selectedHiveId = '',
  isEditing = false,
  userHasActiveSubscription,
  onSubmit,
  onCancel,
  onHiveChange,
  onImageClick,
  fetchingWeather = false
}: InspectionFormProps) {
  const buildInitialFormData = () => initialData || getDefaultInspectionFormData()

  const [formData, setFormData] = useState<InspectionFormData>(buildInitialFormData)
  const [givenTakenDrafts, setGivenTakenDrafts] = useState<Record<GivenTakenFieldKey, string>>(
    () => createGivenTakenDrafts(buildInitialFormData())
  )
  const [formApiaryId, setFormApiaryId] = useState<string>(selectedApiaryId)
  const [submitting, setSubmitting] = useState(false)
  const previousInitialDataRef = useRef<InspectionFormData | null>(initialData)
  const lastRightSizedPrefillKeyRef = useRef<string | null>(null)

  // Collapsible section states
  const [queenCellsExpanded, setQueenCellsExpanded] = useState(false)
  const [dronesExpanded, setDronesExpanded] = useState(false)
  const [givenTakenExpanded, setGivenTakenExpanded] = useState(false)
  const [hygienicBehaviourExpanded, setHygienicBehaviourExpanded] = useState(false)
  const [diseaseExpanded, setDiseaseExpanded] = useState(false)

  const {
    imageFile,
    imagePreview,
    handleImageChange,
    handleRemoveImage,
    setPreviewFromUrl,
    reset: resetImage
  } = useImageUpload({
    bucket: 'inspection-images',
    folder: 'inspections'
  })

  const getApiaryIdForHive = useCallback((hiveId: string) => {
    if (!hiveId) {
      return ''
    }

    return hives.find(hive => hive.id === hiveId)?.apiary_id ?? ''
  }, [hives])

  const getPreviousRightSizedFrames = useCallback((hiveId: string) => {
    if (!hiveId) {
      return null
    }

    const previousValue = previousRightSizedFramesByHive[hiveId]
    return typeof previousValue === 'number' && previousValue > 0 ? previousValue : null
  }, [previousRightSizedFramesByHive])

  // Update form data when initialData changes
  useEffect(() => {
    if (!initialData) {
      if (previousInitialDataRef.current) {
        const defaultFormData = getDefaultInspectionFormData()
        setFormData(defaultFormData)
        setGivenTakenDrafts(createGivenTakenDrafts(defaultFormData))
        setFormApiaryId(selectedApiaryId)
        resetImage()
      }
      previousInitialDataRef.current = null
      return
    }

    setFormData(initialData)
    setGivenTakenDrafts(createGivenTakenDrafts(initialData))
    setFormApiaryId(getApiaryIdForHive(initialData.hive_id))
    if (initialData.image_url) {
      setPreviewFromUrl(initialData.image_url)
    } else {
      resetImage()
    }
    previousInitialDataRef.current = initialData
  }, [getApiaryIdForHive, initialData, resetImage, selectedApiaryId, setPreviewFromUrl])

  useEffect(() => {
    if (isEditing || initialData?.hive_id) {
      return
    }

    if (selectedHiveId) {
      const selectedHive = hives.find(hive => hive.id === selectedHiveId)

      if (!selectedHive) {
        return
      }

      const nextApiaryId = selectedHive.apiary_id ?? selectedApiaryId
      setFormApiaryId(prev => prev !== nextApiaryId ? nextApiaryId : prev)
      setFormData(prev => prev.hive_id !== selectedHiveId ? { ...prev, hive_id: selectedHiveId } : prev)
      return
    }

    if (!selectedApiaryId) {
      return
    }

    setFormApiaryId(prev => prev !== selectedApiaryId ? selectedApiaryId : prev)
    setFormData(prev => {
      if (!prev.hive_id) {
        return prev
      }

      const hiveApiaryId = getApiaryIdForHive(prev.hive_id)
      return hiveApiaryId && hiveApiaryId !== selectedApiaryId
        ? { ...prev, hive_id: '' }
        : prev
    })
  }, [getApiaryIdForHive, hives, initialData?.hive_id, isEditing, selectedApiaryId, selectedHiveId])

  useEffect(() => {
    if (isEditing) {
      const previousValue = formData.hive_id ? getPreviousRightSizedFrames(formData.hive_id) : null
      lastRightSizedPrefillKeyRef.current = formData.hive_id
        ? `${formData.hive_id}:${previousValue ?? 'null'}`
        : null
      return
    }

    const currentHiveId = formData.hive_id

    if (!currentHiveId) {
      if (lastRightSizedPrefillKeyRef.current !== null) {
        lastRightSizedPrefillKeyRef.current = null
        setFormData(prev => prev.right_sized_frames !== null ? { ...prev, right_sized_frames: null } : prev)
      }
      return
    }

    const previousValue = getPreviousRightSizedFrames(currentHiveId)
    const nextPrefillKey = `${currentHiveId}:${previousValue ?? 'null'}`

    if (lastRightSizedPrefillKeyRef.current === nextPrefillKey) {
      return
    }

    lastRightSizedPrefillKeyRef.current = nextPrefillKey

    setFormData(prev => (
      prev.hive_id === currentHiveId && prev.right_sized_frames !== previousValue
        ? { ...prev, right_sized_frames: previousValue }
        : prev
    ))
  }, [formData.hive_id, getPreviousRightSizedFrames, isEditing])

  const handleHiveSelect = async (hiveId: string) => {
    setFormData(prev => ({ ...prev, hive_id: hiveId }))
    setFormApiaryId(prev => hiveId ? getApiaryIdForHive(hiveId) : prev)
    if (hiveId) {
      await onHiveChange(hiveId)
    }
  }

  const setGivenTakenValue = useCallback((field: GivenTakenFieldKey, value: number) => {
    const normalisedValue = Number.isNaN(value) ? 0 : value

    setFormData(prev => prev[field] === normalisedValue ? prev : { ...prev, [field]: normalisedValue })
    setGivenTakenDrafts(prev => (
      prev[field] === String(normalisedValue)
        ? prev
        : { ...prev, [field]: String(normalisedValue) }
    ))
  }, [])

  const handleGivenTakenDraftChange = useCallback((field: GivenTakenFieldKey, nextValue: string) => {
    if (!/^-?\d*$/.test(nextValue)) {
      return
    }

    setGivenTakenDrafts(prev => prev[field] === nextValue ? prev : { ...prev, [field]: nextValue })

    if (nextValue !== '' && nextValue !== '-') {
      const parsedValue = Number.parseInt(nextValue, 10)

      if (!Number.isNaN(parsedValue)) {
        setFormData(prev => prev[field] === parsedValue ? prev : { ...prev, [field]: parsedValue })
      }
    }
  }, [])

  const handleGivenTakenBlur = useCallback((field: GivenTakenFieldKey) => {
    setGivenTakenValue(field, parseSignedInteger(givenTakenDrafts[field]))
  }, [givenTakenDrafts, setGivenTakenValue])

  const adjustGivenTakenValue = useCallback((field: GivenTakenFieldKey, delta: number) => {
    setGivenTakenValue(field, parseSignedInteger(givenTakenDrafts[field]) + delta)
  }, [givenTakenDrafts, setGivenTakenValue])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = normaliseGivenTakenValues(formData, givenTakenDrafts)
    setFormData(submitData)
    setGivenTakenDrafts(createGivenTakenDrafts(submitData))
    setSubmitting(true)
    try {
      await onSubmit(submitData, imageFile)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    resetImage()
    onCancel()
  }

  const handleRemoveCurrentImage = () => {
    handleRemoveImage()
    setFormData(prev => ({ ...prev, image_url: null }))
  }

  const filteredHives = hives
    .filter(h => !h.archived_at)
    .filter(h => !formApiaryId || h.apiary_id === formApiaryId)

  const selectedHive = hives.find(h => h.id === formData.hive_id)

  // Render star rating component
  const renderStarRating = useCallback((value: number, onChange: (val: number) => void, label: string) => (
    <div>
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-sm font-medium text-text-secondary sm:pr-2">{label}</label>
        <Button
          unstyled
          type="button"
          onClick={() => onChange(0)}
          aria-label={`Clear ${label} rating`}
          className="min-h-[36px] w-full px-3 sm:min-h-[32px] sm:w-auto rounded-md border border-border bg-surface-elevated text-[11px] sm:text-xs font-semibold text-text-secondary hover:bg-surface-secondary hover:text-text-primary whitespace-nowrap transition-colors touch-manipulation"
        >
          Clear
        </Button>
      </div>
      <div className="flex flex-wrap sm:flex-nowrap gap-1 sm:gap-1.5 max-w-full">
        {[1, 2, 3, 4, 5].map((star) => (
          <Button
          unstyled
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${label}: ${star} star${star === 1 ? '' : 's'}`}
            aria-pressed={value === star}
            className={`min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] rounded-lg text-lg sm:text-xl flex items-center justify-center transition-all touch-manipulation ${
              value >= star
                ? 'bg-yellow-400 text-white'
                : 'bg-surface-elevated border border-border hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
            }`}
          >
            {'\u2605'}
          </Button>
        ))}
      </div>
    </div>
  ), [])

  // Render number selector (1-10)
  const renderNumberSelector = useCallback((value: number | null, onChange: (val: number | null) => void, label: string, color: NumberSelectorTheme = 'purple') => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-text-secondary mb-3">
        {label} {value !== null ? `(${value})` : ''}
      </label>
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-11 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <Button
          unstyled
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`min-h-[48px] min-w-[48px] sm:min-h-[52px] sm:min-w-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
              value === num
                ? numberSelectorSelectedClasses[color]
                : 'bg-surface-elevated text-foreground hover:bg-surface-secondary active:bg-surface-secondary border border-border'
            }`}
          >
            {num}
          </Button>
        ))}
        <Button
          unstyled
          type="button"
          onClick={() => onChange(null)}
          className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-sm transition-all touch-manipulation col-span-5 sm:col-span-2 md:col-span-1 ${
            value === null
              ? 'bg-surface-secondary text-foreground shadow-lg ring-2 ring-border'
              : 'bg-surface-elevated text-foreground hover:bg-surface-secondary active:bg-surface-secondary border border-border'
          }`}
        >
          Clear
        </Button>
      </div>
    </div>
  ), [])

  // Render yes/no toggle with counter
  const renderCellSection = useCallback((
    title: string,
    present: boolean,
    onPresentChange: (val: boolean) => void,
    count: number,
    onCountChange: (val: number) => void,
    removedAll: boolean,
    onRemovedAllChange: (val: boolean) => void
  ) => (
    <div className="bg-surface-secondary p-3 rounded-lg">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="text-sm font-medium leading-tight text-text-secondary">{title}</label>
        <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto">
          <Button
          unstyled
            type="button"
            onClick={() => onPresentChange(true)}
            className={`min-h-[36px] w-full px-3 sm:w-auto sm:px-4 rounded-lg font-semibold transition-all flex items-center justify-center ${
              present === true
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-surface-elevated text-foreground hover:bg-surface-elevated dark:hover:bg-surface-elevated border border-border'
            }`}
          >
            YES
          </Button>
          <Button
          unstyled
            type="button"
            onClick={() => {
              onPresentChange(false)
              onCountChange(0)
              onRemovedAllChange(false)
            }}
            className={`min-h-[36px] w-full px-3 sm:w-auto sm:px-4 rounded-lg font-semibold transition-all flex items-center justify-center ${
              present === false
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-surface-elevated text-foreground hover:bg-surface-elevated dark:hover:bg-surface-elevated border border-border'
            }`}
          >
            NO
          </Button>
        </div>
      </div>
      {present && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-2">Number</label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
          unstyled
                type="button"
                onClick={() => onCountChange(Math.max(0, count - 1))}
                className="min-h-[36px] px-3 py-2 bg-surface-secondary hover:bg-surface-elevated rounded font-bold border border-border text-text-primary"
              >
                -
              </Button>
              <input
                type="number"
                value={count}
                onChange={(e) => onCountChange(parseInt(e.target.value) || 0)}
                className="h-[36px] w-20 px-3 py-2 border rounded text-center"
                min="0"
              />
              <Button
          unstyled
                type="button"
                onClick={() => onCountChange(count + 1)}
                className="min-h-[36px] px-3 py-2 bg-surface-secondary hover:bg-surface-elevated rounded font-bold border border-border text-text-primary"
              >
                +
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-2">Removed all</label>
            <div className="flex gap-2">
              <Button
          unstyled
                type="button"
                onClick={() => onRemovedAllChange(true)}
                className={`flex-1 min-h-[36px] rounded-lg font-semibold transition-all ${
                  removedAll === true
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-surface-elevated text-foreground hover:bg-surface-elevated dark:hover:bg-surface-elevated border border-border'
                }`}
              >
                YES
              </Button>
              <Button
          unstyled
                type="button"
                onClick={() => onRemovedAllChange(false)}
                className={`flex-1 min-h-[36px] rounded-lg font-semibold transition-all ${
                  removedAll === false
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-surface-elevated text-foreground hover:bg-surface-elevated dark:hover:bg-surface-elevated border border-border'
                }`}
              >
                NO
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  ), [])

  return (
    <div className="bg-surface rounded-lg shadow border border-border p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="text-xl font-semibold text-foreground">
          {initialData?.hive_id ? 'Edit Inspection' : 'Record New Inspection'}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
          unstyled
            type="submit"
            form="inspection-form"
            disabled={submitting || fetchingWeather}
            className="px-6 py-3 sm:py-2 min-h-[48px] bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-700 disabled:bg-surface-secondary disabled:cursor-not-allowed transition-all touch-manipulation font-medium"
          >
            {submitting ? 'Saving...' : fetchingWeather ? 'Fetching Weather...' : initialData?.hive_id ? 'Update' : 'Save'} Inspection
          </Button>
          <Button
          unstyled
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 sm:py-2 min-h-[48px] bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated border border-border active:bg-surface-elevated touch-manipulation font-medium"
          >
            Cancel
          </Button>
        </div>
      </div>

      <form id="inspection-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inspection Details Section */}
        <div className="md:col-span-2 p-4 rounded-lg border border-border">
          <h4 className="text-sm font-semibold text-foreground mb-4">Inspection Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Apiary</label>
              <select
                value={formApiaryId}
                onChange={(e) => {
                  setFormApiaryId(e.target.value)
                  setFormData(prev => ({ ...prev, hive_id: '' }))
                }}
                className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface text-foreground"
              >
                <option value="">All Apiaries</option>
                {apiaries.map((apiary) => (
                  <option key={apiary.id} value={apiary.id}>
                    {apiary.name}{apiary.is_shared ? ' (Shared)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Hive *</label>
              <select
                value={formData.hive_id}
                onChange={(e) => handleHiveSelect(e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface text-foreground"
                required
              >
                <option value="">Select hive</option>
                {filteredHives.map((h) => (
                  <option key={h.id} value={h.id}>{h.hive_number}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Date *</label>
              <input
                type="date"
                value={formData.inspection_date}
                onChange={(e) => setFormData(prev => ({ ...prev, inspection_date: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Time *</label>
              <input
                type="time"
                value={formData.inspection_time}
                onChange={(e) => setFormData(prev => ({ ...prev, inspection_time: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={formData.weight ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value ? parseFloat(e.target.value) : null }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        {/* Queen & Brood Section */}
        <div className="md:col-span-2 p-4 rounded-lg border border-border">
          <h4 className="text-sm font-semibold text-foreground mb-4">Queen & Brood</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <label className="flex items-center gap-3 p-3 bg-surface rounded-lg cursor-pointer touch-manipulation hover:bg-surface-elevated active:bg-surface-elevated border border-purple-200 dark:border-purple-800">
              <input
                type="checkbox"
                checked={formData.queen_seen}
                onChange={(e) => setFormData(prev => ({ ...prev, queen_seen: e.target.checked }))}
                className="h-5 w-5 min-h-[20px] min-w-[20px] rounded border-border text-purple-600 focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-text-secondary">Queen Seen</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-surface rounded-lg cursor-pointer touch-manipulation hover:bg-surface-elevated active:bg-surface-elevated border border-purple-200 dark:border-purple-800">
              <input
                type="checkbox"
                checked={formData.eggs_present}
                onChange={(e) => setFormData(prev => ({ ...prev, eggs_present: e.target.checked }))}
                className="h-5 w-5 min-h-[20px] min-w-[20px] rounded border-border text-purple-600 focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-text-secondary">Eggs Present</span>
            </label>
          </div>

          {renderNumberSelector(
            formData.brood_frames,
            (val) => setFormData(prev => ({ ...prev, brood_frames: val })),
            'Frames with Brood'
          )}

          {selectedHive?.configuration?.right_sized_broodbox && renderNumberSelector(
            formData.right_sized_frames,
            (val) => setFormData(prev => ({ ...prev, right_sized_frames: val })),
            'Right-Sized to How Many Frames',
            'forest'
          )}

          {/* Queen Cells Subsection - Collapsible */}
          <div className="mt-4 rounded-lg border border-border">
            <Button
          unstyled
              type="button"
              onClick={() => setQueenCellsExpanded(!queenCellsExpanded)}
              className="w-full p-3 flex items-center justify-between hover:bg-surface-elevated transition-colors rounded-t-lg"
            >
              <h5 className="text-sm font-semibold text-foreground">Queen Cells</h5>
              {queenCellsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </Button>

            {queenCellsExpanded && (
              <div className="p-4 pt-0 space-y-4">
                {renderCellSection(
                  'Queen Cups',
                  formData.queen_cups,
                  (val) => setFormData(prev => ({ ...prev, queen_cups: val })),
                  formData.queen_cups_number,
                  (val) => setFormData(prev => ({ ...prev, queen_cups_number: val })),
                  formData.queen_cups_removed_all,
                  (val) => setFormData(prev => ({ ...prev, queen_cups_removed_all: val }))
                )}
                {renderCellSection(
                  'Swarm Cells',
                  formData.swarm_cells,
                  (val) => setFormData(prev => ({ ...prev, swarm_cells: val })),
                  formData.swarm_cells_number,
                  (val) => setFormData(prev => ({ ...prev, swarm_cells_number: val })),
                  formData.swarm_cells_removed_all,
                  (val) => setFormData(prev => ({ ...prev, swarm_cells_removed_all: val }))
                )}
                {renderCellSection(
                  'Supercedure Cells',
                  formData.supercedure_cells,
                  (val) => setFormData(prev => ({ ...prev, supercedure_cells: val })),
                  formData.supercedure_cells_number,
                  (val) => setFormData(prev => ({ ...prev, supercedure_cells_number: val })),
                  formData.supercedure_cells_removed_all,
                  (val) => setFormData(prev => ({ ...prev, supercedure_cells_removed_all: val }))
                )}
                {renderCellSection(
                  'Emergency Cells',
                  formData.emergency_cells,
                  (val) => setFormData(prev => ({ ...prev, emergency_cells: val })),
                  formData.emergency_cells_number,
                  (val) => setFormData(prev => ({ ...prev, emergency_cells_number: val })),
                  formData.emergency_cells_removed_all,
                  (val) => setFormData(prev => ({ ...prev, emergency_cells_removed_all: val }))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Behaviour Section */}
        <div className="md:col-span-2 p-4 rounded-lg border border-border">
          <h4 className="text-sm font-semibold text-foreground mb-4">Behaviour Ratings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderStarRating(formData.population_strength, (val) => setFormData(prev => ({ ...prev, population_strength: val })), 'Population Strength')}
            {renderStarRating(formData.temperament_rating, (val) => setFormData(prev => ({ ...prev, temperament_rating: val })), 'Temperament')}
            {renderStarRating(formData.brood_pattern_rating, (val) => setFormData(prev => ({ ...prev, brood_pattern_rating: val })), 'Brood Pattern')}
            {renderStarRating(formData.swarming_tendency, (val) => setFormData(prev => ({ ...prev, swarming_tendency: val })), 'Swarming Tendency')}
            {renderStarRating(formData.calmness, (val) => setFormData(prev => ({ ...prev, calmness: val })), 'Calmness')}
          </div>
        </div>

        {/* Drones Section - Collapsible */}
        <div className="md:col-span-2 rounded-lg border border-border">
          <Button
          unstyled
            type="button"
            onClick={() => setDronesExpanded(!dronesExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors rounded-lg"
          >
            <h4 className="text-sm font-semibold text-foreground">Drones</h4>
            {dronesExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </Button>
          {dronesExpanded && (
            <div className="p-4 pt-0 space-y-4">
              <div>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-sm font-medium text-text-secondary">Drone Population Level</label>
                  <Button
                    unstyled
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, drones_present: -1 }))}
                    className="min-h-[36px] w-full px-3 sm:min-h-[32px] sm:w-auto rounded-md border border-border bg-surface-elevated text-[11px] sm:text-xs font-semibold text-text-secondary hover:bg-surface-secondary hover:text-text-primary whitespace-nowrap transition-colors touch-manipulation"
                  >
                    Clear
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 0, label: 'Low' },
                    { value: 1, label: 'Medium' },
                    { value: 2, label: 'High' },
                    { value: 3, label: 'Extreme' }
                  ].map((option) => (
                    <Button
          unstyled
                      key={option.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, drones_present: option.value }))}
                      className={`min-h-[44px] sm:min-h-[48px] px-2 rounded-lg font-semibold text-xs sm:text-sm leading-tight whitespace-nowrap transition-all ${
                        formData.drones_present === option.value
                          ? 'bg-amber-600 text-white shadow-lg'
                          : 'bg-surface-elevated text-foreground hover:bg-surface-elevated dark:hover:bg-surface-elevated border border-border'
                      }`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 bg-surface rounded-lg cursor-pointer border border-border">
                <input
                  type="checkbox"
                  checked={formData.drone_brood_present === true}
                  onChange={(e) => setFormData(prev => ({ ...prev, drone_brood_present: e.target.checked }))}
                  className="h-5 w-5 rounded border-border text-amber-600"
                />
                <span className="text-sm font-medium text-text-secondary">Drone Brood Present</span>
              </label>
            </div>
          )}
        </div>

        {/* Given/Taken Section - Collapsible */}
        <div className="md:col-span-2 rounded-lg border border-border">
          <Button
          unstyled
            type="button"
            onClick={() => setGivenTakenExpanded(!givenTakenExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors rounded-lg"
          >
            <div className="text-left">
              <h4 className="text-sm font-semibold text-foreground">Given/Taken</h4>
              <p className="mt-1 text-xs text-text-tertiary">Use minus for taken items and plus for given items.</p>
            </div>
            {givenTakenExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </Button>
          {givenTakenExpanded && (
            <div className="grid grid-cols-1 gap-4 p-4 pt-0 sm:grid-cols-2 xl:grid-cols-3">
              {givenTakenFields.map((field) => {
                const currentValue = parseSignedInteger(givenTakenDrafts[field.key])
                const adjustmentStateLabel = currentValue > 0
                  ? `Given ${currentValue}`
                  : currentValue < 0
                    ? `Taken ${Math.abs(currentValue)}`
                    : 'No change'
                const adjustmentStateClasses = currentValue > 0
                  ? 'bg-forest-50 text-forest-700 border border-forest-200 dark:bg-forest-900/30 dark:text-forest-300 dark:border-forest-800'
                  : currentValue < 0
                    ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                    : 'bg-surface-elevated text-text-secondary border border-border'

                return (
                  <div key={field.key} className="rounded-xl border border-border bg-surface-secondary/60 p-3">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <label htmlFor={`given-taken-${field.key}`} className="text-sm font-medium text-text-secondary">
                        {field.label}
                      </label>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${adjustmentStateClasses}`}>
                        {adjustmentStateLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-[52px_minmax(0,1fr)_52px] gap-2">
                      <Button
                        unstyled
                        type="button"
                        onClick={() => adjustGivenTakenValue(field.key, -1)}
                        aria-label={`Decrease ${field.label}`}
                        className="min-h-[52px] rounded-lg border border-red-200 bg-red-50 text-xl font-bold text-red-700 transition-colors hover:bg-red-100 active:bg-red-200 touch-manipulation dark:border-red-900 dark:bg-red-900/30 dark:text-red-300"
                      >
                        -
                      </Button>
                      <input
                        id={`given-taken-${field.key}`}
                        type="text"
                        inputMode="numeric"
                        pattern="-?[0-9]*"
                        value={givenTakenDrafts[field.key]}
                        onChange={(e) => handleGivenTakenDraftChange(field.key, e.target.value)}
                        onBlur={() => handleGivenTakenBlur(field.key)}
                        onFocus={(e) => e.target.select()}
                        className="min-h-[52px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-center text-lg font-semibold text-foreground"
                        placeholder="0"
                        aria-label={`${field.label} adjustment`}
                      />
                      <Button
                        unstyled
                        type="button"
                        onClick={() => adjustGivenTakenValue(field.key, 1)}
                        aria-label={`Increase ${field.label}`}
                        className="min-h-[52px] rounded-lg border border-forest-200 bg-forest-50 text-xl font-bold text-forest-700 transition-colors hover:bg-forest-100 active:bg-forest-200 touch-manipulation dark:border-forest-800 dark:bg-forest-900/30 dark:text-forest-300"
                      >
                        +
                      </Button>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Button
                        unstyled
                        type="button"
                        onClick={() => adjustGivenTakenValue(field.key, -5)}
                        className="min-h-[44px] rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface active:bg-surface touch-manipulation"
                      >
                        -5
                      </Button>
                      <Button
                        unstyled
                        type="button"
                        onClick={() => setGivenTakenValue(field.key, 0)}
                        className="min-h-[44px] rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface active:bg-surface touch-manipulation"
                      >
                        Clear
                      </Button>
                      <Button
                        unstyled
                        type="button"
                        onClick={() => adjustGivenTakenValue(field.key, 5)}
                        className="min-h-[44px] rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface active:bg-surface touch-manipulation"
                      >
                        +5
                      </Button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {/* Disease Section - Collapsible */}
        <div className="md:col-span-2 rounded-lg border border-border">
          <Button
          unstyled
            type="button"
            onClick={() => setDiseaseExpanded(!diseaseExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors rounded-lg"
          >
            <h4 className="text-sm font-semibold text-foreground">Disease Indicators</h4>
            {diseaseExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </Button>
          {diseaseExpanded && (
            <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderStarRating(formData.afb_disease, (val) => setFormData(prev => ({ ...prev, afb_disease: val })), 'AFB')}
              {renderStarRating(formData.efb_disease, (val) => setFormData(prev => ({ ...prev, efb_disease: val })), 'EFB')}
              {renderStarRating(formData.chalkbrood_disease, (val) => setFormData(prev => ({ ...prev, chalkbrood_disease: val })), 'Chalkbrood')}
              {renderStarRating(formData.nosemosis_disease, (val) => setFormData(prev => ({ ...prev, nosemosis_disease: val })), 'Nosemosis')}
              {renderStarRating(formData.dwv_disease, (val) => setFormData(prev => ({ ...prev, dwv_disease: val })), 'DWV')}
              {renderStarRating(formData.iapv_cbpv_disease, (val) => setFormData(prev => ({ ...prev, iapv_cbpv_disease: val })), 'IAPV & CBPV')}
            </div>
          )}
        </div>

        {/* Hygienic Behaviour Section - Collapsible */}
        <div className="md:col-span-2 rounded-lg border border-border">
          <Button
          unstyled
            type="button"
            onClick={() => setHygienicBehaviourExpanded(!hygienicBehaviourExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors rounded-lg"
          >
            <h4 className="text-sm font-semibold text-foreground">Hygienic Behaviour</h4>
            {hygienicBehaviourExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </Button>
          {hygienicBehaviourExpanded && (
            <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderStarRating(formData.recapping, (val) => setFormData(prev => ({ ...prev, recapping: val })), 'Recapping')}
              {renderStarRating(formData.vsh, (val) => setFormData(prev => ({ ...prev, vsh: val })), 'VSH')}
              {renderStarRating(formData.smr, (val) => setFormData(prev => ({ ...prev, smr: val })), 'SMR')}
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
            rows={4}
            placeholder="Optional notes about the inspection"
          />
        </div>

        {/* Image Upload Section */}
        {userHasActiveSubscription && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-2">Photo (optional)</label>
            <div className="flex items-start gap-3">
              {(imagePreview || formData.image_url) && (
                <div className="relative w-20 h-20 flex-shrink-0 group">
                  <div
                    className="relative w-full h-full cursor-pointer"
                    onDoubleClick={() => onImageClick(imagePreview || formData.image_url || '')}
                    title="Double-click to enlarge"
                  >
                    <Image
                      src={imagePreview || formData.image_url || ''}
                      alt="Preview"
                      fill
                      className="object-cover rounded-lg border-2 border-border shadow-sm"
                      sizes="80px"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-40 rounded-lg pointer-events-none">
                      <Camera size={16} className="text-white" />
                    </div>
                  </div>
                  <Button
          unstyled
                    type="button"
                    onClick={handleRemoveCurrentImage}
                    className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 shadow-lg transition-all z-10"
                    title="Remove image"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
              <label className="flex-1 flex flex-col items-center justify-center min-h-[80px] border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all p-4">
                <div className="flex flex-col items-center justify-center">
                  <Camera size={24} className="text-text-tertiary mb-1" />
                  <p className="text-xs text-text-tertiary text-center">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-text-tertiary">PNG, JPG, WEBP up to 10MB</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

