'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { AlertTriangle, CheckCircle, Clock, Archive, Crown, MapPin } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface HiveHealth {
  id: string
  hive_number: string
  apiary_name: string | null
  status: string
  queen_seen: boolean | null
  population_strength: number | null
  brood_pattern_rating: number | null
  temperament_rating: number | null
  last_inspection_date: string | null
  days_since_inspection: number | null
  has_diseases: boolean
  archived_at: string | null
}

export default function HiveHealthDashboard() {
  const [hives, setHives] = useState<HiveHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'needs-attention'>('active')

  const fetchHiveHealth = useCallback(async () => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return

      // Fetch hives with their latest inspection data
      const { data, error } = await supabase
        .from('hives')
        .select(`
          id,
          hive_number,
          status,
          archived_at,
          apiaries (
            name
          ),
          inspections (
            inspection_date,
            queen_seen,
            population_strength,
            brood_pattern_rating,
            temperament_rating,
            afb_disease,
            efb_disease,
            chalkbrood_disease,
            nosemosis_disease,
            dwv_disease,
            iapv_cbpv_disease
          )
        `)
        .eq('user_id', userId)
        .order('hive_number')

      if (error) throw error

      // Process the data to get latest inspection info
      const processedHives: HiveHealth[] = (data || []).map((hive: Record<string, unknown>) => {
        const inspections = (hive.inspections || []) as Array<Record<string, unknown>>
        const sortedInspections = inspections.sort(
          (a, b) => new Date(b.inspection_date as string).getTime() - new Date(a.inspection_date as string).getTime()
        )
        const latestInspection = sortedInspections[0]

        const daysSinceInspection = latestInspection
          ? Math.floor((Date.now() - new Date(latestInspection.inspection_date as string).getTime()) / (1000 * 60 * 60 * 24))
          : null

        const hasDiseases = latestInspection
          ? ((latestInspection.afb_disease as number) > 0 ||
             (latestInspection.efb_disease as number) > 0 ||
             (latestInspection.chalkbrood_disease as number) > 0 ||
             (latestInspection.nosemosis_disease as number) > 0 ||
             (latestInspection.dwv_disease as number) > 0 ||
             (latestInspection.iapv_cbpv_disease as number) > 0)
          : false

        const apiaries = hive.apiaries as Record<string, unknown> | null | undefined

        return {
          id: hive.id as string,
          hive_number: hive.hive_number as string,
          apiary_name: apiaries?.name as string || null,
          status: hive.status as string,
          archived_at: hive.archived_at as string | null,
          queen_seen: latestInspection?.queen_seen as boolean ?? null,
          population_strength: latestInspection?.population_strength as number ?? null,
          brood_pattern_rating: latestInspection?.brood_pattern_rating as number ?? null,
          temperament_rating: latestInspection?.temperament_rating as number ?? null,
          last_inspection_date: latestInspection?.inspection_date as string ?? null,
          days_since_inspection: daysSinceInspection,
          has_diseases: hasDiseases
        }
      })

      setHives(processedHives)
    } catch (error) {
      console.error('Error fetching hive health:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHiveHealth()
  }, [fetchHiveHealth])

  const filteredHives = hives.filter(hive => {
    if (filter === 'active') return !hive.archived_at
    if (filter === 'needs-attention') {
      return !hive.archived_at && (
        hive.has_diseases ||
        hive.queen_seen === false ||
        (hive.days_since_inspection !== null && hive.days_since_inspection > 14) ||
        (hive.population_strength !== null && hive.population_strength < 3)
      )
    }
    return true
  })

  const getHealthStatus = (hive: HiveHealth) => {
    if (hive.archived_at) return { label: 'Archived', color: 'gray', icon: Archive }
    if (hive.has_diseases) return { label: 'Diseased', color: 'red', icon: AlertTriangle }
    if (hive.queen_seen === false) return { label: 'No Queen', color: 'orange', icon: AlertTriangle }
    if (hive.days_since_inspection !== null && hive.days_since_inspection > 14) {
      return { label: 'Needs Inspection', color: 'yellow', icon: Clock }
    }
    if (hive.population_strength !== null && hive.population_strength < 3) {
      return { label: 'Weak', color: 'orange', icon: AlertTriangle }
    }
    return { label: 'Healthy', color: 'green', icon: CheckCircle }
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
      gray: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.gray
  }

  if (loading) return <LoadingSpinner text="Loading hive health data..." />

  const stats = {
    total: hives.length,
    active: hives.filter(h => !h.archived_at).length,
    needsAttention: hives.filter(h => !h.archived_at && (
      h.has_diseases ||
      h.queen_seen === false ||
      (h.days_since_inspection !== null && h.days_since_inspection > 14) ||
      (h.population_strength !== null && h.population_strength < 3)
    )).length,
    healthy: hives.filter(h => {
      const status = getHealthStatus(h)
      return !h.archived_at && status.label === 'Healthy'
    }).length
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-sm text-text-secondary">Total Hives</div>
        </div>
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.healthy}</div>
          <div className="text-sm text-text-secondary">Healthy</div>
        </div>
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.needsAttention}</div>
          <div className="text-sm text-text-secondary">Needs Attention</div>
        </div>
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.total - stats.active}</div>
          <div className="text-sm text-text-secondary">Archived</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-forest-600 dark:bg-forest-700 text-white'
              : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
          }`}
        >
          All Hives
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'active'
              ? 'bg-forest-600 dark:bg-forest-700 text-white'
              : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
          }`}
        >
          Active Only
        </button>
        <button
          onClick={() => setFilter('needs-attention')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'needs-attention'
              ? 'bg-forest-600 dark:bg-forest-700 text-white'
              : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
          }`}
        >
          Needs Attention
        </button>
      </div>

      {/* Hive List */}
      {filteredHives.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          <p>No hives found matching the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHives.map(hive => {
            const status = getHealthStatus(hive)
            const StatusIcon = status.icon
            return (
              <div
                key={hive.id}
                className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {hive.hive_number}
                      </h3>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 ${getColorClasses(status.color)}`}>
                        <StatusIcon size={14} />
                        {status.label}
                      </span>
                    </div>

                    {hive.apiary_name && (
                      <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                        <MapPin size={14} />
                        {hive.apiary_name}
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {hive.queen_seen !== null && (
                        <div className="flex items-center gap-2">
                          <Crown size={14} className={hive.queen_seen ? 'text-green-600' : 'text-red-600'} />
                          <span className="text-text-secondary">
                            Queen: {hive.queen_seen ? 'Seen' : 'Not seen'}
                          </span>
                        </div>
                      )}

                      {hive.population_strength !== null && (
                        <div>
                          <span className="text-text-secondary">Strength: </span>
                          <span className="font-medium text-foreground">{hive.population_strength}/5</span>
                        </div>
                      )}

                      {hive.brood_pattern_rating !== null && (
                        <div>
                          <span className="text-text-secondary">Brood: </span>
                          <span className="font-medium text-foreground">{hive.brood_pattern_rating}/5</span>
                        </div>
                      )}

                      {hive.last_inspection_date && (
                        <div>
                          <span className="text-text-secondary">Last: </span>
                          <span className="font-medium text-foreground">
                            {hive.days_since_inspection} days ago
                          </span>
                        </div>
                      )}
                    </div>

                    {!hive.last_inspection_date && (
                      <p className="text-sm text-text-secondary italic mt-2">
                        No inspections recorded
                      </p>
                    )}
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
