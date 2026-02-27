'use client'

import { useState } from 'react'
import { analyzeApiaryLocation } from '@/lib/tool-calculations'
import { MapPin, Award } from 'lucide-react'
import Button from '@/components/ui/Button'

export function ApiaryLocationAnalyzer() {
  const [forage, setForage] = useState(3)
  const [waterDistance, setWaterDistance] = useState(300)
  const [shelter, setShelter] = useState(3)
  const [access, setAccess] = useState(3)

  const score = analyzeApiaryLocation(forage, waterDistance, shelter, access)

  const getRatingColor = () => {
    if (score.rating === 'excellent') return 'text-green-600 dark:text-green-400'
    if (score.rating === 'good') return 'text-blue-600 dark:text-blue-400'
    if (score.rating === 'fair') return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getRatingBg = () => {
    if (score.rating === 'excellent') return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    if (score.rating === 'good') return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    if (score.rating === 'fair') return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Forage Quality (1-5)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(rating => (
              <Button
                key={rating}
                onClick={() => setForage(rating)}
                size="sm"
                tone={forage === rating ? 'blue' : 'neutral'}
                className={`flex-1 ${forage === rating ? '' : 'bg-surface-secondary'}`}
              >
                {rating}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Water Distance (meters)</label>
          <input type="number" min="0" step="50" value={waterDistance}
            onChange={(e) => setWaterDistance(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Shelter Quality (1-5)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(rating => (
              <Button
                key={rating}
                onClick={() => setShelter(rating)}
                size="sm"
                tone={shelter === rating ? 'blue' : 'neutral'}
                className={`flex-1 ${shelter === rating ? '' : 'bg-surface-secondary'}`}
              >
                {rating}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Access Quality (1-5)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(rating => (
              <Button
                key={rating}
                onClick={() => setAccess(rating)}
                size="sm"
                tone={access === rating ? 'blue' : 'neutral'}
                className={`flex-1 ${access === rating ? '' : 'bg-surface-secondary'}`}
              >
                {rating}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className={`p-6 rounded-lg border ${getRatingBg()}`}>
        <div className="flex items-center gap-3 mb-4">
          <Award className={getRatingColor()} size={32} />
          <div>
            <h4 className="text-2xl font-bold text-foreground capitalize">{score.rating} Location</h4>
            <p className="text-text-secondary">Overall Score: {score.totalScore}/100</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-surface/70 p-3 rounded-lg">
            <div className="text-xs text-text-secondary">Forage</div>
            <div className="text-lg font-bold text-foreground">{score.forageScore}</div>
          </div>
          <div className="bg-surface/70 p-3 rounded-lg">
            <div className="text-xs text-text-secondary">Water</div>
            <div className="text-lg font-bold text-foreground">{score.waterScore}</div>
          </div>
          <div className="bg-surface/70 p-3 rounded-lg">
            <div className="text-xs text-text-secondary">Shelter</div>
            <div className="text-lg font-bold text-foreground">{score.shelterScore}</div>
          </div>
          <div className="bg-surface/70 p-3 rounded-lg">
            <div className="text-xs text-text-secondary">Access</div>
            <div className="text-lg font-bold text-foreground">{score.accessScore}</div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-surface/70 rounded-lg">
          <div className="text-sm text-text-secondary mb-1">Recommended Hive Capacity</div>
          <div className="text-2xl font-bold text-foreground">{score.recommendedCapacity} hives</div>
        </div>
      </div>

      <div className="bg-surface-elevated p-6 rounded-lg border border-border">
        <h4 className="font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
          <MapPin size={20} />
          Improvement Recommendations
        </h4>
        <ul className="space-y-2">
          {score.improvements.map((improvement, i) => (
            <li key={i} className="flex items-start gap-2 text-foreground"><span>•</span><span>{improvement}</span></li>
          ))}
        </ul>
      </div>
    </div>
  )
}
