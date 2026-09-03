'use client'
import { useEffect, useRef, useState } from 'react'
import ModalShell from '@/components/ui/ModalShell'
import Button from '@/components/ui/Button'
import { toLocalDateString } from '@/lib/date-utils'
import { computePlannedRemovalDate } from '@/lib/treatment-removal'
import type { TreatmentProduct, DropdownValue } from '@/types/records'

export interface BulkTreatmentValues {
  treatment_date: string
  treatment_time: string | null
  treatment_type: string
  dosage: string
  batch_number: string | null
  application_method_id: string | null
  temperature: number | null
  weather_conditions: string
  planned_removal_date: string | null
  notes: string
}

interface BulkTreatmentModalProps {
  count: number
  /** How many of the selected hives have honey supers on. Informational only. */
  honeySuperCount: number
  treatmentProducts: TreatmentProduct[]
  applicationMethods: DropdownValue[]
  isUkNiResident: boolean
  saving: boolean
  onClose: () => void
  onApply: (values: BulkTreatmentValues) => void
}

const OTHER = 'Other'

/**
 * Records one varroa treatment against every selected hive.
 *
 * Every column a treatment holds is shared across the batch except `hive_id` —
 * including the planned removal date, which derives from the product and the
 * treatment date and takes no hive input.
 *
 * **Weather is typed, not fetched.** The single-hive form autofills temperature
 * and conditions from the hive's apiary through Nominatim and Open-Meteo with no
 * caching anywhere in that path, so fanning it out to seventeen hives would fire
 * seventeen geocoding and seventeen forecast requests for what is usually one
 * apiary. A beekeeper treating a yard in one session stands in one set of
 * conditions and knows the number; both columns are nullable, and neither
 * appears in the DAFM report.
 */
export default function BulkTreatmentModal({
  count,
  honeySuperCount,
  treatmentProducts,
  applicationMethods,
  isUkNiResident,
  saving,
  onClose,
  onApply,
}: BulkTreatmentModalProps) {
  const now = new Date()
  const [treatmentDate, setTreatmentDate] = useState(() => toLocalDateString(now))
  const [treatmentTime, setTreatmentTime] = useState(() => now.toTimeString().slice(0, 5))
  const [productName, setProductName] = useState('')
  const [otherProduct, setOtherProduct] = useState('')
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [dosage, setDosage] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [methodId, setMethodId] = useState('')
  const [temperature, setTemperature] = useState('')
  const [conditions, setConditions] = useState('')
  const [removalDate, setRemovalDate] = useState('')
  const [notes, setNotes] = useState('')

  const isOther = productName === OTHER
  const resolvedProduct = isOther ? otherProduct.trim() : productName
  const selectedProduct = treatmentProducts.find(p => p.product_name === productName)

  const visibleProducts = showAllProducts
    ? treatmentProducts
    : treatmentProducts.filter(p => (isUkNiResident ? p.approved_in_uk : p.approved_in_ireland))

  // Suggest the removal date from the product's duration, exactly as the
  // single-hive form does. Once the beekeeper types their own we never overwrite
  // it. A free-text product matches no product row and simply gets no
  // suggestion — the field stays, so nothing is lost but the convenience.
  const removalTouchedRef = useRef(false)
  useEffect(() => {
    if (removalTouchedRef.current) return
    const suggested = computePlannedRemovalDate(treatmentDate, selectedProduct?.removal_after_days)
    setRemovalDate(prev => (prev === suggested ? prev : suggested))
  }, [treatmentDate, selectedProduct])

  const dateOrderValid = !removalDate || removalDate >= treatmentDate
  // temperature is numeric(4,1) in the database, so a mistyped 99999 would
  // overflow and reject the whole batch — one slip losing seventeen medicines
  // records. Bounded to air temperatures a hive could plausibly be treated in.
  const parsedTemperature = parseFloat(temperature)
  const temperatureValid =
    temperature.trim() === '' ||
    (Number.isFinite(parsedTemperature) && parsedTemperature >= -50 && parsedTemperature <= 60)
  const canApply =
    Boolean(treatmentDate && resolvedProduct && dosage.trim()) &&
    dateOrderValid && temperatureValid && !saving

  const apply = () => {
    if (!canApply) return
    onApply({
      treatment_date: treatmentDate,
      treatment_time: treatmentTime || null,
      treatment_type: resolvedProduct,
      dosage: dosage.trim(),
      batch_number: batchNumber.trim() || null,
      application_method_id: methodId || null,
      temperature: temperature.trim() === '' ? null : parsedTemperature,
      weather_conditions: conditions.trim(),
      planned_removal_date: removalDate || null,
      notes: notes.trim(),
    })
  }

  const inputClass = 'w-full px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition-all'
  const labelClass = 'block text-sm font-medium text-text-primary mb-2'

  return (
    <ModalShell
      title={`Record treatment for ${count} hive${count === 1 ? '' : 's'}`}
      onClose={onClose}
      closeOnBackdrop
      maxWidthClassName="max-w-lg"
      footer={
        <div className="border-t border-border px-6 py-4 flex flex-col sm:flex-row justify-end gap-3">
          <Button
            type="button"
            onClick={onClose}
            className="px-6 py-3 sm:py-2 min-h-[48px] bg-surface dark:bg-surface-elevated text-text-primary rounded-lg hover:bg-surface-elevated font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canApply}
            onClick={apply}
            className="px-6 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Recording…' : `Record for ${count}`}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-text-secondary mb-4">
        The same treatment is recorded against every selected hive. You can edit any of them
        afterwards from Records.
      </p>

      {honeySuperCount > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
            <span className="text-lg" aria-hidden="true">⚠️</span>
            <span>
              <strong>{honeySuperCount} of {count}</strong> selected hive{honeySuperCount === 1 ? ' has' : 's have'}{' '}
              honey supers on. Check the product is safe to use with supers, and check its
              withdrawal period before harvesting.
            </span>
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bulk-tr-date" className={labelClass}>Treatment date *</label>
            <input id="bulk-tr-date" type="date" value={treatmentDate}
              onChange={(e) => setTreatmentDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="bulk-tr-time" className={labelClass}>Time</label>
            <input id="bulk-tr-time" type="time" value={treatmentTime}
              onChange={(e) => setTreatmentTime(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="bulk-tr-product" className={labelClass}>Treatment product *</label>
          <select id="bulk-tr-product" value={productName}
            onChange={(e) => setProductName(e.target.value)} className={inputClass}>
            <option value="" disabled>Select treatment product…</option>
            {visibleProducts.map((product) => (
              <option key={product.id} value={product.product_name}>
                {product.product_name}
                {product.active_ingredients ? ` - ${product.active_ingredients}` : ''}
              </option>
            ))}
            <option value={OTHER}>Other (specify below)</option>
          </select>
          <label className="flex items-center gap-2 mt-2 cursor-pointer min-h-[44px]">
            <input type="checkbox" checked={showAllProducts}
              onChange={(e) => setShowAllProducts(e.target.checked)}
              className="w-4 h-4 rounded border-border text-forest-600 focus:ring-forest-500" />
            <span className="text-sm text-text-tertiary">
              Show all products (not just {isUkNiResident ? 'UK' : 'Ireland'} approved)
            </span>
          </label>
          {isOther && (
            <input type="text" aria-label="Specify treatment product" value={otherProduct}
              onChange={(e) => setOtherProduct(e.target.value)}
              placeholder="Enter custom treatment product name"
              className={`mt-2 ${inputClass}`} />
          )}
        </div>

        <div>
          <label htmlFor="bulk-tr-removal" className={labelClass}>Remove by</label>
          <input id="bulk-tr-removal" type="date" value={removalDate} min={treatmentDate || undefined}
            onChange={(e) => { removalTouchedRef.current = true; setRemovalDate(e.target.value) }}
            className={inputClass} />
          <p className="mt-1 text-sm text-text-tertiary">
            {selectedProduct?.removal_after_days
              ? `Suggested from ${selectedProduct.product_name} (${selectedProduct.treatment_duration}).`
              : 'Set this for strips or pads that must come out later. Leave it empty for a single application.'}
          </p>
          {removalDate && (
            <p className="mt-1 text-sm text-text-tertiary">
              A removal reminder is added for each hive. They arrive together in one email.
            </p>
          )}
          {!dateOrderValid && (
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              The removal date cannot be before the treatment date.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bulk-tr-dosage" className={labelClass}>Dosage per hive *</label>
            <input id="bulk-tr-dosage" type="text" value={dosage}
              onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 2 strips"
              className={inputClass} />
          </div>
          <div>
            <label htmlFor="bulk-tr-batch" className={labelClass}>Batch number</label>
            <input id="bulk-tr-batch" type="text" value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)} placeholder="for DAFM records"
              className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="bulk-tr-method" className={labelClass}>Application method</label>
          <select id="bulk-tr-method" value={methodId}
            onChange={(e) => setMethodId(e.target.value)} className={inputClass}>
            <option value="">Not recorded</option>
            {applicationMethods.map((method) => (
              <option key={method.id} value={method.id}>{method.value}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bulk-tr-temp" className={labelClass}>Temperature (°C)</label>
            <input id="bulk-tr-temp" type="number" step="0.1" min="-50" max="60" value={temperature}
              onChange={(e) => setTemperature(e.target.value)} className={inputClass} />
            {!temperatureValid && (
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                Enter a temperature between -50 and 60 °C.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="bulk-tr-conditions" className={labelClass}>Conditions</label>
            <input id="bulk-tr-conditions" type="text" value={conditions}
              onChange={(e) => setConditions(e.target.value)} placeholder="e.g. Overcast, light wind"
              className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="bulk-tr-notes" className={labelClass}>Notes</label>
          <textarea id="bulk-tr-notes" rows={2} value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground" />
        </div>
      </div>
    </ModalShell>
  )
}
