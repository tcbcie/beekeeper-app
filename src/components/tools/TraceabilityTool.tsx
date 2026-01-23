'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, Milk, Plus, X, Edit2, Trash2, Check, QrCode, Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useToast } from '@/components/ui/Toast'
import { generateBatchCode } from '@/lib/batch-code'
import { calculateOriginPercentages, formatOrigins, calculateBestBeforeDate, formatDateForInput } from '@/lib/traceability-utils'
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
  const [batchForm, setBatchForm] = useState<BatchFormData>({
    batch_date: formatDateForInput(new Date()),
    total_weight_kg: '',
    jar_size_ml: '500',
    jar_count: '',
    best_before_date: formatDateForInput(calculateBestBeforeDate(new Date())),
    notes: '',
    is_public: true,
    container_ids: []
  })

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
    }
  }, [activeTab, fetchContainers, fetchBatches, fetchAvailableHarvests])

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

      toast.success(editingContainer ? 'Container updated' : 'Container created')
      resetContainerForm()
      fetchContainers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving container')
    }
  }

  const handleDeleteContainer = async (id: string) => {
    if (!confirm('Delete this container? Harvest links will be removed.')) return

    const { error } = await supabase
      .from('bulk_containers')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error deleting container')
      return
    }

    toast.success('Container deleted')
    fetchContainers()
  }

  // Batch form handlers
  const resetBatchForm = () => {
    setBatchForm({
      batch_date: formatDateForInput(new Date()),
      total_weight_kg: '',
      jar_size_ml: '500',
      jar_count: '',
      best_before_date: formatDateForInput(calculateBestBeforeDate(new Date())),
      notes: '',
      is_public: true,
      container_ids: []
    })
    setEditingBatch(null)
    setShowBatchForm(false)
  }

  const handleEditBatch = (batch: BatchRun) => {
    setEditingBatch(batch)
    setBatchForm({
      batch_date: batch.batch_date,
      total_weight_kg: batch.total_weight_kg?.toString() || '',
      jar_size_ml: batch.jar_size_ml?.toString() || '500',
      jar_count: batch.jar_count?.toString() || '',
      best_before_date: batch.best_before_date || '',
      notes: batch.notes || '',
      is_public: batch.is_public,
      container_ids: batch.containers?.map(c => c.container_id) || []
    })
    setShowBatchForm(true)
  }

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      let batchCode = editingBatch?.batch_code

      if (!editingBatch) {
        // Generate new batch code
        batchCode = await generateBatchCode(userId, new Date(batchForm.batch_date))
      }

      const batchData = {
        user_id: userId,
        batch_code: batchCode!,
        batch_date: batchForm.batch_date,
        total_weight_kg: batchForm.total_weight_kg ? parseFloat(batchForm.total_weight_kg) : null,
        jar_size_ml: batchForm.jar_size_ml ? parseInt(batchForm.jar_size_ml) : null,
        jar_count: batchForm.jar_count ? parseInt(batchForm.jar_count) : null,
        best_before_date: batchForm.best_before_date || null,
        notes: batchForm.notes.trim() || null,
        is_public: batchForm.is_public,
        updated_at: new Date().toISOString()
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

  // Get trace URL for a batch
  const getTraceUrl = (batchCode: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.hivecraic.com'
    return `${baseUrl}/trace/${batchCode}`
  }

  // Download QR code as PNG
  const downloadQrCode = (batchCode: string) => {
    const svg = document.getElementById('qr-code-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

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
            {activeTab === 'containers' ? 'New Container' : 'New Batch'}
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
          <span>Containers</span>
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
              {editingContainer ? 'Edit Container' : 'New Container'}
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
                {editingContainer ? 'Update' : 'Create'} Container
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
                  <option value="125">125ml</option>
                  <option value="250">250ml</option>
                  <option value="340">340ml (12oz)</option>
                  <option value="454">454ml (1lb)</option>
                  <option value="500">500ml</option>
                  <option value="750">750ml</option>
                  <option value="1000">1000ml (1kg)</option>
                </select>
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
                Source Containers ({batchForm.container_ids.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                {containers.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-2">
                    No containers available. Create containers first.
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
              <p>No containers yet. Create one to start tracking your honey.</p>
            </div>
          ) : (
            containers.map(container => {
              const origins = getContainerOrigins(container)
              const harvestCount = container.harvests?.length || 0

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
              <p>No batches yet. Create containers first, then create a bottling batch.</p>
            </div>
          ) : (
            batches.map(batch => {
              const containerCount = batch.containers?.length || 0

              return (
                <div
                  key={batch.id}
                  className="bg-surface-elevated rounded-xl p-4 border border-border shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Milk size={20} className="text-amber-600" />
                        <h3 className="text-lg font-semibold font-mono">{batch.batch_code}</h3>
                        {batch.is_public && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs">
                            Public
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-text-secondary">
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
                          <span className="font-medium">Containers:</span> {containerCount}
                        </div>
                      </div>

                      {batch.notes && (
                        <p className="mt-2 text-sm text-text-secondary">{batch.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {batch.is_public && (
                        <button
                          onClick={() => setQrBatch(batch)}
                          className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 rounded-lg transition-colors"
                          title="QR Code"
                        >
                          <QrCode size={18} />
                        </button>
                      )}
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
                  value={getTraceUrl(qrBatch.batch_code)}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <p className="text-xs text-text-secondary mb-4 break-all">
                {getTraceUrl(qrBatch.batch_code)}
              </p>

              <button
                onClick={() => downloadQrCode(qrBatch.batch_code)}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Download size={18} />
                Download PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
