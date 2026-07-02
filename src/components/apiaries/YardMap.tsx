'use client'
import { useState, useCallback } from 'react'
import {
  DndContext,
  useDroppable,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import { ArrowUp, DoorOpen, RotateCcw, RotateCw } from 'lucide-react'
import { useApiaryMap, normaliseDeg } from '@/hooks/useApiaryMap'
import IconButton from '@/components/ui/IconButton'
import Button from '@/components/ui/Button'
import HiveToken from './HiveToken'
import HiveInspectorPanel from './HiveInspectorPanel'

const CANVAS_ID = 'yard-canvas'
const NORTH_STEP_DEG = 15

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// The droppable MUST be registered from inside <DndContext>, so it lives in its
// own child component. Registering it in YardMap (the DndContext's parent) would
// bind it to the default context, leaving the drag with no drop target.
function YardCanvas({
  children,
  onCanvasClick,
}: {
  children: React.ReactNode
  onCanvasClick?: (x: number, y: number) => void
}) {
  const { setNodeRef } = useDroppable({ id: CANVAS_ID })

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onCanvasClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)
    onCanvasClick(Math.round(x * 100) / 100, Math.round(y * 100) / 100)
  }

  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label="Yard layout. Drag hives to position them within the yard."
      onClick={handleClick}
      className="relative w-full aspect-[3/2] rounded-xl border-2 border-forest-700 overflow-hidden bg-forest-100 dark:bg-forest-900/40"
    >
      {children}
    </div>
  )
}

interface YardMapProps {
  apiaryId: string
}

export default function YardMap({ apiaryId }: YardMapProps) {
  const { hives, yard, loading, isOwner, saveHivePlacement, saveYardSettings } = useApiaryMap(apiaryId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [placingEntrance, setPlacingEntrance] = useState(false)
  const isReadOnly = !isOwner

  // Separate mouse and touch sensors: a single PointerSensor is unreliable at
  // starting a drag on touch devices (our field users are on phones). Mouse
  // uses a small distance so a tap still selects; touch uses a short press-and-
  // hold so a tap can scroll/select but a hold-and-drag moves the hive.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )

  // Prefer the pointer position for drop detection (forgiving for placement),
  // falling back to rectangle overlap so keyboard dragging still works.
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerCollisions = pointerWithin(args)
    return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args)
  }, [])

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
  const entrance = yard.yard_entrance_x != null && yard.yard_entrance_y != null
    ? { x: Number(yard.yard_entrance_x), y: Number(yard.yard_entrance_y) }
    : null
  const northAngle = Number(yard.north_angle_deg ?? 0)

  const rotateHive = (hiveId: string, deg: number) => {
    saveHivePlacement(hiveId, { rotation_deg: normaliseDeg(Math.round(deg)) })
  }

  const handleRemove = () => {
    if (!selectedHive) return
    // Nulling the coordinates returns the hive to the unplaced tray.
    saveHivePlacement(selectedHive.id, { map_x: null, map_y: null })
  }

  const handleCanvasClick = (x: number, y: number) => {
    if (!placingEntrance) return
    setPlacingEntrance(false)
    saveYardSettings({ yard_entrance_x: x, yard_entrance_y: y })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {isReadOnly && (
          <p className="text-sm text-text-secondary">
            You have view-only access to this apiary, so the layout cannot be changed.
          </p>
        )}

        {/* Yard toolbar: entrance marker + adjustable north */}
        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              tone={placingEntrance ? 'success' : 'neutral'}
              onClick={() => setPlacingEntrance(v => !v)}
              aria-pressed={placingEntrance}
            >
              <DoorOpen className="w-4 h-4 mr-1" />
              {placingEntrance ? 'Tap the yard…' : entrance ? 'Move entrance' : 'Set entrance'}
            </Button>
            {placingEntrance && (
              <span className="text-sm text-text-secondary">Tap where you walk into the yard.</span>
            )}

            <div className="ml-auto flex items-center gap-1">
              <span className="text-sm text-text-secondary mr-1">North</span>
              <IconButton
                onClick={() => saveYardSettings({ north_angle_deg: normaliseDeg(northAngle - NORTH_STEP_DEG) })}
                aria-label={`Turn north ${NORTH_STEP_DEG} degrees anticlockwise`}
                className="min-h-[48px] min-w-[48px]"
              >
                <RotateCcw className="w-5 h-5" />
              </IconButton>
              <ArrowUp
                aria-hidden
                className="w-5 h-5 text-forest-700 dark:text-forest-300"
                style={{ transform: `rotate(${northAngle}deg)` }}
              />
              <IconButton
                onClick={() => saveYardSettings({ north_angle_deg: normaliseDeg(northAngle + NORTH_STEP_DEG) })}
                aria-label={`Turn north ${NORTH_STEP_DEG} degrees clockwise`}
                className="min-h-[48px] min-w-[48px]"
              >
                <RotateCw className="w-5 h-5" />
              </IconButton>
            </div>
          </div>
        )}

        {/* Yard canvas — a fixed-aspect rectangle representing the bee yard. */}
        <YardCanvas onCanvasClick={placingEntrance ? handleCanvasClick : undefined}>
          {/* North indicator (user-adjustable) */}
          <span className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 text-sm font-semibold text-forest-800 dark:text-forest-200">
            <ArrowUp className="w-4 h-4" style={{ transform: `rotate(${northAngle}deg)` }} /> N
          </span>

          {/* Yard entrance marker */}
          {entrance && (
            <span
              aria-hidden
              className="pointer-events-none absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${entrance.x}%`, top: `${entrance.y}%` }}
            >
              <DoorOpen className="w-6 h-6 text-forest-900 dark:text-forest-100" />
              <span className="text-[11px] font-semibold text-forest-900 dark:text-forest-100 bg-white/80 dark:bg-black/40 px-1 rounded">
                Entrance
              </span>
            </span>
          )}

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
              onRotate={(deg) => rotateHive(hive.id, deg)}
            />
          ))}
        </YardCanvas>

        {/* Details + rotation control for the selected hive */}
        {selectedHive && (
          <HiveInspectorPanel
            hive={selectedHive}
            isReadOnly={isReadOnly}
            onRotate={(deg) => rotateHive(selectedHive.id, deg)}
            onRemove={handleRemove}
            onClose={() => setSelectedId(null)}
            entrance={entrance}
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
