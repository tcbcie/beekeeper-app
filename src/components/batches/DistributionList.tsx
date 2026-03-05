import { useState } from 'react'
import { Check, X } from 'lucide-react'
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

export default function DistributionList({
  distributions,
  grafts,
  distLoading,
  handleConfirmMating,
  handleClearMating,
  handleDeleteDistribution,
}: DistributionListProps) {
  const [matingModalDist, setMatingModalDist] = useState<GraftDistribution | null>(null)
  if (distLoading || distributions.length === 0) return null

  return (
    <div className="pt-4 border-t border-border">
      <h4 className="text-sm font-semibold text-foreground mb-3">Distributions ({distributions.length})</h4>
      <div className="space-y-2">
        {distributions.map((dist) => {
          const distTypeInfo = TYPE_LABELS[dist.distribution_type] || TYPE_LABELS.queen_cell || { label: 'Unknown', color: 'bg-surface-secondary text-text-secondary border border-border' }
          const graft = grafts.find(g => g.id === dist.graft_id)
          const isExternal = !dist.recipient_user_id
          const recipientDisplay = isExternal
            ? (dist.external_recipient_name && dist.external_recipient_email
                ? `${dist.external_recipient_name} (${dist.external_recipient_email})`
                : dist.external_recipient_name || dist.external_recipient_email || dist.external_recipient_phone || 'External beekeeper')
            : (dist.recipient_name && dist.recipient_email && dist.recipient_name !== dist.recipient_email
                ? `${dist.recipient_name} (${dist.recipient_email})`
                : dist.recipient_name || dist.recipient_email || 'Unknown')
          const locationParts = isExternal ? [] : [
            dist.recipient_apiary_grid_reference ? `Grid: ${dist.recipient_apiary_grid_reference}` : null,
            dist.recipient_apiary_elevation != null ? `Elev: ${dist.recipient_apiary_elevation}m` : null,
            (dist.recipient_apiary_latitude != null && dist.recipient_apiary_longitude != null)
              ? `${dist.recipient_apiary_latitude.toFixed(4)}\u00b0, ${dist.recipient_apiary_longitude.toFixed(4)}\u00b0`
              : null,
          ].filter(Boolean)
          return (
            <div
              key={dist.id}
              className="flex items-center gap-3 p-3 bg-surface-elevated dark:bg-surface-elevated rounded-lg border border-border"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    Cell #{dist.cell_number}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${distTypeInfo.color}`}>
                    {distTypeInfo.label}
                  </span>
                </div>
                <div className="text-xs text-text-secondary mt-1 break-words">
                  Distributed to {recipientDisplay}
                </div>
                <div className="text-xs text-text-secondary mt-0.5 break-words">
                  {!isExternal && dist.recipient_apiary_name
                    ? <>to {dist.recipient_apiary_name}{dist.recipient_hive_number && `, Hive ${dist.recipient_hive_number}`} on {formatDateIrish(dist.distribution_date)}</>
                    : <>on {formatDateIrish(dist.distribution_date)}</>
                  }
                </div>
                {isExternal ? (
                  <>
                    {dist.external_recipient_location && (
                      <div className="text-xs text-text-tertiary mt-0.5">
                        Location: {dist.external_recipient_location}
                      </div>
                    )}
                    {dist.external_recipient_phone && (
                      <div className="text-xs text-text-tertiary mt-0.5">
                        Tel: {dist.external_recipient_phone}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {locationParts.length > 0 && (
                      <div className="text-xs text-text-tertiary mt-0.5">
                        {locationParts.join(' \u2022 ')}
                      </div>
                    )}
                  </>
                )}
                {(graft?.queen_marked || graft?.queen_number) && (
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {[
                      graft.queen_marked ? 'Queen marked' : null,
                      graft.queen_number ? `Queen #${graft.queen_number}` : null,
                    ].filter(Boolean).join(' \u2022 ')}
                  </div>
                )}
                {dist.mating_confirmed && dist.mating_confirmed_date && (
                  <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    Mated: {formatDateIrish(dist.mating_confirmed_date)}
                    {dist.mating_location && <> at {dist.mating_location}</>}
                  </div>
                )}
                {dist.distribution_type === 'virgin_queen' && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 italic">
                    Track via Virgin Queen Tracker
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {dist.distribution_type !== 'mated_queen' && (
                  <IconButton
                    type="button"
                    onClick={() => setMatingModalDist(dist)}
                    size="sm"
                    className={`p-2 rounded text-xs ${
                      dist.mating_confirmed
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-surface-secondary text-text-tertiary border border-border'
                    }`}
                    title={dist.mating_confirmed ? `Mating confirmed ${dist.mating_confirmed_date ? formatDateIrish(dist.mating_confirmed_date) : ''}`.trim() : 'Confirm mating'}
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
          )
        })}
      </div>

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
