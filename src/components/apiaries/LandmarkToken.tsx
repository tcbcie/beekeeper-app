'use client'
import { useDraggable } from '@dnd-kit/core'
import { Droplets, Fence, TreeDeciduous, Type, Warehouse, type LucideIcon } from 'lucide-react'
import type { LandmarkKind, YardLandmark } from '@/hooks/useApiaryMap'

export const LANDMARK_LABELS: Record<LandmarkKind, string> = {
  shed: 'Shed',
  tree: 'Tree',
  water: 'Water',
  gate: 'Gate',
  label: 'Text label',
}

export const LANDMARK_ICONS: Record<LandmarkKind, LucideIcon> = {
  shed: Warehouse,
  tree: TreeDeciduous,
  water: Droplets,
  gate: Fence,
  label: Type,
}

/** The words shown for a landmark: its own name, or what it is. */
export function landmarkName(landmark: YardLandmark): string {
  return landmark.label?.trim() || LANDMARK_LABELS[landmark.kind]
}

interface LandmarkTokenProps {
  landmark: YardLandmark
  isReadOnly: boolean
  selected: boolean
  onSelect: (landmarkId: string) => void
}

/**
 * A landmark on the apiary map: an icon with its name underneath (a text label
 * is the name alone). Tap to select; the apiary owner can drag it while
 * arranging, or move it with tap-to-place from its details.
 */
export default function LandmarkToken({ landmark, isReadOnly, selected, onSelect }: LandmarkTokenProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `landmark:${landmark.id}`,
    disabled: isReadOnly,
  })
  const Icon = LANDMARK_ICONS[landmark.kind]
  const name = landmarkName(landmark)
  const dragTransform = transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : ''

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onSelect(landmark.id)}
      aria-label={landmark.kind === 'label' ? `Label: ${name}` : `${LANDMARK_LABELS[landmark.kind]}${landmark.label ? `: ${name}` : ''}`}
      className={`absolute flex min-h-[48px] min-w-[48px] select-none flex-col items-center justify-center rounded-md px-1
        ${selected ? 'ring-2 ring-forest-500 bg-white/70 dark:bg-black/40' : ''}
        ${isReadOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
        ${isDragging ? 'opacity-90' : ''}`}
      style={{
        left: `${landmark.map_x}%`,
        top: `${landmark.map_y}%`,
        transform: `${dragTransform} translate(-50%, -50%)`.trim(),
        // Beneath hives and benches, so a landmark never blocks a hive.
        zIndex: isDragging || selected ? 25 : 4,
        touchAction: isReadOnly ? undefined : 'none',
      }}
      {...(isReadOnly ? {} : listeners)}
      {...attributes}
    >
      {landmark.kind !== 'label' && <Icon aria-hidden className="h-7 w-7 text-forest-900 dark:text-forest-100" />}
      <span className="whitespace-nowrap rounded bg-white/80 px-1 text-sm font-semibold text-forest-900 dark:bg-black/40 dark:text-forest-100">
        {name}
      </span>
    </button>
  )
}
