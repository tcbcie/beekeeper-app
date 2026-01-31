'use client'

import { useState, useEffect, useRef } from 'react'
import { HelpCircle } from 'lucide-react'
import type { VarroaTreatment, Hive, Apiary, TreatmentProduct, DropdownValue } from '@/types/records'

interface VarroaTreatmentFormProps {
  treatment: VarroaTreatment | null
  hives: Hive[]
  apiaries: Apiary[]
  treatmentProducts: TreatmentProduct[]
  applicationMethods: DropdownValue[]
  onSubmit: (treatment: VarroaTreatment, isOther: boolean, otherType: string) => Promise<void>
  onCancel: () => void
  onShowIpmTips: () => void
  onFetchWeather: (hiveId: string) => Promise<{ temp: number; condition: string; humidity: number; wind_speed: number } | null>
}

export default function VarroaTreatmentForm({
  treatment,
  hives,
  apiaries,
  treatmentProducts,
  applicationMethods,
  onSubmit,
  onCancel,
  onShowIpmTips,
  onFetchWeather
}: VarroaTreatmentFormProps) {
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
    application_method_id: null
  })

  const [formApiaryId, setFormApiaryId] = useState<string>('')
  const [isOtherTreatment, setIsOtherTreatment] = useState(false)
  const [otherTreatmentType, setOtherTreatmentType] = useState('')
  const [selectedHiveHasHoneySupers, setSelectedHiveHasHoneySupers] = useState(false)
  const [fetchingWeather, setFetchingWeather] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Update form data when treatment prop changes
  useEffect(() => {
    if (treatment) {
      setFormData(treatment)
      // Find apiary for selected hive
      const hive = hives.find(h => h.id === treatment.hive_id)
      if (hive?.apiary_id) {
        setFormApiaryId(hive.apiary_id)
      }
      // Check if treatment type is custom
      if (treatment.treatment_type && !treatmentProducts.some(p => p.product_name === treatment.treatment_type)) {
        setIsOtherTreatment(true)
        setOtherTreatmentType(treatment.treatment_type)
      }
      // Check for honey supers
      if (hive) {
        const honeySupers = hive.configuration?.honey_supers || 0
        setSelectedHiveHasHoneySupers(honeySupers > 0)
      }
    }
  }, [treatment, hives, treatmentProducts])

  const handleHiveChange = async (hiveId: string) => {
    setFormData(prev => ({ ...prev, hive_id: hiveId }))

    // Check if selected hive has honey supers
    const selectedHive = hives.find(h => h.id === hiveId)
    const honeySupers = selectedHive?.configuration?.honey_supers || 0
    setSelectedHiveHasHoneySupers(honeySupers > 0)

    // Fetch weather data for the selected hive
    if (hiveId) {
      setFetchingWeather(true)
      try {
        const weatherData = await onFetchWeather(hiveId)
        // Only update state if component is still mounted
        if (isMountedRef.current && weatherData) {
          setFormData(prev => ({
            ...prev,
            temperature: weatherData.temp,
            weather_conditions: `${weatherData.condition}, ${weatherData.humidity}% humidity, ${weatherData.wind_speed} km/h wind`
          }))
        }
      } finally {
        if (isMountedRef.current) {
          setFetchingWeather(false)
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.hive_id) {
      alert('Please select a hive')
      return
    }
    if (!formData.treatment_date) {
      alert('Please enter a treatment date')
      return
    }
    if (!formData.treatment_type && !otherTreatmentType) {
      alert('Please select or specify a treatment product')
      return
    }
    if (!formData.dosage?.trim()) {
      alert('Please enter the dosage')
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

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold">
            {treatment?.id ? 'Edit Varroa Treatment' : 'Record New Varroa Treatment'}
          </h3>
          <button
            type="button"
            onClick={onShowIpmTips}
            className="text-amber-600 hover:text-amber-700 transition-colors"
            title="View IPM Tips"
          >
            <HelpCircle size={20} />
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            type="submit"
            form="treatment-form"
            disabled={submitting}
            className="px-6 py-3 sm:py-2 min-h-[48px] bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-all touch-manipulation font-medium disabled:opacity-50"
          >
            {submitting ? 'Saving...' : (treatment?.id ? 'Update' : 'Save')} Treatment
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 sm:py-2 min-h-[48px] bg-sage-200 dark:bg-slate-700 text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 border border-border active:bg-sage-400 dark:active:bg-slate-500 touch-manipulation font-medium"
          >
            Cancel
          </button>
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
              {treatmentProducts.map((product) => (
                <option key={product.id} value={product.product_name}>
                  {product.product_name} - {product.active_ingredients || 'No active ingredient listed'}
                </option>
              ))}
              <option value="Other">Other (specify below)</option>
            </select>

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
                      <span className="text-text-tertiary text-xs">{selectedProduct.notes}</span>
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
            {fetchingWeather && <span className="ml-2 text-xs text-blue-600">Fetching...</span>}
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
            {fetchingWeather && <span className="ml-2 text-xs text-blue-600">Fetching...</span>}
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
            <p className="text-xs text-text-tertiary mt-1">
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
