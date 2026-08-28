'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import ModalShell from '@/components/ui/ModalShell'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import Button from '@/components/ui/Button'
import type { TraceLabel } from '@/types/traceability'

interface RecordJarSaleModalProps {
  userId: string
  label: TraceLabel
  /** The producer's selling currency, to warn when it is not the P&L's EUR. */
  salesCurrency: string
  onClose: () => void
}

const CATEGORY_NAME = 'Honey Sales'

function todayIso(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/**
 * Records a jar sale straight into the P&L.
 *
 * HiveCraic cannot know whether a customer actually paid — Revolut settles
 * entirely outside the app — so nothing is ever booked automatically. This is
 * the deliberate manual step: you check your Revolut app, then record what you
 * actually took. Everything is pre-filled from the label so it is a few taps
 * rather than a typed-out record.
 */
export default function RecordJarSaleModal({
  userId,
  label,
  salesCurrency,
  onClose,
}: RecordJarSaleModalProps) {
  const toast = useToast()

  const [date, setDate] = useState(todayIso())
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState(
    label.payment_amount != null ? String(label.payment_amount) : ''
  )
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  // financial_records.category_id is NOT NULL, so without this id there is no
  // valid row to write and saving must be blocked rather than guessed at.
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [categoryChecked, setCategoryChecked] = useState(false)

  const fetchCategory = useCallback(async () => {
    const { data: category } = await supabase
      .from('dropdown_categories')
      .select('id')
      .eq('category_key', 'income_category')
      .maybeSingle()

    if (category) {
      const { data: value } = await supabase
        .from('dropdown_values')
        .select('id')
        .eq('category_id', category.id)
        .eq('value', CATEGORY_NAME)
        .eq('is_active', true)
        .maybeSingle()
      if (value) setCategoryId(value.id)
    }
    setCategoryChecked(true)
  }, [])

  useEffect(() => {
    fetchCategory()
  }, [fetchCategory])

  const qty = parseInt(quantity, 10)
  const price = unitPrice.trim() ? Number(unitPrice) : NaN
  const validQty = Number.isFinite(qty) && qty > 0
  const validPrice = Number.isFinite(price) && price > 0
  // Rounded before it is ever shown or stored, so the figure on screen is
  // exactly the figure that reaches the P&L.
  const total = validQty && validPrice ? Math.round(qty * price * 100) / 100 : null

  const lotCode = label.current_batch?.batch_code ?? null
  const description = `${label.name}${validQty && qty > 1 ? ` × ${qty}` : ''}${lotCode ? ` (${lotCode})` : ''}`

  const handleSave = async () => {
    if (saving) return
    if (!validQty) {
      toast.error('Enter how many jars you sold')
      return
    }
    if (!validPrice) {
      toast.error('Enter the price per jar')
      return
    }
    if (total === null || total <= 0) {
      toast.error('The total must be more than zero')
      return
    }
    if (!categoryId) {
      toast.error(`Could not find the "${CATEGORY_NAME}" income category. Check your P&L categories.`)
      return
    }

    setSaving(true)
    const { error } = await supabase.from('financial_records').insert({
      user_id: userId,
      record_type: 'income',
      transaction_date: date,
      amount: total,
      category_id: categoryId,
      description,
      notes: note.trim() || null,
    })
    setSaving(false)

    if (error) {
      console.error('Error recording jar sale:', error)
      toast.error('Could not record the sale')
      return
    }

    toast.success(`Recorded €${total.toFixed(2)} to your P&L`)
    onClose()
  }

  return (
    <ModalShell title="Record a jar sale" onClose={onClose} closeDisabled={saving}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="sale-qty" required>Jars sold</FieldLabel>
            <TextInput
              id="sale-qty"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel htmlFor="sale-price" required>Price per jar</FieldLabel>
            <TextInput
              id="sale-price"
              type="number"
              min="0.01"
              step="0.01"
              value={unitPrice}
              onChange={e => setUnitPrice(e.target.value)}
              placeholder="8.00"
            />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="sale-date" required>Date</FieldLabel>
          <TextInput
            id="sale-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div>
          <FieldLabel htmlFor="sale-note">Note</FieldLabel>
          <TextInput
            id="sale-note"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Athenry market"
            maxLength={300}
          />
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-text-secondary">Total</span>
            <span className="text-2xl font-bold text-foreground">
              {total !== null ? `€${total.toFixed(2)}` : '—'}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-tertiary">
            Recorded as income under <strong>{CATEGORY_NAME}</strong>, described as
            &ldquo;{description}&rdquo;.
          </p>
        </div>

        {salesCurrency && salesCurrency !== 'EUR' && (
          <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>
              Your selling currency is {salesCurrency}, but the P&amp;L records in euro. Enter the
              euro value you actually received.
            </span>
          </p>
        )}

        {categoryChecked && !categoryId && (
          <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>
              The &ldquo;{CATEGORY_NAME}&rdquo; income category is missing, so this cannot be saved.
              Check your P&amp;L categories.
            </span>
          </p>
        )}

        <p className="text-sm text-text-tertiary">
          HiveCraic cannot see your Revolut payments, so nothing is recorded automatically. Check
          your Revolut app and record what you actually received.
        </p>

        <div className="flex gap-3 pt-1">
          <Button
            onClick={handleSave}
            tone="amber"
            disabled={saving || !categoryId}
            className="flex-1"
          >
            {saving ? 'Recording…' : 'Record sale'}
          </Button>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </ModalShell>
  )
}
