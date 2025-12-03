'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Bug, Calendar, TrendingDown, TrendingUp, AlertTriangle, MapPin } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface VarroaTreatment {
  id: string
  hive_id: string
  hive_number: string
  apiary_name: string | null
  treatment_date: string
  treatment_type: string
  pre_treatment_count: number | null
  post_treatment_count: number | null
  effectiveness: number | null
  notes: string | null
}

export default function VarroaReport() {
  const [treatments, setTreatments] = useState<VarroaTreatment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterApiary, setFilterApiary] = useState<string>('all')
  const [apiaries, setApiaries] = useState<Array<{ id: string; name: string }>>([])

  const fetchVarroaData = useCallback(async () => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return

      // Fetch varroa treatments with hive and apiary info
      const { data, error } = await supabase
        .from('varroa_treatments')
        .select(`
          id,
          hive_id,
          treatment_date,
          treatment_type,
          pre_treatment_count,
          post_treatment_count,
          notes,
          hives (
            hive_number,
            apiaries (
              id,
              name
            )
          )
        `)
        .eq('user_id', userId)
        .order('treatment_date', { ascending: false })

      if (error) throw error

      const processedTreatments: VarroaTreatment[] = (data || []).map((treatment: Record<string, unknown>) => {
        const preCount = treatment.pre_treatment_count as number | null
        const postCount = treatment.post_treatment_count as number | null
        const effectiveness = preCount && postCount
          ? Math.round(((preCount - postCount) / preCount) * 100)
          : null

        const hives = treatment.hives as Record<string, unknown> | null | undefined
        const apiaries = hives?.apiaries as Record<string, unknown> | null | undefined

        return {
          id: treatment.id as string,
          hive_id: treatment.hive_id as string,
          hive_number: hives?.hive_number as string || 'Unknown',
          apiary_name: apiaries?.name as string || null,
          treatment_date: treatment.treatment_date as string,
          treatment_type: treatment.treatment_type as string,
          pre_treatment_count: preCount,
          post_treatment_count: postCount,
          effectiveness,
          notes: treatment.notes as string | null
        }
      })

      setTreatments(processedTreatments)

      // Get unique apiaries for filter
      const uniqueApiaries = Array.from(
        new Map(
          processedTreatments
            .filter(t => t.apiary_name)
            .map(t => [t.apiary_name, { id: t.apiary_name || '', name: t.apiary_name || '' }])
        ).values()
      )
      setApiaries(uniqueApiaries)

    } catch (error) {
      console.error('Error fetching varroa data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVarroaData()
  }, [fetchVarroaData])

  const filteredTreatments = treatments.filter(treatment => {
    if (filterApiary === 'all') return true
    return treatment.apiary_name === filterApiary
  })

  const stats = {
    totalTreatments: treatments.length,
    avgEffectiveness: treatments.filter(t => t.effectiveness !== null).length > 0
      ? Math.round(
          treatments.filter(t => t.effectiveness !== null)
            .reduce((sum, t) => sum + (t.effectiveness || 0), 0) /
          treatments.filter(t => t.effectiveness !== null).length
        )
      : 0,
    treatmentsLast30Days: treatments.filter(t => {
      const daysSince = Math.floor((Date.now() - new Date(t.treatment_date).getTime()) / (1000 * 60 * 60 * 24))
      return daysSince <= 30
    }).length,
    lowEffectiveness: treatments.filter(t => t.effectiveness !== null && t.effectiveness < 70).length
  }

  const getEffectivenessColor = (effectiveness: number | null) => {
    if (effectiveness === null) return 'gray'
    if (effectiveness >= 80) return 'green'
    if (effectiveness >= 60) return 'yellow'
    return 'red'
  }

  const getEffectivenessClasses = (color: string) => {
    const colorMap = {
      green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
      gray: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.gray
  }

  if (loading) return <LoadingSpinner text="Loading varroa treatment data..." />

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{stats.totalTreatments}</div>
          <div className="text-sm text-text-secondary">Total Treatments</div>
        </div>
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.treatmentsLast30Days}</div>
          <div className="text-sm text-text-secondary">Last 30 Days</div>
        </div>
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.avgEffectiveness}%</div>
          <div className="text-sm text-text-secondary">Avg Effectiveness</div>
        </div>
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.lowEffectiveness}</div>
          <div className="text-sm text-text-secondary">Low Effectiveness</div>
        </div>
      </div>

      {/* Filter */}
      {apiaries.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterApiary('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterApiary === 'all'
                ? 'bg-forest-600 dark:bg-forest-700 text-white'
                : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
            }`}
          >
            All Apiaries
          </button>
          {apiaries.map(apiary => (
            <button
              key={apiary.id}
              onClick={() => setFilterApiary(apiary.name)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterApiary === apiary.name
                  ? 'bg-forest-600 dark:bg-forest-700 text-white'
                  : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
              }`}
            >
              {apiary.name}
            </button>
          ))}
        </div>
      )}

      {/* Treatments List */}
      {filteredTreatments.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          <Bug size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">No varroa treatments recorded yet.</p>
          <p className="text-sm mt-2">Start tracking your varroa treatments to see effectiveness data here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTreatments.map(treatment => {
            const effectivenessColor = getEffectivenessColor(treatment.effectiveness)
            return (
              <div
                key={treatment.id}
                className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-foreground">
                        {treatment.hive_number}
                      </h3>
                      {treatment.effectiveness !== null && (
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 ${getEffectivenessClasses(effectivenessColor)}`}>
                          {treatment.effectiveness >= 80 ? (
                            <TrendingDown size={14} />
                          ) : treatment.effectiveness < 60 ? (
                            <AlertTriangle size={14} />
                          ) : (
                            <TrendingUp size={14} />
                          )}
                          {treatment.effectiveness}% effective
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      {treatment.apiary_name && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <MapPin size={14} />
                          {treatment.apiary_name}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-text-secondary">
                        <Calendar size={14} />
                        {new Date(treatment.treatment_date).toLocaleDateString('en-IE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                        <div>
                          <span className="text-text-secondary">Treatment: </span>
                          <span className="font-medium text-foreground">{treatment.treatment_type}</span>
                        </div>
                        {treatment.pre_treatment_count !== null && (
                          <div>
                            <span className="text-text-secondary">Pre-count: </span>
                            <span className="font-medium text-foreground">{treatment.pre_treatment_count}</span>
                          </div>
                        )}
                        {treatment.post_treatment_count !== null && (
                          <div>
                            <span className="text-text-secondary">Post-count: </span>
                            <span className="font-medium text-foreground">{treatment.post_treatment_count}</span>
                          </div>
                        )}
                      </div>

                      {treatment.notes && (
                        <div className="mt-2 p-2 bg-sage-50 dark:bg-slate-900/50 rounded text-text-secondary">
                          {treatment.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
