'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { normaliseDeg, type MapHive } from '@/hooks/useApiaryMap'
import { tokenFootprintPx, rotatedBboxHalfPx } from '@/lib/yard-geometry'

// dnd-kit's Mouse/Touch sensors listen to mousedown/touchstart, which are
// separate native streams from pointerdown — stop them on the rotate handle so
// a rotation gesture can never also start a drag.
const swallowEvent = (e: React.SyntheticEvent) => e.stopPropagation()

// The hit container hugs the rotated footprint plus a small margin — a fixed
// oversized container made adjacent nucs grab each other's invisible edges.
const CONTAINER_MARGIN_PX = 8
const MIN_TOUCH_PX = 48

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
  /**
   * Bench anchor: position at a % point plus a pixel offset (the slot centre),
   * so a hive on a bench always sits exactly on its slot at any screen size.
   */
  anchor?: { xPct: number; yPct: number; dxPx: number; dyPx: number }
}

export default function HiveToken({ hive, placed, isReadOnly, selected, onSelect, onRotate, anchor }: HiveTokenProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: hive.id,
    disabled: isReadOnly,
  })

  const buttonRef = useRef<HTMLButtonElement | null>(null)
  // Live angle while the rotate handle is being dragged (null = not rotating).
  const [liveDeg, setLiveDeg] = useState<number | null>(null)
  // Detaches an in-flight rotation's window listeners; doubles as the
  // "already rotating" flag so a second touch can't stack listeners.
  const rotateCleanupRef = useRef<(() => void) | null>(null)

  // Never leave window listeners behind if the token unmounts mid-rotation.
  useEffect(() => () => { rotateCleanupRef.current?.() }, [])

  const setRefs = useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node
    setNodeRef(node)
  }, [setNodeRef])

  const queen = hive.queens?.[0]
  // numeric columns can arrive as strings; coerce before doing arithmetic.
  const rotation = liveDeg ?? Number(hive.rotation_deg ?? 0)
  const isNuc = hive.configuration?.hive_size === 'nuc'
  const { w: fpW, h: fpH } = tokenFootprintPx(isNuc)
  // Hit container = rotated footprint bbox + margin, floored at touch size.
  const { hw, hh } = rotatedBboxHalfPx(fpW, fpH, rotation)
  const containerW = Math.max(MIN_TOUCH_PX, Math.ceil(hw * 2) + CONTAINER_MARGIN_PX)
  const containerH = Math.max(MIN_TOUCH_PX, Math.ceil(hh * 2) + CONTAINER_MARGIN_PX)

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
  const anchorTransform = anchor ? `translate(${anchor.dxPx}px, ${anchor.dyPx}px)` : ''
  const style: React.CSSProperties = placed
    ? {
        position: 'absolute',
        left: `${anchor ? anchor.xPct : hive.map_x ?? 50}%`,
        top: `${anchor ? anchor.yPct : hive.map_y ?? 50}%`,
        width: containerW,
        height: containerH,
        transform: `${dragTransform} ${centreTransform} ${anchorTransform}`.trim(),
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
    if (rotateCleanupRef.current) return // a rotation is already in progress
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
      detach()
      setLiveDeg(null)
      onRotate(Math.round(latest))
    }
    const detach = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      rotateCleanupRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    rotateCleanupRef.current = detach
  }

  const showRotateHandle = placed && selected && !isReadOnly && !!onRotate

  return (
    <button
      ref={setRefs}
      style={style}
      type="button"
      onClick={() => onSelect?.(hive.id)}
      className={`select-none flex items-center justify-center
        ${placed ? 'bg-transparent' : 'p-1'}
        ${isReadOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
        ${isDragging ? 'opacity-90' : ''}`}
      {...(isReadOnly ? {} : listeners)}
      {...attributes}
      aria-label={`Hive ${hive.hive_number}${isNuc ? ' (nuc)' : ''}${hive.rotation_deg != null ? `, rotated ${Math.round(Number(hive.rotation_deg))} degrees` : ''}`}
    >
      {/* Footprint: the hive body seen from above; rotates as a whole. */}
      <span
        className={`relative flex items-center justify-center rounded-md border-2 bg-surface shadow-md
          ${borderTone}
          ${selected ? 'ring-2 ring-forest-500 ring-offset-1' : ''}`}
        style={{
          width: fpW,
          height: fpH,
          transform: placed ? `rotate(${rotation}deg)` : undefined,
        }}
      >
        {/* Entrance: a triangle on the top (front) edge, turning with the body. */}
        {placed && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full h-0 w-0 border-l-[7px] border-r-[7px] border-b-[9px] border-l-transparent border-r-transparent border-b-amber-500"
          />
        )}

        {/* Free-rotate handle above the entrance edge; orbits with the body.
            Pointer-only by design — the inspector's nudge buttons are the
            accessible path, so this is hidden from assistive tech. */}
        {showRotateHandle && (
          <>
            {/* Stem connecting the handle to the hive, so it reads as a
                rotation handle at a glance. */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 -top-4 -translate-x-1/2 h-4 w-0.5 bg-forest-600"
            />
            <span
              aria-hidden
              onPointerDown={handleRotateStart}
              onMouseDown={swallowEvent}
              onTouchStart={swallowEvent}
              className="pointer-events-auto absolute left-1/2 -top-[52px] -translate-x-1/2 h-9 w-9 rounded-full border-2 border-forest-600 bg-white shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center text-forest-700 text-sm font-bold"
              style={{ touchAction: 'none' }}
            >
              ⟳
            </span>
          </>
        )}

        {/* Label counter-rotates so text stays horizontal and readable. */}
        <span
          className="flex flex-col items-center whitespace-nowrap"
          style={{ transform: placed ? `rotate(${-rotation}deg)` : undefined }}
        >
          <span className="text-base font-bold text-foreground leading-none">{hive.hive_number}</span>
          {queen && (
            <span className="mt-0.5 text-sm text-text-secondary leading-none">Q{queen.queen_number}</span>
          )}
        </span>
      </span>
    </button>
  )
}
