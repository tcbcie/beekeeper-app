'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { HelpCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import type { VarroaTreatment, Hive, Apiary, TreatmentProduct, DropdownValue } from '@/types/records'
import { computePlannedRemovalDate } from '@/lib/treatment-removal'
import { toLocalDateString } from '@/lib/date-utils'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import { useFormDirtyState } from '@/hooks/useFormDirtyState'

interface VarroaTreatmentFormProps {
  treatment: VarroaTreatment | null
  hives: Hive[]
  apiaries: Apiary[]
  selectedApiaryId?: string
  selectedHiveId?: string
  treatmentProducts: TreatmentProduct[]
  applicationMethods: DropdownValue[]
  isUkNiResident?: boolean
  onSubmit: (treatment: VarroaTreatment, isOther: boolean, otherType: string) => Promise<void>
  onCancel: () => void
  /** Reports unsaved work so the page can guard every exit path. */
  onDirtyChange?: (dirty: boolean) => void
  onShowIpmTips: () => void
  onFetchWeather: (hiveId: string) => Promise<{ temp: number; condition: string; humidity: number; wind_speed: number } | null>
}

export default function VarroaTreatmentForm({
  treatment,
  hives,
  apiaries,
  selectedApiaryId = '',
  selectedHiveId = '',
  treatmentProducts,
  applicationMethods,
  isUkNiResident = false,
  onSubmit,
  onCancel,
  onDirtyChange,
  onShowIpmTips,
  onFetchWeather
}: VarroaTreatmentFormProps) {
  const toast = useToast()
  const [formData, setFormData] = useState<VarroaTreatment>(treatment || {
    id: '',
    hive_id: '',
    user_id: '',
    treatment_date: new Date().toISOString().split('T')[0],
    treatment_time: new Date().toTimeString().slice(0, 5),
    treatment_type: '',
    dosage: '',
    batch_number: null,
    temperature: null,
    weather_conditions: '',
    notes: '',
    application_method_id: null,
    planned_removal_date: null,
    removed_date: null
  })

  const [formApiaryId, setFormApiaryId] = useState<string>('')
  const [isOtherTreatment, setIsOtherTreatment] = useState(false)
  const [otherTreatmentType, setOtherTreatmentType] = useState('')
  const [selectedHiveHasHoneySupers, setSelectedHiveHasHoneySupers] = useState(false)
  const [fetchingWeather, setFetchingWeather] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAllProducts, setShowAllProducts] = useState(false)
  const isEditing = Boolean(treatment?.id)

  // Every exit guard on the records page asks one question: is there
  // unsaved work? Until this was wired, the answer for this form was
  // always no, so its contents could be discarded without a prompt.
  useFormDirtyState({ value: formData, onDirtyChange })

  // Pre-filter treatment products by resident jurisdiction
  const filteredProducts = useMemo(() => {
    if (showAllProducts) return treatmentProducts
    if (isUkNiResident) return treatmentProducts.filter(p => p.approved_in_uk)
    return treatmentProducts.filter(p => p.approved_in_ireland)
  }, [treatmentProducts, isUkNiResident, showAllProducts])

  // Once the beekeeper types their own removal date we stop suggesting one.
  // Seeded true when editing, so re-opening a saved treatment never silently
  // rewrites the date it was recorded with.
  const removalDateTouchedRef = useRef(Boolean(treatment?.id))

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true)
  const lastWeatherHiveIdRef = useRef<string | null>(null)
  const weatherRequestIdRef = useRef(0)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Update form data when treatment prop changes
  useEffect(() => {
    if (treatment) {
      setFormData(treatment)
      removalDateTouchedRef.current = true
      // Find apiary for selected hive
      const hive = hives.find(h => h.id === treatment.hive_id)
      setFormApiaryId(hive?.apiary_id ?? selectedApiaryId)
      // Check if treatment type is custom
      if (treatment.treatment_type && !treatmentProducts.some(p => p.product_name === treatment.treatment_type)) {
        setIsOtherTreatment(true)
        setOtherTreatmentType(treatment.treatment_type)
      } else {
        setIsOtherTreatment(false)
        setOtherTreatmentType('')
      }
    }
  }, [selectedApiaryId, treatment, hives, treatmentProducts])

  useEffect(() => {
    const selectedHive = hives.find(h => h.id === formData.hive_id)
    const honeySupers = selectedHive?.configuration?.honey_supers || 0
    setSelectedHiveHasHoneySupers(honeySupers > 0)
  }, [formData.hive_id, hives])

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

  useEffect(() => {
    if (isEditing) {
      return
    }

    if (!formData.hive_id) {
      lastWeatherHiveIdRef.current = null
      weatherRequestIdRef.current += 1
      setFetchingWeather(false)
      return
    }

    if (lastWeatherHiveIdRef.current === formData.hive_id) {
      return
    }

    lastWeatherHiveIdRef.current = formData.hive_id
    const currentHiveId = formData.hive_id
    const requestId = ++weatherRequestIdRef.current

    setFetchingWeather(true)

    void (async () => {
      try {
        const weatherData = await onFetchWeather(currentHiveId)

        if (!isMountedRef.current || requestId !== weatherRequestIdRef.current || !weatherData) {
          return
        }

        setFormData(prev => (
          prev.hive_id === currentHiveId
            ? {
                ...prev,
                temperature: weatherData.temp,
                weather_conditions: `${weatherData.condition}, ${weatherData.humidity}% humidity, ${weatherData.wind_speed} km/h wind`
              }
            : prev
        ))
      } finally {
        if (isMountedRef.current && requestId === weatherRequestIdRef.current) {
          setFetchingWeather(false)
        }
      }
    })()
  }, [formData.hive_id, isEditing, onFetchWeather])

  const handleHiveChange = (hiveId: string) => {
    setFormData(prev => ({ ...prev, hive_id: hiveId }))
    setFormApiaryId(prev => hiveId ? (hives.find(h => h.id === hiveId)?.apiary_id ?? prev) : prev)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.hive_id) {
      toast.warning('Please select a hive')
      return
    }
    if (!formData.treatment_date) {
      toast.warning('Please enter a treatment date')
      return
    }
    if (!formData.treatment_type && !otherTreatmentType) {
      toast.warning('Please select or specify a treatment product')
      return
    }
    if (!formData.dosage?.trim()) {
      toast.warning('Please enter the dosage')
      return
    }
    // The database enforces both of these too. Catching them here means a clear
    // sentence rather than a rejected write the beekeeper cannot interpret.
    if (formData.planned_removal_date && formData.planned_removal_date < formData.treatment_date) {
      toast.warning('The removal date cannot be before the treatment date')
      return
    }
    if (formData.removed_date && formData.removed_date < formData.treatment_date) {
      toast.warning('The date removed cannot be before the treatment date')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(formData, isOtherTreatment, otherTreatmentType)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredHives = hives
    .filter(h => !h.archived_at)
    .filter(h => !formApiaryId || h.apiary_id === formApiaryId)

  const selectedProduct = treatmentProducts.find(p => p.product_name === formData.treatment_type)

  // Suggest when the treatment should come off, from the product's known
  // duration. Products entered as free text match no product row and simply get
  // no suggestion — the field is still there and still editable, so the 11% of
  // records with an unmatched product name lose the convenience, not the feature.
  useEffect(() => {
    if (removalDateTouchedRef.current) return
    const suggested = computePlannedRemovalDate(
      formData.treatment_date,
      selectedProduct?.removal_after_days
    ) || null
    setFormData(prev => (
      prev.planned_removal_date === suggested ? prev : { ...prev, planned_removal_date: suggested }
    ))
  }, [formData.treatment_date, selectedProduct])

  const handleRemovalDateChange = (value: string) => {
    removalDateTouchedRef.current = true
    setFormData(prev => ({
      ...prev,
      planned_removal_date: value || null,
      // Nothing to have removed once the plan itself is cleared.
      removed_date: value ? prev.removed_date : null
    }))
  }

  const handleRemovedToggle = (checked: boolean) => {
    setFormData(prev => {
      if (!checked) return { ...prev, removed_date: null }
      // Default to today, but never earlier than the treatment itself — a
      // back-dated or future-dated treatment would otherwise be rejected.
      const today = toLocalDateString(new Date())
      return { ...prev, removed_date: today < prev.treatment_date ? prev.treatment_date : today }
    })
  }

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold">
            {treatment?.id ? 'Edit Varroa Treatment' : 'Record New Varroa Treatment'}
          </h3>
          <IconButton
            type="button"
            onClick={onShowIpmTips}
            tone="amber"
            size="sm"
            title="View IPM Tips"
          >
            <HelpCircle size={20} />
          </IconButton>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            type="submit"
            form="treatment-form"
            disabled={submitting}
            tone="danger"
            className="px-6 py-3 sm:py-2 min-h-[48px] touch-manipulation font-medium disabled:opacity-50"
          >
            {submitting ? 'Saving...' : (treatment?.id ? 'Update' : 'Save')} Treatment
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

      <form id="treatment-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Apiary</label>
          <select
            value={formApiaryId}
            onChange={(e) => {
              setFormApiaryId(e.target.value)
              setFormData(prev => ({ ...prev, hive_id: '' }))
              setSelectedHiveHasHoneySupers(false)
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
            onChange={(e) => handleHiveChange(e.target.value)}
            className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            required
          >
            <option value="">Select hive</option>
            {filteredHives.map((h) => (
              <option key={h.id} value={h.id}>{h.hive_number}</option>
            ))}
          </select>
          {selectedHiveHasHoneySupers && (
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <span>
                  <strong>Warning:</strong> This hive has honey supers installed. Please ensure the treatment product is safe for use with honey supers and check the withdrawal period before harvesting honey.
                </span>
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Treatment Date *</label>
          <input
            type="date"
            value={formData.treatment_date}
            onChange={(e) => setFormData(prev => ({ ...prev, treatment_date: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Treatment Time</label>
          <input
            type="time"
            value={formData.treatment_time || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, treatment_time: e.target.value }))}
            className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Treatment Product *</label>
          <div className="relative group">
            <select
              value={isOtherTreatment ? 'Other' : formData.treatment_type}
              onChange={(e) => {
                if (e.target.value === 'Other') {
                  setIsOtherTreatment(true)
                  setOtherTreatmentType(formData.treatment_type || '')
                  setFormData(prev => ({ ...prev, treatment_type: '' }))
                } else {
                  setIsOtherTreatment(false)
                  setOtherTreatmentType('')
                  setFormData(prev => ({ ...prev, treatment_type: e.target.value }))
                }
              }}
              className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
              required={!isOtherTreatment}
            >
              <option value="">Select treatment product</option>
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.product_name}>
                  {product.product_name} - {product.active_ingredients || 'No active ingredient listed'}
                </option>
              ))}
              <option value="Other">Other (specify below)</option>
            </select>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAllProducts}
                onChange={(e) => setShowAllProducts(e.target.checked)}
                className="w-4 h-4 rounded border-border text-forest-600 focus:ring-forest-500"
              />
              <span className="text-sm text-text-tertiary">
                Show all products (not just {isUkNiResident ? 'UK' : 'Ireland'} approved)
              </span>
            </label>

            {/* Product details tooltip */}
            {selectedProduct && !isOtherTreatment && (
              <div className="absolute z-10 invisible group-hover:visible w-full sm:w-96 bg-surface dark:bg-surface-elevated border-2 border-blue-500 dark:border-blue-400 rounded-lg shadow-xl p-4 mt-1 left-0 sm:left-auto sm:right-0">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <h4 className="font-semibold text-foreground">{selectedProduct.product_name}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {selectedProduct.active_ingredients && (
                    <div>
                      <span className="font-medium text-text-secondary">Active Ingredients:</span>
                      <span className="text-text-tertiary ml-2">{selectedProduct.active_ingredients}</span>
                    </div>
                  )}
                  {selectedProduct.application_method && (
                    <div>
                      <span className="font-medium text-text-secondary">Application Method:</span>
                      <span className="text-text-tertiary ml-2">{selectedProduct.application_method}</span>
                    </div>
                  )}
                  {selectedProduct.treatment_duration && (
                    <div>
                      <span className="font-medium text-text-secondary">Duration:</span>
                      <span className="text-text-tertiary ml-2">{selectedProduct.treatment_duration}</span>
                    </div>
                  )}
                  {selectedProduct.temperature_range && (
                    <div>
                      <span className="font-medium text-text-secondary">Temperature:</span>
                      <span className="text-text-tertiary ml-2">{selectedProduct.temperature_range}</span>
                    </div>
                  )}
                  {selectedProduct.honey_flow_restrictions && (
                    <div>
                      <span className="font-medium text-text-secondary">Honey Flow:</span>
                      <span className="text-text-tertiary ml-2">{selectedProduct.honey_flow_restrictions}</span>
                    </div>
                  )}
                  {selectedProduct.withdrawal_period_days !== null && (
                    <div>
                      <span className="font-medium text-text-secondary">Withdrawal:</span>
                      <span className="text-text-tertiary ml-2">{selectedProduct.withdrawal_period_days} days</span>
                    </div>
                  )}
                  {selectedProduct.notes && (
                    <div className="pt-2 border-t border-border">
                      <span className="font-medium text-text-secondary block mb-1">Notes:</span>
                      <span className="text-text-tertiary text-sm">{selectedProduct.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Show manual input if "Other" is selected */}
        {isOtherTreatment && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Specify Treatment Product *
            </label>
            <input
              type="text"
              value={otherTreatmentType}
              onChange={(e) => {
                setOtherTreatmentType(e.target.value)
                setFormData(prev => ({ ...prev, treatment_type: e.target.value }))
              }}
              className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
              placeholder="Enter custom treatment product name"
              required
            />
          </div>
        )}

        {/*
          Removal tracking. Always shown, because a product typed as free text
          matches no product row and would otherwise have nowhere to record this.
        */}
        <div className="rounded-md border border-border p-3 space-y-3">
          <div>
            <label htmlFor="planned-removal-date" className="block text-sm font-medium text-text-secondary mb-1">
              Remove by
            </label>
            <input
              id="planned-removal-date"
              type="date"
              value={formData.planned_removal_date || ''}
              min={formData.treatment_date || undefined}
              onChange={(e) => handleRemovalDateChange(e.target.value)}
              className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            />
            <p className="mt-1 text-sm text-text-tertiary">
              {selectedProduct?.removal_after_days
                ? `Suggested from ${selectedProduct.product_name} (${selectedProduct.treatment_duration}). Change it if you plan to leave it on longer.`
                : 'Set this for strips or pads that must come out later. Leave it empty for a single application with nothing to remove.'}
            </p>
            {formData.planned_removal_date && (
              <p className="mt-1 text-sm text-text-tertiary">
                A reminder will be added to your tasks for this date.
              </p>
            )}
          </div>

          {formData.planned_removal_date && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={Boolean(formData.removed_date)}
                  onChange={(e) => handleRemovedToggle(e.target.checked)}
                  className="w-5 h-5 rounded border-border text-forest-600 focus:ring-forest-500"
                />
                <span className="text-sm font-medium text-text-secondary">Treatment removed</span>
              </label>
              {formData.removed_date && (
                <input
                  type="date"
                  aria-label="Date removed"
                  value={formData.removed_date}
                  min={formData.treatment_date || undefined}
                  onChange={(e) => setFormData(prev => ({ ...prev, removed_date: e.target.value || null }))}
                  className="mt-2 w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
                />
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Dosage *</label>
          <input
            type="text"
            value={formData.dosage}
            onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            placeholder="e.g., 5ml per hive"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Batch Number</label>
          <input
            type="text"
            value={formData.batch_number || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, batch_number: e.target.value || null }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            placeholder="Product batch/lot number (for DAFM records)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Application Method</label>
          <select
            value={formData.application_method_id || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, application_method_id: e.target.value || null }))}
            className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
          >
            <option value="">Select application method</option>
            {applicationMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Temperature (°C)
            {fetchingWeather && <span className="ml-2 text-sm text-blue-600">Fetching...</span>}
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.temperature ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value ? parseFloat(e.target.value) : null }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            placeholder={fetchingWeather ? "Loading weather data..." : "Auto-populated from hive location"}
            disabled={fetchingWeather}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Weather Conditions
            {fetchingWeather && <span className="ml-2 text-sm text-blue-600">Fetching...</span>}
          </label>
          <input
            type="text"
            value={formData.weather_conditions}
            onChange={(e) => setFormData(prev => ({ ...prev, weather_conditions: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            placeholder={fetchingWeather ? "Loading weather data..." : "Auto-populated from hive location"}
            disabled={fetchingWeather}
          />
          {formData.hive_id && !fetchingWeather && (
            <p className="text-sm text-text-tertiary mt-1">
              Weather data auto-populated based on hive location. You can edit if needed.
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            rows={4}
            placeholder="Optional notes about the treatment"
          />
        </div>
      </form>
    </div>
  )
}
