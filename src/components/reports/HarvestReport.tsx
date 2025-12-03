'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Droplet, Calendar, TrendingUp, MapPin, Archive } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface HarvestRecord {
  id: string
  hive_id: string
  hive_number: string
  apiary_name: string | null
  harvest_date: string
  honey_weight_kg: number
  notes: string | null
}

interface ApiaryStats {
  apiary_name: string
  totalHarvest: number
  harvestCount: number
  avgPerHarvest: number
}

export default function HarvestReport() {
  const [harvests, setHarvests] = useState<HarvestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear())
  const [filterApiary, setFilterApiary] = useState<string>('all')

  const fetchHarvestData = useCallback(async () => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return

      // Fetch harvest records with hive and apiary info
      const { data, error } = await supabase
        .from('harvest_records')
        .select(`
          id,
          hive_id,
          harvest_date,
          honey_weight_kg,
          notes,
          hives (
            hive_number,
            apiaries (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .order('harvest_date', { ascending: false })

      if (error) throw error

      const processedHarvests: HarvestRecord[] = (data || []).map((harvest: Record<string, unknown>) => {
        const hives = harvest.hives as Record<string, unknown> | null | undefined
        const apiaries = hives?.apiaries as Record<string, unknown> | null | undefined

        return {
          id: harvest.id as string,
          hive_id: harvest.hive_id as string,
          hive_number: hives?.hive_number as string || 'Unknown',
          apiary_name: apiaries?.name as string || null,
          harvest_date: harvest.harvest_date as string,
          honey_weight_kg: (harvest.honey_weight_kg as number) || 0,
          notes: harvest.notes as string | null
        }
      })

      setHarvests(processedHarvests)
    } catch (error) {
      console.error('Error fetching harvest data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHarvestData()
  }, [fetchHarvestData])

  const filteredHarvests = harvests.filter(harvest => {
    const harvestYear = new Date(harvest.harvest_date).getFullYear()
    const matchesYear = harvestYear === filterYear
    const matchesApiary = filterApiary === 'all' || harvest.apiary_name === filterApiary
    return matchesYear && matchesApiary
  })

  // Calculate stats
  const totalHarvest = filteredHarvests.reduce((sum, h) => sum + h.honey_weight_kg, 0)
  const harvestCount = filteredHarvests.length
  const avgPerHarvest = harvestCount > 0 ? totalHarvest / harvestCount : 0

  // Calculate apiary stats
  const apiaryStats: ApiaryStats[] = Array.from(
    filteredHarvests.reduce((map, harvest) => {
      const apiaryName = harvest.apiary_name || 'Unknown'
      if (!map.has(apiaryName)) {
        map.set(apiaryName, {
          apiary_name: apiaryName,
          totalHarvest: 0,
          harvestCount: 0,
          avgPerHarvest: 0
        })
      }
      const stats = map.get(apiaryName)!
      stats.totalHarvest += harvest.honey_weight_kg
      stats.harvestCount += 1
      stats.avgPerHarvest = stats.totalHarvest / stats.harvestCount
      return map
    }, new Map<string, ApiaryStats>()).values()
  ).sort((a, b) => b.totalHarvest - a.totalHarvest)

  // Get unique years and apiaries for filters
  const availableYears = Array.from(
    new Set(harvests.map(h => new Date(h.harvest_date).getFullYear()))
  ).sort((a, b) => b - a)

  const availableApiaries = Array.from(
    new Set(harvests.map(h => h.apiary_name).filter(Boolean))
  )

  if (loading) return <LoadingSpinner text="Loading harvest data..." />

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Droplet size={20} className="text-amber-600 dark:text-amber-400" />
            <div className="text-sm text-text-secondary">Total Harvest</div>
          </div>
          <div className="text-2xl font-bold text-foreground">{totalHarvest.toFixed(1)} kg</div>
        </div>
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Archive size={20} className="text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-text-secondary">Harvest Events</div>
          </div>
          <div className="text-2xl font-bold text-foreground">{harvestCount}</div>
        </div>
        <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
            <div className="text-sm text-text-secondary">Avg Per Harvest</div>
          </div>
          <div className="text-2xl font-bold text-foreground">{avgPerHarvest.toFixed(1)} kg</div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm font-medium text-text-secondary">Year:</span>
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setFilterYear(year)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterYear === year
                  ? 'bg-forest-600 dark:bg-forest-700 text-white'
                  : 'bg-sage-100 dark:bg-slate-800 text-foreground hover:bg-sage-200 dark:hover:bg-slate-700'
              }`}
            >
              {year}
            </button>
          ))}
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

      {/* Apiary Breakdown */}
      {apiaryStats.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Harvest by Apiary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {apiaryStats.map(stats => (
              <div
                key={stats.apiary_name}
                className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-text-secondary" />
                    <h4 className="font-semibold text-foreground">{stats.apiary_name}</h4>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-text-secondary">Total</div>
                    <div className="font-bold text-foreground">{stats.totalHarvest.toFixed(1)} kg</div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Events</div>
                    <div className="font-bold text-foreground">{stats.harvestCount}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Avg</div>
                    <div className="font-bold text-foreground">{stats.avgPerHarvest.toFixed(1)} kg</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Harvest Records List */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Individual Harvests</h3>
        {filteredHarvests.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <Droplet size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">No harvest records found for {filterYear}.</p>
            <p className="text-sm mt-2">Record your honey harvests to track productivity over time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHarvests.map(harvest => (
              <div
                key={harvest.id}
                className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="text-lg font-semibold text-foreground">
                        {harvest.hive_number}
                      </h4>
                      <span className="px-3 py-1 rounded-lg text-sm font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        {harvest.honey_weight_kg.toFixed(1)} kg
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      {harvest.apiary_name && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <MapPin size={14} />
                          {harvest.apiary_name}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-text-secondary">
                        <Calendar size={14} />
                        {new Date(harvest.harvest_date).toLocaleDateString('en-IE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>

                      {harvest.notes && (
                        <div className="mt-2 p-2 bg-sage-50 dark:bg-slate-900/50 rounded text-text-secondary">
                          {harvest.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
