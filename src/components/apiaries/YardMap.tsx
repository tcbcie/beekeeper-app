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
import { ArrowUp, DoorOpen, Plus, RotateCcw, RotateCw, Trash2, X } from 'lucide-react'
import { useApiaryMap, normaliseDeg, type MapHive, type YardBench } from '@/hooks/useApiaryMap'
import { UNIT_PX, SLOT_UNITS, slotOffsetUnits, slotPositionPct, rotatedOffset } from '@/lib/yard-geometry'
import IconButton from '@/components/ui/IconButton'
import Button from '@/components/ui/Button'
import HiveToken from './HiveToken'
import BenchToken from './BenchToken'
import HiveInspectorPanel from './HiveInspectorPanel'

const CANVAS_ID = 'yard-canvas'
const NORTH_STEP_DEG = 15
const BENCH_STEP_DEG = 15
// A hive dropped within this distance of a free bench slot snaps onto it.
const SNAP_PX = SLOT_UNITS * UNIT_PX * 0.65

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
      aria-label="Yard layout. Drag hives and benches to position them within the yard."
      onClick={handleClick}
      className="relative w-full aspect-[3/2] rounded-xl border-2 border-forest-700 overflow-hidden bg-forest-100 dark:bg-forest-900/40"
    >
      {children}
    </div>
  )
}

/** Nearest free slot on any bench to a dropped point, in canvas pixels. */
function findSnapSlot(
  dropPx: { x: number; y: number },
  canvasRect: { left: number; top: number; width: number; height: number },
  benches: YardBench[],
  hives: MapHive[],
  draggedHiveId: string,
): { bench: YardBench; slot: number } | null {
  let best: { bench: YardBench; slot: number; dist: number } | null = null
  for (const bench of benches) {
    const centrePx = {
      x: canvasRect.left + (Number(bench.map_x) / 100) * canvasRect.width,
      y: canvasRect.top + (Number(bench.map_y) / 100) * canvasRect.height,
    }
    const occupied = new Set(
      hives
        .filter(h => h.bench_id === bench.id && h.id !== draggedHiveId && h.bench_slot != null)
        .map(h => h.bench_slot as number),
    )
    for (let slot = 0; slot < bench.capacity; slot++) {
      if (occupied.has(slot)) continue
      const off = rotatedOffset(slotOffsetUnits(slot, bench.capacity) * UNIT_PX, Number(bench.rotation_deg))
      const dist = Math.hypot(dropPx.x - (centrePx.x + off.dx), dropPx.y - (centrePx.y + off.dy))
      if (dist <= SNAP_PX && (!best || dist < best.dist)) {
        best = { bench, slot, dist }
      }
    }
  }
  return best ? { bench: best.bench, slot: best.slot } : null
}

interface YardMapProps {
  apiaryId: string
}

export default function YardMap({ apiaryId }: YardMapProps) {
  const {
    hives, benches, yard, loading, isOwner,
    saveHivePlacement, saveYardSettings, addBench, saveBenchPlacement, deleteBench,
  } = useApiaryMap(apiaryId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null)
  const [placingEntrance, setPlacingEntrance] = useState(false)
  const [benchCapacity, setBenchCapacity] = useState(2)
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

  const selectHive = (hiveId: string) => {
    setSelectedId(hiveId)
    setSelectedBenchId(null)
  }
  const selectBench = (benchId: string) => {
    setSelectedBenchId(benchId)
    setSelectedId(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    // Only persist when dropped onto the yard canvas.
    if (!over || over.id !== CANVAS_ID) return

    const activeRect = active.rect.current.translated
    const canvasRect = over.rect
    if (!activeRect || !canvasRect.width || !canvasRect.height) return

    // The dragged item's centre point, in viewport px and canvas %.
    const centrePx = {
      x: activeRect.left + activeRect.width / 2,
      y: activeRect.top + activeRect.height / 2,
    }
    const map_x = clamp(((centrePx.x - canvasRect.left) / canvasRect.width) * 100, 0, 100)
    const map_y = clamp(((centrePx.y - canvasRect.top) / canvasRect.height) * 100, 0, 100)
    const roundedX = Math.round(map_x * 100) / 100
    const roundedY = Math.round(map_y * 100) / 100

    const idStr = String(active.id)
    if (idStr.startsWith('bench:')) {
      saveBenchPlacement(idStr.slice('bench:'.length), { map_x: roundedX, map_y: roundedY })
      return
    }

    // Hive drop: snap to the nearest free bench slot when close enough,
    // otherwise place on the ground and clear any bench link.
    const snap = findSnapSlot(centrePx, canvasRect, benches, hives, idStr)
    if (snap) {
      const pos = slotPositionPct(snap.bench, snap.slot)
      saveHivePlacement(idStr, {
        bench_id: snap.bench.id,
        bench_slot: snap.slot,
        map_x: pos.x,
        map_y: pos.y,
        rotation_deg: normaliseDeg(Math.round(Number(snap.bench.rotation_deg))),
      })
    } else {
      saveHivePlacement(idStr, {
        map_x: roundedX,
        map_y: roundedY,
        bench_id: null,
        bench_slot: null,
      })
    }
  }

  if (loading) {
    return <p className="text-text-secondary py-8 text-center">Loading yard map…</p>
  }

  const benchById = new Map(benches.map(b => [b.id, b]))
  const isPlaced = (h: MapHive) =>
    (h.map_x != null && h.map_y != null) || (h.bench_id != null && benchById.has(h.bench_id))
  const placedHives = hives.filter(isPlaced)
  const unplacedHives = hives.filter(h => !isPlaced(h))
  const selectedHive = selectedId ? hives.find(h => h.id === selectedId) ?? null : null
  const selectedBench = selectedBenchId ? benchById.get(selectedBenchId) ?? null : null
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
    saveHivePlacement(selectedHive.id, { map_x: null, map_y: null, bench_id: null, bench_slot: null })
  }

  const handleCanvasClick = (x: number, y: number) => {
    if (!placingEntrance) return
    setPlacingEntrance(false)
    saveYardSettings({ yard_entrance_x: x, yard_entrance_y: y })
  }

  /** Bench anchor for a hive standing on a bench (exact slot at any zoom). */
  const benchAnchor = (hive: MapHive) => {
    if (hive.bench_id == null || hive.bench_slot == null) return undefined
    const bench = benchById.get(hive.bench_id)
    if (!bench) return undefined
    const off = rotatedOffset(slotOffsetUnits(hive.bench_slot, bench.capacity) * UNIT_PX, Number(bench.rotation_deg))
    return { xPct: Number(bench.map_x), yPct: Number(bench.map_y), dxPx: off.dx, dyPx: off.dy }
  }

  const benchOccupancy = (benchId: string) =>
    hives.filter(h => h.bench_id === benchId).length

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {isReadOnly && (
          <p className="text-sm text-text-secondary">
            You have view-only access to this apiary, so the layout cannot be changed.
          </p>
        )}

        {/* Yard toolbar: entrance marker, benches, adjustable north */}
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

            <div className="flex items-center gap-1">
              <label htmlFor="bench-capacity" className="sr-only">Bench size (hives)</label>
              <select
                id="bench-capacity"
                value={benchCapacity}
                onChange={(e) => setBenchCapacity(Number(e.target.value))}
                className="px-2 py-1.5 border border-border rounded-md bg-surface text-foreground text-sm min-h-[48px]"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'hive' : 'hives'}</option>
                ))}
              </select>
              <Button size="sm" tone="neutral" onClick={() => addBench(benchCapacity)}>
                <Plus className="w-4 h-4 mr-1" /> Add bench
              </Button>
            </div>

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
          <span className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 text-sm font-semibold text-forest-800 dark:text-forest-200 z-10">
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

          {placedHives.length === 0 && benches.length === 0 && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-forest-800 dark:text-forest-200">
              {isReadOnly
                ? 'No hives have been placed on this yard yet.'
                : hives.length === 0
                  ? 'This apiary has no hives yet. Add hives to place them on the yard.'
                  : 'Drag a hive from the tray below onto the yard to place it.'}
            </span>
          )}

          {/* Benches render beneath the hives standing on them. */}
          {benches.map(bench => (
            <BenchToken
              key={bench.id}
              bench={bench}
              isReadOnly={isReadOnly}
              selected={selectedBenchId === bench.id}
              onSelect={selectBench}
            />
          ))}

          {placedHives.map(hive => (
            <HiveToken
              key={hive.id}
              hive={hive}
              placed
              isReadOnly={isReadOnly}
              selected={selectedId === hive.id}
              onSelect={selectHive}
              onRotate={(deg) => rotateHive(hive.id, deg)}
              anchor={benchAnchor(hive)}
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

        {/* Bench inspector: rotate + delete */}
        {selectedBench && (
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Bench — {selectedBench.capacity} {selectedBench.capacity === 1 ? 'slot' : 'slots'}
                </h3>
                <p className="text-sm text-text-secondary">
                  {benchOccupancy(selectedBench.id)} of {selectedBench.capacity} slots occupied
                </p>
              </div>
              <IconButton onClick={() => setSelectedBenchId(null)} aria-label="Close bench details" className="min-h-[48px] min-w-[48px]">
                <X className="w-5 h-5" />
              </IconButton>
            </div>

            {!isReadOnly && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">
                    Rotation: <span className="font-semibold text-foreground">{Math.round(Number(selectedBench.rotation_deg))}°</span>
                  </span>
                  <IconButton
                    onClick={() => saveBenchPlacement(selectedBench.id, { rotation_deg: normaliseDeg(Number(selectedBench.rotation_deg) - BENCH_STEP_DEG) })}
                    aria-label={`Rotate bench ${BENCH_STEP_DEG} degrees anticlockwise`}
                    className="min-h-[48px] min-w-[48px]"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </IconButton>
                  <IconButton
                    onClick={() => saveBenchPlacement(selectedBench.id, { rotation_deg: normaliseDeg(Number(selectedBench.rotation_deg) + BENCH_STEP_DEG) })}
                    aria-label={`Rotate bench ${BENCH_STEP_DEG} degrees clockwise`}
                    className="min-h-[48px] min-w-[48px]"
                  >
                    <RotateCw className="w-5 h-5" />
                  </IconButton>
                </div>

                <Button
                  size="sm"
                  tone="danger"
                  className="ml-auto"
                  onClick={() => { deleteBench(selectedBench.id); setSelectedBenchId(null) }}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete bench
                </Button>
              </div>
            )}
          </div>
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
                  onSelect={selectHive}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DndContext>
  )
}
