import { useState, useMemo } from 'react'
import { Check, X, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react'
import type { GraftDistribution } from '@/hooks/useGraftDistributions'
import { Graft, TYPE_LABELS, formatDateIrish } from './graftConstants'
import IconButton from '@/components/ui/IconButton'
import ConfirmMatingModal from './ConfirmMatingModal'

interface DistributionListProps {
  distributions: GraftDistribution[]
  grafts: Graft[]
  groupMemberIds: string[]
  distLoading: boolean
  handleConfirmMating: (distId: string, matingDate: string, matingLocation: string) => Promise<boolean>
  handleClearMating: (distId: string) => Promise<boolean>
  handleDeleteDistribution: (dist: GraftDistribution) => void
}

type SortColumn = 'date' | 'mated'
type SortDir = 'asc' | 'desc'

type RecipientType = 'group' | 'app_user' | 'external'

const RECIPIENT_COLOURS: Record<RecipientType, { dot: string; label: string }> = {
  group: {
    dot: 'bg-green-500 dark:bg-green-400',
    label: 'Group Member',
  },
  app_user: {
    dot: 'bg-blue-500 dark:bg-blue-400',
    label: 'App User',
  },
  external: {
    dot: 'bg-amber-500 dark:bg-amber-400',
    label: 'Other Beekeeper',
  },
}

function getRecipientType(dist: GraftDistribution, groupMemberIds: string[]): RecipientType {
  if (!dist.recipient_user_id) return 'external'
  if (groupMemberIds.includes(dist.recipient_user_id)) return 'group'
  return 'app_user'
}

function getRecipientDisplay(dist: GraftDistribution): string {
  if (!dist.recipient_user_id) {
    return dist.external_recipient_name || dist.external_recipient_email || dist.external_recipient_phone || 'External beekeeper'
  }
  return dist.recipient_name || dist.recipient_email || 'Unknown'
}

function getLocationDisplay(dist: GraftDistribution): string {
  if (!dist.recipient_user_id) {
    return dist.external_recipient_location || '-'
  }
  return dist.mating_location || dist.recipient_apiary_name || '-'
}

function isMated(dist: GraftDistribution): boolean {
  return dist.distribution_type === 'mated_queen' || dist.mating_confirmed
}

export default function DistributionList({
  distributions,
  grafts,
  groupMemberIds,
  distLoading,
  handleConfirmMating,
  handleClearMating,
  handleDeleteDistribution,
}: DistributionListProps) {
  const [matingModalDist, setMatingModalDist] = useState<GraftDistribution | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [sortBy, setSortBy] = useState<SortColumn>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const graftMap = useMemo(() => new Map(grafts.map(g => [g.id, g])), [grafts])

  const sortedDistributions = useMemo(() => {
    const sorted = [...distributions]
    sorted.sort((a, b) => {
      if (sortBy === 'date') {
        const cmp = (a.distribution_date || '').localeCompare(b.distribution_date || '')
        return sortDir === 'asc' ? cmp : -cmp
      }
      // mated: Yes (1) before Pending (0) in desc, reverse in asc
      const aMated = isMated(a) ? 1 : 0
      const bMated = isMated(b) ? 1 : 0
      const cmp = aMated - bMated
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [distributions, sortBy, sortDir])

  const handleSort = (col: SortColumn) => {
    if (sortBy === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  // Detect which recipient types are present for the legend
  const recipientTypesPresent = useMemo(() => {
    const types = new Set<RecipientType>()
    for (const dist of distributions) {
      types.add(getRecipientType(dist, groupMemberIds))
    }
    return types
  }, [distributions, groupMemberIds])

  if (distLoading || distributions.length === 0) return null

  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortBy !== col) return <ArrowDown size={12} className="text-text-tertiary opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-foreground" />
      : <ArrowDown size={12} className="text-foreground" />
  }

  return (
    <div className="pt-4 border-t border-border">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-text-secondary transition-colors"
        >
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          Distributions ({distributions.length})
        </button>

        {/* Legend */}
        {!collapsed && (
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            {(['group', 'app_user', 'external'] as RecipientType[]).filter(t => recipientTypesPresent.has(t)).map(type => (
              <span key={type} className="inline-flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${RECIPIENT_COLOURS[type].dot}`} />
                {RECIPIENT_COLOURS[type].label}
              </span>
            ))}
          </div>
        )}
      </div>

      {collapsed ? null : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-surface shadow-sm dark:bg-surface-elevated/95">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-secondary dark:bg-surface">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-medium text-text-secondary">Cell / Queen</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-text-secondary">Type</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-text-secondary">Recipient</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-text-secondary">
                    <button type="button" onClick={() => handleSort('date')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                      Date <SortIcon col="date" />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-text-secondary">Mating Location</th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-text-secondary">
                    <button type="button" onClick={() => handleSort('mated')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                      Mated <SortIcon col="mated" />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedDistributions.map((dist) => {
                  const distTypeInfo = TYPE_LABELS[dist.distribution_type] || TYPE_LABELS.queen_cell || { label: 'Unknown', color: 'bg-surface-secondary text-text-secondary border border-border' }
                  const graft = graftMap.get(dist.graft_id)
                  const recipientType = getRecipientType(dist, groupMemberIds)
                  return (
                    <tr key={dist.id} className="bg-surface hover:bg-surface-secondary/80 dark:bg-surface-elevated/70 dark:hover:bg-surface/60 transition-colors">
                      <td className="px-3 py-2 text-sm font-medium text-foreground">
                        #{dist.cell_number}
                        {graft?.queen_number && (
                          <span className="block text-sm text-text-tertiary">Q#{graft.queen_number}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-sm font-medium ${distTypeInfo.color}`}>
                          {distTypeInfo.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-foreground max-w-[200px] truncate" title={`${getRecipientDisplay(dist)} (${RECIPIENT_COLOURS[recipientType].label})`}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${RECIPIENT_COLOURS[recipientType].dot}`} />
                          {getRecipientDisplay(dist)}
                        </span>
                        {!dist.recipient_user_id && dist.external_recipient_phone && (
                          <span className="block text-sm text-text-tertiary ml-3.5">{dist.external_recipient_phone}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-text-secondary whitespace-nowrap">
                        {formatDateIrish(dist.distribution_date)}
                      </td>
                      <td className="px-3 py-2 text-sm text-text-secondary max-w-[160px] truncate" title={getLocationDisplay(dist)}>
                        {getLocationDisplay(dist)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {dist.distribution_type === 'mated_queen' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            <Check size={12} /> Yes
                          </span>
                        ) : dist.mating_confirmed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" title={dist.mating_confirmed_date ? `${formatDateIrish(dist.mating_confirmed_date)}${dist.mating_location ? ` at ${dist.mating_location}` : ''}` : ''}>
                            <Check size={12} /> Yes
                          </span>
                        ) : (
                          <span className="text-sm text-text-tertiary">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {dist.distribution_type !== 'mated_queen' && (
                            <IconButton
                              type="button"
                              onClick={() => setMatingModalDist(dist)}
                              size="sm"
                              className={`p-1.5 rounded text-sm ${
                                dist.mating_confirmed
                                  ? 'border border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'border border-border bg-surface-secondary text-text-tertiary dark:bg-surface dark:text-text-secondary'
                              }`}
                              title={dist.mating_confirmed ? 'Edit mating confirmation' : 'Confirm mating'}
                            >
                              <Check size={14} />
                            </IconButton>
                          )}
                          <IconButton
                            type="button"
                            onClick={() => handleDeleteDistribution(dist)}
                            tone="danger"
                            size="sm"
                            title="Remove distribution"
                          >
                            <X size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {sortedDistributions.map((dist) => {
              const distTypeInfo = TYPE_LABELS[dist.distribution_type] || TYPE_LABELS.queen_cell || { label: 'Unknown', color: 'bg-surface-secondary text-text-secondary border border-border' }
              const graft = graftMap.get(dist.graft_id)
              const recipientType = getRecipientType(dist, groupMemberIds)
              return (
                <div
                  key={dist.id}
                  className="rounded-xl border border-border bg-surface p-3 shadow-sm dark:bg-surface-elevated/90 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">#{dist.cell_number}</span>
                      <span className={`px-2 py-0.5 rounded text-sm font-medium ${distTypeInfo.color}`}>
                        {distTypeInfo.label}
                      </span>
                      {(dist.mating_confirmed || dist.distribution_type === 'mated_queen') && (
                        <span className="px-1.5 py-0.5 rounded text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                          Mated
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {dist.distribution_type !== 'mated_queen' && (
                        <IconButton
                          type="button"
                          onClick={() => setMatingModalDist(dist)}
                          size="sm"
                          className={`p-1.5 rounded text-sm ${
                            dist.mating_confirmed
                              ? 'border border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'border border-border bg-surface-secondary text-text-tertiary dark:bg-surface dark:text-text-secondary'
                          }`}
                          title={dist.mating_confirmed ? 'Edit mating confirmation' : 'Confirm mating'}
                        >
                          <Check size={14} />
                        </IconButton>
                      )}
                      <IconButton
                        type="button"
                        onClick={() => handleDeleteDistribution(dist)}
                        tone="danger"
                        size="sm"
                        title="Remove distribution"
                      >
                        <X size={14} />
                      </IconButton>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div>
                      <span className="text-text-tertiary">To: </span>
                      <span className="inline-flex items-center gap-1">
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${RECIPIENT_COLOURS[recipientType].dot}`} />
                        <span className="text-foreground">{getRecipientDisplay(dist)}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Date: </span>
                      <span className="text-text-secondary">{formatDateIrish(dist.distribution_date)}</span>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Mating Location: </span>
                      <span className="text-text-secondary">{getLocationDisplay(dist)}</span>
                    </div>
                    {graft?.queen_number && (
                      <div>
                        <span className="text-text-tertiary">Queen: </span>
                        <span className="text-text-secondary">#{graft.queen_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Mating Confirmation Modal */}
      {matingModalDist && (
        <ConfirmMatingModal
          cellNumber={matingModalDist.cell_number}
          recipientUserId={matingModalDist.recipient_user_id}
          currentMatingLocation={matingModalDist.mating_location}
          currentMatingDate={matingModalDist.mating_confirmed_date}
          isConfirmed={matingModalDist.mating_confirmed}
          onConfirm={(date, location) => handleConfirmMating(matingModalDist.id, date, location)}
          onClear={() => handleClearMating(matingModalDist.id)}
          onClose={() => setMatingModalDist(null)}
        />
      )}
    </div>
  )
}
