'use client'

import { useState } from 'react'
import { calculateVarroaDrop, type Season, type ScreenType } from '@/lib/tool-calculations'
import { getTreatmentsByseason } from '@/lib/external-data'
import { Bug, AlertTriangle, CheckCircle, Info } from 'lucide-react'

export function VarroaDropCalculator() {
  const [miteCount, setMiteCount] = useState(10)
  const [daysCount, setDaysCount] = useState(3)
  const [screenType, setScreenType] = useState<ScreenType>('full')
  const [season, setSeason] = useState<Season>('summer')

  const result = calculateVarroaDrop(miteCount, daysCount, screenType, season)
  const seasonalTreatments = getTreatmentsByseason(season)

  const getIcon = () => {
    if (result.treatmentLevel === 'safe') return <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
    if (result.treatmentLevel === 'monitor') return <Info className="text-amber-600 dark:text-amber-400" size={24} />
    return <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
  }

  const getResultColor = () => {
    if (result.color === 'green') return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    if (result.color === 'amber') return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }

  const getTextColor = () => {
    if (result.color === 'green') return 'text-green-900 dark:text-green-100'
    if (result.color === 'amber') return 'text-amber-900 dark:text-amber-100'
    return 'text-red-900 dark:text-red-100'
  }

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Mite Count (from sticky board)
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMiteCount(Math.max(0, miteCount - 1))}
              className="px-4 py-2 rounded-lg bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700 font-bold text-lg"
            >
              −
            </button>
            <input
              type="number"
              min="0"
              value={miteCount}
              onChange={(e) => setMiteCount(Math.max(0, parseInt(e.target.value) || 0))}
              className="flex-1 px-4 py-2 rounded-lg border border-sage-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground text-center focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
            <button
              onClick={() => setMiteCount(miteCount + 1)}
              className="px-4 py-2 rounded-lg bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700 font-bold text-lg"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Days Counted
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 3, 7].map(days => (
              <button
                key={days}
                onClick={() => setDaysCount(days)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  daysCount === days
                    ? 'bg-forest-600 dark:bg-forest-700 text-white'
                    : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
                }`}
              >
                {days} day{days > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Screen Type */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Screen Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setScreenType('full')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              screenType === 'full'
                ? 'bg-forest-600 dark:bg-forest-700 text-white'
                : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
            }`}
          >
            Full Screen Board
          </button>
          <button
            onClick={() => setScreenType('omf')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              screenType === 'omf'
                ? 'bg-forest-600 dark:bg-forest-700 text-white'
                : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
            }`}
          >
            Open Mesh Floor
          </button>
        </div>
      </div>

      {/* Season */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Season
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(['spring', 'summer', 'autumn', 'winter'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                season === s
                  ? 'bg-forest-600 dark:bg-forest-700 text-white'
                  : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className={`p-6 rounded-lg border ${getResultColor()}`}>
        <div className="flex items-start gap-3 mb-4">
          {getIcon()}
          <div className="flex-1">
            <h4 className={`font-bold text-lg ${getTextColor()}`}>
              {result.treatmentLevel === 'safe' ? 'Safe Levels' :
               result.treatmentLevel === 'monitor' ? 'Monitor Closely' :
               'Urgent Treatment Needed'}
            </h4>
            <p className={`text-sm mt-1 ${getTextColor()}`}>{result.message}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg">
            <div className="text-sm text-text-secondary mb-1">Daily Mite Drop</div>
            <div className="text-2xl font-bold text-foreground">
              {result.dailyDrop} <span className="text-sm font-normal">mites/day</span>
            </div>
          </div>

          <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg">
            <div className="text-sm text-text-secondary mb-1">Estimated Total Infestation</div>
            <div className="text-2xl font-bold text-foreground">
              ~{result.estimatedInfestation} <span className="text-sm font-normal">mites</span>
            </div>
          </div>
        </div>
      </div>

      {/* Treatment Options */}
      {result.treatmentLevel !== 'safe' && seasonalTreatments.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-sage-300 dark:border-slate-700">
          <h4 className="font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
            <Bug size={20} />
            Recommended Treatments for {season.charAt(0).toUpperCase() + season.slice(1)}
          </h4>
          <div className="space-y-3">
            {seasonalTreatments.map((treatment, i) => (
              <div key={i} className="p-4 bg-sage-50 dark:bg-slate-700/50 rounded-lg">
                <div className="font-semibold text-foreground">{treatment.product}</div>
                <div className="text-sm text-text-secondary mt-1">{treatment.activeIngredient}</div>
                <div className="text-sm text-foreground mt-2">{treatment.notes}</div>
                {treatment.minTemperature && (
                  <div className="text-xs text-text-secondary mt-2">
                    Temperature range: {treatment.minTemperature}°C - {treatment.maxTemperature}°C
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
        <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How to Use:</h5>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>• Insert sticky board for 1, 3, or 7 days</li>
          <li>• Count fallen mites (natural drop, not from treatment)</li>
          <li>• Select your screen type (affects calculation accuracy)</li>
          <li>• Choose current season (affects treatment thresholds)</li>
          <li>• Repeat monthly to monitor infestation trends</li>
        </ul>
      </div>
    </div>
  )
}
