'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Milk, Plus, X, Edit2, Trash2, Check, QrCode, Download, MapPin, AlertCircle, Star, MessageSquare, Tag } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useToast } from '@/components/ui/Toast'
import { generateBatchCode } from '@/lib/batch-code'
import { normaliseStoragePublicUrl } from '@/lib/storage-url'
import { calculateBestBeforeDate, formatDateForInput } from '@/lib/traceability-utils'
import { storyTemplates, replacePlaceholders, hasUnfilledPlaceholders, getUnfilledPlaceholders, stripMarkers } from '@/lib/story-templates'
import type { BulkContainer, BatchRun, BatchJar, BatchFormData, JarConfig, BatchLabelPointer } from '@/types/traceability'
import Button from '@/components/ui/Button'

interface BatchesTabProps {
 userId: string
 containers: BulkContainer[]
 showBatchForm: boolean
 setShowBatchForm: (open: boolean) => void
 /** Printed jar labels currently pointed at a batch, so edits can warn. */
 labelPointers?: BatchLabelPointer[]
}

/**
 * Batch runs (jarred honey) side of the traceability tool: batch CRUD with
 * jar configuration, story templates, QR/trace codes, public-page preview
 * and consumer feedback. Extracted verbatim from TraceabilityTool.tsx
 * (Phase 6.7 decomposition).
 */
export default function BatchesTab({ userId, containers, showBatchForm, setShowBatchForm, labelPointers = [] }: BatchesTabProps) {
 const toast = useToast()

  // Batch state
  const [batches, setBatches] = useState<BatchRun[]>([])

  const [editingBatch, setEditingBatch] = useState<BatchRun | null>(null)
  const [qrBatch, setQrBatch] = useState<BatchRun | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom')
  const [batchForm, setBatchForm] = useState<BatchFormData>({
    batch_date: formatDateForInput(new Date()),
    total_weight_kg: '',
    jars: [{ jar_size_ml: '500ml', jar_weight_g: '', jar_count: '' }],
    best_before_date: formatDateForInput(calculateBestBeforeDate(new Date())),
    notes: '',
    is_public: true,
    is_creamed: false,
    show_apiary_image: false,
    show_feedback: true,
    public_title: '',
    public_origin: '',
    public_story: '',
    container_ids: []
  })

  // Jar size options from database
  const [jarSizeOptions, setJarSizeOptions] = useState<string[]>([])

  // Feedback state
  interface FeedbackSummary {
    batch_id: string
    feedback_count: number
    average_rating: number
  }
  interface FeedbackDetail {
    feedback_id: string
    rating: number
    comment: string | null
    created_at: string
  }
  const [feedbackSummary, setFeedbackSummary] = useState<Map<string, FeedbackSummary>>(new Map())
  const [feedbackBatch, setFeedbackBatch] = useState<BatchRun | null>(null)
  const [feedbackDetails, setFeedbackDetails] = useState<FeedbackDetail[]>([])
  const [loadingFeedback, setLoadingFeedback] = useState(false)

  // Fetch jar size options from database
  const fetchJarSizes = useCallback(async () => {
    const { data: category } = await supabase
      .from('dropdown_categories')
      .select('id')
      .eq('category_key', 'jar_size')
      .single()

    if (category) {
      const { data: values } = await supabase
        .from('dropdown_values')
        .select('value')
        .eq('category_id', category.id)
        .eq('is_active', true)
        .order('display_order')

      if (values) {
        setJarSizeOptions(values.map(v => v.value))
      }
    }
  }, [])

  // Fetch jar sizes on mount
  useEffect(() => {
    fetchJarSizes()
  }, [fetchJarSizes])

  // Auto-tally total weight from the selected bulk honey sources. The batch's
  // total weight is the sum of the linked containers' weights (the raw honey
  // going into the batch). Manual edits to Total Weight are preserved until the
  // source selection changes again.
  useEffect(() => {
    const totalKg = containers
      .filter(c => batchForm.container_ids.includes(c.id))
      .reduce((sum, c) => sum + (c.total_weight_kg ?? 0), 0)

    if (totalKg > 0) {
      setBatchForm(prev => ({ ...prev, total_weight_kg: totalKg.toFixed(2) }))
    }
  }, [batchForm.container_ids, containers])

  // Public preview state
  interface PublicPreviewData {
    beekeeperName: string
    origins: { name: string; city: string | null; hasLocation: boolean; percentage: number }[]
    floralSources: string[]
    hasAnyLocationShared: boolean
    apiaryImageUrl: string | null
  }
  const [publicPreview, setPublicPreview] = useState<PublicPreviewData | null>(null)

  // Fetch public preview data when containers change or when editing
  useEffect(() => {
    const fetchPreviewData = async () => {
      // Use form container_ids, or fall back to editing batch's containers
      const containerIds = batchForm.container_ids.length > 0
        ? batchForm.container_ids
        : editingBatch?.containers?.map(c => c.container_id) || []

      if (!batchForm.is_public || containerIds.length === 0) {
        setPublicPreview(null)
        return
      }

      // Get beekeeper name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, full_name')
        .eq('id', userId)
        .single()

      const beekeeperName = profile?.first_name || profile?.full_name || 'Local Beekeeper'

      // Get selected containers with their harvests
      const selectedContainers = containers.filter(c => containerIds.includes(c.id))

      // Calculate origins and gather floral sources
      const originMap = new Map<string, { city: string | null; hasLocation: boolean; weight: number }>()
      const floralSourcesSet = new Set<string>()

      for (const container of selectedContainers) {
        if (!container.harvests) continue

        for (const harvestLink of container.harvests) {
          const harvest = harvestLink.harvest
          if (!harvest) continue

          // Get floral source
          // Note: floral_source not in current query, would need to add - for now skip

          // Get apiary info
          const hivesRaw = harvest.hives as unknown
          const hive = Array.isArray(hivesRaw) ? hivesRaw[0] : hivesRaw
          const apiariesRaw = hive?.apiaries as unknown
          const apiary = Array.isArray(apiariesRaw) ? apiariesRaw[0] : apiariesRaw

          if (apiary) {
            const key = apiary.name || 'Unknown'
            const existing = originMap.get(key)
            const weight = harvest.honey_weight || 0

            if (existing) {
              existing.weight += weight
            } else {
              // We need to check share_location - fetch it
              originMap.set(key, {
                city: apiary.city || null,
                hasLocation: false, // Will update below
                weight
              })
            }
          }
        }
      }

      // Fetch apiary share_location status and image
      const apiaryNames = Array.from(originMap.keys())
      let apiaryImageUrl: string | null = null
      if (apiaryNames.length > 0) {
        const { data: apiaries } = await supabase
          .from('apiaries')
          .select('name, share_location, latitude, longitude, image_url')
          .eq('user_id', userId)
          .in('name', apiaryNames)

        if (apiaries) {
          for (const apiary of apiaries) {
            const origin = originMap.get(apiary.name)
            if (origin) {
              origin.hasLocation = apiary.share_location === true && apiary.latitude != null && apiary.longitude != null
            }
            // Get first apiary with an image
            if (!apiaryImageUrl && apiary.image_url) {
              apiaryImageUrl = normaliseStoragePublicUrl(apiary.image_url)
            }
          }
        }
      }

      // Fetch floral sources from harvests
      const harvestIds: string[] = []
      for (const container of selectedContainers) {
        if (container.harvests) {
          for (const h of container.harvests) {
            harvestIds.push(h.harvest_id)
          }
        }
      }

      if (harvestIds.length > 0) {
        const { data: harvests } = await supabase
          .from('harvests')
          .select('floral_source')
          .in('id', harvestIds)

        if (harvests) {
          for (const h of harvests) {
            if (h.floral_source) {
              floralSourcesSet.add(h.floral_source)
            }
          }
        }
      }

      // Calculate percentages
      const totalWeight = Array.from(originMap.values()).reduce((sum, o) => sum + o.weight, 0)
      const origins = Array.from(originMap.entries()).map(([name, data]) => ({
        name,
        city: data.city,
        hasLocation: data.hasLocation,
        percentage: totalWeight > 0 ? Math.round((data.weight / totalWeight) * 100) : 0
      })).sort((a, b) => b.percentage - a.percentage)

      const previewData = {
        beekeeperName,
        origins,
        floralSources: Array.from(floralSourcesSet),
        hasAnyLocationShared: origins.some(o => o.hasLocation),
        apiaryImageUrl
      }

      setPublicPreview(previewData)

      // Auto-populate form fields if they're empty (don't overwrite user edits)
      setBatchForm(prev => {
        const updates: Partial<BatchFormData> = {}

        // Auto-populate title if empty
        if (!prev.public_title) {
          updates.public_title = 'Pure Irish Honey'
        }

        // Auto-populate origin if empty
        if (!prev.public_origin && origins.length > 0 && origins[0].city) {
          updates.public_origin = `Harvested in ${origins[0].city}, Ireland`
        }

        // Auto-populate story if empty
        if (!prev.public_story) {
          let story = `Harvested by ${beekeeperName}`
          if (origins.length > 0) {
            story += ` from ${origins[0].name}`
            if (origins.length > 1) {
              story += ` and ${origins[1].name}`
            }
          }
          story += '.'
          if (previewData.floralSources.length > 0) {
            const sources = previewData.floralSources.slice(0, 3)
            if (sources.length === 1) {
              story += ` The bees foraged on ${sources[0].toLowerCase()}.`
            } else {
              const last = sources.pop()
              story += ` The bees foraged on ${sources.map(s => s.toLowerCase()).join(', ')} and ${last?.toLowerCase()}.`
            }
          }
          updates.public_story = story
        }

        if (Object.keys(updates).length > 0) {
          return { ...prev, ...updates }
        }
        return prev
      })
    }

    fetchPreviewData()
  }, [batchForm.is_public, batchForm.container_ids, containers, userId, editingBatch])

  // Fetch containers

  const fetchBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from('batch_runs')
      .select(`
        *,
        containers:batch_containers(
          id,
          container_id,
          weight_used_kg,
          container:bulk_containers(*)
        ),
        jars:batch_jars(
          id,
          batch_id,
          jar_size_ml,
          jar_weight_g,
          jar_count,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('batch_date', { ascending: false })

    if (error) {
      console.error('Error fetching batches:', error)
      return
    }

    setBatches(data || [])
  }, [userId])

  // Fetch feedback summary for all batches

  const fetchFeedbackSummary = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_batch_feedback_summary', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error fetching feedback summary:', error)
      return
    }

    const summaryMap = new Map<string, FeedbackSummary>()
    if (data) {
      for (const item of data) {
        summaryMap.set(item.batch_id, {
          batch_id: item.batch_id,
          feedback_count: Number(item.feedback_count),
          average_rating: Number(item.average_rating)
        })
      }
    }
    setFeedbackSummary(summaryMap)
  }, [userId])

  // Fetch detailed feedback for a specific batch
  const fetchFeedbackDetails = async (batch: BatchRun) => {
    setFeedbackBatch(batch)
    setLoadingFeedback(true)
    setFeedbackDetails([])

    const { data, error } = await supabase.rpc('get_batch_feedback_details', {
      p_batch_id: batch.id,
      p_user_id: userId
    })

    if (error) {
      console.error('Error fetching feedback details:', error)
      toast.error('Failed to load feedback')
    } else {
      setFeedbackDetails(data || [])
    }
    setLoadingFeedback(false)
  }

  // Fetch available harvests for container form

  const resetBatchForm = () => {
    setBatchForm({
      batch_date: formatDateForInput(new Date()),
      total_weight_kg: '',
      jars: [{ jar_size_ml: '500ml', jar_weight_g: '', jar_count: '' }],
      best_before_date: formatDateForInput(calculateBestBeforeDate(new Date())),
      notes: '',
      is_public: true,
      is_creamed: false,
      show_apiary_image: false,
      show_feedback: true,
      public_title: '',
      public_origin: '',
      public_story: '',
      container_ids: []
    })
    setEditingBatch(null)
    setSelectedTemplate('custom')
    setShowBatchForm(false)
  }

  // Map a stored numeric jar size (e.g. 340) to its dropdown option (e.g. "340ml (12oz)")
  const matchJarSizeOption = (sizeMl: number | null): string =>
    jarSizeOptions.find(opt => opt.startsWith(`${sizeMl}ml`)) || '500ml'

  const handleEditBatch = (batch: BatchRun) => {
    setSelectedTemplate('custom')
    setEditingBatch(batch)
    // Build jar rows from the joined batch_jars; fall back to legacy columns
    // if a batch somehow has no jar rows, so editing never starts empty.
    const jarRows: JarConfig[] = (batch.jars && batch.jars.length > 0)
      ? batch.jars.map(j => ({
          jar_size_ml: matchJarSizeOption(j.jar_size_ml),
          jar_weight_g: j.jar_weight_g?.toString() || '',
          jar_count: j.jar_count?.toString() || '',
        }))
      : [{
          jar_size_ml: matchJarSizeOption(batch.jar_size_ml),
          jar_weight_g: batch.jar_weight_g?.toString() || '',
          jar_count: batch.jar_count?.toString() || '',
        }]
    setBatchForm({
      batch_date: batch.batch_date,
      total_weight_kg: batch.total_weight_kg?.toString() || '',
      jars: jarRows,
      best_before_date: batch.best_before_date || '',
      notes: batch.notes || '',
      is_public: batch.is_public,
      is_creamed: batch.is_creamed || false,
      show_apiary_image: batch.show_apiary_image || false,
      show_feedback: batch.show_feedback ?? true,
      public_title: batch.public_title || '',
      public_origin: batch.public_origin || '',
      public_story: batch.public_story || '',
      container_ids: batch.containers?.map(c => c.container_id) || []
    })
    setShowBatchForm(true)
  }

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Require at least one bulk honey source
    if (batchForm.container_ids.length === 0) {
      toast.error('Please select at least one bulk honey source')
      return
    }

    // Check for unfilled placeholders in public story
    const storyToSave = stripMarkers(batchForm.public_story)
    if (batchForm.is_public && hasUnfilledPlaceholders(storyToSave)) {
      const placeholders = getUnfilledPlaceholders(storyToSave)
      toast.error(`Please fill in all placeholders: ${placeholders.join(', ')}`)
      return
    }

    try {
      let batchCode = editingBatch?.batch_code
      let traceCode = editingBatch?.trace_code

      if (!editingBatch) {
        // Generate new batch code
        batchCode = await generateBatchCode(userId, new Date(batchForm.batch_date))
        // Generate unique trace code via database function
        const { data: newTraceCode } = await supabase.rpc('generate_trace_code')
        traceCode = newTraceCode as string
      }

      // Parse jar rows into clean numeric configs, skipping rows without a valid size.
      const parsedJars = batchForm.jars
        .map(jar => {
          const size = parseInt(jar.jar_size_ml.match(/^\d+/)?.[0] || '')
          const weight = parseInt(jar.jar_weight_g)
          const count = parseInt(jar.jar_count)
          return {
            jar_size_ml: Number.isFinite(size) && size > 0 ? size : null,
            jar_weight_g: Number.isFinite(weight) ? weight : null,
            jar_count: Number.isFinite(count) ? count : null,
          }
        })
        .filter(jar => jar.jar_size_ml !== null)

      // Legacy scalar columns kept in sync for backward-compatible readers:
      // size + weight from the first jar, total count summed across all jars.
      const primaryJar = parsedJars[0]
      const totalJarCount = parsedJars.reduce((sum, j) => sum + (j.jar_count || 0), 0)

      const batchData: Record<string, unknown> = {
        user_id: userId,
        batch_code: batchCode!,
        batch_date: batchForm.batch_date,
        total_weight_kg: batchForm.total_weight_kg ? parseFloat(batchForm.total_weight_kg) : null,
        jar_size_ml: primaryJar?.jar_size_ml ?? null,
        jar_weight_g: primaryJar?.jar_weight_g ?? null,
        jar_count: totalJarCount > 0 ? totalJarCount : null,
        best_before_date: batchForm.best_before_date || null,
        notes: batchForm.notes.trim() || null,
        is_public: batchForm.is_public,
        is_creamed: batchForm.is_creamed,
        show_apiary_image: batchForm.show_apiary_image,
        show_feedback: batchForm.show_feedback,
        public_title: batchForm.public_title.trim() || null,
        public_origin: batchForm.public_origin.trim() || null,
        public_story: stripMarkers(batchForm.public_story).trim() || null,
        updated_at: new Date().toISOString()
      }

      // Only include trace_code for new batches
      if (!editingBatch) {
        batchData.trace_code = traceCode
      }

      let batchId: string

      if (editingBatch) {
        const { error } = await supabase
          .from('batch_runs')
          .update(batchData)
          .eq('id', editingBatch.id)

        if (error) throw error
        batchId = editingBatch.id
      } else {
        const { data, error } = await supabase
          .from('batch_runs')
          .insert(batchData)
          .select('id')
          .single()

        if (error) throw error
        batchId = data.id
      }

      // Replace container links + jar rows atomically (one transaction) so an
      // edit can never leave the batch half-written if a step fails.
      const { error: linksError } = await supabase.rpc('replace_batch_links', {
        p_batch_id: batchId,
        p_container_ids: batchForm.container_ids,
        p_jars: parsedJars,
      })
      if (linksError) throw linksError

      toast.success(editingBatch ? 'Batch updated' : `Batch ${batchCode} created`)
      resetBatchForm()
      fetchBatches()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving batch')
    }
  }

  const handleDeleteBatch = async (id: string) => {
    if (!confirm('Delete this batch?')) return

    const { error } = await supabase
      .from('batch_runs')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error deleting batch')
      return
    }

    toast.success('Batch deleted')
    fetchBatches()
  }

  // Toggle harvest selection

  const toggleContainer = (containerId: string) => {
    setBatchForm(prev => ({
      ...prev,
      container_ids: prev.container_ids.includes(containerId)
        ? prev.container_ids.filter(id => id !== containerId)
        : [...prev.container_ids, containerId]
    }))
  }

  const updateJar = (index: number, field: keyof JarConfig, value: string) => {
    setBatchForm(prev => ({
      ...prev,
      jars: prev.jars.map((jar, i) => i === index ? { ...jar, [field]: value } : jar)
    }))
  }

  const addJar = () => {
    setBatchForm(prev => ({
      ...prev,
      jars: [...prev.jars, { jar_size_ml: jarSizeOptions[0] || '500ml', jar_weight_g: '', jar_count: '' }]
    }))
  }

  const removeJar = (index: number) => {
    setBatchForm(prev => ({
      ...prev,
      // Always keep at least one row so the form never goes empty.
      jars: prev.jars.length > 1 ? prev.jars.filter((_, i) => i !== index) : prev.jars
    }))
  }

  // Calculate origins for a container

  const getTraceUrl = (traceCode: string, jarWeightG?: number | null) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.hivecraic.com'
    const url = `${baseUrl}/trace/${traceCode}`
    return jarWeightG != null ? `${url}?w=${jarWeightG}` : url
  }

  // Jar sizes on a batch that carry a net weight — each gets its own QR so a
  // consumer scanning a specific jar sees that jar's net weight unambiguously.
  const jarsWithWeight = (batch: BatchRun): BatchJar[] =>
    (batch.jars || []).filter(j => j.jar_weight_g != null)

  // Honey already jarred from this batch: Σ(net weight × jar count), so the card
  // can show bottled output against the raw honey that went in (Total).
  //
  // Batches with no batch_jars rows fall back to the legacy scalar columns. That
  // cannot overcount: legacy jar_weight_g holds the *first* size's weight while
  // jar_count holds the total across sizes, but a batch without jar rows is by
  // definition single-size, so the two describe the same jars.
  //
  // Rows missing a net weight are skipped from *both* totals, so the kg figure
  // and the jar count always describe the same set of weighed jars.
  interface BottledSize {
    key: string
    sizeMl: number | null
    weightG: number
    count: number
    kg: number
  }

  const bottledTotals = (batch: BatchRun): { kg: number; jars: number; sizes: BottledSize[] } => {
    const rows = (batch.jars && batch.jars.length > 0)
      ? batch.jars
      : [{ id: 'legacy', jar_size_ml: batch.jar_size_ml, jar_weight_g: batch.jar_weight_g, jar_count: batch.jar_count }]

    const sizes: BottledSize[] = []
    let grams = 0
    let jars = 0
    for (const row of rows) {
      const weight = row.jar_weight_g
      const count = row.jar_count
      if (weight == null || count == null || weight <= 0 || count <= 0) continue
      sizes.push({ key: row.id, sizeMl: row.jar_size_ml, weightG: weight, count, kg: (weight * count) / 1000 })
      grams += weight * count
      jars += count
    }
    return { kg: grams / 1000, jars, sizes }
  }

  // Share of a batch's recorded intake, for the Bottled/Unbottled lines. A real
  // but tiny share must never read as "0%" — that would look like nothing was
  // bottled at all.
  const formatShare = (pct: number, kg: number): string =>
    (pct === 0 && kg > 0 ? '<1%' : `${pct}%`)

  // Download a QR code SVG (by element id) as a PNG.
  const downloadQrCode = (elementId: string, filename: string) => {
    const svg = document.getElementById(elementId)
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new window.Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngUrl = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = pngUrl
      downloadLink.download = filename
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }


 // Load this tab's data on mount
 useEffect(() => {
  fetchBatches()
  fetchFeedbackSummary()
 }, [fetchBatches, fetchFeedbackSummary])

 return (
  <>
      {showBatchForm && (
        <div className="bg-surface-elevated rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingBatch ? `Edit Batch ${editingBatch.batch_code}` : 'New Batch'}
            </h3>
            <Button onClick={resetBatchForm} className="p-2 hover:bg-surface rounded-lg">
              <X size={20} />
            </Button>
          </div>

          {/* Printed jar labels pointing here. Their QR codes are already on
              jars, so a change to this batch changes what those scans resolve
              to — worth saying out loud before the user edits or unpublishes. */}
          {editingBatch && (() => {
            const pointing = labelPointers.filter(l => l.current_batch_id === editingBatch.id && l.is_active)
            if (pointing.length === 0) return null
            return (
              <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                  <Tag size={16} className="flex-shrink-0" />
                  {pointing.length === 1
                    ? 'A printed jar label points at this batch'
                    : `${pointing.length} printed jar labels point at this batch`}
                </p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                  {pointing.map(l => l.name).join(', ')} — scanning those jars shows this batch.
                  {!batchForm.is_public && ' While this batch is not public, those scans show no batch information.'}
                </p>
              </div>
            )
          })()}

          {/* QR Code Preview for existing public batches */}
          {editingBatch && editingBatch.trace_code && editingBatch.is_public && (() => {
            const weightedJars = jarsWithWeight(editingBatch)
            // 2+ jar sizes → one QR per size so each jar's sticker resolves to
            // its own net weight on the public page.
            if (weightedJars.length >= 2) {
              const code = editingBatch.trace_code
              return (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                    Public Trace Links — one QR per jar size
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {weightedJars.map(jar => {
                      const svgId = `qr-edit-svg-${jar.id}`
                      const url = getTraceUrl(code, jar.jar_weight_g)
                      return (
                        <div key={jar.id} className="flex items-center gap-3">
                          <div className="bg-surface p-2 rounded-lg border border-border">
                            <QRCodeSVG id={svgId} value={url} size={64} level="L" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{jar.jar_weight_g}g jar</p>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-amber-600 dark:text-amber-400 hover:underline break-all"
                            >
                              {url}
                            </a>
                            <Button
                              type="button"
                              onClick={() => downloadQrCode(svgId, `qr-${editingBatch.batch_code}-${jar.jar_weight_g}g.png`)}
                              className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
                            >
                              <Download size={14} /> Download PNG
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }
            // Single (or no) jar size → keep the original single trace link.
            const url = getTraceUrl(editingBatch.trace_code, weightedJars[0]?.jar_weight_g)
            return (
              <div className="flex items-center gap-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
                <div className="bg-surface p-2 rounded-lg border border-border">
                  <QRCodeSVG id="qr-edit-svg-single" value={url} size={64} level="L" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Public Trace Link</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-amber-600 dark:text-amber-400 hover:underline break-all flex items-center gap-1"
                  >
                    {url}
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <Button
                    type="button"
                    onClick={() => downloadQrCode('qr-edit-svg-single', `qr-${editingBatch.batch_code}.png`)}
                    className="mt-1 flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    <Download size={14} /> Download PNG
                  </Button>
                </div>
              </div>
            )
          })()}

          <form onSubmit={handleBatchSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Batch Date *
                </label>
                <input
                  type="date"
                  value={batchForm.batch_date}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, batch_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Best Before Date
                </label>
                <input
                  type="date"
                  value={batchForm.best_before_date}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, best_before_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Total Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={batchForm.total_weight_kg}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, total_weight_kg: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                />
              </div>
            </div>

            {/* Jar Sizes — one row per size, summed into Total Weight */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Jar Sizes
              </label>
              <div className="space-y-2">
                {batchForm.jars.map((jar, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[110px]">
                      {index === 0 && (
                        <span className="block text-xs text-text-secondary mb-1">Jar Size (ml)</span>
                      )}
                      <select
                        value={jar.jar_size_ml}
                        onChange={(e) => updateJar(index, 'jar_size_ml', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                      >
                        {(jarSizeOptions.length > 0 ? jarSizeOptions : ['500ml']).map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[90px]">
                      {index === 0 && (
                        <span className="block text-xs text-text-secondary mb-1">Net Weight (g)</span>
                      )}
                      <input
                        type="number"
                        value={jar.jar_weight_g}
                        onChange={(e) => updateJar(index, 'jar_weight_g', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                        placeholder="e.g., 454"
                      />
                    </div>
                    <div className="flex-1 min-w-[80px]">
                      {index === 0 && (
                        <span className="block text-xs text-text-secondary mb-1">Jar Count</span>
                      )}
                      <input
                        type="number"
                        value={jar.jar_count}
                        onChange={(e) => updateJar(index, 'jar_count', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                        placeholder="e.g., 48"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => removeJar(index)}
                      disabled={batchForm.jars.length === 1}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Remove jar size"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                onClick={addJar}
                className="mt-2 text-sm text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Plus size={16} /> Add jar size
              </Button>
              {(() => {
                // Proposed bottled output from the jar rows: Σ(net weight × count).
                let grams = 0
                let jarCount = 0
                for (const jar of batchForm.jars) {
                  const weight = parseInt(jar.jar_weight_g)
                  const count = parseInt(jar.jar_count)
                  if (Number.isFinite(weight) && Number.isFinite(count) && weight > 0 && count > 0) {
                    grams += weight * count
                    jarCount += count
                  }
                }
                if (grams <= 0) return null
                return (
                  <p className="mt-2 text-sm text-text-secondary">
                    Proposed bottled output:{' '}
                    <span className="font-medium text-foreground">{(grams / 1000).toFixed(2)} kg</span>
                    {' '}across {jarCount} jar{jarCount === 1 ? '' : 's'}
                  </p>
                )
              })()}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_creamed"
                  checked={batchForm.is_creamed}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, is_creamed: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="is_creamed" className="text-sm">
                  Creamed (stirred creamy)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={batchForm.is_public}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="is_public" className="text-sm">
                  Public (allow consumer lookup)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
              <textarea
                value={batchForm.notes}
                onChange={(e) => setBatchForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                rows={2}
              />
            </div>

            {/* Container Selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Bulk Honey Source ({batchForm.container_ids.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                {containers.filter(c => !c.excluded).length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-2">
                    No bulk honey available. Create bulk honey first.
                  </p>
                ) : (
                  containers.filter(c => !c.excluded).map(container => (
                    <Button
                      key={container.id}
                      type="button"
                      onClick={() => toggleContainer(container.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        batchForm.container_ids.includes(container.id)
                          ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-500'
                          : 'hover:bg-surface'
                      }`}
                    >
                      <div>
                        <span className="font-medium">{container.container_code}</span>
                        <span className="text-text-secondary ml-2">
                          {new Date(container.extraction_date).toLocaleDateString()}
                        </span>
                        {container.total_weight_kg && (
                          <span className="text-text-secondary ml-2">
                            • {container.total_weight_kg} kg
                          </span>
                        )}
                      </div>
                      {batchForm.container_ids.includes(container.id) && (
                        <Check size={18} className="text-amber-600" />
                      )}
                    </Button>
                  ))
                )}
              </div>
            </div>

            {/* Public Preview Section */}
            {batchForm.is_public && (
              <div className="border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden bg-amber-50/50 dark:bg-amber-900/10">
                <div className="bg-amber-100 dark:bg-amber-900/30 px-4 py-2 border-b border-amber-200 dark:border-amber-800">
                  <h4 className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <span>🍯</span> Public Preview
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    This is what consumers will see when they scan the QR code
                  </p>
                </div>

                {batchForm.container_ids.length === 0 && (!editingBatch?.containers || editingBatch.containers.length === 0) ? (
                  <div className="p-4 text-center text-text-secondary text-sm">
                    Select bulk honey to see public preview
                  </div>
                ) : publicPreview ? (
                  <div className="p-4 space-y-4">
                    {/* Editable Title */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Title</label>
                      <input
                        type="text"
                        value={batchForm.public_title}
                        onChange={(e) => setBatchForm(prev => ({ ...prev, public_title: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-surface-elevated text-center font-bold"
                        placeholder="Pure Irish Honey"
                      />
                    </div>

                    {/* Editable Origin */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Origin Headline</label>
                      <input
                        type="text"
                        value={batchForm.public_origin}
                        onChange={(e) => setBatchForm(prev => ({ ...prev, public_origin: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-surface-elevated text-center"
                        placeholder="Harvested in Meath, Ireland"
                      />
                    </div>

                    {/* Map Status */}
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin size={16} className={publicPreview.hasAnyLocationShared ? 'text-green-600' : 'text-text-tertiary'} />
                      {publicPreview.hasAnyLocationShared ? (
                        <span className="text-green-700 dark:text-green-400">
                          Map will be shown (apiary location shared)
                        </span>
                      ) : (
                        <span className="text-text-secondary flex items-center gap-1">
                          <AlertCircle size={14} className="text-amber-500" />
                          No map - enable &quot;Share Location&quot; on apiary to show map
                        </span>
                      )}
                    </div>

                    {/* Apiary Image Option */}
                    {publicPreview.apiaryImageUrl && (
                      <div className="border border-border rounded-lg p-3 bg-surface-elevated">
                        <div className="flex items-start gap-3">
                          <div className="relative w-16 h-16">
                            <Image
                              src={publicPreview.apiaryImageUrl}
                              alt="Apiary"
                              fill
                              className="object-cover rounded-lg border border-border"
                              unoptimized
                            />
                          </div>
                          <div className="flex-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={batchForm.show_apiary_image}
                                onChange={(e) => setBatchForm(prev => ({ ...prev, show_apiary_image: e.target.checked }))}
                                className="rounded text-amber-600"
                              />
                              <span className="text-sm font-medium">Show apiary image on public page</span>
                            </label>
                            <p className="text-xs text-text-secondary mt-1">
                              Display this image below the map on the trace page
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Feedback Toggle */}
                    <div className="border border-border rounded-lg p-3 bg-surface-elevated">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={batchForm.show_feedback}
                          onChange={(e) => setBatchForm(prev => ({ ...prev, show_feedback: e.target.checked }))}
                          className="rounded text-amber-600"
                        />
                        <span className="text-sm font-medium">Show feedback form on public page</span>
                      </label>
                      <p className="text-xs text-text-secondary mt-1 ml-6">
                        Allow customers to rate and comment on this honey
                      </p>
                    </div>

                    {/* Story Template Selector */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-2">Story Template</label>
                      <div className="space-y-1.5 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="storyTemplate"
                            value="custom"
                            checked={selectedTemplate === 'custom'}
                            onChange={() => setSelectedTemplate('custom')}
                            className="text-amber-600"
                          />
                          <span className="text-sm">Custom</span>
                        </label>
                        {storyTemplates.map((template) => (
                          <label key={template.id} className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="storyTemplate"
                              value={template.id}
                              checked={selectedTemplate === template.id}
                              onChange={() => {
                                setSelectedTemplate(template.id)
                                const populated = replacePlaceholders(template.template, {
                                  beekeeperName: publicPreview?.beekeeperName,
                                  floralSources: publicPreview?.floralSources,
                                  origins: publicPreview?.origins,
                                  batchDate: batchForm.batch_date,
                                  batchCode: editingBatch?.batch_code
                                })
                                setBatchForm(prev => ({ ...prev, public_story: populated }))
                              }}
                              className="text-amber-600 mt-0.5"
                            />
                            <div>
                              <span className="text-sm font-medium">{template.name}</span>
                              <span className="text-xs text-text-secondary ml-1">- {template.description}</span>
                            </div>
                          </label>
                        ))}
                      </div>

                      <label className="block text-xs font-medium text-text-secondary mb-1">Story Text</label>
                      <textarea
                        value={batchForm.public_story}
                        onChange={(e) => {
                          setBatchForm(prev => ({ ...prev, public_story: e.target.value }))
                          setSelectedTemplate('custom')
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-surface-elevated text-sm font-mono"
                        rows={4}
                        placeholder="Harvested by [name] from [apiary]. The bees foraged on [flowers]."
                      />

                      {/* Formatted Preview */}
                      {batchForm.public_story && (
                        <div className="mt-2 p-3 bg-surface-secondary rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-text-secondary">Preview:</p>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="text-text-secondary">Auto-filled</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                <span className="text-text-secondary">Needs input</span>
                              </span>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed">
                            {batchForm.public_story.split(/(<<[^>]+>>|\[[^\]]+\])/).map((part, i) => {
                              if (part.startsWith('<<') && part.endsWith('>>')) {
                                // Auto-inserted value - green bold
                                return <span key={i} className="font-semibold text-green-600 dark:text-green-400">{part.slice(2, -2)}</span>
                              } else if (part.startsWith('[') && part.endsWith(']')) {
                                // Unfilled placeholder - red
                                return <span key={i} className="font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1 rounded">{part}</span>
                              }
                              return part
                            })}
                          </p>
                        </div>
                      )}

                      {hasUnfilledPlaceholders(stripMarkers(batchForm.public_story)) && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Fill in red placeholders: {getUnfilledPlaceholders(stripMarkers(batchForm.public_story)).join(', ')}
                        </p>
                      )}
                      {publicPreview.floralSources.length === 0 && !hasUnfilledPlaceholders(stripMarkers(batchForm.public_story)) && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Tip: Add floral source to harvests to auto-populate templates
                        </p>
                      )}
                    </div>

                    {/* Details Preview */}
                    <div className="bg-surface-elevated rounded-lg p-3 border border-border space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Net Weight</span>
                        <span className="font-medium">
                          {(() => {
                            const weights = batchForm.jars
                              .map(j => j.jar_weight_g.trim())
                              .filter(w => w !== '')
                            return weights.length > 0
                              ? weights.map(w => `${w}g`).join(', ')
                              : <span className="text-amber-500">Not set</span>
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Bottled</span>
                        <span className="font-medium">{new Date(batchForm.batch_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      {batchForm.best_before_date && (
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Best Before</span>
                          <span className="font-medium">{new Date(batchForm.best_before_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-text-tertiary">
                        <span>Batch</span>
                        <span className="font-mono text-xs">{editingBatch?.batch_code || 'L-YYYY-MM-NNN'}</span>
                      </div>
                    </div>

                    {/* Origins */}
                    {publicPreview.origins.length > 0 && (
                      <div className="text-sm">
                        <p className="text-text-secondary mb-2">Origins:</p>
                        <div className="space-y-1">
                          {publicPreview.origins.map((origin, i) => (
                            <div key={i} className="flex items-center justify-between bg-surface-elevated rounded px-3 py-2 border border-border">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>{origin.name}</span>
                                {origin.city && <span className="text-text-tertiary">({origin.city})</span>}
                              </div>
                              <span className="font-bold text-amber-600">{origin.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Verification Badge */}
                    <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-2 flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Traced from hive to jar</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-text-secondary text-sm">
                    Loading preview...
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={resetBatchForm}
                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                {editingBatch ? 'Update' : 'Create'} Batch
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Container List */}

      {(
        <div className="space-y-4">
          {batches.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <Milk size={48} className="mx-auto mb-4 opacity-50" />
              <p>No batches yet. Create bulk honey first, then create a bottling batch.</p>
            </div>
          ) : (
            batches.map(batch => {
              const containerCount = batch.containers?.length || 0
              const feedback = feedbackSummary.get(batch.id)
              const bottled = bottledTotals(batch)
              // total_weight_kg is the one numeric (not integer) column here, so
              // coerce before arithmetic rather than trusting the wire format.
              const totalKg = batch.total_weight_kg != null ? Number(batch.total_weight_kg) : null
              const unbottledKg = totalKg != null && Number.isFinite(totalKg)
                ? totalKg - bottled.kg
                : null
              // Percentages need a positive total to divide by. The unbottled share
              // is derived from the bottled one rather than computed separately, so
              // the two always sum to 100% however each would have rounded.
              const bottledPct = totalKg != null && Number.isFinite(totalKg) && totalKg > 0
                ? Math.round((bottled.kg / totalKg) * 100)
                : null

              return (
                <div
                  key={batch.id}
                  className="bg-surface-elevated rounded-xl p-4 border border-border shadow-sm"
                >
                  {/* Header row with batch code and badges */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Milk size={20} className="text-amber-600 flex-shrink-0" />
                    <h3 className="text-lg font-semibold font-mono">{batch.batch_code}</h3>
                    {batch.is_creamed && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs">
                        Creamed
                      </span>
                    )}
                    {batch.is_public && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs">
                        Public
                      </span>
                    )}
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-text-secondary mb-3">
                    <div>
                      <span className="font-medium">Bottled On:</span>{' '}
                      {new Date(batch.batch_date).toLocaleDateString()}
                    </div>
                    {batch.best_before_date && (
                      <div>
                        <span className="font-medium">Best Before:</span>{' '}
                        {new Date(batch.best_before_date).toLocaleDateString()}
                      </div>
                    )}
                    {batch.jars && batch.jars.length > 0 ? (
                      <div className="col-span-2">
                        <span className="font-medium">Jars:</span>{' '}
                        {batch.jars.map((jar, i) => (
                          <span key={jar.id}>
                            {i > 0 && ', '}
                            {jar.jar_size_ml}ml
                            {jar.jar_weight_g != null && ` · ${jar.jar_weight_g}g`}
                            {jar.jar_count != null && ` × ${jar.jar_count}`}
                          </span>
                        ))}
                      </div>
                    ) : batch.jar_size_ml && (
                      <div className="col-span-2">
                        <span className="font-medium">Jars:</span>{' '}
                        {batch.jar_size_ml}ml
                        {batch.jar_weight_g != null && ` · ${batch.jar_weight_g}g`}
                        {batch.jar_count != null && ` × ${batch.jar_count}`}
                      </div>
                    )}
                    {batch.total_weight_kg != null && (
                      <div>
                        <span className="font-medium">Total:</span>{' '}
                        {batch.total_weight_kg} kg
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Bulk Honey:</span> {containerCount}
                    </div>
                    {bottled.kg > 0 && (
                      <div className="col-span-2">
                        <span className="font-medium">Bottled:</span>{' '}
                        {bottled.kg.toFixed(2)} kg ({bottledPct != null && `${formatShare(bottledPct, bottled.kg)} · `}
                        {bottled.jars} jar{bottled.jars === 1 ? '' : 's'})
                        {/* Per-size breakdown only earns its space on multi-size
                            batches — on a single size it just repeats the total. */}
                        {bottled.sizes.length > 1 && (
                          <ul className="mt-1 ml-4 list-disc space-y-0.5">
                            {bottled.sizes.map(size => (
                              <li key={size.key}>
                                {size.sizeMl != null && `${size.sizeMl}ml · `}
                                {size.weightG}g × {size.count} = {size.kg.toFixed(2)} kg
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    {/* Honey from this batch not yet in jars. Only meaningful once
                        something has been bottled — before that it just repeats Total.
                        A negative figure means more was jarred than the recorded
                        intake, which is a data problem worth surfacing, not hiding.
                        The 5g tolerance stops rounding noise reading as over-bottling. */}
                    {unbottledKg != null && bottled.kg > 0 && (
                      unbottledKg < -0.005 ? (
                        <div className="col-span-2 text-amber-600 dark:text-amber-400">
                          <span className="font-medium">Unbottled:</span>{' '}
                          none — {Math.abs(unbottledKg).toFixed(2)} kg more bottled than the recorded total
                        </div>
                      ) : (
                        <div className="col-span-2">
                          <span className="font-medium">Unbottled:</span>{' '}
                          {Math.max(unbottledKg, 0).toFixed(2)} kg
                          {bottledPct != null && ` (${formatShare(100 - bottledPct, Math.max(unbottledKg, 0))})`}
                        </div>
                      )
                    )}
                    {feedback && (
                      <div className="col-span-2 flex items-center gap-2">
                        <span className="font-medium">Feedback:</span>
                        <span className="flex items-center gap-1">
                          <Star size={14} className="text-amber-500 fill-amber-500" />
                          <span className="font-semibold text-amber-600 dark:text-amber-400">{feedback.average_rating}</span>
                          <span className="text-text-tertiary">({feedback.feedback_count} review{feedback.feedback_count !== 1 ? 's' : ''})</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {batch.notes && (
                    <p className="mb-3 text-sm text-text-secondary">{batch.notes}</p>
                  )}

                  {/* Action buttons row */}
                  <div className="flex gap-2 pt-2 border-t border-border">
                    {feedback && feedback.feedback_count > 0 && (
                      <Button
                        onClick={() => fetchFeedbackDetails(batch)}
                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg transition-colors"
                        title="View Feedback"
                      >
                        <MessageSquare size={18} />
                      </Button>
                    )}
                    {batch.is_public && (
                      <Button
                        onClick={() => setQrBatch(batch)}
                        className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 rounded-lg transition-colors"
                        title="QR Code"
                      >
                        <QrCode size={18} />
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button
                      onClick={() => handleEditBatch(batch)}
                      className="p-2 hover:bg-surface rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button
                      onClick={() => handleDeleteBatch(batch.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* QR Code Modal */}
      {qrBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-2xl p-6 max-w-sm w-full shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">QR Code</h3>
              <Button
                onClick={() => setQrBatch(null)}
                className="p-2 hover:bg-surface rounded-lg"
              >
                <X size={20} />
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-text-secondary mb-4">
                Scan to trace batch <span className="font-mono font-semibold">{qrBatch.batch_code}</span>
              </p>

              {(() => {
                const weightedJars = jarsWithWeight(qrBatch)
                // 2+ jar sizes → one QR per size, each with its own download.
                if (weightedJars.length >= 2) {
                  return (
                    <div className="space-y-6">
                      {weightedJars.map(jar => {
                        const svgId = `qr-code-svg-${jar.id}`
                        const url = getTraceUrl(qrBatch.trace_code, jar.jar_weight_g)
                        return (
                          <div key={jar.id}>
                            <p className="text-sm font-medium text-foreground mb-2">{jar.jar_weight_g}g jar</p>
                            <div className="bg-surface p-4 rounded-xl border border-border inline-block mb-2">
                              <QRCodeSVG id={svgId} value={url} size={180} level="H" includeMargin={true} />
                            </div>
                            <p className="text-xs text-text-secondary mb-2 break-all">{url}</p>
                            <Button
                              onClick={() => downloadQrCode(svgId, `qr-${qrBatch.batch_code}-${jar.jar_weight_g}g.png`)}
                              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                            >
                              <Download size={18} />
                              Download PNG
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )
                }
                // Single (or no) jar size → one QR as before.
                const url = getTraceUrl(qrBatch.trace_code, weightedJars[0]?.jar_weight_g)
                return (
                  <>
                    <div className="bg-surface p-4 rounded-xl border border-border inline-block mb-4">
                      <QRCodeSVG id="qr-code-svg" value={url} size={200} level="H" includeMargin={true} />
                    </div>
                    <p className="text-xs text-text-secondary mb-4 break-all">{url}</p>
                    <Button
                      onClick={() => downloadQrCode('qr-code-svg', `qr-${qrBatch.batch_code}.png`)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      <Download size={18} />
                      Download PNG
                    </Button>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Customer Feedback</h3>
                <p className="text-sm text-text-secondary font-mono">{feedbackBatch.batch_code}</p>
              </div>
              <Button
                onClick={() => setFeedbackBatch(null)}
                className="p-2 hover:bg-surface rounded-lg"
              >
                <X size={20} />
              </Button>
            </div>

            {/* Summary */}
            {feedbackSummary.get(feedbackBatch.id) && (
              <div className="flex items-center justify-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star size={24} className="text-amber-500 fill-amber-500" />
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {feedbackSummary.get(feedbackBatch.id)?.average_rating}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {feedbackSummary.get(feedbackBatch.id)?.feedback_count} review{feedbackSummary.get(feedbackBatch.id)?.feedback_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Feedback List */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {loadingFeedback ? (
                <div className="text-center py-8 text-text-secondary">
                  Loading feedback...
                </div>
              ) : feedbackDetails.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  No feedback yet
                </div>
              ) : (
                feedbackDetails.map(item => (
                  <div key={item.feedback_id} className="p-3 bg-surface rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            size={14}
                            className={star <= item.rating ? 'text-amber-500 fill-amber-500' : 'text-text-tertiary'}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-text-tertiary">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {item.comment && (
                      <p className="text-sm text-text-secondary">{item.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
  </>
 )
}
