'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ChevronDown, ChevronUp, Camera, X, Mic, Square, Loader2, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import type { Hive, Apiary, InspectionFormData, FollowUpTaskDraft, FollowUpTaskPriority, BroodBoxFrames, BroodBoxType } from '@/types/records'
import { getDefaultInspectionFormData, getDefaultFollowUpTaskDraft, LEVEL_NOT_RECORDED } from '@/types/records'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { supabase } from '@/lib/supabase'
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
  onSubmit: (formData: InspectionFormData, imageFile: File | null, followUpTasks: FollowUpTaskDraft[]) => Promise<void>
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

const INSPECTION_ADJUSTMENT_MIN = -2147483648
const INSPECTION_ADJUSTMENT_MAX = 2147483647

function clampInspectionAdjustment(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value < INSPECTION_ADJUSTMENT_MIN) {
    return INSPECTION_ADJUSTMENT_MIN
  }

  if (value > INSPECTION_ADJUSTMENT_MAX) {
    return INSPECTION_ADJUSTMENT_MAX
  }

  return Math.trunc(value)
}

function parseSignedInteger(value: string): number {
  if (value.trim() === '' || value === '-') {
    return 0
  }

  const parsedValue = Number.parseInt(value, 10)
  return Number.isNaN(parsedValue) ? 0 : clampInspectionAdjustment(parsedValue)
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

const FOLLOW_UP_DEFAULT_DAYS = 14

function addDaysToIsoDate(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) {
    const fallback = new Date()
    fallback.setUTCDate(fallback.getUTCDate() + days)
    return fallback.toISOString().slice(0, 10)
  }
  const [, y, m, d] = match
  const utc = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  utc.setUTCDate(utc.getUTCDate() + days)
  return utc.toISOString().slice(0, 10)
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
  const [propolisExpanded, setPropolisExpanded] = useState(false)
  const [givenTakenExpanded, setGivenTakenExpanded] = useState(false)
  const [superFullnessExpanded, setSuperFullnessExpanded] = useState(false)
  const [hygienicBehaviourExpanded, setHygienicBehaviourExpanded] = useState(false)
  const [diseaseExpanded, setDiseaseExpanded] = useState(false)
  const [followUpExpanded, setFollowUpExpanded] = useState(false)
  const [followUpDrafts, setFollowUpDrafts] = useState<FollowUpTaskDraft[]>([])

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

  const {
    isRecording: isVoiceRecording,
    isSupported: isVoiceSupported,
    error: voiceRecorderError,
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
    reset: resetVoiceRecorder
  } = useVoiceRecorder()
  const [voiceProcessing, setVoiceProcessing] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const voiceAbortRef = useRef<AbortController | null>(null)
  // Scale-weight auto-fill: tracks which hive we've already prefetched for so the
  // effect doesn't loop on every formData change. Cleared on hive change.
  const lastScalePrefillHiveIdRef = useRef<string | null>(null)
  const scaleFetchAbortRef = useRef<AbortController | null>(null)
  const [weightFromScale, setWeightFromScale] = useState<{ kg: number; source: 'beep' | 'wolf' } | null>(null)

  // Abort any in-flight voice transcription on unmount so a late response
  // cannot leak the cleaned transcript into a different inspection's notes.
  useEffect(() => {
    return () => {
      voiceAbortRef.current?.abort()
      voiceAbortRef.current = null
    }
  }, [])

  const appendVoiceTranscript = useCallback((cleaned: string) => {
    if (!cleaned) return
    setFormData(prev => {
      const existing = (prev.notes || '').trimEnd()
      const merged = existing ? `${existing}\n\n${cleaned}` : cleaned
      return { ...prev, notes: merged }
    })
  }, [])

  const handleToggleVoice = useCallback(async () => {
    if (voiceProcessing) return
    if (isVoiceRecording) {
      const blob = await stopVoiceRecording()
      if (!blob) {
        setVoiceError('Recording was empty. Please try again.')
        return
      }
      voiceAbortRef.current?.abort()
      const controller = new AbortController()
      voiceAbortRef.current = controller
      setVoiceProcessing(true)
      setVoiceError(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          setVoiceError('You need to be signed in to transcribe voice notes.')
          return
        }
        const fd = new FormData()
        const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'
        fd.append('audio', blob, `voice-note.${ext}`)
        const res = await fetch('/api/voice-notes-transcribe', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
          signal: controller.signal
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string; code?: string }
          if (controller.signal.aborted) return
          if (body.code === 'SUBSCRIPTION_REQUIRED') {
            setVoiceError('An active subscription is required to use voice notes.')
          } else {
            setVoiceError(body.error || 'Could not transcribe the recording.')
          }
          return
        }
        const { cleaned } = await res.json() as { transcript: string; cleaned: string }
        if (controller.signal.aborted) return
        if (!cleaned) {
          setVoiceError('Nothing was transcribed. Please try recording again.')
          return
        }
        appendVoiceTranscript(cleaned)
      } catch (err) {
        if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) {
          return
        }
        console.error('Voice transcription failed:', err)
        setVoiceError('Could not transcribe the recording. Please try again.')
      } finally {
        if (voiceAbortRef.current === controller) {
          voiceAbortRef.current = null
        }
        if (!controller.signal.aborted) {
          setVoiceProcessing(false)
        }
      }
    } else {
      setVoiceError(null)
      await startVoiceRecording()
    }
  }, [appendVoiceTranscript, isVoiceRecording, startVoiceRecording, stopVoiceRecording, voiceProcessing])

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

  // Number of honey supers on the selected hive drives how many fullness sliders show.
  // When editing an older inspection whose stored array is longer, keep every recorded value.
  const honeySuperSliderCount = useMemo(() => {
    const configuredSupers = hives.find(hive => hive.id === formData.hive_id)?.configuration?.honey_supers ?? 0
    const recorded = formData.honey_super_fullness?.length ?? 0
    return Math.max(Math.max(0, Math.trunc(configuredSupers)), recorded)
  }, [hives, formData.hive_id, formData.honey_super_fullness])

  // Clamp a slider value to a whole 0-100 percentage.
  const clampFullness = (value: number): number => {
    if (!Number.isFinite(value)) return 0
    return Math.min(100, Math.max(0, Math.trunc(value)))
  }

  // Record one super's fullness. The array is created lazily so an untouched
  // section stays null ("not recorded") and never renders a misleading 0% gauge.
  const setSuperFullness = useCallback((index: number, value: number) => {
    setFormData(prev => {
      const next = Array.from({ length: honeySuperSliderCount }, (_, i) => {
        const existing = prev.honey_super_fullness?.[i]
        return typeof existing === 'number' ? existing : 0
      })
      next[index] = value
      return { ...prev, honey_super_fullness: next }
    })
  }, [honeySuperSliderCount])

  // Update form data when initialData changes
  useEffect(() => {
    if (!initialData) {
      if (previousInitialDataRef.current) {
        const defaultFormData = getDefaultInspectionFormData()
        setFormData(defaultFormData)
        setGivenTakenDrafts(createGivenTakenDrafts(defaultFormData))
        setFormApiaryId(selectedApiaryId)
        setDronesExpanded(false)
        setPropolisExpanded(false)
        setSuperFullnessExpanded(false)
        setFollowUpExpanded(false)
        setFollowUpDrafts([])
        resetImage()
        voiceAbortRef.current?.abort()
        voiceAbortRef.current = null
        resetVoiceRecorder()
        setVoiceError(null)
        setVoiceProcessing(false)
      }
      previousInitialDataRef.current = null
      return
    }

    // Switching the form to a different inspection must also tear down any
    // in-flight voice transcription from the previous one — otherwise its
    // cleaned text will land in the new inspection's notes via setFormData.
    voiceAbortRef.current?.abort()
    voiceAbortRef.current = null

    setFormData(initialData)
    setGivenTakenDrafts(createGivenTakenDrafts(initialData))
    setFormApiaryId(getApiaryIdForHive(initialData.hive_id))
    setFollowUpExpanded(false)
    setFollowUpDrafts([])

    // Auto-expand sections that have recorded data so the user sees them immediately
    setDronesExpanded(
      (initialData.drones_present !== LEVEL_NOT_RECORDED && initialData.drones_present !== null) ||
      initialData.drone_brood_present !== null
    )
    setPropolisExpanded(
      initialData.propolis_level !== LEVEL_NOT_RECORDED && initialData.propolis_level !== null
    )
    setSuperFullnessExpanded(
      Array.isArray(initialData.honey_super_fullness) && initialData.honey_super_fullness.length > 0
    )

    if (initialData.image_url) {
      setPreviewFromUrl(initialData.image_url)
    } else {
      resetImage()
    }
    previousInitialDataRef.current = initialData
  }, [getApiaryIdForHive, initialData, resetImage, resetVoiceRecorder, selectedApiaryId, setPreviewFromUrl])

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

  // Auto-fill the Weight (kg) field from a connected scale when starting a new
  // inspection. Skipped in edit mode so historical readings are never overwritten.
  // Skipped if the user (or initial data) already supplied a weight, so we don't
  // clobber explicit input. Silent fall-through on any error — the field is
  // optional and manual entry is always available.
  useEffect(() => {
    if (isEditing) return
    const hiveId = formData.hive_id
    if (!hiveId) {
      // Hive deselected mid-fetch: abort so a late response can't write a stale weight.
      scaleFetchAbortRef.current?.abort()
      lastScalePrefillHiveIdRef.current = null
      setWeightFromScale(null)
      return
    }
    if (lastScalePrefillHiveIdRef.current === hiveId) return
    lastScalePrefillHiveIdRef.current = hiveId

    // Cancel any prior in-flight fetch (rapid hive switches).
    scaleFetchAbortRef.current?.abort()

    // Don't overwrite an existing weight value (e.g. user already typed one).
    if (formData.weight !== null && formData.weight !== undefined) {
      setWeightFromScale(null)
      return
    }

    const hive = hives.find(h => h.id === hiveId)
    if (!hive) return
    // Precedence: Wolf first, then BEEP. Either is fine when only one is set.
    const useWolf = !!hive.wolf_scale_id
    const useBeep = !useWolf && !!hive.beep_device_id
    if (!useWolf && !useBeep) {
      setWeightFromScale(null)
      return
    }

    const controller = new AbortController()
    scaleFetchAbortRef.current = controller

    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) return

        const url = useWolf
          ? `/api/wolf-waagen/data?scaleId=${encodeURIComponent(hive.wolf_scale_id!)}&hiveId=${encodeURIComponent(hiveId)}`
          : `/api/beep/data?deviceId=${encodeURIComponent(hive.beep_device_id!)}&hiveId=${encodeURIComponent(hiveId)}`

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        if (!res.ok) return
        const body = await res.json() as {
          lastValues?: { weight_kg?: number; weight_kg_corrected?: number }
        }
        const kgRaw = body.lastValues?.weight_kg_corrected ?? body.lastValues?.weight_kg
        if (typeof kgRaw !== 'number' || !Number.isFinite(kgRaw)) return
        if (controller.signal.aborted) return
        // Round to one decimal — scale APIs return full sensor precision (e.g.
        // 47.049202787406 kg) which is meaningless for a hive weight reading.
        const kg = Math.round(kgRaw * 10) / 10

        // Only prefill if still no manual entry by the time the network resolves.
        setFormData(prev => prev.weight !== null && prev.weight !== undefined
          ? prev
          : { ...prev, weight: kg }
        )
        setWeightFromScale({ kg, source: useWolf ? 'wolf' : 'beep' })
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return
        console.error('Scale weight auto-fill failed:', err)
      }
    })()
  }, [formData.hive_id, formData.weight, hives, isEditing])

  // Cancel any pending scale fetch on unmount.
  useEffect(() => {
    return () => { scaleFetchAbortRef.current?.abort() }
  }, [])

  const handleHiveSelect = async (hiveId: string) => {
    setFormData(prev => ({ ...prev, hive_id: hiveId }))
    setFormApiaryId(prev => hiveId ? getApiaryIdForHive(hiveId) : prev)
    if (hiveId) {
      try {
        await onHiveChange(hiveId)
      } catch (error) {
        console.error('Failed to update hive inspection context:', error)
      }
    }
  }

  const setGivenTakenValue = useCallback((field: GivenTakenFieldKey, value: number) => {
    const normalisedValue = clampInspectionAdjustment(value)

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

    if (submitting || fetchingWeather) {
      return
    }

    const submitData = normaliseGivenTakenValues(formData, givenTakenDrafts)
    setFormData(submitData)
    setGivenTakenDrafts(createGivenTakenDrafts(submitData))
    setSubmitting(true)
    try {
      const tasks = followUpDrafts
        .map(draft => ({
          ...draft,
          title: draft.title.trim(),
          description: draft.description.trim(),
          equipment_needed: draft.equipment_needed.trim(),
        }))
        .filter(draft => draft.title !== '')
      await onSubmit(submitData, imageFile, tasks)
    } finally {
      setSubmitting(false)
    }
  }

  const addFollowUpTask = useCallback(() => {
    setFollowUpDrafts(prev => {
      const lastDate = prev.length > 0 ? prev[prev.length - 1].due_date : null
      const baseDate = lastDate || addDaysToIsoDate(formData.inspection_date, FOLLOW_UP_DEFAULT_DAYS)
      return [...prev, getDefaultFollowUpTaskDraft(baseDate)]
    })
  }, [formData.inspection_date])

  const updateFollowUpDraft = useCallback((index: number, patch: Partial<FollowUpTaskDraft>) => {
    setFollowUpDrafts(prev => prev.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)))
  }, [])

  const removeFollowUpDraft = useCallback((index: number) => {
    setFollowUpDrafts(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleCancel = () => {
    resetImage()
    resetVoiceRecorder()
    setVoiceError(null)
    setVoiceProcessing(false)
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

  // Brood box list for the selected hive. Full boxes first, then half-depth.
  // Falls back to legacy `brood_boxes` total when full/half aren't broken out.
  const broodBoxFullCount = selectedHive?.configuration?.brood_boxes_full
    ?? selectedHive?.configuration?.brood_boxes
    ?? 0
  const broodBoxHalfCount = selectedHive?.configuration?.brood_boxes_half ?? 0
  const broodBoxList = useMemo<{ box: number; type: BroodBoxType }[]>(() => {
    const boxes: { box: number; type: BroodBoxType }[] = []
    let idx = 1
    for (let i = 0; i < broodBoxFullCount; i++) boxes.push({ box: idx++, type: 'full' })
    for (let i = 0; i < broodBoxHalfCount; i++) boxes.push({ box: idx++, type: 'half' })
    return boxes
  }, [broodBoxFullCount, broodBoxHalfCount])
  const isMultiBox = broodBoxList.length > 1

  // Reconcile formData.brood_frames_per_box with the hive's current box list.
  // Single-box hives clear it to null. Multi-box hives initialise from the
  // existing total (Box 1 seed) when transitioning from null, and otherwise
  // preserve already-entered values when the box list shape changes.
  useEffect(() => {
    setFormData(prev => {
      if (!isMultiBox) {
        if (prev.brood_frames_per_box === null) return prev
        // Coming from multi-box: brood_frames was a sum across boxes and has
        // no meaning for the new hive's single picker. Clear both fields so
        // the previous hive's total can't leak forward as a stale prefill.
        return { ...prev, brood_frames_per_box: null, brood_frames: null }
      }
      const existing = prev.brood_frames_per_box
      const next: BroodBoxFrames[] = broodBoxList.map(({ box, type }) => {
        const match = existing?.find(b => b.box === box && b.type === type)
        if (match) return match
        if (box === 1 && existing == null && prev.brood_frames !== null) {
          return { box: 1, type, frames: prev.brood_frames }
        }
        return { box, type, frames: 0 }
      })
      const sameLength = existing != null && existing.length === next.length
      const unchanged = sameLength && existing!.every((b, i) =>
        b.box === next[i].box && b.type === next[i].type && b.frames === next[i].frames
      )
      if (unchanged) return prev
      const total = next.reduce((sum, b) => sum + b.frames, 0)
      return { ...prev, brood_frames_per_box: next, brood_frames: total }
    })
  }, [isMultiBox, broodBoxList])

  const setBroodFramesForBox = useCallback((boxIndex: number, frames: number) => {
    setFormData(prev => {
      const list = prev.brood_frames_per_box ?? []
      const updated = list.map(b => b.box === boxIndex ? { ...b, frames } : b)
      const total = updated.reduce((sum, b) => sum + b.frames, 0)
      return { ...prev, brood_frames_per_box: updated, brood_frames: total }
    })
  }, [])

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
                onChange={(e) => {
                  const next = e.target.value ? parseFloat(e.target.value) : null
                  // User typed → drop the auto-fill marker.
                  if (weightFromScale && next !== weightFromScale.kg) setWeightFromScale(null)
                  setFormData(prev => ({ ...prev, weight: next }))
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                placeholder="Optional"
              />
              {weightFromScale && (
                <p className="mt-1 text-xs text-text-tertiary">
                  Auto-filled from {weightFromScale.source === 'wolf' ? 'Wolf Waagen' : 'BEEP'} scale
                </p>
              )}
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

          {isMultiBox ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-text-secondary">Frames with Brood per box</span>
                <span className="text-xs text-text-tertiary">Total: {formData.brood_frames ?? 0}</span>
              </div>
              {(formData.brood_frames_per_box ?? []).map(box => (
                <div key={`box-${box.box}-${box.type}`}>
                  {renderNumberSelector(
                    box.frames,
                    (val) => setBroodFramesForBox(box.box, val ?? 0),
                    `Box ${box.box} (${box.type})`
                  )}
                </div>
              ))}
              {isEditing
                && initialData?.brood_frames_per_box == null
                && initialData?.brood_frames != null
                && initialData.brood_frames > 0 && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                  Per-box detail wasn&apos;t recorded when this inspection was first saved. Box 1 reflects the original total of {initialData.brood_frames}; please adjust if needed.
                </p>
              )}
            </div>
          ) : (
            renderNumberSelector(
              formData.brood_frames,
              (val) => setFormData(prev => ({ ...prev, brood_frames: val })),
              'Frames with Brood'
            )
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
                    onClick={() => setFormData(prev => ({ ...prev, drones_present: LEVEL_NOT_RECORDED }))}
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

        {/* Propolis Section - Collapsible */}
        <div className="md:col-span-2 rounded-lg border border-border">
          <Button
          unstyled
            type="button"
            onClick={() => setPropolisExpanded(!propolisExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors rounded-lg"
          >
            <h4 className="text-sm font-semibold text-foreground">Propolis</h4>
            {propolisExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </Button>
          {propolisExpanded && (
            <div className="p-4 pt-0 space-y-4">
              <div>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-sm font-medium text-text-secondary">Propolis Level</label>
                  <Button
                    unstyled
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, propolis_level: LEVEL_NOT_RECORDED }))}
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
                      onClick={() => setFormData(prev => ({ ...prev, propolis_level: option.value }))}
                      className={`min-h-[44px] sm:min-h-[48px] px-2 rounded-lg font-semibold text-xs sm:text-sm leading-tight whitespace-nowrap transition-all ${
                        formData.propolis_level === option.value
                          ? 'bg-amber-800 text-white shadow-lg'
                          : 'bg-surface-elevated text-foreground hover:bg-surface-elevated dark:hover:bg-surface-elevated border border-border'
                      }`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
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
              })}
            </div>
          )}
        </div>

        {/* Honey Super Fullness Section - Collapsible (only when the hive has supers) */}
        {honeySuperSliderCount > 0 && (
          <div className="md:col-span-2 rounded-lg border border-border">
            <Button
              unstyled
              type="button"
              onClick={() => setSuperFullnessExpanded(!superFullnessExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors rounded-lg"
            >
              <div className="text-left">
                <h4 className="text-sm font-semibold text-foreground">Honey Super Fullness</h4>
                <p className="mt-1 text-xs text-text-tertiary">Estimate how full each honey super is (0&ndash;100%).</p>
              </div>
              {superFullnessExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </Button>
            {superFullnessExpanded && (
              <div className="space-y-4 p-4 pt-0">
                {Array.from({ length: honeySuperSliderCount }).map((_, i) => {
                  const value = clampFullness(formData.honey_super_fullness?.[i] ?? 0)
                  return (
                    <div key={`super-fullness-${i}`} className="rounded-xl border border-border bg-surface-secondary/60 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label htmlFor={`super-fullness-${i}`} className="text-sm font-medium text-text-secondary">
                          🍯 Super {i + 1}
                        </label>
                        <span className="min-w-[3.5rem] rounded-full bg-amber-100 px-3 py-1 text-center text-lg font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                          {value}%
                        </span>
                      </div>
                      <input
                        id={`super-fullness-${i}`}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={value}
                        onChange={(e) => setSuperFullness(i, clampFullness(Number(e.target.value)))}
                        aria-label={`Super ${i + 1} fullness percentage`}
                        className="h-6 w-full cursor-pointer accent-amber-600 touch-manipulation"
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

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
              <div>
                {renderStarRating(
                  formData.varroa_disease,
                  (val) => setFormData(prev => val === 0
                    ? { ...prev, varroa_disease: 0, varroa_seen_on_bees: false, varroa_seen_in_brood: false, varroa_brood_worker: false, varroa_brood_drone: false }
                    : { ...prev, varroa_disease: val }
                  ),
                  'Varroa'
                )}
                <div className="mt-3 space-y-2" role="group" aria-labelledby="varroa-where-seen-label">
                  <p id="varroa-where-seen-label" className="text-xs font-medium text-text-secondary">Where seen</p>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg cursor-pointer touch-manipulation hover:bg-surface-elevated active:bg-surface-elevated border border-purple-200 dark:border-purple-800">
                      <input
                        type="checkbox"
                        checked={formData.varroa_seen_on_bees}
                        onChange={(e) => setFormData(prev => ({ ...prev, varroa_seen_on_bees: e.target.checked }))}
                        className="h-5 w-5 min-h-[20px] min-w-[20px] rounded border-border text-purple-600 focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-text-secondary">On bees</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg cursor-pointer touch-manipulation hover:bg-surface-elevated active:bg-surface-elevated border border-purple-200 dark:border-purple-800">
                      <input
                        type="checkbox"
                        checked={formData.varroa_seen_in_brood}
                        onChange={(e) => setFormData(prev => e.target.checked
                          ? { ...prev, varroa_seen_in_brood: true }
                          : { ...prev, varroa_seen_in_brood: false, varroa_brood_worker: false, varroa_brood_drone: false }
                        )}
                        className="h-5 w-5 min-h-[20px] min-w-[20px] rounded border-border text-purple-600 focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-text-secondary">In brood</span>
                    </label>
                  </div>
                  {formData.varroa_seen_in_brood && (
                    <div className="flex flex-wrap gap-2 pl-4" role="group" aria-labelledby="varroa-brood-type-label">
                      <p id="varroa-brood-type-label" className="sr-only">Brood type where varroa was observed</p>
                      <label className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg cursor-pointer touch-manipulation hover:bg-surface-elevated active:bg-surface-elevated border border-border">
                        <input
                          type="checkbox"
                          checked={formData.varroa_brood_worker}
                          onChange={(e) => setFormData(prev => ({ ...prev, varroa_brood_worker: e.target.checked }))}
                          className="h-5 w-5 min-h-[20px] min-w-[20px] rounded border-border text-purple-600 focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-text-secondary">Worker brood</span>
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg cursor-pointer touch-manipulation hover:bg-surface-elevated active:bg-surface-elevated border border-border">
                        <input
                          type="checkbox"
                          checked={formData.varroa_brood_drone}
                          onChange={(e) => setFormData(prev => ({ ...prev, varroa_brood_drone: e.target.checked }))}
                          className="h-5 w-5 min-h-[20px] min-w-[20px] rounded border-border text-purple-600 focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-text-secondary">Drone brood</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
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
          {userHasActiveSubscription && isVoiceSupported && (
            <div className="mt-2 flex flex-col gap-2">
              <Button
                unstyled
                type="button"
                onClick={handleToggleVoice}
                disabled={voiceProcessing}
                aria-label={isVoiceRecording ? 'Stop voice recording' : 'Record voice note'}
                className={`inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-white font-medium transition-all touch-manipulation disabled:cursor-not-allowed ${
                  voiceProcessing
                    ? 'bg-purple-400 dark:bg-purple-500'
                    : isVoiceRecording
                      ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                      : 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600'
                }`}
              >
                {voiceProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Transcribing...</span>
                  </>
                ) : isVoiceRecording ? (
                  <>
                    <Square size={18} />
                    <span>Stop recording</span>
                  </>
                ) : (
                  <>
                    <Mic size={18} />
                    <span>Record voice note</span>
                  </>
                )}
              </Button>
              {(voiceError || voiceRecorderError) && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {voiceError || voiceRecorderError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Next Visit Plan - Collapsible */}
        <div className="md:col-span-2 rounded-lg border border-border">
          <Button
            unstyled
            type="button"
            onClick={() => setFollowUpExpanded(!followUpExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors rounded-lg"
          >
            <div className="text-left">
              <h4 className="text-sm font-semibold text-foreground">Next Visit Plan</h4>
              <p className="mt-1 text-xs text-text-tertiary">
                Optional. Each task is added to your Tasks list, linked to this hive.
                {followUpDrafts.length > 0 && ` (${followUpDrafts.length} task${followUpDrafts.length === 1 ? '' : 's'} ready)`}
              </p>
            </div>
            {followUpExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </Button>
          {followUpExpanded && (
            <div className="space-y-4 p-4 pt-0">
              {initialData && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                  Follow-up tasks already created from this inspection live in your Tasks list. Adding rows here creates new tasks — re-typing existing ones will produce duplicates.
                </p>
              )}
              {followUpDrafts.length === 0 && (
                <p className="text-sm text-text-tertiary">
                  No follow-up tasks yet. Add tasks for what needs doing on the next visit and the equipment to bring.
                </p>
              )}
              {followUpDrafts.map((draft, index) => (
                <div key={index} className="rounded-lg border border-border bg-surface-secondary/40 p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Task {index + 1}</span>
                    <Button
                      unstyled
                      type="button"
                      onClick={() => removeFollowUpDraft(index)}
                      aria-label={`Remove task ${index + 1}`}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center gap-1 text-xs font-medium"
                    >
                      <Trash2 size={14} />
                      Remove
                    </Button>
                  </div>
                  <div>
                    <label htmlFor={`follow-up-title-${index}`} className="block text-xs font-medium text-text-secondary mb-1">
                      Title <span className="text-red-600 dark:text-red-400">*</span>
                    </label>
                    <input
                      id={`follow-up-title-${index}`}
                      type="text"
                      value={draft.title}
                      onChange={(e) => updateFollowUpDraft(index, { title: e.target.value })}
                      placeholder="e.g. Treat varroa"
                      className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`follow-up-date-${index}`} className="block text-xs font-medium text-text-secondary mb-1">Due date</label>
                      <input
                        id={`follow-up-date-${index}`}
                        type="date"
                        value={draft.due_date}
                        onChange={(e) => updateFollowUpDraft(index, { due_date: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                      />
                    </div>
                    <div>
                      <label htmlFor={`follow-up-priority-${index}`} className="block text-xs font-medium text-text-secondary mb-1">Priority</label>
                      <select
                        id={`follow-up-priority-${index}`}
                        value={draft.priority}
                        onChange={(e) => updateFollowUpDraft(index, { priority: e.target.value as FollowUpTaskPriority })}
                        className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`follow-up-equipment-${index}`} className="block text-xs font-medium text-text-secondary mb-1">
                      Equipment / consumables to bring
                    </label>
                    <input
                      id={`follow-up-equipment-${index}`}
                      type="text"
                      value={draft.equipment_needed}
                      onChange={(e) => updateFollowUpDraft(index, { equipment_needed: e.target.value })}
                      placeholder="e.g. oxalic acid, applicator"
                      className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                    />
                    <p className="mt-1 text-xs text-text-tertiary">Separate multiple items with a comma.</p>
                  </div>
                  <div>
                    <label htmlFor={`follow-up-description-${index}`} className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
                    <textarea
                      id={`follow-up-description-${index}`}
                      value={draft.description}
                      onChange={(e) => updateFollowUpDraft(index, { description: e.target.value })}
                      rows={2}
                      placeholder="Optional details"
                      className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                    />
                  </div>
                </div>
              ))}
              <Button
                unstyled
                type="button"
                onClick={addFollowUpTask}
                className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg border border-border bg-surface text-sm font-medium text-foreground hover:bg-surface-elevated transition-colors"
              >
                <Plus size={16} />
                Add task
              </Button>
            </div>
          )}
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

        {/* Bottom Save/Cancel Buttons - mirror of top for long forms */}
        <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2 border-t border-border">
          <Button
          unstyled
            type="submit"
            disabled={submitting || fetchingWeather}
            className="px-6 py-3 min-h-[48px] bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-700 disabled:bg-surface-secondary disabled:cursor-not-allowed transition-all touch-manipulation font-medium w-full sm:w-auto"
          >
            {submitting ? 'Saving...' : fetchingWeather ? 'Fetching Weather...' : initialData?.hive_id ? 'Update' : 'Save'} Inspection
          </Button>
          <Button
          unstyled
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 min-h-[48px] bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated border border-border active:bg-surface-elevated touch-manipulation font-medium w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

