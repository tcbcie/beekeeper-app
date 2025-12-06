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
  apiary_id?: string | null
  row_in_apiary?: number | null
  order_in_apiary?: number | null
  queen_id?: string | null
  queen_marked?: boolean | null
  queen_marking_color?: string | null
  queen_mated?: boolean | null
  queen_clipped?: boolean | null
  changer?: {
    full_name: string | null
    email: string
  } | null
  apiary?: {
    name: string
  } | null
  queen?: {
    queen_number: string
  } | null
}

interface HiveConfigurationHistoryProps {
  hiveId: string
}

export default function HiveConfigurationHistory({ hiveId }: HiveConfigurationHistoryProps) {
  const [history, setHistory] = useState<ConfigurationHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isSectionExpanded, setIsSectionExpanded] = useState(false)
  const [isShowingMore, setIsShowingMore] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isHiveShared, setIsHiveShared] = useState(false)

  const fetchHistory = useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      // Check if hive is shared
      const { data: hiveData, error: hiveError } = await supabase
        .from('hives')
        .select('user_id, apiary_id')
        .eq('id', hiveId)
        .maybeSingle()

      if (hiveError) {
        console.error('Error fetching hive data:', hiveError)
      }

      // Check if the apiary is shared by looking in team_apiaries
      let isShared = false
      if (hiveData?.apiary_id) {
        const { data: teamApiaryData } = await supabase
          .from('team_apiaries')
          .select('id')
          .eq('apiary_id', hiveData.apiary_id)
          .limit(1)

        isShared = (teamApiaryData && teamApiaryData.length > 0) || false
      }
      setIsHiveShared(isShared)

      const { data, error} = await supabase
        .from('hive_configuration_history')
        .select(`
          id,
          hive_id,
          changed_at,
          changed_by,
          configuration,
          apiary_id,
          row_in_apiary,
          order_in_apiary,
          queen_id,
          queen_marked,
          queen_marking_color,
          queen_mated,
          queen_clipped,
          apiary:apiaries(name),
          queen:queens(queen_number)
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
            changer: profile || null,
            apiary: Array.isArray(entry.apiary) ? entry.apiary[0] : entry.apiary,
            queen: Array.isArray(entry.queen) ? entry.queen[0] : entry.queen
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

  const formatFieldValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined || value === '') return 'None'

    switch (key) {
      case 'hive_size':
        return value === 'nuc' ? 'Nuc' : 'Full Size'
      case 'frame_orientation':
        return value === 'warm' ? 'Warm way' : 'Cold way'
      case 'varroa_mesh_floor':
        return value === 'open' ? 'Open' : value === 'closed' ? 'Closed' : String(value)
      case 'queen_excluder':
      case 'feeder':
      case 'entrance_reducer':
      case 'right_sized_broodbox':
        return value ? 'Yes' : 'No'
      default:
        return String(value)
    }
  }

  const getFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      hive_size: 'Size',
      brood_boxes: 'Brood boxes',
      brood_boxes_full: 'Brood boxes (full)',
      brood_boxes_half: 'Brood boxes (half)',
      honey_supers: 'Honey supers',
      queen_excluder: 'Queen excluder',
      feeder: 'Feeder',
      feeder_type: 'Feeder type',
      entrance_reducer: 'Entrance reducer',
      varroa_mesh_floor: 'Varroa floor',
      right_sized_broodbox: 'Right-sized broodbox',
      frame_orientation: 'Frame orientation'
    }
    return labels[key] || key
  }

  const compareLocations = (current: ConfigurationHistoryEntry, previous?: ConfigurationHistoryEntry): Array<{field: string, before: string, after: string}> => {
    const changes: Array<{field: string, before: string, after: string}> = []

    if (!previous) {
      // Initial entry - show location if set
      if (current.apiary) {
        changes.push({
          field: 'Location',
          before: '-',
          after: `${current.apiary.name}${current.row_in_apiary ? `, Row ${current.row_in_apiary}` : ''}${current.order_in_apiary ? `, Position ${current.order_in_apiary}` : ''}`
        })
      }
      return changes
    }

    // Check if location changed
    const apiaryChanged = current.apiary_id !== previous.apiary_id
    const rowChanged = current.row_in_apiary !== previous.row_in_apiary
    const positionChanged = current.order_in_apiary !== previous.order_in_apiary

    if (apiaryChanged || rowChanged || positionChanged) {
      const previousLocation = previous.apiary
        ? `${previous.apiary.name}${previous.row_in_apiary ? `, Row ${previous.row_in_apiary}` : ''}${previous.order_in_apiary ? `, Position ${previous.order_in_apiary}` : ''}`
        : 'Unknown'

      const currentLocation = current.apiary
        ? `${current.apiary.name}${current.row_in_apiary ? `, Row ${current.row_in_apiary}` : ''}${current.order_in_apiary ? `, Position ${current.order_in_apiary}` : ''}`
        : 'Unknown'

      changes.push({
        field: 'Location',
        before: previousLocation,
        after: currentLocation
      })
    }

    return changes
  }

  const compareQueenInfo = (current: ConfigurationHistoryEntry, previous?: ConfigurationHistoryEntry): Array<{field: string, before: string, after: string}> => {
    const changes: Array<{field: string, before: string, after: string}> = []

    if (!previous) {
      // Initial entry - show queen info ONLY if set to meaningful values
      if (current.queen_id && current.queen) {
        changes.push({
          field: 'Queen',
          before: '-',
          after: current.queen.queen_number
        })
      }

      // Show manual queen status flags ONLY if they are true (when no specific queen assigned)
      // Don't show "No" values for initial entry as they're just defaults
      if (!current.queen_id) {
        if (current.queen_marked) {
          changes.push({
            field: 'Queen marked',
            before: '-',
            after: current.queen_marking_color || 'Yes'
          })
        }
        if (current.queen_mated) {
          changes.push({
            field: 'Queen mated',
            before: '-',
            after: 'Yes'
          })
        }
        if (current.queen_clipped) {
          changes.push({
            field: 'Queen clipped',
            before: '-',
            after: 'Yes'
          })
        }
      }
      return changes
    }

    // Check if queen changed
    if (current.queen_id !== previous.queen_id) {
      const previousQueen = previous.queen_id && previous.queen ? previous.queen.queen_number : 'None'
      const currentQueen = current.queen_id && current.queen ? current.queen.queen_number : 'None'

      changes.push({
        field: 'Queen',
        before: previousQueen,
        after: currentQueen
      })
    }

    // Check manual queen status flags (only when no specific queen assigned)
    // Only show changes if values actually differ
    if (!current.queen_id && !previous.queen_id) {
      if (current.queen_marked !== previous.queen_marked || current.queen_marking_color !== previous.queen_marking_color) {
        const previousStatus = previous.queen_marked ? (previous.queen_marking_color || 'Marked') : 'Not marked'
        const currentStatus = current.queen_marked ? (current.queen_marking_color || 'Marked') : 'Not marked'

        // Only add if there's an actual change
        if (previousStatus !== currentStatus) {
          changes.push({
            field: 'Queen marked',
            before: previousStatus,
            after: currentStatus
          })
        }
      }

      if (current.queen_mated !== previous.queen_mated) {
        changes.push({
          field: 'Queen mated',
          before: previous.queen_mated ? 'Yes' : 'No',
          after: current.queen_mated ? 'Yes' : 'No'
        })
      }

      if (current.queen_clipped !== previous.queen_clipped) {
        changes.push({
          field: 'Queen clipped',
          before: previous.queen_clipped ? 'Yes' : 'No',
          after: current.queen_clipped ? 'Yes' : 'No'
        })
      }
    }

    return changes
  }

  const compareConfigurations = (current: HiveConfiguration, previous?: HiveConfiguration): Array<{field: string, before: string, after: string}> => {
    if (!previous) {
      // Initial configuration - show all non-empty fields
      const changes: Array<{field: string, before: string, after: string}> = []
      Object.entries(current).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== false && value !== 0 && value !== '') {
          changes.push({
            field: getFieldLabel(key),
            before: '-',
            after: formatFieldValue(key, value)
          })
        }
      })
      return changes
    }

    // Compare with previous configuration
    const changes: Array<{field: string, before: string, after: string}> = []
    const allKeys = new Set([...Object.keys(current), ...Object.keys(previous)])

    allKeys.forEach(key => {
      const currentValue = (current as Record<string, unknown>)[key]
      const previousValue = (previous as Record<string, unknown>)[key]

      // Only show if values are different
      if (JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
        changes.push({
          field: getFieldLabel(key),
          before: formatFieldValue(key, previousValue),
          after: formatFieldValue(key, currentValue)
        })
      }
    })

    return changes
  }

  const displayedHistory = isShowingMore ? history : history.slice(0, 3)

  return (
    <div className="space-y-3">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsSectionExpanded(!isSectionExpanded)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left font-medium text-forest-700 dark:text-forest-300 hover:bg-sage-50 dark:hover:bg-slate-800 rounded-lg border border-border hover:border-forest-500 dark:hover:border-forest-400 transition-all"
      >
        <div className="flex items-center gap-2">
          <History size={18} className="flex-shrink-0" />
          <span>Configuration History</span>
          {history.length > 0 && (
            <span className="text-xs text-text-tertiary">({history.length} {history.length === 1 ? 'entry' : 'entries'})</span>
          )}
        </div>
        {isSectionExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {/* Expanded Content */}
      {isSectionExpanded && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-forest-500 border-t-transparent"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary text-sm">
              No configuration changes recorded yet
            </div>
          ) : (
            <>
              {displayedHistory.map((entry, index) => {
        const displayIndex = isShowingMore ? index : index
        const fullIndex = displayIndex
        const previousEntry = fullIndex < history.length - 1 ? history[fullIndex + 1] : undefined
        const previousConfig = previousEntry?.configuration
        const configChanges = compareConfigurations(entry.configuration, previousConfig)
        const locationChanges = compareLocations(entry, previousEntry)
        const queenChanges = compareQueenInfo(entry, previousEntry)
        const allChanges = [...locationChanges, ...queenChanges, ...configChanges]
        const changerName = entry.changer?.full_name || entry.changer?.email || 'Unknown'
        const isInitial = fullIndex === history.length - 1

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

            {/* Only show "Changed by" if hive is shared or changed by someone other than current user */}
            {isHiveShared && entry.changed_by !== currentUserId && (
              <div className="flex items-center gap-2 mb-3 text-xs text-text-secondary">
                <User size={14} className="flex-shrink-0" />
                <span>Changed by: <span className="font-medium text-text-primary">{changerName}</span></span>
              </div>
            )}

            {allChanges.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allChanges.map((change, idx) => (
                  <div
                    key={idx}
                    className="text-xs bg-sage-50 dark:bg-slate-800/50 px-3 py-2 rounded border border-border"
                  >
                    <span className="font-medium text-text-primary">{change.field}:</span>
                    {change.before !== '-' && (
                      <span className="text-text-tertiary"> {change.before} →</span>
                    )}
                    <span className="text-forest-600 dark:text-forest-400 font-medium"> {change.after}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-tertiary italic bg-slate-50 dark:bg-slate-800/30 px-3 py-2 rounded border border-border">
                No changes detected (configuration may have been saved without modifications)
              </div>
            )}
          </div>
        )
      })}

              {history.length > 3 && (
                <button
                  onClick={() => setIsShowingMore(!isShowingMore)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-forest-600 dark:text-forest-400 hover:bg-sage-50 dark:hover:bg-slate-800 rounded-lg border border-border hover:border-forest-500 dark:hover:border-forest-400 transition-all"
                >
                  {isShowingMore ? (
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
            </>
          )}
        </>
      )}
    </div>
  )
}
