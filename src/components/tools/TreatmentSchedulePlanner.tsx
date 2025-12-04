'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  APPROVED_TREATMENTS,
  getTreatmentsByseason,
  getCurrentSeason,
  getTreatmentByName,
  isTreatmentSuitable
} from '@/lib/external-data'
import { calculateTreatmentTiming } from '@/lib/tool-calculations'
import { Calendar, AlertTriangle, CheckCircle, Info, Thermometer } from 'lucide-react'

export function TreatmentSchedulePlanner() {
  const [selectedTreatment, setSelectedTreatment] = useState<string>('')
  const [hiveCount, setHiveCount] = useState(1)
  const [lastTreatmentDate, setLastTreatmentDate] = useState<string>('')
  const [honeySuperPresent, setHoneySuperPresent] = useState(false)
  const [currentTemp, setCurrentTemp] = useState<number | null>(null)
  const [season] = useState(getCurrentSeason())
  const [userId, setUserId] = useState<string | null>(null)

  // Get user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [])

  // Load last treatment date when treatment is selected
  useEffect(() => {
    const loadLastTreatment = async () => {
      if (!userId || !selectedTreatment) return

      const { data } = await supabase
        .from('varroa_treatments')
        .select('treatment_date')
        .eq('user_id', userId)
        .eq('treatment_type', selectedTreatment)
        .order('treatment_date', { ascending: false })
        .limit(1)
        .single()

      if (data?.treatment_date) {
        setLastTreatmentDate(data.treatment_date.split('T')[0])
      }
    }

    loadLastTreatment()
  }, [userId, selectedTreatment])

  const treatment = selectedTreatment ? getTreatmentByName(selectedTreatment) : null

  const timing = treatment
    ? calculateTreatmentTiming(
        treatment.product,
        lastTreatmentDate ? new Date(lastTreatmentDate) : null,
        honeySuperPresent,
        treatment.withdrawalPeriodDays,
        treatment.minIntervalDays
      )
    : null

  const suitability = treatment && currentTemp !== null
    ? isTreatmentSuitable(treatment, currentTemp, honeySuperPresent)
    : null

  const seasonalTreatments = getTreatmentsByseason(season)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IE', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Treatment Selection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Select Treatment
          </label>
          <select
            value={selectedTreatment}
            onChange={(e) => setSelectedTreatment(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-sage-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
          >
            <option value="">Choose a treatment...</option>
            <optgroup label={`Recommended for ${season.charAt(0).toUpperCase() + season.slice(1)}`}>
              {seasonalTreatments.map(t => (
                <option key={t.product} value={t.product}>
                  {t.product} ({t.activeIngredient})
                </option>
              ))}
            </optgroup>
            <optgroup label="All Approved Treatments">
              {APPROVED_TREATMENTS.filter(t => !seasonalTreatments.find(st => st.product === t.product)).map(t => (
                <option key={t.product} value={t.product}>
                  {t.product} ({t.activeIngredient})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Number of Hives
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHiveCount(Math.max(1, hiveCount - 1))}
              className="w-12 h-12 flex items-center justify-center rounded-lg bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700 font-bold text-xl"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              value={hiveCount}
              onChange={(e) => setHiveCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 px-4 py-3 rounded-lg border border-sage-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
            <button
              onClick={() => setHiveCount(hiveCount + 1)}
              className="w-12 h-12 flex items-center justify-center rounded-lg bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700 font-bold text-xl"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Last Treatment Date (Optional)
          </label>
          <input
            type="date"
            value={lastTreatmentDate}
            onChange={(e) => setLastTreatmentDate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-sage-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            <Thermometer size={16} className="inline mr-1" />
            Current Temperature (°C) - Optional
          </label>
          <input
            type="number"
            value={currentTemp ?? ''}
            onChange={(e) => setCurrentTemp(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="e.g., 18"
            className="w-full px-4 py-3 rounded-lg border border-sage-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
          />
        </div>
      </div>

      {/* Honey Super Toggle */}
      <div className="flex items-center gap-3 p-4 bg-sage-50 dark:bg-slate-800/50 rounded-lg">
        <input
          type="checkbox"
          id="honeySuper"
          checked={honeySuperPresent}
          onChange={(e) => setHoneySuperPresent(e.target.checked)}
          className="w-5 h-5 rounded border-sage-300 dark:border-slate-600 text-forest-600 focus:ring-2 focus:ring-forest-500"
        />
        <label htmlFor="honeySuper" className="text-foreground font-medium cursor-pointer">
          Honey supers are currently on the hive
        </label>
      </div>

      {/* Treatment Details */}
      {treatment && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-sage-300 dark:border-slate-700 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2">{treatment.product}</h3>
            <p className="text-sm text-text-secondary">{treatment.activeIngredient}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-text-secondary">Application Method</div>
              <div className="text-foreground">{treatment.applicationMethod}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-text-secondary">Withdrawal Period</div>
              <div className="text-foreground">
                {treatment.withdrawalPeriodDays === 0
                  ? 'No withdrawal period'
                  : `${treatment.withdrawalPeriodDays} days`}
              </div>
            </div>
          </div>

          {treatment.minTemperature !== undefined && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Thermometer className="text-blue-600 dark:text-blue-400 mt-0.5" size={18} />
              <div className="text-sm">
                <div className="font-medium text-blue-900 dark:text-blue-100">Temperature Range</div>
                <div className="text-blue-700 dark:text-blue-300">
                  {treatment.minTemperature}°C - {treatment.maxTemperature}°C
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-sage-50 dark:bg-slate-700/50 rounded-lg">
            <div className="text-sm font-medium text-text-secondary mb-1">Application Notes</div>
            <div className="text-sm text-foreground">{treatment.notes}</div>
          </div>

          {treatment.seasonalRestrictions && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Info className="text-amber-600 dark:text-amber-400 mt-0.5" size={18} />
              <div className="text-sm">
                <div className="font-medium text-amber-900 dark:text-amber-100">Seasonal Timing</div>
                <div className="text-amber-700 dark:text-amber-300">{treatment.seasonalRestrictions}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timing Analysis */}
      {timing && treatment && (
        <div className="space-y-3">
          {/* Can Treat Now Status */}
          <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
            timing.canTreatNow
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
          }`}>
            {timing.canTreatNow ? (
              <CheckCircle className="text-green-600 dark:text-green-400 mt-0.5" size={24} />
            ) : (
              <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5" size={24} />
            )}
            <div className="flex-1">
              <div className={`font-bold text-lg ${
                timing.canTreatNow
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-amber-900 dark:text-amber-100'
              }`}>
                {timing.canTreatNow ? 'Safe to Treat Now' : 'Cannot Treat Yet'}
              </div>
              {timing.warnings.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {timing.warnings.map((warning, i) => (
                    <li key={i} className={`text-sm ${
                      timing.canTreatNow
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}>
                      {warning}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Temperature Suitability */}
          {suitability && (
            <div className={`flex items-start gap-3 p-4 rounded-lg ${
              suitability.suitable
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <Thermometer className={suitability.suitable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} size={20} />
              <div>
                <div className="text-sm font-medium text-foreground mb-1">Temperature Check</div>
                <ul className="space-y-1">
                  {suitability.reasons.map((reason, i) => (
                    <li key={i} className={`text-sm ${
                      suitability.suitable
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Timeline */}
          {(timing.nextSafeTreatment || timing.withdrawalEnds) && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-sage-300 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={20} className="text-forest-600 dark:text-forest-400" />
                <h4 className="font-semibold text-foreground">Treatment Timeline</h4>
              </div>
              <div className="space-y-2 text-sm">
                {timing.nextSafeTreatment && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Next safe treatment date:</span>
                    <span className="font-medium text-foreground">{formatDate(timing.nextSafeTreatment)}</span>
                  </div>
                )}
                {timing.withdrawalEnds && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Withdrawal period ends:</span>
                    <span className="font-medium text-foreground">{formatDate(timing.withdrawalEnds)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cost Estimate */}
          {hiveCount > 1 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Planning for {hiveCount} hives
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Ensure you have sufficient {treatment.product} for all {hiveCount} hives.
                Check product instructions for exact quantities needed.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!treatment && (
        <div className="bg-sage-50 dark:bg-slate-800/50 p-8 rounded-lg text-center">
          <Calendar className="mx-auto mb-3 text-text-secondary" size={48} />
          <p className="text-text-secondary">
            Select a treatment above to view application details and timing recommendations
          </p>
        </div>
      )}
    </div>
  )
}
