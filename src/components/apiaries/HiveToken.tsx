'use client'
import { useRef, useState, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { normaliseDeg, type MapHive } from '@/hooks/useApiaryMap'

interface HiveTokenProps {
  hive: MapHive
  // A placed token is absolutely positioned on the canvas; an unplaced one
  // sits in the tray and flows normally.
  placed: boolean
  isReadOnly: boolean
  selected?: boolean
  onSelect?: (hiveId: string) => void
  /** Persist a new body rotation (degrees) after the rotate handle is released. */
  onRotate?: (deg: number) => void
}

export default function HiveToken({ hive, placed, isReadOnly, selected, onSelect, onRotate }: HiveTokenProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: hive.id,
    disabled: isReadOnly,
  })

  const buttonRef = useRef<HTMLButtonElement | null>(null)
  // Live angle while the rotate handle is being dragged (null = not rotating).
  const [liveDeg, setLiveDeg] = useState<number | null>(null)

  const setRefs = useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node
    setNodeRef(node)
  }, [setNodeRef])

  const queen = hive.queens?.[0]
  // numeric columns can arrive as strings; coerce before doing arithmetic.
  const rotation = liveDeg ?? Number(hive.rotation_deg ?? 0)

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

  // Free rotation: drag the handle around the token centre; angle is measured
  // clockwise from canvas-up. Saved once on release; live-previewed meanwhile.
  const handleRotateStart = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (isReadOnly || !onRotate) return
    // Keep dnd-kit's drag sensors from hijacking the gesture.
    e.stopPropagation()
    e.preventDefault()

    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const degFrom = (ev: PointerEvent) =>
      normaliseDeg((Math.atan2(ev.clientX - cx, -(ev.clientY - cy)) * 180) / Math.PI)

    let latest = rotation
    const onMove = (ev: PointerEvent) => {
      latest = degFrom(ev)
      setLiveDeg(latest)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setLiveDeg(null)
      onRotate(Math.round(latest))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const showRotateHandle = placed && selected && !isReadOnly && !!onRotate

  return (
    <button
      ref={setRefs}
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
      aria-label={`Hive ${hive.hive_number}${hive.rotation_deg != null ? `, rotated ${Math.round(hive.rotation_deg)} degrees` : ''}`}
    >
      {/* Entrance arrow: an upright triangle rotated around the token centre. */}
      {(placed || hive.rotation_deg != null) && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full h-0 w-0 border-l-[7px] border-r-[7px] border-b-[9px] border-l-transparent border-r-transparent border-b-amber-500" />
        </span>
      )}

      {/* Free-rotate handle: a grip that orbits the token as it turns. */}
      {showRotateHandle && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <span
            onPointerDown={handleRotateStart}
            className="pointer-events-auto absolute left-1/2 -top-7 -translate-x-1/2 h-7 w-7 rounded-full border-2 border-forest-600 bg-white shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center text-forest-700 text-xs font-bold"
            style={{ touchAction: 'none' }}
          >
            ⟳
          </span>
        </span>
      )}

      <span className="text-lg font-bold text-foreground leading-none">{hive.hive_number}</span>
      {queen && (
        <span className="mt-0.5 text-sm text-text-secondary leading-none">Q{queen.queen_number}</span>
      )}
    </button>
  )
}
