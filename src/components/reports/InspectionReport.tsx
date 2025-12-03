'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { ClipboardList, Calendar, Crown, AlertTriangle, TrendingUp, MapPin } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface InspectionSummary {
  id: string
  hive_id: string
  hive_number: string
  apiary_name: string | null
  inspection_date: string
  queen_seen: boolean
  population_strength: number
  brood_pattern_rating: number
  temperament_rating: number
  has_diseases: boolean
  has_queen_cells: boolean
  notes: string | null
}

export default function InspectionReport() {
  const [inspections, setInspections] = useState<InspectionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDays, setFilterDays] = useState<number>(30)
  const [filterApiary, setFilterApiary] = useState<string>('all')

  const fetchInspectionData = useCallback(async () => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return

      // Calculate cutoff date
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - filterDays)

      // Fetch recent inspections with hive and apiary info
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          id,
          hive_id,
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
          iapv_cbpv_disease,
          queen_cups,
          swarm_cells,
          supercedure_cells,
          emergency_cells,
          notes,
          hives (
            hive_number,
            apiaries (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .gte('inspection_date', cutoffDate.toISOString().split('T')[0])
        .order('inspection_date', { ascending: false })

      if (error) throw error

      const processedInspections: InspectionSummary[] = (data || []).map((inspection: Record<string, unknown>) => {
        const hasDiseases =
          (inspection.afb_disease as number) > 0 ||
          (inspection.efb_disease as number) > 0 ||
          (inspection.chalkbrood_disease as number) > 0 ||
          (inspection.nosemosis_disease as number) > 0 ||
          (inspection.dwv_disease as number) > 0 ||
          (inspection.iapv_cbpv_disease as number) > 0

        const hasQueenCells =
          inspection.queen_cups ||
          inspection.swarm_cells ||
          inspection.supercedure_cells ||
          inspection.emergency_cells

        const hives = inspection.hives as Record<string, unknown> | null | undefined
        const apiaries = hives?.apiaries as Record<string, unknown> | null | undefined

        return {
          id: inspection.id as string,
          hive_id: inspection.hive_id as string,
          hive_number: hives?.hive_number as string || 'Unknown',
          apiary_name: apiaries?.name as string || null,
          inspection_date: inspection.inspection_date as string,
          queen_seen: inspection.queen_seen as boolean,
          population_strength: inspection.population_strength as number,
          brood_pattern_rating: inspection.brood_pattern_rating as number,
          temperament_rating: inspection.temperament_rating as number,
          has_diseases: hasDiseases,
          has_queen_cells: !!hasQueenCells,
          notes: inspection.notes as string | null
        }
      })

      setInspections(processedInspections)
    } catch (error) {
      console.error('Error fetching inspection data:', error)
    } finally {
      setLoading(false)
    }
  }, [filterDays])

  useEffect(() => {
    fetchInspectionData()
  }, [fetchInspectionData])

  const filteredInspections = inspections.filter(inspection => {
    if (filterApiary === 'all') return true
    return inspection.apiary_name === filterApiary
  })

  // Get unique apiaries for filter
  const availableApiaries = Array.from(
    new Set(inspections.map(i => i.apiary_name).filter(Boolean))
  )

  // Calculate stats
  const stats = {
    totalInspections: filteredInspections.length,
    queenSeen: filteredInspections.filter(i => i.queen_seen).length,
    diseaseDetected: filteredInspections.filter(i => i.has_diseases).length,
    queenCellsFound: filteredInspections.filter(i => i.has_queen_cells).length,
    avgPopulation: filteredInspections.length > 0
      ? (filteredInspections.reduce((sum, i) => sum + i.population_strength, 0) / filteredInspections.length).toFixed(1)
      : '0',
    avgBrood: filteredInspections.length > 0
      ? (filteredInspections.reduce((sum, i) => sum + i.brood_pattern_rating, 0) / filteredInspections.length).toFixed(1)
      : '0',
    avgTemperament: filteredInspections.length > 0
      ? (filteredInspections.reduce((sum, i) => sum + i.temperament_rating, 0) / filteredInspections.length).toFixed(1)
      : '0'
  }

  if (loading) return <LoadingSpinner text="Loading inspection data..." />

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{stats.totalInspections}</div>
          <div className="text-sm text-text-secondary">Total Inspections</div>
        </div>
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.queenSeen}</div>
          <div className="text-sm text-text-secondary">Queen Seen</div>
        </div>
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.queenCellsFound}</div>
          <div className="text-sm text-text-secondary">Queen Cells Found</div>
        </div>
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.diseaseDetected}</div>
          <div className="text-sm text-text-secondary">Disease Detected</div>
        </div>
      </div>

      {/* Average Ratings */}
      <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-3">Average Ratings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-text-secondary mb-1">Population Strength</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-foreground">{stats.avgPopulation}</div>
              <div className="text-sm text-text-secondary">/ 5</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-text-secondary mb-1">Brood Pattern</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-foreground">{stats.avgBrood}</div>
              <div className="text-sm text-text-secondary">/ 5</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-text-secondary mb-1">Temperament</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-foreground">{stats.avgTemperament}</div>
              <div className="text-sm text-text-secondary">/ 5</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm font-medium text-text-secondary">Time Period:</span>
          <button
            onClick={() => setFilterDays(7)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterDays === 7
                ? 'bg-forest-600 dark:bg-forest-700 text-white'
                : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setFilterDays(30)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterDays === 30
                ? 'bg-forest-600 dark:bg-forest-700 text-white'
                : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setFilterDays(90)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterDays === 90
                ? 'bg-forest-600 dark:bg-forest-700 text-white'
                : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
            }`}
          >
            Last 90 Days
          </button>
        </div>

        {availableApiaries.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm font-medium text-text-secondary">Apiary:</span>
            <button
              onClick={() => setFilterApiary('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterApiary === 'all'
                  ? 'bg-forest-600 dark:bg-forest-700 text-white'
                  : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
            {availableApiaries.map(apiary => (
              <button
                key={apiary}
                onClick={() => setFilterApiary(apiary as string)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterApiary === apiary
                    ? 'bg-forest-600 dark:bg-forest-700 text-white'
                    : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
                }`}
              >
                {apiary}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inspections List */}
      {filteredInspections.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">No inspections found in the last {filterDays} days.</p>
          <p className="text-sm mt-2">Conduct regular hive inspections to track health and progress.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInspections.map(inspection => (
            <div
              key={inspection.id}
              className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="text-lg font-semibold text-foreground">
                        {inspection.hive_number}
                      </h4>
                      {inspection.has_diseases && (
                        <span className="px-2 py-1 rounded-lg text-xs font-medium border bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 flex items-center gap-1">
                          <AlertTriangle size={14} />
                          Disease
                        </span>
                      )}
                      {inspection.has_queen_cells && (
                        <span className="px-2 py-1 rounded-lg text-xs font-medium border bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700">
                          Queen Cells
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm">
                      {inspection.apiary_name && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <MapPin size={14} />
                          {inspection.apiary_name}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-text-secondary">
                        <Calendar size={14} />
                        {new Date(inspection.inspection_date).toLocaleDateString('en-IE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Crown size={14} className={inspection.queen_seen ? 'text-green-600' : 'text-red-600'} />
                    <span className="text-text-secondary">
                      Queen: {inspection.queen_seen ? 'Seen' : 'Not seen'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-blue-600" />
                    <span className="text-text-secondary">
                      Strength: <span className="font-medium text-foreground">{inspection.population_strength}/5</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-text-secondary">Brood: </span>
                    <span className="font-medium text-foreground">{inspection.brood_pattern_rating}/5</span>
                  </div>

                  <div>
                    <span className="text-text-secondary">Temperament: </span>
                    <span className="font-medium text-foreground">{inspection.temperament_rating}/5</span>
                  </div>
                </div>

                {inspection.notes && (
                  <div className="mt-2 p-2 bg-sage-50 dark:bg-slate-900/50 rounded text-sm text-text-secondary">
                    {inspection.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
