'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { GripHorizontal } from 'lucide-react'
import { normaliseDeg, type YardBench } from '@/hooks/useApiaryMap'
import { UNIT_PX, BENCH_DEPTH_UNITS, benchLengthUnits, slotOffsetUnits } from '@/lib/yard-geometry'

// dnd-kit's Mouse/Touch sensors listen to mousedown/touchstart, which are
// separate native streams from pointerdown — stop them on rotate handles so
// a rotation gesture can never also start a drag.
const swallowEvent = (e: React.SyntheticEvent) => e.stopPropagation()

const DEPTH_PX = BENCH_DEPTH_UNITS * UNIT_PX
const SLOT_BOX_PX = 64 // dashed slot outline, slightly smaller than a hive token

interface BenchTokenProps {
  bench: YardBench
  isReadOnly: boolean
  selected: boolean
  onSelect: (benchId: string) => void
  /** Persist a new bench rotation (degrees) after the rotate handle is released. */
  onRotate?: (deg: number) => void
}

/**
 * A bench (hive stand) on the 2D yard: a wooden slab with dashed hive slots.
 * Hive tokens standing on the bench cover it, so a grab tab protrudes beyond
 * the front edge — tap it to select, drag it to move the bench (its hives
 * ride along). When selected, a rotate handle orbits one end.
 */
export default function BenchToken({ bench, isReadOnly, selected, onSelect, onRotate }: BenchTokenProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bench:${bench.id}`,
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

  // numeric columns can arrive as strings; coerce before doing arithmetic.
  const rotation = liveDeg ?? Number(bench.rotation_deg ?? 0)
  const lengthPx = benchLengthUnits(bench.capacity) * UNIT_PX

  const dragTransform = transform
    ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
    : ''

  // Free rotation: drag the handle around the bench centre; angle measured
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

    // The handle marks the bench's +x (right-hand) end, which points at
    // 90° screen-angle when rotation is 0 — so rotation = pointer angle − 90°.
    const degFrom = (ev: PointerEvent) =>
      normaliseDeg((Math.atan2(ev.clientX - cx, -(ev.clientY - cy)) * 180) / Math.PI - 90)

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

  return (
    <button
      ref={setRefs}
      type="button"
      onClick={() => onSelect(bench.id)}
      aria-label={`Bench with ${bench.capacity} hive ${bench.capacity === 1 ? 'slot' : 'slots'}, rotated ${Math.round(rotation)} degrees. Drag its tab to move the bench together with its hives.`}
      className={`absolute rounded-lg border-2 select-none
        border-amber-900 bg-amber-800/60 dark:bg-amber-900/50 shadow
        ${selected ? 'ring-2 ring-forest-500 ring-offset-1' : ''}
        ${isReadOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
        ${isDragging ? 'opacity-90' : ''}`}
      style={{
        left: `${Number(bench.map_x)}%`,
        top: `${Number(bench.map_y)}%`,
        width: lengthPx,
        height: DEPTH_PX,
        transform: `${dragTransform} translate(-50%, -50%) rotate(${rotation}deg)`.trim(),
        zIndex: isDragging || selected ? 20 : 5,
        touchAction: 'none',
        overflow: 'visible',
      }}
      {...(isReadOnly ? {} : listeners)}
      {...attributes}
    >
      {/* Dashed outline per hive slot along the bench's long axis. */}
      {Array.from({ length: bench.capacity }).map((_, slot) => (
        <span
          key={slot}
          aria-hidden
          className="absolute top-1/2 rounded-md border-2 border-dashed border-white/50 dark:border-white/30"
          style={{
            left: '50%',
            width: SLOT_BOX_PX,
            height: SLOT_BOX_PX,
            transform: `translate(calc(-50% + ${slotOffsetUnits(slot, bench.capacity) * UNIT_PX}px), -50%)`,
          }}
        />
      ))}

      {/* Grab tab: protrudes beyond the hives standing on the bench so the
          bench stays selectable/draggable even when fully occupied. */}
      {!isReadOnly && (
        <span
          aria-hidden
          className="absolute left-1/2 top-full mt-3 -translate-x-1/2 flex items-center justify-center gap-1 h-9 min-w-[64px] px-2 rounded-md border-2 border-amber-900 bg-amber-700 text-white text-sm font-bold shadow-md"
        >
          <GripHorizontal className="w-4 h-4" /> bench
        </span>
      )}

      {/* Free-rotate handle at the bench's right-hand end when selected. */}
      {selected && !isReadOnly && !!onRotate && (
        <span
          aria-hidden
          onPointerDown={handleRotateStart}
          onMouseDown={swallowEvent}
          onTouchStart={swallowEvent}
          className="pointer-events-auto absolute top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border-2 border-forest-600 bg-white shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center text-forest-700 text-sm font-bold"
          style={{ left: '100%', marginLeft: 14, touchAction: 'none' }}
        >
          ⟳
        </span>
      )}
    </button>
  )
}
