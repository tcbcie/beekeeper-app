'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { analyzeHivePerformance, InspectionData } from '@/lib/tool-calculations'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Hive {
  id: string
  hive_number: string
}

export function HiveStrengthAnalyzer() {
  const [hives, setHives] = useState<Hive[]>([])
  const [selectedHive, setSelectedHive] = useState<string>('')
  const [dateRange, setDateRange] = useState(90)
  const [inspectionData, setInspectionData] = useState<InspectionData[]>([])
  const [loading, setLoading] = useState(false)
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

  // Load user hives
  useEffect(() => {
    const loadUserHives = async () => {
      if (!userId) return

      const { data, error } = await supabase
        .from('hives')
        .select('id, hive_number')
        .eq('user_id', userId)
        .is('archived_at', null)
        .order('hive_number')

      if (!error && data) {
        setHives(data)
      }
    }

    loadUserHives()
  }, [userId])

  // Load inspection history when hive or date range changes
  useEffect(() => {
    const loadInspectionHistory = async () => {
      if (!selectedHive) {
        setInspectionData([])
        return
      }

      setLoading(true)

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - dateRange)

      const { data, error } = await supabase
        .from('inspections')
        .select('inspection_date, population_strength, brood_pattern_rating, temperament_rating')
        .eq('hive_id', selectedHive)
        .gte('inspection_date', cutoffDate.toISOString())
        .order('inspection_date', { ascending: true })

      if (!error && data) {
        setInspectionData(data)
      }

      setLoading(false)
    }

    loadInspectionHistory()
  }, [selectedHive, dateRange])

  const analysis = analyzeHivePerformance(inspectionData)

  const getTrendIcon = () => {
    if (analysis.trend === 'improving') return <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
    if (analysis.trend === 'declining') return <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
    return <Minus className="text-gray-600 dark:text-gray-400" size={20} />
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-blue-600 dark:text-blue-400'
    if (score >= 40) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Hive Selector */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Select Hive
          </label>
          <select
            value={selectedHive}
            onChange={(e) => setSelectedHive(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-sage-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
          >
            <option value="">Choose a hive...</option>
            {hives.map(hive => (
              <option key={hive.id} value={hive.id}>
                Hive {hive.hive_number}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Date Range
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[30, 60, 90, 180].map(days => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === days
                    ? 'bg-forest-600 dark:bg-forest-700 text-white'
                    : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-8 text-text-secondary">
          Loading inspection data...
        </div>
      ) : selectedHive && inspectionData.length > 0 ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-sage-300 dark:border-slate-700">
              <div className="text-sm text-text-secondary mb-1">Avg Population</div>
              <div className="text-2xl font-bold text-foreground">
                {analysis.avgPopulation.toFixed(1)}<span className="text-lg text-text-secondary">/5</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-sage-300 dark:border-slate-700">
              <div className="text-sm text-text-secondary mb-1">Avg Brood</div>
              <div className="text-2xl font-bold text-foreground">
                {analysis.avgBrood.toFixed(1)}<span className="text-lg text-text-secondary">/5</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-sage-300 dark:border-slate-700">
              <div className="text-sm text-text-secondary mb-1">Trend</div>
              <div className="flex items-center gap-2 mt-1">
                {getTrendIcon()}
                <span className="text-lg font-semibold text-foreground capitalize">
                  {analysis.trend}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-sage-300 dark:border-slate-700">
              <div className="text-sm text-text-secondary mb-1">Overall Score</div>
              <div className={`text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                {analysis.overallScore}<span className="text-lg">/100</span>
              </div>
            </div>
          </div>

          {/* Inspection Count */}
          <div className="bg-sage-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <div className="text-sm text-text-secondary">
              Analysis based on <strong>{inspectionData.length} inspections</strong> over the last {dateRange} days
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-sage-300 dark:border-slate-700">
            <h4 className="font-semibold text-lg mb-4 text-foreground">Analysis & Recommendations</h4>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-foreground">
                  <span className="mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : selectedHive && inspectionData.length === 0 ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-lg text-center">
          <p className="text-amber-800 dark:text-amber-200 font-medium mb-2">
            No inspection data found for the selected period
          </p>
          <p className="text-amber-700 dark:text-amber-300 text-sm">
            Conduct regular inspections to track hive strength and performance over time
          </p>
        </div>
      ) : (
        <div className="bg-sage-50 dark:bg-slate-800/50 p-8 rounded-lg text-center">
          <p className="text-text-secondary">
            Select a hive above to view strength analysis and recommendations
          </p>
        </div>
      )}
    </div>
  )
}
