'use client'

import { useState, useEffect } from 'react'
import type { Feeding, Hive, Apiary } from '@/types/records'
import Button from '@/components/ui/Button'

interface FeedingFormProps {
  feeding: Feeding | null
  hives: Hive[]
  apiaries: Apiary[]
  feedTypeOptions: string[]
  onSubmit: (feeding: Feeding, isOther: boolean, otherType: string) => Promise<void>
  onCancel: () => void
}

export default function FeedingForm({
  feeding,
  hives,
  apiaries,
  feedTypeOptions,
  onSubmit,
  onCancel
}: FeedingFormProps) {
  const [formData, setFormData] = useState<Feeding>(feeding || {
    id: '',
    hive_id: '',
    user_id: '',
    feed_date: new Date().toISOString().split('T')[0],
    feed_type: '',
    quantity: null,
    unit: 'L',
    notes: ''
  })

  const [formApiaryId, setFormApiaryId] = useState<string>('')
  const [isOtherFeedType, setIsOtherFeedType] = useState(false)
  const [otherFeedType, setOtherFeedType] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Update form data when feeding prop changes
  useEffect(() => {
    if (feeding) {
      setFormData(feeding)
      // Find apiary for selected hive
      const hive = hives.find(h => h.id === feeding.hive_id)
      if (hive?.apiary_id) {
        setFormApiaryId(hive.apiary_id)
      }
      // Check if feed type is custom
      if (feeding.feed_type && !feedTypeOptions.includes(feeding.feed_type)) {
        setIsOtherFeedType(true)
        setOtherFeedType(feeding.feed_type)
      }
    }
  }, [feeding, hives, feedTypeOptions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(formData, isOtherFeedType, otherFeedType)
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
          {feeding?.id ? 'Edit Feeding' : 'Record New Feeding'}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            type="submit"
            form="feeding-form"
            disabled={submitting}
            tone="success"
            className="px-6 py-3 sm:py-2 min-h-[48px] touch-manipulation font-medium disabled:opacity-50"
          >
            {submitting ? 'Saving...' : (feeding?.id ? 'Update' : 'Save')} Feeding
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

      <form id="feeding-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            onChange={(e) => setFormData(prev => ({ ...prev, hive_id: e.target.value }))}
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
          <label className="block text-sm font-medium text-text-secondary mb-1">Feed Date *</label>
          <input
            type="date"
            value={formData.feed_date}
            onChange={(e) => setFormData(prev => ({ ...prev, feed_date: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Feed Type *</label>
          <select
            value={isOtherFeedType ? 'Other' : formData.feed_type}
            onChange={(e) => {
              const value = e.target.value
              if (value === 'Other') {
                setIsOtherFeedType(true)
                setFormData(prev => ({ ...prev, feed_type: '' }))
              } else {
                setIsOtherFeedType(false)
                setOtherFeedType('')
                setFormData(prev => ({ ...prev, feed_type: value }))
              }
            }}
            className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            required={!isOtherFeedType}
          >
            <option value="">Select feed type</option>
            {feedTypeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {isOtherFeedType && (
            <input
              type="text"
              value={otherFeedType}
              onChange={(e) => setOtherFeedType(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground mt-2"
              placeholder="Enter custom feed type"
              required
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Quantity</label>
          <input
            type="number"
            step="0.1"
            value={formData.quantity ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value ? parseFloat(e.target.value) : null }))}
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
            <option value="L">Liters (L)</option>
            <option value="kg">Kilograms (kg)</option>
            <option value="g">Grams (g)</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            rows={4}
            placeholder="Optional notes about the feeding"
          />
        </div>
      </form>
    </div>
  )
}
