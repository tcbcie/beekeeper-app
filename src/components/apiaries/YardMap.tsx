'use client'
import { useState } from 'react'
import {
  DndContext,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Compass } from 'lucide-react'
import { useApiaryMap, type EntranceDirection } from '@/hooks/useApiaryMap'
import HiveToken from './HiveToken'
import HiveInspectorPanel from './HiveInspectorPanel'

const CANVAS_ID = 'yard-canvas'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

interface YardMapProps {
  apiaryId: string
}

export default function YardMap({ apiaryId }: YardMapProps) {
  const { hives, loading, isOwner, saveHivePlacement } = useApiaryMap(apiaryId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isReadOnly = !isOwner

  // A small activation distance so a tap can still select without starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const { setNodeRef: setCanvasRef } = useDroppable({ id: CANVAS_ID })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    // Only persist when dropped onto the yard canvas.
    if (!over || over.id !== CANVAS_ID) return

    const activeRect = active.rect.current.translated
    const canvasRect = over.rect
    if (!activeRect || !canvasRect.width || !canvasRect.height) return

    // Convert the dragged token's centre point into a canvas-relative percentage.
    const centreX = activeRect.left + activeRect.width / 2
    const centreY = activeRect.top + activeRect.height / 2
    const map_x = clamp(((centreX - canvasRect.left) / canvasRect.width) * 100, 0, 100)
    const map_y = clamp(((centreY - canvasRect.top) / canvasRect.height) * 100, 0, 100)

    saveHivePlacement(String(active.id), {
      map_x: Math.round(map_x * 100) / 100,
      map_y: Math.round(map_y * 100) / 100,
    })
  }

  if (loading) {
    return <p className="text-text-secondary py-8 text-center">Loading yard map…</p>
  }

  const placedHives = hives.filter(h => h.map_x != null && h.map_y != null)
  const unplacedHives = hives.filter(h => h.map_x == null || h.map_y == null)
  const selectedHive = selectedId ? hives.find(h => h.id === selectedId) ?? null : null

  const handleRotate = (direction: EntranceDirection) => {
    if (!selectedHive) return
    saveHivePlacement(selectedHive.id, { entrance_direction: direction })
  }

  const handleRemove = () => {
    if (!selectedHive) return
    // Nulling the coordinates returns the hive to the unplaced tray.
    saveHivePlacement(selectedHive.id, { map_x: null, map_y: null })
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {isReadOnly && (
          <p className="text-sm text-text-secondary">
            You have view-only access to this apiary, so the layout cannot be changed.
          </p>
        )}

        {/* Yard canvas — a fixed-aspect rectangle representing the bee yard. */}
        <div
          ref={setCanvasRef}
          role="group"
          aria-label="Yard layout. Drag hives to position them within the yard."
          className="relative w-full aspect-[3/2] rounded-xl border-2 border-forest-700 overflow-hidden bg-forest-100 dark:bg-forest-900/40"
        >
          {/* North indicator */}
          <span className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 text-sm font-semibold text-forest-800 dark:text-forest-200">
            <Compass className="w-4 h-4" /> N
          </span>

          {placedHives.length === 0 && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-forest-800 dark:text-forest-200">
              {isReadOnly
                ? 'No hives have been placed on this yard yet.'
                : hives.length === 0
                  ? 'This apiary has no hives yet. Add hives to place them on the yard.'
                  : 'Drag a hive from the tray below onto the yard to place it.'}
            </span>
          )}

          {placedHives.map(hive => (
            <HiveToken
              key={hive.id}
              hive={hive}
              placed
              isReadOnly={isReadOnly}
              selected={selectedId === hive.id}
              onSelect={setSelectedId}
            />
          ))}
        </div>

        {/* Details + entrance control for the selected hive */}
        {selectedHive && (
          <HiveInspectorPanel
            hive={selectedHive}
            isReadOnly={isReadOnly}
            onRotate={handleRotate}
            onRemove={handleRemove}
            onClose={() => setSelectedId(null)}
          />
        )}

        {/* Unplaced tray — drag onto the canvas to place; removed hives return here */}
        {!isReadOnly && unplacedHives.length > 0 && (
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-sm font-medium text-text-secondary mb-2">
              Unplaced hives ({unplacedHives.length})
            </p>
            <div className="flex flex-wrap gap-3">
              {unplacedHives.map(hive => (
                <HiveToken
                  key={hive.id}
                  hive={hive}
                  placed={false}
                  isReadOnly={isReadOnly}
                  selected={selectedId === hive.id}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DndContext>
  )
}
