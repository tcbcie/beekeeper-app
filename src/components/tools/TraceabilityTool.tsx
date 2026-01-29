'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Package, Milk, Plus, X, Edit2, Trash2, Check, QrCode, Download, MapPin, AlertCircle, Star, MessageSquare } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useToast } from '@/components/ui/Toast'
import { generateBatchCode } from '@/lib/batch-code'
import { calculateOriginPercentages, formatOrigins, calculateBestBeforeDate, formatDateForInput } from '@/lib/traceability-utils'
import { storyTemplates, replacePlaceholders, hasUnfilledPlaceholders, getUnfilledPlaceholders, stripMarkers } from '@/lib/story-templates'
import type { BulkContainer, BatchRun, HarvestWithApiary, ContainerFormData, BatchFormData, OriginPercentage } from '@/types/traceability'

type TabType = 'containers' | 'batches'

interface TraceabilityToolProps {
  userId: string
}

export default function TraceabilityTool({ userId }: TraceabilityToolProps) {
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('containers')

  // Container state
  const [containers, setContainers] = useState<BulkContainer[]>([])
  const [showContainerForm, setShowContainerForm] = useState(false)
  const [editingContainer, setEditingContainer] = useState<BulkContainer | null>(null)
  const [containerForm, setContainerForm] = useState<ContainerFormData>({
    container_code: '',
    container_type: 'bucket',
    extraction_date: formatDateForInput(new Date()),
    total_weight_kg: '',
    notes: '',
    harvest_ids: []
  })
  const [availableHarvests, setAvailableHarvests] = useState<HarvestWithApiary[]>([])

  // Batch state
  const [batches, setBatches] = useState<BatchRun[]>([])
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [editingBatch, setEditingBatch] = useState<BatchRun | null>(null)
  const [qrBatch, setQrBatch] = useState<BatchRun | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom')
  const [batchForm, setBatchForm] = useState<BatchFormData>({
    batch_date: formatDateForInput(new Date()),
    total_weight_kg: '',
    jar_size_ml: '500ml',
    jar_weight_g: '',
    jar_count: '',
    best_before_date: formatDateForInput(calculateBestBeforeDate(new Date())),
    notes: '',
    is_public: true,
    is_creamed: false,
    show_apiary_image: false,
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

  // Auto-calculate total weight when jar_weight_g and jar_count change
  useEffect(() => {
    const jarWeight = parseInt(batchForm.jar_weight_g)
    const jarCount = parseInt(batchForm.jar_count)

    if (jarWeight > 0 && jarCount > 0) {
      const calculatedKg = ((jarWeight * jarCount) / 1000).toFixed(2)
      setBatchForm(prev => ({ ...prev, total_weight_kg: calculatedKg }))
    }
  }, [batchForm.jar_weight_g, batchForm.jar_count])

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
              apiaryImageUrl = apiary.image_url
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
  const fetchContainers = useCallback(async () => {
    const { data, error } = await supabase
      .from('bulk_containers')
      .select(`
        *,
        harvests:container_harvests(
          id,
          harvest_id,
          harvest:harvests(
            id,
            harvest_date,
            honey_weight,
            unit,
            hive_id,
            hives(
              hive_number,
              apiary_id,
              apiaries(id, name, city)
            )
          )
        ),
        batch_usage:batch_containers(
          weight_used_kg,
          batch:batch_runs(batch_code, total_weight_kg)
        )
      `)
      .eq('user_id', userId)
      .order('extraction_date', { ascending: false })

    if (error) {
      console.error('Error fetching containers:', error)
      return
    }

    setContainers(data || [])
  }, [userId])

  // Fetch batches
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
  const fetchAvailableHarvests = useCallback(async () => {
    // Get all harvests with hive/apiary info
    const { data: harvests, error: harvestsError } = await supabase
      .from('harvests')
      .select(`
        id,
        harvest_date,
        honey_weight,
        unit,
        hives(
          hive_number,
          apiaries(name, city)
        )
      `)
      .eq('user_id', userId)
      .order('harvest_date', { ascending: false })

    if (harvestsError) {
      console.error('Error fetching harvests:', harvestsError)
      return
    }

    // Get already linked harvest IDs (excluding current container being edited)
    const { data: linked } = await supabase
      .from('container_harvests')
      .select('harvest_id, container_id')

    const linkedHarvestIds = new Set(
      (linked || [])
        .filter(l => !editingContainer || l.container_id !== editingContainer.id)
        .map(l => l.harvest_id)
    )

    const formatted: HarvestWithApiary[] = (harvests || []).map(h => {
      // Supabase returns joined data - handle both array and object formats
      const hivesRaw = h.hives as unknown
      const hive = Array.isArray(hivesRaw) ? hivesRaw[0] : hivesRaw
      const apiariesRaw = hive?.apiaries as unknown
      const apiary = Array.isArray(apiariesRaw) ? apiariesRaw[0] : apiariesRaw

      return {
        id: h.id,
        harvest_date: h.harvest_date,
        honey_weight: h.honey_weight,
        unit: h.unit,
        hive_number: hive?.hive_number || 'Unknown',
        apiary_name: apiary?.name || null,
        apiary_city: apiary?.city || null,
        already_linked: linkedHarvestIds.has(h.id)
      }
    })

    setAvailableHarvests(formatted)
  }, [userId, editingContainer])

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'containers') {
      fetchContainers()
      fetchAvailableHarvests()
    } else {
      fetchBatches()
      fetchContainers() // Need containers for batch form
      fetchFeedbackSummary()
    }
  }, [activeTab, fetchContainers, fetchBatches, fetchAvailableHarvests, fetchFeedbackSummary])

  // Container form handlers
  const resetContainerForm = () => {
    setContainerForm({
      container_code: '',
      container_type: 'bucket',
      extraction_date: formatDateForInput(new Date()),
      total_weight_kg: '',
      notes: '',
      harvest_ids: []
    })
    setEditingContainer(null)
    setShowContainerForm(false)
  }

  const handleEditContainer = (container: BulkContainer) => {
    setEditingContainer(container)
    setContainerForm({
      container_code: container.container_code,
      container_type: container.container_type,
      extraction_date: container.extraction_date,
      total_weight_kg: container.total_weight_kg?.toString() || '',
      notes: container.notes || '',
      harvest_ids: container.harvests?.map(h => h.harvest_id) || []
    })
    setShowContainerForm(true)
    fetchAvailableHarvests()
  }

  const handleContainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const containerData = {
        user_id: userId,
        container_code: containerForm.container_code.trim(),
        container_type: containerForm.container_type,
        extraction_date: containerForm.extraction_date,
        total_weight_kg: containerForm.total_weight_kg ? parseFloat(containerForm.total_weight_kg) : null,
        notes: containerForm.notes.trim() || null,
        updated_at: new Date().toISOString()
      }

      let containerId: string

      if (editingContainer) {
        // Update existing
        const { error } = await supabase
          .from('bulk_containers')
          .update(containerData)
          .eq('id', editingContainer.id)

        if (error) throw error
        containerId = editingContainer.id

        // Delete existing harvest links
        await supabase
          .from('container_harvests')
          .delete()
          .eq('container_id', containerId)
      } else {
        // Create new
        const { data, error } = await supabase
          .from('bulk_containers')
          .insert(containerData)
          .select('id')
          .single()

        if (error) throw error
        containerId = data.id
      }

      // Add harvest links
      if (containerForm.harvest_ids.length > 0) {
        const links = containerForm.harvest_ids.map(harvest_id => ({
          container_id: containerId,
          harvest_id
        }))

        const { error: linkError } = await supabase
          .from('container_harvests')
          .insert(links)

        if (linkError) throw linkError
      }

      toast.success(editingContainer ? 'Bulk honey updated' : 'Bulk honey created')
      resetContainerForm()
      fetchContainers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving bulk honey')
    }
  }

  const handleDeleteContainer = async (id: string) => {
    if (!confirm('Delete this bulk honey? Harvest links will be removed.')) return

    const { error } = await supabase
      .from('bulk_containers')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error deleting bulk honey')
      return
    }

    toast.success('Bulk honey deleted')
    fetchContainers()
  }

  // Batch form handlers
  const resetBatchForm = () => {
    setBatchForm({
      batch_date: formatDateForInput(new Date()),
      total_weight_kg: '',
      jar_size_ml: '500ml',
      jar_weight_g: '',
      jar_count: '',
      best_before_date: formatDateForInput(calculateBestBeforeDate(new Date())),
      notes: '',
      is_public: true,
      is_creamed: false,
      show_apiary_image: false,
      public_title: '',
      public_origin: '',
      public_story: '',
      container_ids: []
    })
    setEditingBatch(null)
    setSelectedTemplate('custom')
    setShowBatchForm(false)
  }

  const handleEditBatch = (batch: BatchRun) => {
    setSelectedTemplate('custom')
    setEditingBatch(batch)
    // Find matching jar size option (e.g., 340 -> "340ml (12oz)")
    const matchingJarSize = jarSizeOptions.find(opt => opt.startsWith(`${batch.jar_size_ml}ml`)) || '500ml'
    setBatchForm({
      batch_date: batch.batch_date,
      total_weight_kg: batch.total_weight_kg?.toString() || '',
      jar_size_ml: matchingJarSize,
      jar_weight_g: batch.jar_weight_g?.toString() || '',
      jar_count: batch.jar_count?.toString() || '',
      best_before_date: batch.best_before_date || '',
      notes: batch.notes || '',
      is_public: batch.is_public,
      is_creamed: batch.is_creamed || false,
      show_apiary_image: batch.show_apiary_image || false,
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

      const batchData: Record<string, unknown> = {
        user_id: userId,
        batch_code: batchCode!,
        batch_date: batchForm.batch_date,
        total_weight_kg: batchForm.total_weight_kg ? parseFloat(batchForm.total_weight_kg) : null,
        jar_size_ml: batchForm.jar_size_ml ? parseInt(batchForm.jar_size_ml.match(/^\d+/)?.[0] || '0') : null,
        jar_weight_g: batchForm.jar_weight_g ? parseInt(batchForm.jar_weight_g) : null,
        jar_count: batchForm.jar_count ? parseInt(batchForm.jar_count) : null,
        best_before_date: batchForm.best_before_date || null,
        notes: batchForm.notes.trim() || null,
        is_public: batchForm.is_public,
        is_creamed: batchForm.is_creamed,
        show_apiary_image: batchForm.show_apiary_image,
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

        // Delete existing container links
        await supabase
          .from('batch_containers')
          .delete()
          .eq('batch_id', batchId)
      } else {
        const { data, error } = await supabase
          .from('batch_runs')
          .insert(batchData)
          .select('id')
          .single()

        if (error) throw error
        batchId = data.id
      }

      // Add container links
      if (batchForm.container_ids.length > 0) {
        const links = batchForm.container_ids.map(container_id => ({
          batch_id: batchId,
          container_id
        }))

        const { error: linkError } = await supabase
          .from('batch_containers')
          .insert(links)

        if (linkError) throw linkError
      }

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
  const toggleHarvest = (harvestId: string) => {
    setContainerForm(prev => ({
      ...prev,
      harvest_ids: prev.harvest_ids.includes(harvestId)
        ? prev.harvest_ids.filter(id => id !== harvestId)
        : [...prev.harvest_ids, harvestId]
    }))
  }

  // Toggle container selection
  const toggleContainer = (containerId: string) => {
    setBatchForm(prev => ({
      ...prev,
      container_ids: prev.container_ids.includes(containerId)
        ? prev.container_ids.filter(id => id !== containerId)
        : [...prev.container_ids, containerId]
    }))
  }

  // Calculate origins for a container
  const getContainerOrigins = (container: BulkContainer): OriginPercentage[] => {
    if (!container.harvests) return []
    return calculateOriginPercentages(container.harvests)
  }

  // Get trace URL for a batch (uses trace_code for unique public URLs)
  const getTraceUrl = (traceCode: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.hivecraic.com'
    return `${baseUrl}/trace/${traceCode}`
  }

  // Download QR code as PNG
  const downloadQrCode = (batchCode: string) => {
    const svg = document.getElementById('qr-code-svg')
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
      downloadLink.download = `qr-${batchCode}.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-forest-600 dark:text-forest-400" />
          <h2 className="text-xl font-semibold text-foreground">Honey Provenance</h2>
        </div>
        <button
          onClick={() => activeTab === 'containers' ? setShowContainerForm(true) : setShowBatchForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">
            {activeTab === 'containers' ? 'New Bulk Honey' : 'New Batch'}
          </span>
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('containers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'containers'
              ? 'bg-amber-600 text-white'
              : 'bg-surface-elevated text-text-secondary hover:bg-sage-100 dark:hover:bg-slate-700'
          }`}
        >
          <Package size={18} />
          <span>Bulk Honey</span>
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'batches'
              ? 'bg-amber-600 text-white'
              : 'bg-surface-elevated text-text-secondary hover:bg-sage-100 dark:hover:bg-slate-700'
          }`}
        >
          <Milk size={18} />
          <span>Batches</span>
        </button>
      </div>

      {/* Container Form */}
      {showContainerForm && activeTab === 'containers' && (
        <div className="bg-surface-elevated rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingContainer ? 'Edit Bulk Honey' : 'New Bulk Honey'}
            </h3>
            <button onClick={resetContainerForm} className="p-2 hover:bg-surface rounded-lg">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleContainerSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Container Code *
                </label>
                <input
                  type="text"
                  value={containerForm.container_code}
                  onChange={(e) => setContainerForm(prev => ({ ...prev, container_code: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                  placeholder="e.g., Bucket-01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Container Type
                </label>
                <select
                  value={containerForm.container_type}
                  onChange={(e) => setContainerForm(prev => ({ ...prev, container_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                >
                  <option value="bucket">Bucket</option>
                  <option value="tank">Tank</option>
                  <option value="drum">Drum</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Extraction Date *
                </label>
                <input
                  type="date"
                  value={containerForm.extraction_date}
                  onChange={(e) => setContainerForm(prev => ({ ...prev, extraction_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Total Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={containerForm.total_weight_kg}
                  onChange={(e) => setContainerForm(prev => ({ ...prev, total_weight_kg: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                  placeholder="e.g., 25.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
              <textarea
                value={containerForm.notes}
                onChange={(e) => setContainerForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                rows={2}
                placeholder="Optional notes..."
              />
            </div>

            {/* Harvest Selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Link Harvests ({containerForm.harvest_ids.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                {availableHarvests.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-2">No harvests available</p>
                ) : (
                  availableHarvests.map(harvest => (
                    <button
                      key={harvest.id}
                      type="button"
                      onClick={() => !harvest.already_linked && toggleHarvest(harvest.id)}
                      disabled={harvest.already_linked}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        containerForm.harvest_ids.includes(harvest.id)
                          ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-500'
                          : harvest.already_linked
                            ? 'bg-gray-100 dark:bg-gray-800 text-text-secondary cursor-not-allowed'
                            : 'hover:bg-surface'
                      }`}
                    >
                      <div>
                        <span className="font-medium">{harvest.hive_number}</span>
                        <span className="text-text-secondary ml-2">
                          {new Date(harvest.harvest_date).toLocaleDateString()}
                        </span>
                        {harvest.apiary_name && (
                          <span className="text-text-secondary ml-2">• {harvest.apiary_name}</span>
                        )}
                        <span className="text-text-secondary ml-2">
                          • {harvest.honey_weight || 0} {harvest.unit || 'kg'}
                        </span>
                        {harvest.already_linked && (
                          <span className="text-amber-600 ml-2">(already linked)</span>
                        )}
                      </div>
                      {containerForm.harvest_ids.includes(harvest.id) && (
                        <Check size={18} className="text-amber-600" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetContainerForm}
                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                {editingContainer ? 'Update' : 'Create'} Bulk Honey
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch Form */}
      {showBatchForm && activeTab === 'batches' && (
        <div className="bg-surface-elevated rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingBatch ? `Edit Batch ${editingBatch.batch_code}` : 'New Batch'}
            </h3>
            <button onClick={resetBatchForm} className="p-2 hover:bg-surface rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* QR Code Preview for existing public batches */}
          {editingBatch && editingBatch.trace_code && editingBatch.is_public && (
            <div className="flex items-center gap-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
              <div className="bg-white p-2 rounded-lg">
                <QRCodeSVG
                  value={getTraceUrl(editingBatch.trace_code)}
                  size={64}
                  level="L"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Public Trace Link</p>
                <a
                  href={getTraceUrl(editingBatch.trace_code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-600 dark:text-amber-400 hover:underline break-all flex items-center gap-1"
                >
                  {getTraceUrl(editingBatch.trace_code)}
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          )}

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
                  Jar Size (ml)
                </label>
                <select
                  value={batchForm.jar_size_ml}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, jar_size_ml: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                >
                  {(jarSizeOptions.length > 0 ? jarSizeOptions : ['500ml']).map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Net Weight (g)
                </label>
                <input
                  type="number"
                  value={batchForm.jar_weight_g}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, jar_weight_g: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                  placeholder="e.g., 454"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Jar Count
                </label>
                <input
                  type="number"
                  value={batchForm.jar_count}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, jar_count: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                  placeholder="e.g., 48"
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
              <div className="flex items-center gap-2 pt-6">
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
              <div className="flex items-center gap-2 pt-6">
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
                {containers.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-2">
                    No bulk honey available. Create bulk honey first.
                  </p>
                ) : (
                  containers.map(container => (
                    <button
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
                    </button>
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
                      <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                      <input
                        type="text"
                        value={batchForm.public_title}
                        onChange={(e) => setBatchForm(prev => ({ ...prev, public_title: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-center font-bold"
                        placeholder="Pure Irish Honey"
                      />
                    </div>

                    {/* Editable Origin */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Origin Headline</label>
                      <input
                        type="text"
                        value={batchForm.public_origin}
                        onChange={(e) => setBatchForm(prev => ({ ...prev, public_origin: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-center"
                        placeholder="Harvested in Meath, Ireland"
                      />
                    </div>

                    {/* Map Status */}
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin size={16} className={publicPreview.hasAnyLocationShared ? 'text-green-600' : 'text-slate-400'} />
                      {publicPreview.hasAnyLocationShared ? (
                        <span className="text-green-700 dark:text-green-400">
                          Map will be shown (apiary location shared)
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1">
                          <AlertCircle size={14} className="text-amber-500" />
                          No map - enable &quot;Share Location&quot; on apiary to show map
                        </span>
                      )}
                    </div>

                    {/* Apiary Image Option */}
                    {publicPreview.apiaryImageUrl && (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800">
                        <div className="flex items-start gap-3">
                          <div className="relative w-16 h-16">
                            <Image
                              src={publicPreview.apiaryImageUrl}
                              alt="Apiary"
                              fill
                              className="object-cover rounded-lg border border-slate-200 dark:border-slate-600"
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
                            <p className="text-xs text-slate-500 mt-1">
                              Display this image below the map on the trace page
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Story Template Selector */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-2">Story Template</label>
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
                              <span className="text-xs text-slate-500 ml-1">- {template.description}</span>
                            </div>
                          </label>
                        ))}
                      </div>

                      <label className="block text-xs font-medium text-slate-500 mb-1">Story Text</label>
                      <textarea
                        value={batchForm.public_story}
                        onChange={(e) => {
                          setBatchForm(prev => ({ ...prev, public_story: e.target.value }))
                          setSelectedTemplate('custom')
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-sm font-mono"
                        rows={4}
                        placeholder="Harvested by [name] from [apiary]. The bees foraged on [flowers]."
                      />

                      {/* Formatted Preview */}
                      {batchForm.public_story && (
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-slate-500">Preview:</p>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="text-slate-500">Auto-filled</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                <span className="text-slate-500">Needs input</span>
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
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Net Weight</span>
                        <span className="font-medium">
                          {batchForm.jar_weight_g ? `${batchForm.jar_weight_g}g` : <span className="text-amber-500">Not set</span>}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bottled</span>
                        <span className="font-medium">{new Date(batchForm.batch_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      {batchForm.best_before_date && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Best Before</span>
                          <span className="font-medium">{new Date(batchForm.best_before_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400">
                        <span>Batch</span>
                        <span className="font-mono text-xs">{editingBatch?.batch_code || 'L-YYYY-MM-NNN'}</span>
                      </div>
                    </div>

                    {/* Origins */}
                    {publicPreview.origins.length > 0 && (
                      <div className="text-sm">
                        <p className="text-slate-500 mb-2">Origins:</p>
                        <div className="space-y-1">
                          {publicPreview.origins.map((origin, i) => (
                            <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded px-3 py-2 border border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>{origin.name}</span>
                                {origin.city && <span className="text-slate-400">({origin.city})</span>}
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
              <button
                type="button"
                onClick={resetBatchForm}
                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                {editingBatch ? 'Update' : 'Create'} Batch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Container List */}
      {activeTab === 'containers' && (
        <div className="space-y-4">
          {containers.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p>No bulk honey yet. Create one to start tracking your honey.</p>
            </div>
          ) : (
            containers.map(container => {
              const origins = getContainerOrigins(container)
              const harvestCount = container.harvests?.length || 0
              // Get batch usage info
              const batchUsage = (container as { batch_usage?: { weight_used_kg: number | null; batch: { batch_code: string; total_weight_kg: number | null } | null }[] }).batch_usage || []
              const batchCodes = batchUsage.map(b => b.batch?.batch_code).filter(Boolean)
              // Calculate total used (use weight_used_kg if set, otherwise use batch total_weight_kg)
              const totalUsed = batchUsage.reduce((sum, b) => {
                if (b.weight_used_kg) return sum + b.weight_used_kg
                if (b.batch?.total_weight_kg) return sum + b.batch.total_weight_kg
                return sum
              }, 0)
              const remaining = container.total_weight_kg ? Math.max(0, container.total_weight_kg - totalUsed) : null

              return (
                <div
                  key={container.id}
                  className="bg-surface-elevated rounded-xl p-4 border border-border shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package size={20} className="text-amber-600" />
                        <h3 className="text-lg font-semibold">{container.container_code}</h3>
                        <span className="px-2 py-0.5 bg-surface rounded text-xs text-text-secondary">
                          {container.container_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-text-secondary">
                        <div>
                          <span className="font-medium">Extracted:</span>{' '}
                          {new Date(container.extraction_date).toLocaleDateString()}
                        </div>
                        {container.total_weight_kg && (
                          <div>
                            <span className="font-medium">Weight:</span>{' '}
                            {container.total_weight_kg} kg
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Harvests:</span> {harvestCount}
                        </div>
                        {batchCodes.length > 0 && (
                          <>
                            <div>
                              <span className="font-medium">Used:</span>{' '}
                              <span className="text-amber-600 dark:text-amber-400">{totalUsed} kg</span>
                            </div>
                            {remaining !== null && (
                              <div>
                                <span className="font-medium">Remaining:</span>{' '}
                                <span className={remaining > 0 ? 'text-green-600 dark:text-green-400' : 'text-text-tertiary'}>
                                  {remaining} kg
                                </span>
                              </div>
                            )}
                            <div className="col-span-2">
                              <span className="font-medium">Batches:</span>{' '}
                              <span className="text-text-secondary font-mono text-xs">
                                {batchCodes.join(', ')}
                              </span>
                            </div>
                          </>
                        )}
                        {origins.length > 0 && (
                          <div className="col-span-2">
                            <span className="font-medium">Origins:</span>{' '}
                            {formatOrigins(origins)}
                          </div>
                        )}
                      </div>

                      {container.notes && (
                        <p className="mt-2 text-sm text-text-secondary">{container.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditContainer(container)}
                        className="p-2 hover:bg-surface rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteContainer(container.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Batch List */}
      {activeTab === 'batches' && (
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
                      <span className="font-medium">Bottled:</span>{' '}
                      {new Date(batch.batch_date).toLocaleDateString()}
                    </div>
                    {batch.best_before_date && (
                      <div>
                        <span className="font-medium">Best Before:</span>{' '}
                        {new Date(batch.best_before_date).toLocaleDateString()}
                      </div>
                    )}
                    {batch.jar_size_ml && (
                      <div>
                        <span className="font-medium">Jar Size:</span>{' '}
                        {batch.jar_size_ml}ml
                      </div>
                    )}
                    {batch.jar_weight_g && (
                      <div>
                        <span className="font-medium">Net Weight:</span>{' '}
                        {batch.jar_weight_g}g
                      </div>
                    )}
                    {batch.jar_count && (
                      <div>
                        <span className="font-medium">Jar Count:</span>{' '}
                        {batch.jar_count}
                      </div>
                    )}
                    {batch.total_weight_kg && (
                      <div>
                        <span className="font-medium">Total:</span>{' '}
                        {batch.total_weight_kg} kg
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Bulk Honey:</span> {containerCount}
                    </div>
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
                      <button
                        onClick={() => fetchFeedbackDetails(batch)}
                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg transition-colors"
                        title="View Feedback"
                      >
                        <MessageSquare size={18} />
                      </button>
                    )}
                    {batch.is_public && (
                      <button
                        onClick={() => setQrBatch(batch)}
                        className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 rounded-lg transition-colors"
                        title="QR Code"
                      >
                        <QrCode size={18} />
                      </button>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => handleEditBatch(batch)}
                      className="p-2 hover:bg-surface rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteBatch(batch.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
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
          <div className="bg-surface-elevated rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">QR Code</h3>
              <button
                onClick={() => setQrBatch(null)}
                className="p-2 hover:bg-surface rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-text-secondary mb-4">
                Scan to trace batch <span className="font-mono font-semibold">{qrBatch.batch_code}</span>
              </p>

              <div className="bg-white p-4 rounded-xl inline-block mb-4">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={getTraceUrl(qrBatch.trace_code)}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <p className="text-xs text-text-secondary mb-4 break-all">
                {getTraceUrl(qrBatch.trace_code)}
              </p>

              <button
                onClick={() => downloadQrCode(qrBatch.trace_code)}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Download size={18} />
                Download PNG
              </button>
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
              <button
                onClick={() => setFeedbackBatch(null)}
                className="p-2 hover:bg-surface rounded-lg"
              >
                <X size={20} />
              </button>
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
                            className={star <= item.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'}
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
    </div>
  )
}
