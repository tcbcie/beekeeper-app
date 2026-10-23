'use client'
import { Plus, Trash2 } from 'lucide-react'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import SelectField from '@/components/ui/SelectField'
import Button from '@/components/ui/Button'
import { formatMoney } from '@/lib/crm-currency'
import {
  PRODUCT_TYPE_LABELS,
  type OrderItemFormData,
  type ProductType,
} from '@/types/crm'

const PRODUCT_TYPES = Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]

interface OrderItemsEditorProps {
  items: OrderItemFormData[]
  onChange: (items: OrderItemFormData[]) => void
  isUkNi: boolean
}

export function emptyOrderItem(): OrderItemFormData {
  return { product_type: 'queens', description: '', quantity: 1, unit_price: 0 }
}

/** A cleared field stays '' (so it can be retyped); anything else is a number of at least 0. */
function parseAmount(value: string): number | '' {
  if (value === '') return ''
  const n = parseFloat(value)
  return Number.isFinite(n) ? Math.max(0, n) : ''
}

/**
 * The lines to save, or what to fix first. Every line needs a quantity above 0 and a price
 * (0 is a valid price for a free item). Lines are never dropped silently: before, a cleared
 * quantity became 0 and the line vanished on save, and a cleared price saved as 0 (C8b-08).
 */
export function checkOrderItems(items: OrderItemFormData[]):
  | { lines: (Omit<OrderItemFormData, 'quantity' | 'unit_price'> & { quantity: number; unit_price: number })[]; error: null }
  | { lines: null; error: string } {
  if (items.length === 0) return { lines: null, error: 'Add at least one line item' }
  if (items.some((i) => i.quantity === '' || i.quantity <= 0)) {
    return { lines: null, error: 'Enter a quantity above 0 on every line, or remove the lines you don’t need' }
  }
  if (items.some((i) => i.unit_price === '')) {
    return { lines: null, error: 'Enter a unit price on every line (0 for a free item)' }
  }
  return {
    lines: items.map((i) => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
    error: null,
  }
}

export default function OrderItemsEditor({ items, onChange, isUkNi }: OrderItemsEditorProps) {
  const update = (index: number, patch: Partial<OrderItemFormData>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const add = () => onChange([...items, emptyOrderItem()])

  const total = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FieldLabel className="mb-0">Line items</FieldLabel>
        <Button type="button" onClick={add} tone="success" size="sm">
          <Plus size={14} /> Add item
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-text-tertiary">No items yet. Add at least one line.</p>
      )}

      {items.map((item, index) => {
        const lineTotal = Number(item.quantity) * Number(item.unit_price)
        return (
          <div key={index} className="field-journal-panel p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Product</label>
                <SelectField
                  value={item.product_type}
                  onChange={(e) => update(index, { product_type: e.target.value as ProductType })}
                  className="rounded-md text-sm"
                >
                  {PRODUCT_TYPES.map((pt) => (
                    <option key={pt} value={pt}>{PRODUCT_TYPE_LABELS[pt]}</option>
                  ))}
                </SelectField>
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Description</label>
                <TextInput
                  value={item.description}
                  onChange={(e) => update(index, { description: e.target.value })}
                  placeholder="Optional"
                  className="rounded-md text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Quantity</label>
                <TextInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={String(item.quantity)}
                  onChange={(e) => update(index, { quantity: parseAmount(e.target.value) })}
                  className="rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Unit price</label>
                <TextInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={String(item.unit_price)}
                  onChange={(e) => update(index, { unit_price: parseAmount(e.target.value) })}
                  className="rounded-md text-sm"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {formatMoney(lineTotal, isUkNi)}
                </span>
                <Button
                  type="button"
                  onClick={() => remove(index)}
                  tone="danger"
                  size="sm"
                  aria-label="Remove item"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        )
      })}

      <div className="flex justify-end pt-1">
        <p className="text-base font-semibold text-foreground">
          Total: {formatMoney(total, isUkNi)}
        </p>
      </div>
    </div>
  )
}
