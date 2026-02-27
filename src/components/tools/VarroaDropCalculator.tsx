'use client'

import { useState } from 'react'
import { calculateVarroaDrop, type Season, type ScreenType } from '@/lib/tool-calculations'
import { getTreatmentsByseason } from '@/lib/external-data'
import { Bug, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import Button from '@/components/ui/Button'

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
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Mite Count (from sticky board)</label>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setMiteCount(Math.max(0, miteCount - 1))}
              tone="neutral"
              className="px-4 py-2 bg-surface-secondary hover:bg-surface-elevated font-bold text-lg"
            >
              -
            </Button>
            <input
              type="number"
              min="0"
              value={miteCount}
              onChange={(e) => setMiteCount(Math.max(0, parseInt(e.target.value) || 0))}
              className="flex-1 px-4 py-2 rounded-lg border border-border bg-surface text-foreground text-center focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
            <Button
              onClick={() => setMiteCount(miteCount + 1)}
              tone="neutral"
              className="px-4 py-2 bg-surface-secondary hover:bg-surface-elevated font-bold text-lg"
            >
              +
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Days Counted</label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 3, 7].map((days) => (
              <Button
                key={days}
                onClick={() => setDaysCount(days)}
                tone={daysCount === days ? 'blue' : 'neutral'}
                className={daysCount === days ? '' : 'bg-surface-secondary hover:bg-surface-elevated'}
              >
                {days} day{days > 1 ? 's' : ''}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Screen Type</label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setScreenType('full')}
            tone={screenType === 'full' ? 'blue' : 'neutral'}
            className={screenType === 'full' ? '' : 'bg-surface-secondary hover:bg-surface-elevated'}
          >
            Full Screen Board
          </Button>
          <Button
            onClick={() => setScreenType('omf')}
            tone={screenType === 'omf' ? 'blue' : 'neutral'}
            className={screenType === 'omf' ? '' : 'bg-surface-secondary hover:bg-surface-elevated'}
          >
            Open Mesh Floor
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Season</label>
        <div className="grid grid-cols-4 gap-2">
          {(['spring', 'summer', 'autumn', 'winter'] as const).map((s) => (
            <Button
              key={s}
              onClick={() => setSeason(s)}
              tone={season === s ? 'blue' : 'neutral'}
              className={`capitalize ${season === s ? '' : 'bg-surface-secondary hover:bg-surface-elevated'}`}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <div className={`p-6 rounded-lg border ${getResultColor()}`}>
        <div className="flex items-start gap-3 mb-4">
          {getIcon()}
          <div className="flex-1">
            <h4 className={`font-bold text-lg ${getTextColor()}`}>
              {result.treatmentLevel === 'safe'
                ? 'Safe Levels'
                : result.treatmentLevel === 'monitor'
                  ? 'Monitor Closely'
                  : 'Urgent Treatment Needed'}
            </h4>
            <p className={`text-sm mt-1 ${getTextColor()}`}>{result.message}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-surface/70 p-4 rounded-lg">
            <div className="text-sm text-text-secondary mb-1">Daily Mite Drop</div>
            <div className="text-2xl font-bold text-foreground">
              {result.dailyDrop} <span className="text-sm font-normal">mites/day</span>
            </div>
          </div>

          <div className="bg-surface/70 p-4 rounded-lg">
            <div className="text-sm text-text-secondary mb-1">Estimated Total Infestation</div>
            <div className="text-2xl font-bold text-foreground">
              ~{result.estimatedInfestation} <span className="text-sm font-normal">mites</span>
            </div>
          </div>
        </div>
      </div>

      {result.treatmentLevel !== 'safe' && seasonalTreatments.length > 0 && (
        <div className="bg-surface-elevated p-6 rounded-lg border border-border">
          <h4 className="font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
            <Bug size={20} />
            Recommended Treatments for {season.charAt(0).toUpperCase() + season.slice(1)}
          </h4>
          <div className="space-y-3">
            {seasonalTreatments.map((treatment, i) => (
              <div key={i} className="p-4 bg-surface-secondary rounded-lg">
                <div className="font-semibold text-foreground">{treatment.product}</div>
                <div className="text-sm text-text-secondary mt-1">{treatment.activeIngredient}</div>
                <div className="text-sm text-foreground mt-2">{treatment.notes}</div>
                {treatment.minTemperature && (
                  <div className="text-xs text-text-secondary mt-2">
                    Temperature range: {treatment.minTemperature}degC - {treatment.maxTemperature}degC
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
        <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How to Use:</h5>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>- Insert sticky board for 1, 3, or 7 days</li>
          <li>- Count fallen mites (natural drop, not from treatment)</li>
          <li>- Select your screen type (affects calculation accuracy)</li>
          <li>- Choose current season (affects treatment thresholds)</li>
          <li>- Repeat monthly to monitor infestation trends</li>
        </ul>
      </div>
    </div>
  )
}
