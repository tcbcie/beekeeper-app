'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RotateCcw, RotateCw, X, ExternalLink, Move, Search, Undo2 } from 'lucide-react'
import IconButton from '@/components/ui/IconButton'
import Button from '@/components/ui/Button'
import { formatQueenlessLabel } from '@/lib/queenless'
import { normaliseDeg, describeQueenLineage, type MapHive } from '@/hooks/useApiaryMap'
import type { YardDims } from '@/lib/yard-geometry'
import { hiveMark, type MapView } from '@/lib/apiary-map-view'
import { getCurrentDate } from '@/lib/date-utils'

const NUDGE_DEG = 15

/**
 * Plain-language readout of where the hive's entrance faces relative to the
 * yard entrance marker — beekeepers think "as I walk in", not in compass terms.
 */
export function entranceRelation(hive: MapHive, entrance: { x: number; y: number } | null, dims: YardDims): string | null {
  if (!entrance || hive.map_x == null || hive.map_y == null || hive.rotation_deg == null) return null
  // Positions are % of width and % of depth, which are different distances unless the apiary is
  // square. Scale to real proportions first, as the canvas and hive rotation are (C7a-15).
  const dx = (entrance.x - Number(hive.map_x)) * dims.widthUnits
  const dy = (entrance.y - Number(hive.map_y)) * dims.depthUnits
  const bearing = normaliseDeg((Math.atan2(dx, -dy) * 180) / Math.PI)
  const diff = ((hive.rotation_deg - bearing + 540) % 360) - 180
  if (Math.abs(diff) <= 45) return 'Faces towards the apiary entrance'
  if (Math.abs(diff) >= 135) return 'Faces away from the apiary entrance'
  return diff > 0 ? 'Apiary entrance is to its left' : 'Apiary entrance is to its right'
}

interface HiveInspectorPanelProps {
  hive: MapHive
  /** Whether the hive is on the map (isHivePlaced, the one shared test). */
  isPlaced: boolean
  /**
   * The status views to spell out (inspection, stores, tasks), when the caller
   * loaded them. The 3D view does not, and shows the queen line only.
   */
  statusViews?: MapView[]
  isReadOnly: boolean
  onRotate: (deg: number) => void
  /** Start tap-to-place: the next tap on the map is where the hive goes. */
  onMove?: () => void
  onRemove: () => void
  onClose: () => void
  /** Yard entrance marker position (0-100 %), when set on the apiary. */
  entrance?: { x: number; y: number } | null
  /** Apiary size, to turn % positions into real directions. */
  dims: YardDims
}

export default function HiveInspectorPanel({ hive, isPlaced, statusViews, isReadOnly, onRotate, onMove, onRemove, onClose, entrance, dims }: HiveInspectorPanelProps) {
  const router = useRouter()
  const queen = hive.queens?.[0]
  // numeric columns can arrive as strings; coerce before doing arithmetic.
  const rotation = Number(hive.rotation_deg ?? 0)
  const relation = entranceRelation(hive, entrance ?? null, dims)
  const lineage = describeQueenLineage(queen)
  const today = getCurrentDate()
  const statusLines = (statusViews ?? []).filter(v => v !== 'queens').map(v => ({ view: v, text: hiveMark(hive, v, today).detail }))

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-lg md:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">Hive {hive.hive_number}</h3>
          <p className="text-sm text-text-secondary">
            {hive.is_queenless
              ? formatQueenlessLabel(hive.queenless_reason)
              : queen
                ? <Link href={`/dashboard/queens/${queen.id}`} className="fj-link">Queen {queen.queen_number}</Link>
                : 'No queen recorded'}
            {' · '}
            <span className="capitalize">{hive.status}</span>
          </p>
          {lineage && <p className="text-sm text-text-secondary mt-0.5">{lineage}</p>}
          {statusLines.map(line => (
            <p key={line.view} className="text-sm text-text-secondary mt-0.5">{line.text}</p>
          ))}
          {relation && <p className="text-sm text-text-secondary mt-0.5">{relation}</p>}
          {!isReadOnly && isPlaced && (
            <p className="hidden md:block text-sm text-text-secondary mt-0.5">
              Drag the ⟳ handle above the hive to turn it freely, or use the buttons below.
            </p>
          )}
        </div>
        <IconButton onClick={onClose} aria-label="Close hive details" className="min-h-[48px] min-w-[48px]">
          <X className="w-5 h-5" />
        </IconButton>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!isReadOnly && isPlaced && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              Turned <span className="font-semibold text-foreground">{Math.round(rotation)}°</span>
            </span>
            <IconButton
              onClick={() => onRotate(normaliseDeg(rotation - NUDGE_DEG))}
              aria-label={`Turn hive ${NUDGE_DEG} degrees anticlockwise`}
              className="min-h-[48px] min-w-[48px]"
            >
              <RotateCcw className="w-5 h-5" />
            </IconButton>
            <IconButton
              onClick={() => onRotate(normaliseDeg(rotation + NUDGE_DEG))}
              aria-label={`Turn hive ${NUDGE_DEG} degrees clockwise`}
              className="min-h-[48px] min-w-[48px]"
            >
              <RotateCw className="w-5 h-5" />
            </IconButton>
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!isReadOnly && onMove && (
            <Button size="sm" tone="neutral" onClick={onMove}>
              <Move className="w-4 h-4 mr-1" /> {isPlaced ? 'Move' : 'Place on map'}
            </Button>
          )}
          {!isReadOnly && isPlaced && (
            <Button size="sm" tone="danger" onClick={onRemove}>
              <Undo2 className="w-4 h-4 mr-1" /> Remove from map
            </Button>
          )}
          <Button size="sm" tone="neutral" onClick={() => router.push(`/dashboard/hives/${hive.id}`)}>
            <ExternalLink className="w-4 h-4 mr-1" /> Open hive
          </Button>
          {isReadOnly && (
            <Button size="sm" tone="success" onClick={() => router.push(`/dashboard/records?create=inspection&hive=${hive.id}`)}>
              <Search className="w-4 h-4 mr-1" /> Start inspection
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
