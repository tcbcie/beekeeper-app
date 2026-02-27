'use client'

import { useState } from 'react'
import { predictSwarmDate, type CellAge, type CellType } from '@/lib/tool-calculations'
import { AlertTriangle, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'

export function SwarmPredictor() {
  const [queenCellsPresent, setQueenCellsPresent] = useState(false)
  const [cellType, setCellType] = useState<CellType>('swarm')
  const [cellAge, setCellAge] = useState<CellAge>('young_larvae')
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0])
  const [hiveStrength, setHiveStrength] = useState(3)

  const prediction = predictSwarmDate(
    queenCellsPresent,
    cellType,
    cellAge,
    new Date(inspectionDate),
    hiveStrength
  )

  const getRiskColor = () => {
    if (prediction.swarmRisk === 'imminent') return 'bg-red-50 dark:bg-red-900/20 border-red-500'
    if (prediction.swarmRisk === 'high') return 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
    if (prediction.swarmRisk === 'medium') return 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
    return 'bg-green-50 dark:bg-green-900/20 border-green-500'
  }

  const getRiskIcon = () => {
    if (prediction.swarmRisk === 'imminent') return <AlertTriangle className="text-red-600 dark:text-red-400" size={32} />
    if (prediction.swarmRisk === 'high') return <AlertCircle className="text-orange-600 dark:text-orange-400" size={32} />
    if (prediction.swarmRisk === 'medium') return <Clock className="text-amber-600 dark:text-amber-400" size={32} />
    return <CheckCircle2 className="text-green-600 dark:text-green-400" size={32} />
  }

  return (
    <div className="space-y-6">
      {/* Queen Cells Toggle */}
      <div className="flex items-center gap-3 p-4 bg-surface-secondary rounded-lg">
        <input
          type="checkbox"
          id="queenCells"
          checked={queenCellsPresent}
          onChange={(e) => setQueenCellsPresent(e.target.checked)}
          className="w-5 h-5 rounded border-border text-forest-600 focus:ring-2 focus:ring-forest-500"
        />
        <label htmlFor="queenCells" className="text-foreground font-medium cursor-pointer">
          Queen cells detected during inspection
        </label>
      </div>

      {queenCellsPresent && (
        <>
          {/* Cell Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Cell Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['swarm', 'supercedure', 'emergency'] as const).map((type) => (
                <Button
                  key={type}
                  onClick={() => setCellType(type)}
                  size="sm"
                  tone={cellType === type ? 'blue' : 'neutral'}
                  className={cellType === type ? '' : 'bg-surface-secondary hover:bg-surface-elevated'}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Cell Age */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Cell Development Stage</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'eggs' as CellAge, label: 'Eggs' },
                { value: 'young_larvae' as CellAge, label: 'Young Larvae' },
                { value: 'old_larvae' as CellAge, label: 'Old Larvae' },
                { value: 'sealed' as CellAge, label: 'Sealed' },
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  onClick={() => setCellAge(value)}
                  size="sm"
                  tone={cellAge === value ? 'blue' : 'neutral'}
                  className={cellAge === value ? '' : 'bg-surface-secondary hover:bg-surface-elevated'}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Inspection Date & Hive Strength */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Inspection Date</label>
          <input
            type="date"
            value={inspectionDate}
            onChange={(e) => setInspectionDate(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Hive Strength (1-5)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                onClick={() => setHiveStrength(rating)}
                size="sm"
                tone={hiveStrength === rating ? 'blue' : 'neutral'}
                className={`flex-1 text-sm ${
                  hiveStrength === rating ? '' : 'bg-surface-secondary hover:bg-surface-elevated'
                }`}
              >
                {rating}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Prediction Results */}
      <div className={`p-6 rounded-lg border-2 ${getRiskColor()}`}>
        <div className="flex items-start gap-4 mb-4">
          {getRiskIcon()}
          <div className="flex-1">
            <h4 className="text-xl font-bold text-foreground capitalize mb-1">{prediction.swarmRisk} Risk</h4>
            <p className="text-foreground font-medium">{prediction.urgency}</p>
          </div>
        </div>

        {queenCellsPresent && (
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-surface/70 p-4 rounded-lg">
              <div className="text-sm text-text-secondary mb-1">Predicted Swarm Date</div>
              <div className="text-lg font-bold text-foreground">
                {prediction.predictedDate.toLocaleDateString('en-IE', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>

            <div className="bg-surface/70 p-4 rounded-lg">
              <div className="text-sm text-text-secondary mb-1">Days Remaining</div>
              <div className="text-lg font-bold text-foreground">
                {prediction.daysRemaining} day{prediction.daysRemaining !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Items */}
      <div className="bg-surface-elevated p-6 rounded-lg border border-border">
        <h4 className="font-semibold text-lg mb-4 text-foreground">Recommended Actions</h4>
        <ul className="space-y-2">
          {prediction.actions.map((action, i) => (
            <li key={i} className="flex items-start gap-2 text-foreground">
              <span className="mt-1">-</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
        <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Cell Types:</h5>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>- <strong>Swarm:</strong> On face of frame, multiple cells - colony preparing to swarm</li>
          <li>- <strong>Supercedure:</strong> 1-3 cells on face of frame - replacing old queen</li>
          <li>- <strong>Emergency:</strong> Multiple cells in brood area - colony is queenless</li>
        </ul>
      </div>
    </div>
  )
}
