'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateQueenMetrics, getQueenRating } from '@/lib/tool-calculations'
import { Crown, TrendingUp, Award } from 'lucide-react'

interface Queen {
  id: string
  name: string | null
  hive_id: string | null
  installation_date: string | null
  hive?: {
    hive_number: string
  } | null
}

interface QueenAnalysis {
  queenId: string
  queenName: string
  hiveNumber: string | null
  ageMonths: number
  avgBroodRating: number
  totalHoney: number
  inspectionCount: number
  metrics: ReturnType<typeof calculateQueenMetrics>
  rating: ReturnType<typeof getQueenRating>
}

export function QueenProductivityTracker() {
  const [queens, setQueens] = useState<Queen[]>([])
  const [selectedQueen, setSelectedQueen] = useState<string>('')
  const [analysis, setAnalysis] = useState<QueenAnalysis | null>(null)
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

  // Load user queens
  useEffect(() => {
    const loadUserQueens = async () => {
      if (!userId) return

      const { data, error } = await supabase
        .from('queens')
        .select(`
          id,
          name,
          hive_id,
          installation_date,
          hive:hives!queens_hive_id_fkey(hive_number)
        `)
        .eq('user_id', userId)
        .not('installation_date', 'is', null)
        .order('installation_date', { ascending: false })

      if (!error && data) {
        // Transform data to handle Supabase nested query result
        const transformedQueens = data.map(q => ({
          ...q,
          hive: Array.isArray(q.hive) && q.hive.length > 0 ? q.hive[0] : null
        }))
        setQueens(transformedQueens as Queen[])
      }
    }

    loadUserQueens()
  }, [userId])

  // Analyze queen when selection changes
  useEffect(() => {
    const analyzeQueen = async () => {
      if (!selectedQueen) {
        setAnalysis(null)
        return
      }

      setLoading(true)

      // Get queen details
      const queen = queens.find(q => q.id === selectedQueen)
      if (!queen || !queen.installation_date) {
        setLoading(false)
        return
      }

      // Calculate age in months
      const installDate = new Date(queen.installation_date)
      const today = new Date()
      const ageMonths = Math.max(1, Math.round(
        (today.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      ))

      // Get inspection data for this queen's hive (if she has one)
      let avgBroodRating = 0
      let inspectionCount = 0

      if (queen.hive_id) {
        const { data: inspections } = await supabase
          .from('inspections')
          .select('brood_pattern_rating')
          .eq('hive_id', queen.hive_id)
          .gte('inspection_date', queen.installation_date)
          .not('brood_pattern_rating', 'is', null)

        if (inspections && inspections.length > 0) {
          inspectionCount = inspections.length
          const sum = inspections.reduce((acc, i) => acc + (i.brood_pattern_rating || 0), 0)
          avgBroodRating = sum / inspections.length
        }
      }

      // Get harvest data for this queen's hive
      let totalHoney = 0

      if (queen.hive_id) {
        const { data: harvests } = await supabase
          .from('harvest_records')
          .select('honey_weight_kg')
          .eq('hive_id', queen.hive_id)
          .gte('harvest_date', queen.installation_date)

        if (harvests && harvests.length > 0) {
          totalHoney = harvests.reduce((sum, h) => sum + (h.honey_weight_kg || 0), 0)
        }
      }

      // Calculate metrics
      const metrics = calculateQueenMetrics(
        ageMonths,
        avgBroodRating,
        totalHoney,
        inspectionCount
      )

      const rating = getQueenRating(metrics.overallRating)

      setAnalysis({
        queenId: queen.id,
        queenName: queen.name || 'Unnamed Queen',
        hiveNumber: queen.hive?.hive_number || null,
        ageMonths,
        avgBroodRating,
        totalHoney,
        inspectionCount,
        metrics,
        rating
      })

      setLoading(false)
    }

    analyzeQueen()
  }, [selectedQueen, queens])

  return (
    <div className="space-y-6">
      {/* Queen Selector */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Select Queen
        </label>
        <select
          value={selectedQueen}
          onChange={(e) => setSelectedQueen(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-sage-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
        >
          <option value="">Choose a queen...</option>
          {queens.map(queen => (
            <option key={queen.id} value={queen.id}>
              {queen.name || 'Unnamed Queen'}
              {queen.hive?.hive_number && ` - Hive ${queen.hive.hive_number}`}
              {queen.installation_date && ` (Installed ${new Date(queen.installation_date).toLocaleDateString()})`}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-8 text-text-secondary">
          Analyzing queen performance...
        </div>
      ) : analysis ? (
        <>
          {/* Queen Info Header */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-6 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="text-amber-600 dark:text-amber-400" size={24} />
                  <h3 className="text-xl font-bold text-foreground">{analysis.queenName}</h3>
                </div>
                {analysis.hiveNumber && (
                  <p className="text-text-secondary">Currently in Hive {analysis.hiveNumber}</p>
                )}
                <p className="text-sm text-text-secondary mt-1">
                  Age: {analysis.ageMonths} month{analysis.ageMonths !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${analysis.rating.color}`}>
                  {analysis.metrics.overallRating}
                </div>
                <div className="text-sm font-medium text-text-secondary">Overall Score</div>
              </div>
            </div>
          </div>

          {/* Rating Badge */}
          <div className={`flex items-center gap-3 p-4 rounded-lg border-2 ${
            analysis.rating.label === 'Excellent' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
            analysis.rating.label === 'Good' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
            analysis.rating.label === 'Average' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' :
            'border-red-500 bg-red-50 dark:bg-red-900/20'
          }`}>
            <Award className={analysis.rating.color} size={24} />
            <div>
              <div className={`font-bold text-lg ${analysis.rating.color}`}>
                {analysis.rating.label} Performance
              </div>
              <div className="text-sm text-foreground">{analysis.rating.recommendation}</div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-sage-300 dark:border-slate-700">
              <div className="text-sm text-text-secondary mb-1">Brood Score</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-foreground">
                  {analysis.metrics.broodScore}
                </div>
                <div className="text-sm text-text-secondary">/100</div>
              </div>
              <div className="text-xs text-text-secondary mt-1">
                Avg rating: {analysis.avgBroodRating.toFixed(1)}/5 ({analysis.inspectionCount} inspections)
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-sage-300 dark:border-slate-700">
              <div className="text-sm text-text-secondary mb-1">Production Score</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-foreground">
                  {analysis.metrics.productionScore}
                </div>
                <div className="text-sm text-text-secondary">/100</div>
              </div>
              <div className="text-xs text-text-secondary mt-1">
                Total honey: {analysis.totalHoney.toFixed(1)} kg
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-sage-300 dark:border-slate-700">
              <div className="text-sm text-text-secondary mb-1">Consistency Score</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-foreground">
                  {analysis.metrics.consistencyScore}
                </div>
                <div className="text-sm text-text-secondary">/100</div>
              </div>
              <div className="text-xs text-text-secondary mt-1">
                {(analysis.inspectionCount / analysis.ageMonths).toFixed(1)} inspections/month
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-sage-300 dark:border-slate-700">
            <h4 className="font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
              <TrendingUp size={20} />
              Performance Insights
            </h4>
            <ul className="space-y-2 text-sm">
              {analysis.metrics.broodScore >= 80 && (
                <li className="flex items-start gap-2 text-green-700 dark:text-green-300">
                  <span>✓</span>
                  <span>Excellent brood pattern - queen is laying consistently</span>
                </li>
              )}
              {analysis.metrics.broodScore < 50 && (
                <li className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                  <span>⚠</span>
                  <span>Brood pattern could be improved - monitor for queen issues</span>
                </li>
              )}
              {analysis.metrics.productionScore >= 70 && (
                <li className="flex items-start gap-2 text-green-700 dark:text-green-300">
                  <span>✓</span>
                  <span>Good honey production - hive is productive</span>
                </li>
              )}
              {analysis.metrics.productionScore < 50 && analysis.ageMonths >= 6 && (
                <li className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                  <span>⚠</span>
                  <span>Lower honey production - consider hive location or genetics</span>
                </li>
              )}
              {analysis.inspectionCount < analysis.ageMonths && (
                <li className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                  <span>ℹ</span>
                  <span>More frequent inspections will improve data accuracy</span>
                </li>
              )}
              {analysis.metrics.overallRating >= 85 && (
                <li className="flex items-start gap-2 text-green-700 dark:text-green-300">
                  <span>★</span>
                  <span>Top performer - excellent candidate for queen rearing program</span>
                </li>
              )}
            </ul>
          </div>
        </>
      ) : (
        <div className="bg-sage-50 dark:bg-slate-800/50 p-8 rounded-lg text-center">
          <Crown className="mx-auto mb-3 text-text-secondary" size={48} />
          <p className="text-text-secondary">
            Select a queen above to view performance metrics and productivity analysis
          </p>
        </div>
      )}
    </div>
  )
}
