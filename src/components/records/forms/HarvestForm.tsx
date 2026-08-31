'use client'

import { useState, useEffect } from 'react'
import type { Harvest, Hive, Apiary } from '@/types/records'
import Button from '@/components/ui/Button'

interface HarvestFormProps {
  harvest: Harvest | null
  hives: Hive[]
  apiaries: Apiary[]
  selectedApiaryId?: string
  selectedHiveId?: string
  floralSourceOptions: string[]
  onSubmit: (harvest: Harvest) => Promise<void>
  onCancel: () => void
}

export default function HarvestForm({
  harvest,
  hives,
  apiaries,
  selectedApiaryId = '',
  selectedHiveId = '',
  floralSourceOptions,
  onSubmit,
  onCancel
}: HarvestFormProps) {
  const [formData, setFormData] = useState<Harvest>(harvest || {
    id: '',
    hive_id: '',
    user_id: '',
    harvest_date: new Date().toISOString().split('T')[0],
    honey_weight: null,
    wax_weight: null,
    unit: 'kg',
    frames_harvested: null,
    floral_source: null,
    moisture_content: null,
    notes: ''
  })

  const [formApiaryId, setFormApiaryId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const isEditing = Boolean(harvest?.id)

  // Update form data when harvest prop changes
  useEffect(() => {
    if (harvest) {
      setFormData(harvest)
      // Find apiary for selected hive
      const hive = hives.find(h => h.id === harvest.hive_id)
      setFormApiaryId(hive?.apiary_id ?? selectedApiaryId)
    }
  }, [harvest, hives, selectedApiaryId])

  useEffect(() => {
    if (isEditing) {
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

      const hiveApiaryId = hives.find(hive => hive.id === prev.hive_id)?.apiary_id ?? ''
      return hiveApiaryId && hiveApiaryId !== selectedApiaryId
        ? { ...prev, hive_id: '' }
        : prev
    })
  }, [hives, isEditing, selectedApiaryId, selectedHiveId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredHives = hives
    .filter(h => !h.archived_at)
    .filter(h => !formApiaryId || h.apiary_id === formApiaryId)

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="text-xl font-semibold">
          {harvest?.id ? 'Edit Harvest' : 'Record New Harvest'}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            type="submit"
            form="harvest-form"
            disabled={submitting}
            tone="amber"
            className="px-6 py-3 sm:py-2 min-h-[48px] touch-manipulation font-medium disabled:opacity-50"
          >
            {submitting ? 'Saving...' : (harvest?.id ? 'Update' : 'Save')} Harvest
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            tone="neutral"
            className="px-6 py-3 sm:py-2 min-h-[48px] touch-manipulation font-medium"
          >
            Cancel
          </Button>
        </div>
      </div>

      <form id="harvest-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Apiary</label>
          <select
            value={formApiaryId}
            onChange={(e) => {
              setFormApiaryId(e.target.value)
              setFormData(prev => ({ ...prev, hive_id: '' }))
            }}
            className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
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
            onChange={(e) => {
              const hiveId = e.target.value
              setFormData(prev => ({ ...prev, hive_id: hiveId }))
              setFormApiaryId(prev => hiveId ? (hives.find(h => h.id === hiveId)?.apiary_id ?? prev) : prev)
            }}
            className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            required
          >
            <option value="">Select hive</option>
            {filteredHives.map((h) => (
              <option key={h.id} value={h.id}>{h.hive_number}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Harvest Date *</label>
          <input
            type="date"
            value={formData.harvest_date}
            onChange={(e) => setFormData(prev => ({ ...prev, harvest_date: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Honey Weight</label>
          <input
            type="number"
            step="0.1"
            value={formData.honey_weight ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, honey_weight: e.target.value ? parseFloat(e.target.value) : null }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Wax Weight</label>
          <input
            type="number"
            step="0.1"
            value={formData.wax_weight ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, wax_weight: e.target.value ? parseFloat(e.target.value) : null }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Unit *</label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
            className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            required
          >
            <option value="kg">Kilograms (kg)</option>
            <option value="lb">Pounds (lb)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Frames Harvested</label>
          <input
            type="number"
            value={formData.frames_harvested ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, frames_harvested: e.target.value ? parseInt(e.target.value) : null }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Moisture Content (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="30"
            value={formData.moisture_content ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, moisture_content: e.target.value ? parseFloat(e.target.value) : null }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            placeholder="e.g., 18.5"
          />
          <p className="text-sm text-text-tertiary mt-1">EU limit: 20%</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Predominant Floral Source (&gt;50%)</label>
          <select
            value={formData.floral_source ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, floral_source: e.target.value || null }))}
            className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
          >
            <option value="">Select floral source</option>
            {floralSourceOptions.map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            rows={4}
            placeholder="Optional notes about the harvest"
          />
        </div>
      </form>
    </div>
  )
}
