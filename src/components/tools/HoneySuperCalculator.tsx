'use client'

import { useState } from 'react'
import { calculateHoneySuperNeeds, type FlowIntensity } from '@/lib/tool-calculations'
import { Layers, TrendingUp, CheckCircle, XCircle } from 'lucide-react'

export function HoneySuperCalculator() {
  const [currentSuperCount, setCurrentSuperCount] = useState(1)
  const [framesFilled, setFramesFilled] = useState(6)
  const [hiveStrength, setHiveStrength] = useState(3)
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity>('moderate')

  const recommendation = calculateHoneySuperNeeds(
    currentSuperCount,
    framesFilled,
    hiveStrength,
    flowIntensity
  )

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Current Supers on Hive
          </label>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentSuperCount(Math.max(0, currentSuperCount - 1))}
              className="px-4 py-2 rounded-lg bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700 font-bold">−</button>
            <input type="number" min="0" value={currentSuperCount}
              onChange={(e) => setCurrentSuperCount(Math.max(0, parseInt(e.target.value) || 0))}
              className="flex-1 px-4 py-2 rounded-lg border border-sage-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground text-center focus:outline-none focus:ring-2 focus:ring-forest-500" />
            <button onClick={() => setCurrentSuperCount(currentSuperCount + 1)}
              className="px-4 py-2 rounded-lg bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700 font-bold">+</button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Frames Filled (out of 10)
          </label>
          <div className="flex items-center gap-2">
            <button onClick={() => setFramesFilled(Math.max(0, framesFilled - 1))}
              className="px-4 py-2 rounded-lg bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700 font-bold">−</button>
            <input type="number" min="0" max="10" value={framesFilled}
              onChange={(e) => setFramesFilled(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
              className="flex-1 px-4 py-2 rounded-lg border border-sage-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground text-center focus:outline-none focus:ring-2 focus:ring-forest-500" />
            <button onClick={() => setFramesFilled(Math.min(10, framesFilled + 1))}
              className="px-4 py-2 rounded-lg bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700 font-bold">+</button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Hive Strength</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(rating => (
            <button key={rating} onClick={() => setHiveStrength(rating)}
              className={`flex-1 py-2 rounded-lg font-medium ${hiveStrength === rating ? 'bg-forest-600 dark:bg-forest-700 text-white' : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'}`}>{rating}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Nectar Flow Intensity</label>
        <div className="grid grid-cols-3 gap-2">
          {(['weak', 'moderate', 'strong'] as const).map(flow => (
            <button key={flow} onClick={() => setFlowIntensity(flow)}
              className={`px-3 py-2 rounded-lg capitalize font-medium ${flowIntensity === flow ? 'bg-forest-600 dark:bg-forest-700 text-white' : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'}`}>{flow}</button>
          ))}
        </div>
      </div>

      <div className={`p-6 rounded-lg border-2 ${recommendation.addSuper ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : recommendation.removeSuper ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-border bg-sage-50 dark:bg-slate-900/20'}`}>
        <div className="flex items-start gap-3 mb-4">
          {recommendation.addSuper ? <CheckCircle className="text-green-600 dark:text-green-400" size={28} /> :
           recommendation.removeSuper ? <Layers className="text-blue-600 dark:text-blue-400" size={28} /> :
           <XCircle className="text-text-tertiary" size={28} />}
          <div className="flex-1">
            <h4 className="font-bold text-lg text-foreground mb-2">
              {recommendation.addSuper ? 'Add Super Now' : recommendation.removeSuper ? 'Ready to Harvest' : 'No Action Needed'}
            </h4>
            <p className="text-foreground">{recommendation.reasoning}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg">
            <div className="text-sm text-text-secondary mb-1">Harvest Readiness</div>
            <div className="text-2xl font-bold text-foreground">{recommendation.harvestReadiness.toFixed(0)}%</div>
            <div className="w-full bg-sage-200 dark:bg-slate-700 rounded-full h-2 mt-2">
              <div className="bg-forest-600 h-2 rounded-full" style={{ width: `${Math.min(100, recommendation.harvestReadiness)}%` }}></div>
            </div>
          </div>

          {recommendation.daysToFull !== null && (
            <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg">
              <div className="text-sm text-text-secondary mb-1">Estimated Days to Full</div>
              <div className="text-2xl font-bold text-foreground">{recommendation.daysToFull} days</div>
            </div>
          )}
        </div>

        {recommendation.queenExcluder && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <TrendingUp size={16} className="inline mr-1" />
              Use queen excluder to prevent queen from laying in supers
            </p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
        <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Tips:</h5>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>• Add supers before congestion occurs (70-80% full)</li>
          <li>• Remove for harvest when 90%+ frames are capped</li>
          <li>• Strong flow + strong hive = add supers proactively</li>
          <li>• Use queen excluder to keep brood out of honey supers</li>
        </ul>
      </div>
    </div>
  )
}
