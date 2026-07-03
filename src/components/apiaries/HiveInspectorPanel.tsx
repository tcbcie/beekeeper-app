'use client'
import Link from 'next/link'
import { RotateCcw, RotateCw, X, ExternalLink, Undo2 } from 'lucide-react'
import IconButton from '@/components/ui/IconButton'
import Button from '@/components/ui/Button'
import { formatQueenlessLabel } from '@/lib/queenless'
import { normaliseDeg, describeQueenLineage, type MapHive } from '@/hooks/useApiaryMap'

const NUDGE_DEG = 15

/**
 * Plain-language readout of where the hive's entrance faces relative to the
 * yard entrance marker — beekeepers think "as I walk in", not in compass terms.
 */
function entranceRelation(hive: MapHive, entrance: { x: number; y: number } | null): string | null {
  if (!entrance || hive.map_x == null || hive.map_y == null || hive.rotation_deg == null) return null
  const bearing = normaliseDeg(
    (Math.atan2(entrance.x - hive.map_x, -(entrance.y - hive.map_y)) * 180) / Math.PI,
  )
  const diff = ((hive.rotation_deg - bearing + 540) % 360) - 180
  if (Math.abs(diff) <= 45) return 'Faces towards the apiary entrance'
  if (Math.abs(diff) >= 135) return 'Faces away from the apiary entrance'
  return diff > 0 ? 'Apiary entrance is to its left' : 'Apiary entrance is to its right'
}

interface HiveInspectorPanelProps {
  hive: MapHive
  isReadOnly: boolean
  onRotate: (deg: number) => void
  onRemove: () => void
  onClose: () => void
  /** Yard entrance marker position (0-100 %), when set on the apiary. */
  entrance?: { x: number; y: number } | null
}

export default function HiveInspectorPanel({ hive, isReadOnly, onRotate, onRemove, onClose, entrance }: HiveInspectorPanelProps) {
  const queen = hive.queens?.[0]
  const isPlaced = (hive.map_x != null && hive.map_y != null) || hive.bench_id != null
  // numeric columns can arrive as strings; coerce before doing arithmetic.
  const rotation = Number(hive.rotation_deg ?? 0)
  const relation = entranceRelation(hive, entrance ?? null)
  const lineage = describeQueenLineage(queen)

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">Hive {hive.hive_number}</h3>
          <p className="text-sm text-text-secondary">
            {hive.is_queenless
              ? formatQueenlessLabel(hive.queenless_reason)
              : queen
                ? `Queen ${queen.queen_number}`
                : 'No queen recorded'}
            {' · '}
            <span className="capitalize">{hive.status}</span>
          </p>
          {lineage && <p className="text-sm text-text-secondary mt-0.5">{lineage}</p>}
          {relation && <p className="text-sm text-text-secondary mt-0.5">{relation}</p>}
          {!isReadOnly && isPlaced && (
            <p className="text-sm text-text-secondary mt-0.5">
              Drag the ⟳ handle above the hive to turn it freely, or use the buttons below.
            </p>
          )}
        </div>
        <IconButton onClick={onClose} aria-label="Close hive details" className="min-h-[48px] min-w-[48px]">
          <X className="w-5 h-5" />
        </IconButton>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!isReadOnly && isPlaced && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              Rotation: <span className="font-semibold text-foreground">{Math.round(rotation)}°</span>
            </span>
            <IconButton
              onClick={() => onRotate(normaliseDeg(rotation - NUDGE_DEG))}
              aria-label={`Rotate ${NUDGE_DEG} degrees anticlockwise`}
              className="min-h-[48px] min-w-[48px]"
            >
              <RotateCcw className="w-5 h-5" />
            </IconButton>
            <IconButton
              onClick={() => onRotate(normaliseDeg(rotation + NUDGE_DEG))}
              aria-label={`Rotate ${NUDGE_DEG} degrees clockwise`}
              className="min-h-[48px] min-w-[48px]"
            >
              <RotateCw className="w-5 h-5" />
            </IconButton>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {!isReadOnly && isPlaced && (
            <Button size="sm" tone="danger" onClick={onRemove}>
              <Undo2 className="w-4 h-4 mr-1" /> Remove from map
            </Button>
          )}
          <Link href={`/dashboard/hives/${hive.id}`}>
            <Button size="sm" tone="neutral">
              <ExternalLink className="w-4 h-4 mr-1" /> Open hive
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
