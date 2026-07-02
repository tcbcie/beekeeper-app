'use client'
import { useDraggable } from '@dnd-kit/core'
import { UNIT_PX, BENCH_DEPTH_UNITS, benchLengthUnits, slotOffsetUnits } from '@/lib/yard-geometry'
import type { YardBench } from '@/hooks/useApiaryMap'

const DEPTH_PX = BENCH_DEPTH_UNITS * UNIT_PX
const SLOT_BOX_PX = 64 // dashed slot outline, slightly smaller than a hive token

interface BenchTokenProps {
  bench: YardBench
  isReadOnly: boolean
  selected: boolean
  onSelect: (benchId: string) => void
}

/** A bench (hive stand) on the 2D yard: a wooden slab with dashed hive slots. */
export default function BenchToken({ bench, isReadOnly, selected, onSelect }: BenchTokenProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bench:${bench.id}`,
    disabled: isReadOnly,
  })

  // numeric columns can arrive as strings; coerce before doing arithmetic.
  const rotation = Number(bench.rotation_deg ?? 0)
  const lengthPx = benchLengthUnits(bench.capacity) * UNIT_PX

  const dragTransform = transform
    ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
    : ''

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onSelect(bench.id)}
      aria-label={`Bench with ${bench.capacity} hive ${bench.capacity === 1 ? 'slot' : 'slots'}, rotated ${Math.round(rotation)} degrees`}
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
    </button>
  )
}
