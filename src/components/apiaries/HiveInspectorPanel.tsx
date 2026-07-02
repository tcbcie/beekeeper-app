'use client'
import Link from 'next/link'
import { RotateCcw, RotateCw, X, ExternalLink, Undo2 } from 'lucide-react'
import IconButton from '@/components/ui/IconButton'
import Button from '@/components/ui/Button'
import { formatQueenlessLabel } from '@/lib/queenless'
import type { MapHive, EntranceDirection } from '@/hooks/useApiaryMap'

// Clockwise order used to cycle the entrance with the rotate controls.
const DIRECTIONS: EntranceDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function nextDirection(current: EntranceDirection | null, step: 1 | -1): EntranceDirection {
  if (!current) return 'N'
  const index = DIRECTIONS.indexOf(current)
  return DIRECTIONS[(index + step + DIRECTIONS.length) % DIRECTIONS.length]
}

interface HiveInspectorPanelProps {
  hive: MapHive
  isReadOnly: boolean
  onRotate: (direction: EntranceDirection) => void
  onRemove: () => void
  onClose: () => void
}

export default function HiveInspectorPanel({ hive, isReadOnly, onRotate, onRemove, onClose }: HiveInspectorPanelProps) {
  const queen = hive.queens?.[0]
  const isPlaced = hive.map_x != null && hive.map_y != null

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
        </div>
        <IconButton onClick={onClose} aria-label="Close hive details" className="min-h-[48px] min-w-[48px]">
          <X className="w-5 h-5" />
        </IconButton>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              Entrance: <span className="font-semibold text-foreground">{hive.entrance_direction ?? '—'}</span>
            </span>
            <IconButton
              onClick={() => onRotate(nextDirection(hive.entrance_direction, -1))}
              aria-label="Rotate entrance anticlockwise"
              className="min-h-[48px] min-w-[48px]"
            >
              <RotateCcw className="w-5 h-5" />
            </IconButton>
            <IconButton
              onClick={() => onRotate(nextDirection(hive.entrance_direction, 1))}
              aria-label="Rotate entrance clockwise"
              className="min-h-[48px] min-w-[48px]"
            >
              <RotateCw className="w-5 h-5" />
            </IconButton>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {!isReadOnly && isPlaced && (
            <Button size="sm" tone="danger" onClick={onRemove}>
              <Undo2 className="w-4 h-4 mr-1" /> Remove from yard
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
