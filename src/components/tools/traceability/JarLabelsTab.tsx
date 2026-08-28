'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QrCode, X, Edit2, Trash2, Tag, Download, AlertCircle, Wallet } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useToast } from '@/components/ui/Toast'
import { generateTagCode } from '@/lib/qr-tags'
import { downloadQrPng, downloadQrSvg } from '@/lib/qr-download'
import Button from '@/components/ui/Button'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import TextAreaField from '@/components/ui/TextAreaField'
import SelectField from '@/components/ui/SelectField'
import CheckboxInput from '@/components/ui/CheckboxInput'
import EmptyState from '@/components/ui/EmptyState'
import RecordJarSaleModal from './RecordJarSaleModal'
import Link from 'next/link'
import { isAllowedPaymentUrl } from '@/lib/payment-links'
import type { TraceLabel, TraceLabelFormData } from '@/types/traceability'

/** Batches offered by the "point at batch" selector. */
interface BatchOption {
  id: string
  batch_code: string
  batch_date: string
  is_public: boolean
  jar_weights: number[]
}

interface JarLabelsTabProps {
  userId: string
  showLabelForm: boolean
  setShowLabelForm: (open: boolean) => void
  onLabelsChanged?: () => void
}

const emptyForm: TraceLabelFormData = {
  name: '',
  jar_size_ml: '',
  jar_weight_g: '',
  resolve_mode: 'current',
  is_active: true,
  public_title: '',
  public_origin: '',
  public_story: '',
  show_story: true,
  show_origin_map: true,
  show_apiary_image: true,
  show_floral: true,
  show_lot_details: true,
  show_feedback: true,
  // On by default: these are direct sales, so there is no retailer to undercut.
  // The panel stays invisible until a valid link is added, so this shows nothing
  // to a customer until it is configured.
  show_payment: true,
  payment_amount: '',
  payment_note: '',
}

// Only the boolean fields of the form are switchable. Deriving the key type
// rather than using `keyof` means adding a string field to TraceLabelFormData
// cannot silently end up bound to a checkbox.
type ToggleKey = {
  [K in keyof TraceLabelFormData]: TraceLabelFormData[K] extends boolean ? K : never
}[keyof TraceLabelFormData]

/** The six per-label switches, so the form and the card stay in step. */
const DISPLAY_TOGGLES: { key: ToggleKey; label: string; hint: string }[] = [
  { key: 'show_story', label: 'Story', hint: 'The narrative about who kept the bees and where' },
  { key: 'show_origin_map', label: 'Origin map', hint: 'Foraging area map, if the apiary shares its location' },
  { key: 'show_apiary_image', label: 'Apiary photo', hint: 'Only appears if the batch also has its photo enabled' },
  { key: 'show_floral', label: 'Floral sources', hint: 'Mentions what the bees foraged on in the story' },
  { key: 'show_lot_details', label: 'Lot and dates', hint: 'Lot code, bottled date, best before' },
  { key: 'show_feedback', label: 'Feedback form', hint: 'Lets customers leave a rating' },
]

/**
 * Jar Labels: the printed label designs, one per jar size. Each carries a
 * permanent code that goes into the QR at print time and is then pointed at
 * whichever batch is currently being bottled into that size — which is what
 * lets labels be printed in bulk, long before those batches exist.
 */
export default function JarLabelsTab({
  userId,
  showLabelForm,
  setShowLabelForm,
  onLabelsChanged,
}: JarLabelsTabProps) {
  const toast = useToast()

  const [labels, setLabels] = useState<TraceLabel[]>([])
  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingLabel, setEditingLabel] = useState<TraceLabel | null>(null)
  const [qrLabel, setQrLabel] = useState<TraceLabel | null>(null)
  const [repointingId, setRepointingId] = useState<string | null>(null)
  const [saleLabel, setSaleLabel] = useState<TraceLabel | null>(null)
  const [form, setForm] = useState<TraceLabelFormData>(emptyForm)
  // Held separately from `form`: the pointer is the one field that is also
  // editable straight from a card, without opening the form.
  const [formBatchId, setFormBatchId] = useState<string>('')
  // Whether the producer has a usable payment method on their profile. The label
  // form needs it to explain why a payment panel would or would not appear.
  const [paymentsReady, setPaymentsReady] = useState(false)
  const [paymentCurrency, setPaymentCurrency] = useState<string>('')

  const fetchLabels = useCallback(async () => {
    const { data, error } = await supabase
      .from('trace_labels')
      .select('*, current_batch:batch_runs(id, batch_code, batch_date, is_public)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching jar labels:', error)
      toast.error('Could not load jar labels')
      setLoading(false)
      return
    }

    // A to-one PostgREST embed (the FK lives on trace_labels) arrives as a
    // single object at runtime even though the typings suggest an array.
    const rows = (data || []).map(row => {
      const embedded = (row as { current_batch?: unknown }).current_batch
      const batch = Array.isArray(embedded) ? embedded[0] ?? null : embedded ?? null
      return { ...row, current_batch: batch } as TraceLabel
    })

    setLabels(rows)
    setLoading(false)
  }, [userId, toast])

  const fetchBatchOptions = useCallback(async () => {
    const { data, error } = await supabase
      .from('batch_runs')
      .select('id, batch_code, batch_date, is_public, jar_weight_g, batch_jars(jar_weight_g)')
      .eq('user_id', userId)
      .order('batch_date', { ascending: false })

    if (error) {
      console.error('Error fetching batches for jar labels:', error)
      return
    }

    setBatchOptions((data || []).map(row => {
      const jarsRaw = (row as { batch_jars?: unknown }).batch_jars
      const jars = Array.isArray(jarsRaw) ? jarsRaw : jarsRaw ? [jarsRaw] : []
      const weights = jars
        .map(j => (j as { jar_weight_g: number | null }).jar_weight_g)
        .filter((w): w is number => w != null)
      // Batches predating batch_jars keep their weight on the parent row.
      const legacy = (row as { jar_weight_g: number | null }).jar_weight_g
      return {
        id: row.id as string,
        batch_code: row.batch_code as string,
        batch_date: row.batch_date as string,
        is_public: (row.is_public as boolean) ?? false,
        jar_weights: weights.length > 0 ? weights : legacy != null ? [legacy] : [],
      }
    }))
  }, [userId])

  const fetchPaymentSetup = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('enable_jar_payments, sales_revolut_url, sales_currency')
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) return
    setPaymentsReady(
      data.enable_jar_payments === true && isAllowedPaymentUrl(data.sales_revolut_url, 'revolut')
    )
    setPaymentCurrency(data.sales_currency || 'EUR')
  }, [userId])

  useEffect(() => {
    fetchLabels()
    fetchBatchOptions()
    fetchPaymentSetup()
  }, [fetchLabels, fetchBatchOptions, fetchPaymentSetup])

  const resetForm = () => {
    setForm(emptyForm)
    setFormBatchId('')
    setEditingLabel(null)
    setShowLabelForm(false)
  }

  const handleEdit = (label: TraceLabel) => {
    setEditingLabel(label)
    setForm({
      name: label.name,
      jar_size_ml: label.jar_size_ml?.toString() || '',
      jar_weight_g: label.jar_weight_g?.toString() || '',
      resolve_mode: label.resolve_mode,
      is_active: label.is_active,
      public_title: label.public_title || '',
      public_origin: label.public_origin || '',
      public_story: label.public_story || '',
      show_story: label.show_story,
      show_origin_map: label.show_origin_map,
      show_apiary_image: label.show_apiary_image,
      show_floral: label.show_floral,
      show_lot_details: label.show_lot_details,
      show_feedback: label.show_feedback,
      show_payment: label.show_payment,
      payment_amount: label.payment_amount != null ? String(label.payment_amount) : '',
      payment_note: label.payment_note || '',
    })
    setFormBatchId(label.current_batch_id || '')
    setShowLabelForm(true)
  }

  /**
   * Insert with a freshly generated code, retrying on a unique-code collision.
   * 30^6 combinations makes a clash vanishingly unlikely, but the DB constraint
   * is the authority and a retry is cheaper than an error the user cannot act on.
   */
  const insertWithUniqueCode = async (payload: Record<string, unknown>) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await supabase
        .from('trace_labels')
        .insert({ ...payload, code: generateTagCode('HJ') })
      if (!error) return
      // 23505 = unique_violation. Anything else is a real failure.
      if (error.code !== '23505') throw error
    }
    throw new Error('Could not allocate a unique label code. Please try again.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return

    const name = form.name.trim()
    if (!name) {
      toast.error('Give the label a name, e.g. "Wildflower 340 g"')
      return
    }

    const sizeMl = form.jar_size_ml.trim() ? parseInt(form.jar_size_ml, 10) : null
    const weightG = form.jar_weight_g.trim() ? parseInt(form.jar_weight_g, 10) : null
    if (sizeMl !== null && (!Number.isFinite(sizeMl) || sizeMl <= 0)) {
      toast.error('Jar size must be a positive number of millilitres')
      return
    }
    if (weightG !== null && (!Number.isFinite(weightG) || weightG <= 0)) {
      toast.error('Net weight must be a positive number of grams')
      return
    }

    const amountRaw = form.payment_amount.trim()
    const amount = amountRaw ? Number(amountRaw) : null
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      toast.error('Price must be a positive amount')
      return
    }

    // With a Revolut link the payer types the amount themselves, so the shown
    // price is the only thing telling them what to send. Missing it means quiet
    // underpayment, which is why this is a hard stop rather than a warning.
    //
    // Required whenever payment is switched on, NOT only when the profile is
    // already set up: otherwise a label saved before the profile is configured
    // would start rendering a priceless panel the moment it is.
    if (form.show_payment && amount === null) {
      toast.error('Add the price customers should pay — without it they will not know what to send')
      return
    }

    const batchId = formBatchId || null
    const payload: Record<string, unknown> = {
      user_id: userId,
      name,
      jar_size_ml: sizeMl,
      jar_weight_g: weightG,
      current_batch_id: batchId,
      resolve_mode: form.resolve_mode,
      is_active: form.is_active,
      public_title: form.public_title.trim() || null,
      public_origin: form.public_origin.trim() || null,
      public_story: form.public_story.trim() || null,
      show_story: form.show_story,
      show_origin_map: form.show_origin_map,
      show_apiary_image: form.show_apiary_image,
      show_floral: form.show_floral,
      show_lot_details: form.show_lot_details,
      show_feedback: form.show_feedback,
      show_payment: form.show_payment,
      payment_amount: amount,
      payment_note: form.payment_note.trim() || null,
    }

    setSaving(true)
    try {
      if (editingLabel) {
        // trace_labels has no updated_at trigger (matching batch_runs and
        // bulk_containers), so the client stamps it. assigned_at only moves when
        // the pointer actually changes, so it stays a true "last re-pointed" date.
        payload.updated_at = new Date().toISOString()
        if (batchId !== editingLabel.current_batch_id) {
          payload.assigned_at = batchId ? new Date().toISOString() : null
        }
        const { error } = await supabase
          .from('trace_labels')
          .update(payload)
          .eq('id', editingLabel.id)
        if (error) throw error
        toast.success('Jar label updated')
      } else {
        if (batchId) payload.assigned_at = new Date().toISOString()
        await insertWithUniqueCode(payload)
        toast.success('Jar label created')
      }
      resetForm()
      await fetchLabels()
      onLabelsChanged?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving jar label')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Re-point a label straight from its card — the routine bottling-day action.
   * Updated optimistically so the select does not visibly snap back to the old
   * batch while the write is in flight, and guarded so a second change cannot
   * race the first into landing out of order.
   */
  const handleRepoint = async (label: TraceLabel, batchId: string) => {
    const next = batchId || null
    if (next === label.current_batch_id || repointingId) return

    const batch = batchOptions.find(b => b.id === next)
    setRepointingId(label.id)
    setLabels(current => current.map(l => l.id === label.id
      ? {
          ...l,
          current_batch_id: next,
          current_batch: batch
            ? { id: batch.id, batch_code: batch.batch_code, batch_date: batch.batch_date, is_public: batch.is_public }
            : null,
        }
      : l))

    const { error } = await supabase
      .from('trace_labels')
      .update({
        current_batch_id: next,
        assigned_at: next ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', label.id)

    if (error) {
      // Revert just this row, so a concurrent edit elsewhere is not clobbered.
      setLabels(current => current.map(l => l.id === label.id
        ? { ...l, current_batch_id: label.current_batch_id, current_batch: label.current_batch ?? null }
        : l))
      setRepointingId(null)
      toast.error('Could not update the label')
      return
    }

    toast.success(batch ? `${label.name} now points at ${batch.batch_code}` : `${label.name} is no longer pointed at a batch`)
    await fetchLabels()
    setRepointingId(null)
    onLabelsChanged?.()
  }

  const handleDelete = async (label: TraceLabel) => {
    if (!confirm(
      `Delete "${label.name}"?\n\nAny jar already carrying this QR code will stop resolving. ` +
      `If the labels are out in the world, set the label inactive instead.`
    )) return

    const { error } = await supabase.from('trace_labels').delete().eq('id', label.id)
    if (error) {
      toast.error('Error deleting jar label')
      return
    }
    toast.success('Jar label deleted')
    await fetchLabels()
    onLabelsChanged?.()
  }

  const labelUrl = (code: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.hivecraic.com'
    return `${base}/j/${code}`
  }

  const saveQr = async (kind: 'png' | 'svg', elementId: string, label: TraceLabel) => {
    const filename = `qr-${label.code}.${kind}`
    const ok = kind === 'png'
      ? await downloadQrPng(elementId, filename)
      : await downloadQrSvg(elementId, filename)
    if (!ok) toast.error(`Could not save the QR code as ${kind.toUpperCase()}`)
  }

  const selectedBatch = batchOptions.find(b => b.id === formBatchId)
  const formWeight = form.jar_weight_g.trim() ? parseInt(form.jar_weight_g, 10) : null

  return (
    <>
      {showLabelForm && (
        <div className="bg-surface-elevated rounded-xl p-4 border border-border shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingLabel ? `Edit ${editingLabel.name}` : 'New Jar Label'}
            </h3>
            <Button onClick={resetForm} className="p-2 hover:bg-surface rounded-lg" unstyled>
              <X size={20} />
            </Button>
          </div>

          {editingLabel && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
              <QRCodeSVG id={`qr-form-${editingLabel.id}`} value={labelUrl(editingLabel.code)} size={56} level="L" />
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold text-foreground">{editingLabel.code}</p>
                <p className="truncate text-sm text-text-secondary">{labelUrl(editingLabel.code)}</p>
                <p className="text-sm text-text-tertiary">The code is permanent — editing this label never changes it.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <FieldLabel htmlFor="jl-name" required>Label name</FieldLabel>
              <TextInput
                id="jl-name"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Wildflower 340 g"
                required
              />
              <p className="mt-1 text-sm text-text-tertiary">For your own reference — customers never see this.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="jl-size">Jar size (ml)</FieldLabel>
                <TextInput
                  id="jl-size"
                  type="number"
                  min="1"
                  value={form.jar_size_ml}
                  onChange={e => setForm(p => ({ ...p, jar_size_ml: e.target.value }))}
                  placeholder="340"
                />
              </div>
              <div>
                <FieldLabel htmlFor="jl-weight">Net weight (g)</FieldLabel>
                <TextInput
                  id="jl-weight"
                  type="number"
                  min="1"
                  value={form.jar_weight_g}
                  onChange={e => setForm(p => ({ ...p, jar_weight_g: e.target.value }))}
                  placeholder="340"
                />
              </div>
            </div>
            <p className="-mt-2 text-sm text-text-tertiary">
              Both are printed on the label, so the scan page does not repeat them. The net weight
              is what matches this label to the right batches.
            </p>

            <div>
              <FieldLabel htmlFor="jl-batch">Currently bottling into</FieldLabel>
              <SelectField
                id="jl-batch"
                value={formBatchId}
                onChange={e => setFormBatchId(e.target.value)}
              >
                <option value="">Not pointed at a batch yet</option>
                {batchOptions.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.batch_code} · {new Date(b.batch_date).toLocaleDateString()}
                    {!b.is_public ? ' (not public)' : ''}
                  </option>
                ))}
              </SelectField>
              {selectedBatch && !selectedBatch.is_public && (
                <p className="mt-2 flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    {selectedBatch.batch_code} is not public, so a scan shows your product details
                    but no batch information. Mark the batch public to include it.
                  </span>
                </p>
              )}
              {selectedBatch && selectedBatch.is_public && formWeight != null
                && selectedBatch.jar_weights.length > 0
                && !selectedBatch.jar_weights.includes(formWeight) && (
                <p className="mt-2 flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    {selectedBatch.batch_code} has no {formWeight} g jars recorded against it.
                    Double-check this is the batch going into these jars.
                  </span>
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border p-3">
              <p className="mb-1 text-sm font-medium text-text-secondary">What a scan shows</p>
              <p className="mb-3 text-sm text-text-tertiary">
                Anything you set here is used for every batch this label carries. Leave a
                field blank to use each batch&rsquo;s own wording instead.
              </p>
              <div className="space-y-3">
                <div>
                  <FieldLabel htmlFor="jl-title">Title</FieldLabel>
                  <TextInput
                    id="jl-title"
                    value={form.public_title}
                    onChange={e => setForm(p => ({ ...p, public_title: e.target.value }))}
                    placeholder="Pure Irish Honey"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="jl-origin">Origin line</FieldLabel>
                  <TextInput
                    id="jl-origin"
                    value={form.public_origin}
                    onChange={e => setForm(p => ({ ...p, public_origin: e.target.value }))}
                    placeholder="Harvested in Athenry, Ireland"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="jl-story">Story</FieldLabel>
                  <TextAreaField
                    id="jl-story"
                    rows={3}
                    value={form.public_story}
                    onChange={e => setForm(p => ({ ...p, public_story: e.target.value }))}
                    placeholder="Leave blank to tell each batch's own story"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DISPLAY_TOGGLES.map(toggle => (
                  <label
                    key={toggle.key}
                    className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-surface"
                  >
                    <CheckboxInput
                      checked={form[toggle.key]}
                      onChange={e => setForm(p => ({ ...p, [toggle.key]: e.target.checked }))}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{toggle.label}</span>
                      <span className="block text-sm text-text-tertiary">{toggle.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <label className="flex cursor-pointer items-start gap-2">
                <CheckboxInput
                  checked={form.show_payment}
                  onChange={e => setForm(p => ({ ...p, show_payment: e.target.checked }))}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Let customers pay for the jar
                  </span>
                  <span className="block text-sm text-text-tertiary">
                    Shows the price and a payment button at the top of the scan page, replacing
                    a separate payment sticker.
                  </span>
                </span>
              </label>

              {form.show_payment && (
                <div className="mt-4 space-y-3">
                  {!paymentsReady && (
                    <p className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <span>
                        No payment method set up yet, so nothing will show on the scan page.{' '}
                        <Link href="/dashboard/profile" className="font-medium underline">
                          Add your Revolut link in your profile
                        </Link>
                        {' '}— it is shared by all your labels.
                      </span>
                    </p>
                  )}

                  {paymentsReady && (
                    <p className="text-sm text-text-tertiary">
                      Using the Revolut link from{' '}
                      <Link href="/dashboard/profile" className="font-medium underline">your profile</Link>
                      {paymentCurrency ? `, in ${paymentCurrency}.` : '.'}
                    </p>
                  )}

                  <div>
                    <FieldLabel htmlFor="jl-amount">Price customers pay</FieldLabel>
                    <TextInput
                      id="jl-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.payment_amount}
                      onChange={e => setForm(p => ({ ...p, payment_amount: e.target.value }))}
                      placeholder="8.00"
                    />
                    <p className="mt-1 text-sm text-text-tertiary">
                      Revolut does not carry the amount in the link — the customer types it. This
                      price is the only thing telling them what to send.
                    </p>
                  </div>

                  <div>
                    <FieldLabel htmlFor="jl-paynote">Message under the button</FieldLabel>
                    <TextInput
                      id="jl-paynote"
                      value={form.payment_note}
                      onChange={e => setForm(p => ({ ...p, payment_note: e.target.value }))}
                      placeholder="Raw and unfiltered, straight from our hives"
                      maxLength={300}
                    />
                    <p className="mt-1 text-sm text-text-tertiary">
                      A line about your honey, or anything practical the customer needs to know
                      &mdash; where to collect, or that jars can be refilled.
                    </p>
                  </div>

                  <p className="flex items-start gap-2 text-sm text-text-tertiary">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>
                      Customers pay in Revolut, so HiveCraic never sees payment details — and
                      never learns whether a payment went through. Check your Revolut app to
                      confirm.
                    </span>
                  </p>
                </div>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-2">
              <CheckboxInput
                checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Active</span>
                <span className="block text-sm text-text-tertiary">
                  Turn off to retire a design. Scans of that QR then show &ldquo;not found&rdquo;,
                  so only do this once the jars are out of circulation.
                </span>
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <Button type="submit" tone="amber" disabled={saving} className="flex-1">
                {saving ? 'Saving…' : editingLabel ? 'Save changes' : 'Create label'}
              </Button>
              <Button onClick={resetForm} disabled={saving}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-text-tertiary">Loading jar labels…</p>
      ) : labels.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No jar labels yet"
          description="A jar label is one printed design — usually one per jar size. It carries a permanent QR code you can print in bulk, then point at whichever batch you are bottling."
          actionLabel="Create your first label"
          actionOnClick={() => setShowLabelForm(true)}
        />
      ) : (
        <div className="space-y-4">
          {labels.map(label => {
            const batch = label.current_batch
            return (
              <div key={label.id} className="rounded-xl border border-border bg-surface-elevated p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Tag size={20} className="flex-shrink-0 text-amber-600" />
                  <h3 className="text-lg font-semibold text-foreground">{label.name}</h3>
                  <span className="rounded bg-surface px-2 py-0.5 font-mono text-sm text-text-secondary">
                    {label.code}
                  </span>
                  {!label.is_active && (
                    <span className="rounded bg-surface-secondary px-2 py-0.5 text-xs text-text-secondary">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-text-secondary">
                  {label.jar_size_ml != null && (
                    <div><span className="font-medium">Jar size:</span> {label.jar_size_ml}ml</div>
                  )}
                  {label.jar_weight_g != null && (
                    <div><span className="font-medium">Net weight:</span> {label.jar_weight_g}g</div>
                  )}
                </div>

                <div className="mb-3">
                  <FieldLabel htmlFor={`repoint-${label.id}`}>Currently bottling into</FieldLabel>
                  <SelectField
                    id={`repoint-${label.id}`}
                    value={label.current_batch_id || ''}
                    disabled={repointingId !== null}
                    onChange={e => handleRepoint(label, e.target.value)}
                  >
                    <option value="">Not pointed at a batch yet</option>
                    {batchOptions.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batch_code} · {new Date(b.batch_date).toLocaleDateString()}
                        {!b.is_public ? ' (not public)' : ''}
                      </option>
                    ))}
                  </SelectField>
                  {batch && batch.is_public === false && (
                    <p className="mt-2 flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <span>{batch.batch_code} is not public — a scan shows no batch information.</span>
                    </p>
                  )}
                  {!label.current_batch_id && (
                    <p className="mt-2 text-sm text-text-tertiary">
                      Scans resolve, but show no batch until you point this label at one.
                    </p>
                  )}
                </div>

                <div className="flex gap-2 border-t border-border pt-2">
                  <Button
                    onClick={() => setQrLabel(label)}
                    className="rounded-lg p-2 text-amber-600 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    title={`QR code for ${label.name}`}
                    aria-label={`QR code for ${label.name}`}
                    unstyled
                  >
                    <QrCode size={18} />
                  </Button>
                  <Button
                    onClick={() => setSaleLabel(label)}
                    className="rounded-lg p-2 text-green-700 dark:text-green-400 transition-colors hover:bg-green-100 dark:hover:bg-green-900/30"
                    title={`Record a sale of ${label.name}`}
                    aria-label={`Record a sale of ${label.name}`}
                    unstyled
                  >
                    <Wallet size={18} />
                  </Button>
                  <div className="flex-1" />
                  <Button
                    onClick={() => handleEdit(label)}
                    className="rounded-lg p-2 transition-colors hover:bg-surface"
                    title={`Edit ${label.name}`}
                    aria-label={`Edit ${label.name}`}
                    unstyled
                  >
                    <Edit2 size={18} />
                  </Button>
                  <Button
                    onClick={() => handleDelete(label)}
                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
                    title={`Delete ${label.name}`}
                    aria-label={`Delete ${label.name}`}
                    unstyled
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {saleLabel && (
        <RecordJarSaleModal
          userId={userId}
          label={saleLabel}
          salesCurrency={paymentCurrency}
          onClose={() => setSaleLabel(null)}
        />
      )}

      {qrLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-surface-elevated p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{qrLabel.name}</h3>
              <Button onClick={() => setQrLabel(null)} className="p-1" unstyled aria-label="Close">
                <X size={20} />
              </Button>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG
                  id={`qr-modal-${qrLabel.id}`}
                  value={labelUrl(qrLabel.code)}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <p className="font-mono text-sm font-semibold text-foreground">{qrLabel.code}</p>
              <p className="break-all text-center text-sm text-text-secondary">{labelUrl(qrLabel.code)}</p>

              <div className="flex w-full gap-2">
                <Button
                  onClick={() => saveQr('svg', `qr-modal-${qrLabel.id}`, qrLabel)}
                  tone="amber"
                  className="flex flex-1 items-center justify-center gap-2"
                >
                  <Download size={16} /> SVG
                </Button>
                <Button
                  onClick={() => saveQr('png', `qr-modal-${qrLabel.id}`, qrLabel)}
                  className="flex flex-1 items-center justify-center gap-2"
                >
                  <Download size={16} /> PNG
                </Button>
              </div>
              <p className="text-center text-sm text-text-tertiary">
                Send the SVG to your label printer — it stays sharp at any size. This code never
                changes, so one print run lasts for every batch to come.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
