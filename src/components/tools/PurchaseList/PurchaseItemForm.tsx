'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { PurchaseItem, DropdownValue } from '@/types/records'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'

interface PurchaseItemFormProps {
  item: PurchaseItem | null
  categories: DropdownValue[]
  onSubmit: (item: Partial<PurchaseItem>) => Promise<void>
  onCancel: () => void
  saving: boolean
}

export default function PurchaseItemForm({
  item,
  categories,
  onSubmit,
  onCancel,
  saving
}: PurchaseItemFormProps) {
  const toast = useToast()
  const [name, setName] = useState(item?.name || '')
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '')
  const [unit, setUnit] = useState(item?.unit || '')
  const [categoryId, setCategoryId] = useState(item?.category_id || '')
  const [supplier, setSupplier] = useState(item?.supplier || '')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(item?.priority || 'medium')
  const [estimatedPrice, setEstimatedPrice] = useState(item?.estimated_price?.toString() || '')
  const [dueDate, setDueDate] = useState(item?.due_date || '')
  const [notes, setNotes] = useState(item?.notes || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.warning('Please enter an item name')
      return
    }

    await onSubmit({
      name: name.trim(),
      quantity: quantity ? parseFloat(quantity) : null,
      unit: unit.trim() || null,
      category_id: categoryId || null,
      supplier: supplier.trim() || null,
      priority,
      estimated_price: estimatedPrice ? parseFloat(estimatedPrice) : null,
      due_date: dueDate || null,
      notes: notes.trim() || null
    })
  }

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-surface-secondary text-text-secondary' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  ]

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground">
          {item ? 'Edit Item' : 'Add Item'}
        </h4>
        <IconButton
          onClick={onCancel}
          size="sm"
          className="hover:bg-surface-secondary"
          aria-label="Close form"
        >
          <X size={20} className="text-text-secondary" />
        </IconButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Item Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Langstroth frames"
            required
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
          />
        </div>

        {/* Category and Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
            >
              <option value="">Select category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Priority
            </label>
            <div className="flex gap-1">
              {priorityOptions.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value as typeof priority)}
                  size="xs"
                  className={`flex-1 text-xs transition-colors ${
                    priority === opt.value
                      ? opt.color
                      : 'bg-surface-secondary text-text-secondary hover:bg-surface-secondary/80'
                  }`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Quantity and Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Unit
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., kg, pcs, L"
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
            />
          </div>
        </div>

        {/* Supplier and Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Supplier
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Supplier name"
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Est. Price (EUR)
            </label>
            <input
              type="number"
              value={estimatedPrice}
              onChange={(e) => setEstimatedPrice(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
            />
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Need By Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details..."
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            onClick={onCancel}
            disabled={saving}
            tone="neutral"
            size="sm"
            className="hover:bg-surface-secondary transition-colors"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            tone="blue"
            size="sm"
            className="disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {item ? 'Update' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  )
}
