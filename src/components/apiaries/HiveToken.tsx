'use client'
import { useDraggable } from '@dnd-kit/core'
import type { MapHive, EntranceDirection } from '@/hooks/useApiaryMap'

const DIRECTION_DEGREES: Record<EntranceDirection, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
}

interface HiveTokenProps {
  hive: MapHive
  // A placed token is absolutely positioned on the canvas; an unplaced one
  // sits in the tray and flows normally.
  placed: boolean
  isReadOnly: boolean
  selected?: boolean
  onSelect?: (hiveId: string) => void
}

export default function HiveToken({ hive, placed, isReadOnly, selected, onSelect }: HiveTokenProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: hive.id,
    disabled: isReadOnly,
  })

  const queen = hive.queens?.[0]

  // Colour the border by colony health so it reads at a glance in the field.
  const borderTone = hive.is_queenless
    ? 'border-red-500'
    : hive.status === 'active'
      ? 'border-forest-600'
      : 'border-border'

  // Compose live drag translation (px) with centering (-50%) for placed tokens.
  const dragTransform = transform
    ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
    : ''
  const centreTransform = placed ? 'translate(-50%, -50%)' : ''
  const style: React.CSSProperties = placed
    ? {
        position: 'absolute',
        left: `${hive.map_x ?? 50}%`,
        top: `${hive.map_y ?? 50}%`,
        transform: `${dragTransform} ${centreTransform}`.trim(),
        zIndex: isDragging || selected ? 30 : 10,
        touchAction: 'none',
      }
    : {
        transform: dragTransform,
        zIndex: isDragging ? 30 : undefined,
        touchAction: 'none',
      }

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={() => onSelect?.(hive.id)}
      className={`relative flex flex-col items-center justify-center rounded-lg border-2 bg-surface px-3 py-2 min-w-[64px] min-h-[56px] shadow-md select-none
        ${borderTone}
        ${selected ? 'ring-2 ring-forest-500 ring-offset-1' : ''}
        ${isReadOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
        ${isDragging ? 'opacity-90' : ''}`}
      {...(isReadOnly ? {} : listeners)}
      {...attributes}
      aria-label={`Hive ${hive.hive_number}${hive.entrance_direction ? `, entrance facing ${hive.entrance_direction}` : ''}`}
    >
      {/* Entrance arrow: an upright triangle rotated around the token centre. */}
      {hive.entrance_direction && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ transform: `rotate(${DIRECTION_DEGREES[hive.entrance_direction]}deg)` }}
        >
          <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full h-0 w-0 border-l-[7px] border-r-[7px] border-b-[9px] border-l-transparent border-r-transparent border-b-amber-500" />
        </span>
      )}

      <span className="text-lg font-bold text-foreground leading-none">{hive.hive_number}</span>
      {queen && (
        <span className="mt-0.5 text-sm text-text-secondary leading-none">Q{queen.queen_number}</span>
      )}
    </button>
  )
}
