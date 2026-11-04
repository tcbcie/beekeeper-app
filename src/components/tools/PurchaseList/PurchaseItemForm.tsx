'use client'

import { useId, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { PurchaseItem, DropdownValue } from '@/types/records'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import { RadioChoiceGroup, RadioChoiceOption } from '@/components/ui/RadioChoiceGroup'

interface PurchaseItemFormProps {
  item: PurchaseItem | null
  categories: DropdownValue[]
  onSubmit: (item: Partial<PurchaseItem>) => Promise<void>
  onCancel: () => void
  saving: boolean
  isUkNi?: boolean
}

export default function PurchaseItemForm({
  item,
  categories,
  onSubmit,
  onCancel,
  saving,
  isUkNi
}: PurchaseItemFormProps) {
  const toast = useToast()
  // Ties each label to its field, so tapping a label focuses it and screen readers name it.
  const fieldId = useId()
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
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ] as const

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
          <label htmlFor={`${fieldId}-name`} className="block text-sm font-medium text-text-secondary mb-1">
            Item Name *
          </label>
          <input
            id={`${fieldId}-name`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Langstroth frames"
            required
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
          />
        </div>

        {/* Category, then Priority on its own row: four choices need the full width */}
        <div>
          <label htmlFor={`${fieldId}-category`} className="block text-sm font-medium text-text-secondary mb-1">
            Category
          </label>
          <select
            id={`${fieldId}-category`}
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
        <fieldset>
          <legend className="block text-sm font-medium text-text-secondary mb-1">
            Priority
          </legend>
          <RadioChoiceGroup className="sm:grid-cols-4">
            {priorityOptions.map((opt) => (
              <RadioChoiceOption
                key={opt.value}
                name={`${fieldId}-priority`}
                value={opt.value}
                checked={priority === opt.value}
                onChange={() => setPriority(opt.value)}
                title={opt.label}
                tone="green"
                className="min-h-[48px] items-center"
              />
            ))}
          </RadioChoiceGroup>
        </fieldset>

        {/* Quantity and Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${fieldId}-quantity`} className="block text-sm font-medium text-text-secondary mb-1">
              Quantity
            </label>
            <input
              id={`${fieldId}-quantity`}
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
            <label htmlFor={`${fieldId}-unit`} className="block text-sm font-medium text-text-secondary mb-1">
              Unit
            </label>
            <input
              id={`${fieldId}-unit`}
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
            <label htmlFor={`${fieldId}-supplier`} className="block text-sm font-medium text-text-secondary mb-1">
              Supplier
            </label>
            <input
              id={`${fieldId}-supplier`}
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Supplier name"
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
            />
          </div>
          <div>
            <label htmlFor={`${fieldId}-price`} className="block text-sm font-medium text-text-secondary mb-1">
              Est. Price ({isUkNi ? 'GBP' : 'EUR'})
            </label>
            <input
              id={`${fieldId}-price`}
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
          <label htmlFor={`${fieldId}-due`} className="block text-sm font-medium text-text-secondary mb-1">
            Need By Date
          </label>
          <input
            id={`${fieldId}-due`}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor={`${fieldId}-notes`} className="block text-sm font-medium text-text-secondary mb-1">
            Notes
          </label>
          <textarea
            id={`${fieldId}-notes`}
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
