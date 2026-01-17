'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Scale, RefreshCw } from 'lucide-react'
import HiveScaleCard from './HiveScaleCard'

interface ScaleOverviewTabProps {
  userId: string
}

interface HiveWithScale {
  id: string
  hive_number: number
  beep_device_id: string | null
  beep_device_name: string | null
  wolf_scale_id: string | null
  wolf_scale_name: string | null
  apiaries: { id: string; name: string } | null
}

export default function ScaleOverviewTab({ userId }: ScaleOverviewTabProps) {
  const [hives, setHives] = useState<HiveWithScale[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchHives = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('hives')
      .select(`
        id, hive_number,
        beep_device_id, beep_device_name,
        wolf_scale_id, wolf_scale_name,
        apiaries(id, name)
      `)
      .eq('user_id', userId)
      .is('archived_at', null)
      .or('beep_device_id.not.is.null,wolf_scale_id.not.is.null')
      .order('hive_number')

    if (error) {
      console.error('Error fetching hives with scales:', error)
    } else if (data) {
      setHives(data as HiveWithScale[])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchHives()
  }, [fetchHives])

  const handleRefreshAll = () => {
    setRefreshKey(k => k + 1)
  }

  const beepCount = hives.filter(h => h.beep_device_id).length
  const wolfCount = hives.filter(h => h.wolf_scale_id).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Scale className="text-amber-600" size={24} />
          <h2 className="text-xl font-semibold text-foreground">Scale Overview</h2>
        </div>
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span>{hives.length} scale{hives.length !== 1 ? 's' : ''}</span>
            {beepCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded">
                {beepCount} BEEP
              </span>
            )}
            {wolfCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                {wolfCount} Wolf
              </span>
            )}
          </div>
          <button
            onClick={handleRefreshAll}
            className="px-3 py-1.5 text-sm bg-sage-200 dark:bg-slate-700 text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            Refresh All
          </button>
        </div>
      </div>

      {/* Empty state */}
      {hives.length === 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-12 text-center text-text-secondary border border-border">
          <Scale size={48} className="mx-auto mb-4 text-amber-500" />
          <p>No hives with connected scales found.</p>
          <p className="text-sm mt-2">Connect a BEEP or Wolf Waagen scale to a hive to see it here.</p>
        </div>
      )}

      {/* Grid of scale cards */}
      {hives.length > 0 && (
        <div key={refreshKey} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hives.map(hive => (
            <HiveScaleCard key={hive.id} hive={hive} />
          ))}
        </div>
      )}
    </div>
  )
}
