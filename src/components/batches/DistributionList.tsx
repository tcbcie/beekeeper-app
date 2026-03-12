import { useState, useMemo } from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { GraftDistribution } from '@/hooks/useGraftDistributions'
import { Graft, TYPE_LABELS, formatDateIrish } from './graftConstants'
import IconButton from '@/components/ui/IconButton'
import ConfirmMatingModal from './ConfirmMatingModal'

interface DistributionListProps {
  distributions: GraftDistribution[]
  grafts: Graft[]
  distLoading: boolean
  handleConfirmMating: (distId: string, matingDate: string, matingLocation: string) => Promise<boolean>
  handleClearMating: (distId: string) => Promise<boolean>
  handleDeleteDistribution: (dist: GraftDistribution) => void
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

export default function DistributionList({
  distributions,
  grafts,
  distLoading,
  handleConfirmMating,
  handleClearMating,
  handleDeleteDistribution,
}: DistributionListProps) {
  const [matingModalDist, setMatingModalDist] = useState<GraftDistribution | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const graftMap = useMemo(() => new Map(grafts.map(g => [g.id, g])), [grafts])
  if (distLoading || distributions.length === 0) return null

  return (
    <div className="pt-4 border-t border-border">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-text-secondary transition-colors mb-3"
      >
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        Distributions ({distributions.length})
      </button>

      {collapsed ? null : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-surface shadow-sm dark:bg-surface-elevated/95">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-secondary dark:bg-surface">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Cell</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Recipient</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Location</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary">Mated</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {distributions.map((dist) => {
                  const distTypeInfo = TYPE_LABELS[dist.distribution_type] || TYPE_LABELS.queen_cell || { label: 'Unknown', color: 'bg-surface-secondary text-text-secondary border border-border' }
                  const graft = graftMap.get(dist.graft_id)
                  return (
                    <tr key={dist.id} className="bg-surface hover:bg-surface-secondary/80 dark:bg-surface-elevated/70 dark:hover:bg-surface/60 transition-colors">
                      <td className="px-3 py-2 text-sm font-medium text-foreground">
                        #{dist.cell_number}
                        {graft?.queen_number && (
                          <span className="block text-xs text-text-tertiary">Q#{graft.queen_number}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${distTypeInfo.color}`}>
                          {distTypeInfo.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-foreground max-w-[200px] truncate" title={getRecipientDisplay(dist)}>
                        {getRecipientDisplay(dist)}
                        {!dist.recipient_user_id && dist.external_recipient_phone && (
                          <span className="block text-xs text-text-tertiary">{dist.external_recipient_phone}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-text-secondary whitespace-nowrap">
                        {formatDateIrish(dist.distribution_date)}
                      </td>
                      <td className="px-3 py-2 text-xs text-text-secondary max-w-[160px] truncate" title={getLocationDisplay(dist)}>
                        {getLocationDisplay(dist)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {dist.distribution_type === 'mated_queen' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            <Check size={12} /> Yes
                          </span>
                        ) : dist.mating_confirmed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" title={dist.mating_confirmed_date ? `${formatDateIrish(dist.mating_confirmed_date)}${dist.mating_location ? ` at ${dist.mating_location}` : ''}` : ''}>
                            <Check size={12} /> Yes
                          </span>
                        ) : (
                          <span className="text-xs text-text-tertiary">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {dist.distribution_type !== 'mated_queen' && (
                            <IconButton
                              type="button"
                              onClick={() => setMatingModalDist(dist)}
                              size="sm"
                              className={`p-1.5 rounded text-xs ${
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
            {distributions.map((dist) => {
              const distTypeInfo = TYPE_LABELS[dist.distribution_type] || TYPE_LABELS.queen_cell || { label: 'Unknown', color: 'bg-surface-secondary text-text-secondary border border-border' }
              const graft = graftMap.get(dist.graft_id)
              return (
                <div
                  key={dist.id}
                  className="rounded-xl border border-border bg-surface p-3 shadow-sm dark:bg-surface-elevated/90 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">#{dist.cell_number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${distTypeInfo.color}`}>
                        {distTypeInfo.label}
                      </span>
                      {(dist.mating_confirmed || dist.distribution_type === 'mated_queen') && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
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
                          className={`p-1.5 rounded text-xs ${
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
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-text-tertiary">To: </span>
                      <span className="text-foreground">{getRecipientDisplay(dist)}</span>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Date: </span>
                      <span className="text-text-secondary">{formatDateIrish(dist.distribution_date)}</span>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Location: </span>
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
