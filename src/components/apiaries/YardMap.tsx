'use client'
import { useState, useCallback, useRef } from 'react'
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
import { ArrowUp, DoorOpen, Plus, Printer, RotateCcw, RotateCw, Trash2, X } from 'lucide-react'
import { useApiaryMap, normaliseDeg, isHivePlaced, type MapHive, type YardBench } from '@/hooks/useApiaryMap'
import { UNIT_PX, slotOffsetUnits, slotPositionPct, rotatedOffset } from '@/lib/yard-geometry'
import { printImageDataUrl, downloadDataUrl, printedOnLabel, excludeNoPrint } from '@/lib/print-layout'
import { useToast } from '@/components/ui/Toast'
import IconButton from '@/components/ui/IconButton'
import Button from '@/components/ui/Button'
import HiveToken from './HiveToken'
import BenchToken from './BenchToken'
import HiveInspectorPanel from './HiveInspectorPanel'

const CANVAS_ID = 'yard-canvas'
const NORTH_STEP_DEG = 15
const BENCH_STEP_DEG = 15
const SLOT_ID_PATTERN = /^bench:(.+):slot:(\d+)$/

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// The droppable MUST be registered from inside <DndContext>, so it lives in its
// own child component. Registering it in YardMap (the DndContext's parent) would
// bind it to the default context, leaving the drag with no drop target.
function YardCanvas({
  children,
  onCanvasClick,
  canvasElRef,
}: {
  children: React.ReactNode
  onCanvasClick?: (x: number, y: number) => void
  canvasElRef: React.MutableRefObject<HTMLDivElement | null>
}) {
  const { setNodeRef } = useDroppable({ id: CANVAS_ID })

  const setRefs = (node: HTMLDivElement | null) => {
    canvasElRef.current = node
    setNodeRef(node)
  }

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
      ref={setRefs}
      role="group"
      aria-label="Apiary layout. Drag hives and benches to position them within the apiary."
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
  const {
    apiaryName, hives, benches, yard, loading, isOwner,
    saveHivePlacement, saveYardSettings, addBench, saveBenchPlacement, deleteBench,
  } = useApiaryMap(apiaryId)
  const toast = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null)
  const [placingEntrance, setPlacingEntrance] = useState(false)
  const [benchCapacity, setBenchCapacity] = useState(2)
  // Live canvas element so drop maths always uses the current viewport rect.
  const canvasElRef = useRef<HTMLDivElement | null>(null)
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

  // Slot-first collision. pointerWithin alone judges the FINGER position, but
  // the user aims by the TOKEN: a hive can visually cover a slot while the
  // finger is off it (grabbed by an edge). So: 1) slot under the pointer wins;
  // 2) otherwise the slot most covered by the dragged rect wins; 3) otherwise
  // pointer/rect against everything (canvas) so ground drops still work.
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerCollisions = pointerWithin(args)
    const pointerSlot = pointerCollisions.find(c => SLOT_ID_PATTERN.test(String(c.id)))
    if (pointerSlot) return [pointerSlot]

    const slotContainers = args.droppableContainers.filter(c => SLOT_ID_PATTERN.test(String(c.id)))
    const tokenSlotHits = rectIntersection({ ...args, droppableContainers: slotContainers })
    if (tokenSlotHits.length > 0) return tokenSlotHits

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

  /** The requested slot if free, else the nearest free slot on the bench. */
  const resolveFreeSlot = (bench: YardBench, requested: number, draggedHiveId: string): number | null => {
    const occupied = new Set(
      hives
        .filter(h => h.bench_id === bench.id && h.id !== draggedHiveId && h.bench_slot != null)
        .map(h => h.bench_slot as number),
    )
    if (!occupied.has(requested)) return requested
    let best: number | null = null
    for (let slot = 0; slot < bench.capacity; slot++) {
      if (occupied.has(slot)) continue
      if (best == null || Math.abs(slot - requested) < Math.abs(best - requested)) best = slot
    }
    return best
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    // Live viewport rect of the canvas — not dnd-kit's drag-start snapshot.
    const canvasRect = canvasElRef.current?.getBoundingClientRect()
    const activeRect = active.rect.current.translated
    if (!canvasRect || !canvasRect.width || !canvasRect.height || !activeRect) return

    // The dragged item's centre point, as canvas percentages.
    const centrePx = {
      x: activeRect.left + activeRect.width / 2,
      y: activeRect.top + activeRect.height / 2,
    }
    const map_x = Math.round(clamp(((centrePx.x - canvasRect.left) / canvasRect.width) * 100, 0, 100) * 100) / 100
    const map_y = Math.round(clamp(((centrePx.y - canvasRect.top) / canvasRect.height) * 100, 0, 100) * 100) / 100

    const idStr = String(active.id)
    const overId = String(over.id)

    // Bench move: any target inside the yard counts (the pointer may sit over
    // a slot droppable rather than the canvas itself).
    if (idStr.startsWith('bench:')) {
      if (overId !== CANVAS_ID && !SLOT_ID_PATTERN.test(overId)) return
      saveBenchPlacement(idStr.slice('bench:'.length), { map_x, map_y })
      return
    }

    // Hive dropped on a bench slot: land it there (or the nearest free slot).
    const slotMatch = overId.match(SLOT_ID_PATTERN)
    if (slotMatch) {
      const bench = benches.find(b => b.id === slotMatch[1])
      if (bench) {
        const target = resolveFreeSlot(bench, Number(slotMatch[2]), idStr)
        if (target == null) {
          toast.error('This bench is full')
          return
        }
        const pos = slotPositionPct(bench, target)
        saveHivePlacement(idStr, {
          bench_id: bench.id,
          bench_slot: target,
          map_x: pos.x,
          map_y: pos.y,
          rotation_deg: normaliseDeg(Math.round(Number(bench.rotation_deg))),
        })
        return
      }
    }

    // Otherwise: place on the ground and clear any bench link.
    if (overId === CANVAS_ID) {
      saveHivePlacement(idStr, {
        map_x,
        map_y,
        bench_id: null,
        bench_slot: null,
      })
    }
  }

  if (loading) {
    return <p className="text-text-secondary py-8 text-center">Loading apiary map…</p>
  }

  const benchById = new Map(benches.map(b => [b.id, b]))
  const placedHives = hives.filter(h => isHivePlaced(h, benchById))
  const unplacedHives = hives.filter(h => !isHivePlaced(h, benchById))
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

  /** Snapshot the map to a PNG and open the browser print dialogue. */
  const handlePrint = async () => {
    const node = canvasElRef.current
    if (!node) return
    // Clear selection so rings and handles don't appear on the printout.
    setSelectedId(null)
    setSelectedBenchId(null)
    await new Promise(resolve => setTimeout(resolve, 80))
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(node, { pixelRatio: 2, filter: excludeNoPrint })
      const title = `${apiaryName ?? 'Apiary'} — Apiary Map`
      if (!printImageDataUrl(dataUrl, title, printedOnLabel())) {
        downloadDataUrl(dataUrl, `${title}.png`)
        toast.info('Pop-up blocked — the map image was downloaded instead.')
      }
    } catch (error) {
      console.error('Error printing apiary map:', error)
      toast.error('Could not create the printable map')
    }
  }

  /** Bench anchor for a hive standing on a bench (exact slot at any zoom). */
  const benchAnchor = (hive: MapHive) => {
    if (hive.bench_id == null || hive.bench_slot == null) return undefined
    const bench = benchById.get(hive.bench_id)
    if (!bench) return undefined
    const off = rotatedOffset(slotOffsetUnits(hive.bench_slot, bench.capacity) * UNIT_PX, Number(bench.rotation_deg))
    return { xPct: Number(bench.map_x), yPct: Number(bench.map_y), dxPx: off.dx, dyPx: off.dy }
  }

  const occupiedSlots = (benchId: string) =>
    hives.filter(h => h.bench_id === benchId && h.bench_slot != null).map(h => h.bench_slot as number)

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {isReadOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-text-secondary flex-1">
              You have view-only access to this apiary, so the layout cannot be changed.
            </p>
            <Button size="sm" tone="neutral" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          </div>
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
              {placingEntrance ? 'Tap the map…' : entrance ? 'Move entrance' : 'Set entrance'}
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

            <Button size="sm" tone="neutral" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>

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
        <YardCanvas onCanvasClick={placingEntrance ? handleCanvasClick : undefined} canvasElRef={canvasElRef}>
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
                ? 'No hives have been placed on this map yet.'
                : hives.length === 0
                  ? 'This apiary has no hives yet. Add hives to place them on the map.'
                  : 'Drag a hive from the tray below onto the map to place it.'}
            </span>
          )}

          {/* Benches render beneath the hives standing on them. */}
          {benches.map(bench => (
            <BenchToken
              key={bench.id}
              bench={bench}
              isReadOnly={isReadOnly}
              selected={selectedBenchId === bench.id}
              occupiedSlots={occupiedSlots(bench.id)}
              onSelect={selectBench}
              onRotate={(deg) => saveBenchPlacement(bench.id, { rotation_deg: normaliseDeg(Math.round(deg)) })}
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
                  {occupiedSlots(selectedBench.id).length} of {selectedBench.capacity} slots occupied
                </p>
                <p className="text-sm text-text-secondary mt-0.5">
                  Drag the wooden tab to move the bench — its hives move with it. Drag the ⟳ handle or use the buttons below to turn it.
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
