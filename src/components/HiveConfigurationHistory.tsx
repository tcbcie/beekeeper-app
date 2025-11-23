'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { History, User, ChevronDown, ChevronUp } from 'lucide-react'

interface HiveConfiguration {
  brood_boxes?: number
  brood_boxes_full?: number
  brood_boxes_half?: number
  honey_supers?: number
  queen_excluder?: boolean
  feeder?: boolean
  feeder_type?: string
  entrance_reducer?: boolean
  varroa_mesh_floor?: string
  right_sized_broodbox?: boolean
  frame_orientation?: string | null
  hive_size?: 'full' | 'nuc'
}

interface ConfigurationHistoryEntry {
  id: string
  hive_id: string
  changed_at: string
  changed_by: string
  configuration: HiveConfiguration
  changer?: {
    full_name: string | null
    email: string
  } | null
}

interface HiveConfigurationHistoryProps {
  hiveId: string
}

export default function HiveConfigurationHistory({ hiveId }: HiveConfigurationHistoryProps) {
  const [history, setHistory] = useState<ConfigurationHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  const fetchHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('hive_configuration_history')
        .select(`
          id,
          hive_id,
          changed_at,
          changed_by,
          configuration
        `)
        .eq('hive_id', hiveId)
        .order('changed_at', { ascending: false })

      if (error) throw error

      // Fetch user profiles separately for each entry
      const historyWithUsers = await Promise.all(
        (data || []).map(async (entry) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', entry.changed_by)
            .single()

          return {
            ...entry,
            changer: profile || null
          }
        })
      )

      setHistory(historyWithUsers as ConfigurationHistoryEntry[])
    } catch (error) {
      console.error('Error fetching configuration history:', error)
    } finally {
      setLoading(false)
    }
  }, [hiveId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const formatConfigurationChanges = (config: HiveConfiguration): string[] => {
    const changes: string[] = []

    if (config.hive_size) {
      changes.push(`Size: ${config.hive_size === 'nuc' ? 'Nuc' : 'Full Size'}`)
    }

    const broodFull = config.brood_boxes_full ?? config.brood_boxes ?? 0
    const broodHalf = config.brood_boxes_half ?? 0
    if (broodFull > 0 || broodHalf > 0) {
      const parts = []
      if (broodFull > 0) parts.push(`${broodFull} full`)
      if (broodHalf > 0) parts.push(`${broodHalf} half`)
      changes.push(`Brood boxes: ${parts.join(', ')}`)
    }

    if (config.honey_supers && config.honey_supers > 0) {
      changes.push(`Honey supers: ${config.honey_supers}`)
    }

    if (config.queen_excluder) {
      changes.push('Queen excluder: Yes')
    }

    if (config.feeder_type) {
      changes.push(`Feeder: ${config.feeder_type}`)
    }

    if (config.entrance_reducer) {
      changes.push('Entrance reducer: Yes')
    }

    if (config.varroa_mesh_floor) {
      changes.push(`Varroa floor: ${config.varroa_mesh_floor}`)
    }

    if (config.right_sized_broodbox) {
      changes.push('Right-sized broodbox: Yes')
    }

    if (config.frame_orientation) {
      changes.push(`Frame orientation: ${config.frame_orientation === 'warm' ? 'Warm way' : 'Cold way'}`)
    }

    return changes
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-forest-500 border-t-transparent"></div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-text-tertiary text-sm">
        No configuration changes recorded yet
      </div>
    )
  }

  const displayedHistory = isExpanded ? history : history.slice(0, 3)

  return (
    <div className="space-y-3">
      {displayedHistory.map((entry, index) => {
        const changes = formatConfigurationChanges(entry.configuration)
        const changerName = entry.changer?.full_name || entry.changer?.email || 'Unknown'
        const isInitial = index === history.length - 1

        return (
          <div
            key={entry.id}
            className="bg-surface dark:bg-surface-elevated rounded-lg p-4 border border-border hover:border-forest-500 dark:hover:border-forest-400 transition-colors"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <History size={16} className="text-forest-600 dark:text-forest-400 flex-shrink-0" />
                <span className="text-xs font-medium text-text-secondary">
                  {isInitial ? 'Initial Configuration' : 'Configuration Updated'}
                </span>
              </div>
              <div className="text-xs text-text-tertiary text-right">
                {new Date(entry.changed_at).toLocaleDateString('en-IE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
                {' at '}
                {new Date(entry.changed_at).toLocaleTimeString('en-IE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3 text-xs text-text-secondary">
              <User size={14} className="flex-shrink-0" />
              <span>Changed by: <span className="font-medium text-text-primary">{changerName}</span></span>
            </div>

            {changes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {changes.map((change, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-text-primary bg-sage-50 dark:bg-slate-800/50 px-3 py-2 rounded border border-border"
                  >
                    {change}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {history.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-forest-600 dark:text-forest-400 hover:bg-sage-50 dark:hover:bg-slate-800 rounded-lg border border-border hover:border-forest-500 dark:hover:border-forest-400 transition-all"
        >
          {isExpanded ? (
            <>
              <ChevronUp size={16} />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Show More ({history.length - 3} older)
            </>
          )}
        </button>
      )}
    </div>
  )
}
