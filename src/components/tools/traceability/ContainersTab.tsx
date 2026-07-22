'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, X, Edit2, Trash2, Check, Printer } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { calculateOriginPercentages, formatOrigins, formatDateForInput } from '@/lib/traceability-utils'
import type { BulkContainer, HarvestWithApiary, ContainerFormData, OriginPercentage } from '@/types/traceability'
import Button from '@/components/ui/Button'

interface ContainersTabProps {
 userId: string
 containers: BulkContainer[]
 fetchContainers: () => void
 labelPrintingEnabled: boolean
 selectedContainerIds: Set<string>
 setSelectedContainerIds: React.Dispatch<React.SetStateAction<Set<string>>>
 setPrintContainers: (containers: BulkContainer[] | null) => void
 showContainerForm: boolean
 setShowContainerForm: (open: boolean) => void
}

/**
 * Bulk honey containers side of the traceability tool: container CRUD with
 * harvest linking, exclusion handling and label printing selection.
 * Extracted verbatim from TraceabilityTool.tsx (Phase 6.7 decomposition).
 */
export default function ContainersTab({ userId, containers, fetchContainers, labelPrintingEnabled, selectedContainerIds, setSelectedContainerIds, setPrintContainers, showContainerForm, setShowContainerForm }: ContainersTabProps) {
 const toast = useToast()

  const [containerFilter, setContainerFilter] = useState<'available' | 'excluded' | 'all'>('available')

  const [editingContainer, setEditingContainer] = useState<BulkContainer | null>(null)
  const [containerForm, setContainerForm] = useState<ContainerFormData>({
    container_code: '',
    container_type: 'bucket',
    extraction_date: formatDateForInput(new Date()),
    total_weight_kg: '',
    moisture_content: '',
    excluded_reason: '',
    excluded_note: '',
    notes: '',
    harvest_ids: [],
    bucket_count: '1'
  })
  const [availableHarvests, setAvailableHarvests] = useState<HarvestWithApiary[]>([])

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

  // Container form handlers
  const resetContainerForm = () => {
    setContainerForm({
      container_code: '',
      container_type: 'bucket',
      extraction_date: formatDateForInput(new Date()),
      total_weight_kg: '',
      moisture_content: '',
      excluded_reason: '',
      excluded_note: '',
      notes: '',
      harvest_ids: [],
      bucket_count: '1'
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
      moisture_content: container.moisture_content?.toString() || '',
      excluded_reason: container.excluded_reason || '',
      excluded_note: container.excluded_note || '',
      notes: container.notes || '',
      harvest_ids: container.harvests?.map(h => h.harvest_id) || [],
      bucket_count: '1'
    })
    setShowContainerForm(true)
    fetchAvailableHarvests()
  }

  const handleContainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const safeFloat = (v: string): number | null => {
      if (!v) return null
      const n = parseFloat(v)
      return Number.isFinite(n) ? n : null
    }

    try {
      const baseCode = containerForm.container_code.trim()
      const bucketCount = editingContainer ? 1 : Math.max(1, Math.min(50, parseInt(containerForm.bucket_count) || 1))
      const baseData = {
        user_id: userId,
        container_type: containerForm.container_type,
        extraction_date: containerForm.extraction_date,
        moisture_content: safeFloat(containerForm.moisture_content),
        excluded: containerForm.excluded_reason !== '',
        excluded_reason: containerForm.excluded_reason || null,
        excluded_note: containerForm.excluded_note.trim() || null,
        notes: containerForm.notes.trim() || null,
        updated_at: new Date().toISOString()
      }

      if (editingContainer) {
        const { error } = await supabase
          .from('bulk_containers')
          .update({
            ...baseData,
            container_code: baseCode,
            total_weight_kg: safeFloat(containerForm.total_weight_kg),
          })
          .eq('id', editingContainer.id)

        if (error) throw error

        // Replace harvest links atomically (one transaction) so an edit can
        // never leave the container with no links if the re-insert fails.
        const { error: linksError } = await supabase.rpc('replace_container_harvests', {
          p_container_id: editingContainer.id,
          p_harvest_ids: containerForm.harvest_ids,
        })
        if (linksError) throw linksError
      } else {
        const rows = Array.from({ length: bucketCount }, (_, i) => ({
          ...baseData,
          container_code: bucketCount === 1 ? baseCode : `${baseCode}-${i + 1}`,
          total_weight_kg: bucketCount === 1 ? safeFloat(containerForm.total_weight_kg) : null,
        }))

        const { data, error } = await supabase
          .from('bulk_containers')
          .insert(rows)
          .select('id')

        if (error) throw error

        if (containerForm.harvest_ids.length > 0 && data.length > 0) {
          const links = data.flatMap(row =>
            containerForm.harvest_ids.map(harvest_id => ({
              container_id: row.id,
              harvest_id
            }))
          )
          const { error: linkError } = await supabase
            .from('container_harvests')
            .insert(links)
          if (linkError) throw linkError
        }
      }

      const msg = editingContainer
        ? 'Bulk honey updated'
        : bucketCount > 1
          ? `${bucketCount} bulk honey containers created`
          : 'Bulk honey created'
      toast.success(msg)
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


  const toggleHarvest = (harvestId: string) => {
    setContainerForm(prev => ({
      ...prev,
      harvest_ids: prev.harvest_ids.includes(harvestId)
        ? prev.harvest_ids.filter(id => id !== harvestId)
        : [...prev.harvest_ids, harvestId]
    }))
  }


  const getContainerOrigins = (container: BulkContainer): OriginPercentage[] => {
    if (!container.harvests) return []
    return calculateOriginPercentages(container.harvests)
  }

  // Get trace URL for a batch (uses trace_code for unique public URLs).
  // Pass a net weight (g) to deep-link the public page to a single jar size.

 // Load this tab's data on mount (and refresh harvest options when the
 // edited container changes, mirroring the old tab-switch behaviour)
 useEffect(() => {
  fetchAvailableHarvests()
 }, [fetchAvailableHarvests])

 return (
  <>
      {showContainerForm && (
        <div className="bg-surface-elevated rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingContainer ? 'Edit Bulk Honey' : 'New Bulk Honey'}
            </h3>
            <Button onClick={resetContainerForm} className="p-2 hover:bg-surface rounded-lg">
              <X size={20} />
            </Button>
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
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Moisture Content (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={containerForm.moisture_content}
                  onChange={(e) => setContainerForm(prev => ({ ...prev, moisture_content: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                  placeholder="e.g., 18.2"
                />
              </div>
              {!editingContainer && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Number of Buckets
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={containerForm.bucket_count}
                    onChange={(e) => setContainerForm(prev => ({ ...prev, bucket_count: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
                  />
                  {parseInt(containerForm.bucket_count) > 1 && (
                    <p className="text-xs text-text-secondary mt-1">
                      Creates {containerForm.bucket_count} containers: {containerForm.container_code || '...'}-1 to {containerForm.container_code || '...'}-{containerForm.bucket_count}
                    </p>
                  )}
                </div>
              )}
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

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Exclude from Batches
              </label>
              <select
                value={containerForm.excluded_reason}
                onChange={(e) => setContainerForm(prev => ({
                  ...prev,
                  excluded_reason: e.target.value,
                  excluded_note: e.target.value !== 'Other' ? '' : prev.excluded_note
                }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface"
              >
                <option value="">No — available for batches</option>
                <option value="Given Away">Given Away</option>
                <option value="Sold Wholesale">Sold Wholesale</option>
                <option value="Personal Use">Personal Use</option>
                <option value="Other">Other</option>
              </select>
              {containerForm.excluded_reason === 'Other' && (
                <input
                  type="text"
                  value={containerForm.excluded_note}
                  onChange={(e) => setContainerForm(prev => ({ ...prev, excluded_note: e.target.value }))}
                  className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-surface"
                  placeholder="Reason..."
                />
              )}
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
                    <Button
                      key={harvest.id}
                      type="button"
                      onClick={() => !harvest.already_linked && toggleHarvest(harvest.id)}
                      disabled={harvest.already_linked}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        containerForm.harvest_ids.includes(harvest.id)
                          ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-500'
                          : harvest.already_linked
                            ? 'bg-surface-secondary text-text-secondary cursor-not-allowed'
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
                    </Button>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={resetContainerForm}
                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                {editingContainer ? 'Update' : 'Create'} Bulk Honey
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Batch Form */}

      {(
        <div className="space-y-4">
          {containers.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={containerFilter}
                onChange={(e) => setContainerFilter(e.target.value as 'available' | 'excluded' | 'all')}
                className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm"
              >
                <option value="available">Available</option>
                <option value="excluded">Excluded</option>
                <option value="all">All</option>
              </select>
              <span className="text-sm text-text-secondary">
                {containers.filter(c =>
                  containerFilter === 'available' ? !c.excluded :
                  containerFilter === 'excluded' ? c.excluded : true
                ).length} of {containers.length}
              </span>
            </div>
          )}
          {containers.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p>No bulk honey yet. Create one to start tracking your honey.</p>
            </div>
          ) : (
            containers.filter(c =>
              containerFilter === 'available' ? !c.excluded :
              containerFilter === 'excluded' ? c.excluded : true
            ).map(container => {
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
                        {container.excluded && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                            {container.excluded_reason === 'Other' && container.excluded_note
                              ? container.excluded_note
                              : container.excluded_reason || 'Excluded'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-text-secondary">
                        <div>
                          <span className="font-medium">Extracted:</span>{' '}
                          {new Date(container.extraction_date).toLocaleDateString()}
                        </div>
                        {container.total_weight_kg != null && (
                          <div>
                            <span className="font-medium">Weight:</span>{' '}
                            {container.total_weight_kg} kg
                          </div>
                        )}
                        {container.moisture_content != null && (
                          <div>
                            <span className="font-medium">Moisture:</span>{' '}
                            {container.moisture_content}%
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

                    <div className="flex items-center gap-2">
                      {labelPrintingEnabled && (
                        <>
                          <label
                            className="p-2 inline-flex items-center cursor-pointer"
                            title="Select for bulk print"
                            onClick={e => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              className="w-5 h-5 accent-amber-600 cursor-pointer"
                              checked={selectedContainerIds.has(container.id)}
                              onChange={e => {
                                const next = new Set(selectedContainerIds)
                                if (e.target.checked) next.add(container.id)
                                else next.delete(container.id)
                                setSelectedContainerIds(next)
                              }}
                            />
                          </label>
                          <Button
                            onClick={() => setPrintContainers([container])}
                            className="p-2 hover:bg-surface rounded-lg transition-colors"
                            title="Print label"
                          >
                            <Printer size={18} />
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => handleEditContainer(container)}
                        className="p-2 hover:bg-surface rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </Button>
                      <Button
                        onClick={() => handleDeleteContainer(container.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Batch List */}
  </>
 )
}
