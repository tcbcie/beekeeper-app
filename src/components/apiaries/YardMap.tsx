'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  type DragMoveEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import {
  ArrowUp, Check, DoorOpen, Move, Pencil, Plus, Printer, RotateCcw, RotateCw, Ruler, Trash2, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import {
  useApiaryMap, normaliseDeg, isHivePlaced,
  type MapHive, type YardBench, type HivePlacementPatch, type BenchPlacementPatch,
} from '@/hooks/useApiaryMap'
import {
  UNIT_PX, BENCH_DEPTH_UNITS, SLOT_UNITS,
  slotOffsetUnits, slotPositionPct, rotatedOffset, gridPcts,
  tokenFootprintUnits, rotatedBboxHalfPx, benchLengthUnits, snapPctToGrid,
  type YardDims,
} from '@/lib/yard-geometry'
import { printImageDataUrl, downloadDataUrl, printedOnLabel, excludeNoPrint } from '@/lib/print-layout'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import IconButton from '@/components/ui/IconButton'
import Button from '@/components/ui/Button'
import HiveToken from './HiveToken'
import BenchToken from './BenchToken'
import HiveInspectorPanel from './HiveInspectorPanel'

const CANVAS_ID = 'yard-canvas'
const NORTH_STEP_DEG = 15
const BENCH_STEP_DEG = 15
const SLOT_ID_PATTERN = /^bench:(.+):slot:(\d+)$/
// Zoom steps as a multiple of "the whole apiary fits the screen width".
const ZOOM_STEPS = [1, 1.5, 2.25, 3.5, 5]
// No point zooming in past this scale: a hive is already about 80px across.
const MAX_PX_PER_UNIT = 90

/** Dashed outline previewing where the dragged item will land. */
interface DropGhost {
  xPct: number
  yPct: number
  wPx: number
  hPx: number
}

type CanvasClick = (xPct: number, yPct: number, clientX: number, clientY: number) => void

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// The droppable MUST be registered from inside <DndContext>, so it lives in its
// own child component. Registering it in YardMap (the DndContext's parent) would
// bind it to the default context, leaving the drag with no drop target.
function YardCanvas({
  children,
  onCanvasClick,
  canvasElRef,
  dims,
  zoom,
}: {
  children: React.ReactNode
  onCanvasClick?: CanvasClick
  canvasElRef: React.MutableRefObject<HTMLDivElement | null>
  dims: YardDims
  zoom: number
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
    onCanvasClick(Math.round(x * 100) / 100, Math.round(y * 100) / 100, e.clientX, e.clientY)
  }

  const grid = gridPcts(dims)

  // At zoom 1 the whole apiary fits the screen width; zooming in makes the
  // canvas wider than the screen and it scrolls sideways inside this wrapper.
  return (
    <div className="overflow-x-auto">
      <div
        ref={setRefs}
        role="group"
        aria-label="Apiary layout, showing where each hive and bench stands."
        onClick={handleClick}
        className={`relative rounded-xl border-2 border-forest-700 overflow-hidden bg-forest-100 dark:bg-forest-900/40 ${onCanvasClick ? 'cursor-crosshair' : ''}`}
        style={{
          width: `${zoom * 100}%`,
          aspectRatio: `${dims.widthUnits} / ${dims.depthUnits}`,
          // Placement-grid dots at every intersection everything snaps to.
          backgroundImage: 'radial-gradient(circle at 0 0, rgba(22, 101, 52, 0.35) 1.5px, transparent 1.5px)',
          backgroundSize: `${grid.x}% ${grid.y}%`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** What the borders and marks on the map mean. */
function MapLegend() {
  const swatch = 'inline-block h-5 w-5 shrink-0 rounded border-2 bg-surface'
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-secondary" aria-label="What the map shows">
      <li className="flex items-center gap-2">
        <span aria-hidden className={`${swatch} border-forest-600`} /> Active hive
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className={`${swatch} border-red-500 relative`}>
          <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-sm font-bold leading-none">!</span>
        </span>
        Queenless
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className={`${swatch} border-border`} /> Not active
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="inline-block h-0 w-0 border-l-[7px] border-r-[7px] border-b-[9px] border-l-transparent border-r-transparent border-b-amber-500" />
        Hive entrance side
      </li>
    </ul>
  )
}

interface YardMapProps {
  apiaryId: string
}

export default function YardMap({ apiaryId }: YardMapProps) {
  const {
    apiaryName, hives, benches, yard, yardDims, loading, loadFailed, isOwner,
    saveHivePlacement, saveYardSettings, saveYardDimensions, addBench, saveBenchPlacement, deleteBench, retry,
  } = useApiaryMap(apiaryId)
  const toast = useToast()
  const confirm = useConfirm()
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null)
  // The map opens for viewing. Only "Arrange" lets things be moved, so a finger
  // resting on a hive at the apiary cannot shift it by accident.
  const [arranging, setArranging] = useState(false)
  const [zoom, setZoom] = useState(1)
  // Tap-to-place, the visible alternative to dragging: the next tap on the map
  // is where this hive or bench goes.
  const [moving, setMoving] = useState<{ kind: 'hive' | 'bench'; id: string } | null>(null)
  const [placingEntrance, setPlacingEntrance] = useState(false)
  const [benchCapacity, setBenchCapacity] = useState(2)
  const [ghost, setGhost] = useState<DropGhost | null>(null)
  const [resizing, setResizing] = useState(false)
  const [widthInput, setWidthInput] = useState('')
  const [depthInput, setDepthInput] = useState('')
  // Live canvas element so drop maths always uses the current viewport rect.
  const canvasElRef = useRef<HTMLDivElement | null>(null)
  // True-to-scale rendering: 1 scene unit = canvasWidth / widthUnits pixels,
  // exactly like the 3D view — the two views can never disagree about sizes.
  const [canvasWidth, setCanvasWidth] = useState<number | null>(null)
  const pxPerUnit = canvasWidth ? canvasWidth / yardDims.widthUnits : UNIT_PX
  // Tokens can only be moved or turned by the owner, and only while arranging.
  const isReadOnly = !isOwner || !arranging

  useEffect(() => {
    const el = canvasElRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width
      if (width) setCanvasWidth(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading, loadFailed])

  // An owner opening a map with nothing on it is there to set it up: start in
  // arrange mode, once.
  const autoArrangeDoneRef = useRef(false)
  useEffect(() => {
    if (loading || loadFailed || autoArrangeDoneRef.current) return
    autoArrangeDoneRef.current = true
    const benchIds = new Set(benches.map(b => b.id))
    if (isOwner && benches.length === 0 && !hives.some(h => isHivePlaced(h, benchIds))) setArranging(true)
  }, [loading, loadFailed, isOwner, benches, hives])

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

  const stopArranging = () => {
    setArranging(false)
    setMoving(null)
    setPlacingEntrance(false)
    setResizing(false)
  }

  /**
   * Save a hive change and, once it is saved, say so with an Undo that puts the
   * hive back exactly as it was. `done` is null for the small turn buttons,
   * whose readout already shows the result.
   */
  const changeHive = async (hiveId: string, patch: HivePlacementPatch, done: string | null) => {
    const before = hives.find(h => h.id === hiveId)
    if (!before) return
    const previous: HivePlacementPatch = {
      map_x: before.map_x,
      map_y: before.map_y,
      rotation_deg: before.rotation_deg,
      bench_id: before.bench_id,
      bench_slot: before.bench_slot,
    }
    const saved = await saveHivePlacement(hiveId, patch)
    if (saved && done) {
      toast.undoable(`Hive ${before.hive_number} ${done}`, () => { saveHivePlacement(hiveId, previous) })
    }
  }

  /** As changeHive, for a bench (its hives go with it, and come back with it). */
  const changeBench = async (benchId: string, patch: BenchPlacementPatch, done: string | null) => {
    const before = benches.find(b => b.id === benchId)
    if (!before) return
    const previous: BenchPlacementPatch = {
      map_x: Number(before.map_x),
      map_y: Number(before.map_y),
      rotation_deg: Number(before.rotation_deg),
    }
    const saved = await saveBenchPlacement(benchId, patch)
    if (saved && done) {
      toast.undoable(`Bench ${done}`, () => { saveBenchPlacement(benchId, previous) })
    }
  }

  /** The dragged item's rotated bounding box, for sizing the drop ghost. */
  const draggedBboxPx = (idStr: string): { w: number; h: number } | null => {
    if (idStr.startsWith('bench:')) {
      const bench = benches.find(b => b.id === idStr.slice('bench:'.length))
      if (!bench) return null
      const { hw, hh } = rotatedBboxHalfPx(
        benchLengthUnits(bench.capacity) * pxPerUnit,
        BENCH_DEPTH_UNITS * pxPerUnit,
        Number(bench.rotation_deg ?? 0),
      )
      return { w: hw * 2, h: hh * 2 }
    }
    const hive = hives.find(h => h.id === idStr)
    if (!hive) return null
    const fp = tokenFootprintUnits(hive.configuration?.hive_size === 'nuc')
    const { hw, hh } = rotatedBboxHalfPx(fp.w * pxPerUnit, fp.h * pxPerUnit, Number(hive.rotation_deg ?? 0))
    return { w: hw * 2, h: hh * 2 }
  }

  /** Live preview: show the grid cell the dragged item will land on. */
  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over } = event
    const canvasRect = canvasElRef.current?.getBoundingClientRect()
    const activeRect = active.rect.current.translated
    if (!canvasRect || !canvasRect.width || !canvasRect.height || !activeRect) {
      setGhost(null)
      return
    }

    const idStr = String(active.id)
    const overId = over ? String(over.id) : null
    const overSlot = overId != null && SLOT_ID_PATTERN.test(overId)
    // A hive hovering a bench slot is previewed by the slot's own highlight.
    if (!overId || (overSlot && !idStr.startsWith('bench:'))) {
      setGhost(null)
      return
    }

    const bbox = draggedBboxPx(idStr)
    if (!bbox) {
      setGhost(null)
      return
    }

    const centreX = activeRect.left + activeRect.width / 2
    const centreY = activeRect.top + activeRect.height / 2
    const snapped = snapPctToGrid(
      ((centreX - canvasRect.left) / canvasRect.width) * 100,
      ((centreY - canvasRect.top) / canvasRect.height) * 100,
      yardDims,
    )
    // Keep the same object while the target cell is unchanged — the map only
    // re-renders when the ghost actually moves to another intersection.
    setGhost(prev =>
      prev && prev.xPct === snapped.x && prev.yPct === snapped.y && prev.wPx === bbox.w
        ? prev
        : { xPct: snapped.x, yPct: snapped.y, wPx: bbox.w, hPx: bbox.h },
    )
  }

  /**
   * The bench (and nearest slot) whose footprint contains a viewport point —
   * a hive dropped onto a bench's body clearly means "put it on this bench",
   * even when it missed a slot's drop zone. Prevents ground hives standing
   * through a bench.
   */
  const benchAtPoint = (
    px: { x: number; y: number },
    rect: { left: number; top: number; width: number; height: number },
  ): { bench: YardBench; slot: number } | null => {
    const ppu = rect.width / yardDims.widthUnits
    for (const bench of benches) {
      const bx = rect.left + (Number(bench.map_x) / 100) * rect.width
      const by = rect.top + (Number(bench.map_y) / 100) * rect.height
      const t = (Number(bench.rotation_deg ?? 0) * Math.PI) / 180
      const dx = px.x - bx
      const dy = px.y - by
      // Inverse-rotate into bench-local coordinates (clockwise, y-down).
      const lx = dx * Math.cos(t) + dy * Math.sin(t)
      const ly = -dx * Math.sin(t) + dy * Math.cos(t)
      if (
        Math.abs(lx) <= (benchLengthUnits(bench.capacity) * ppu) / 2 &&
        Math.abs(ly) <= (BENCH_DEPTH_UNITS * ppu) / 2
      ) {
        const idx = Math.round(lx / (SLOT_UNITS * ppu) + (bench.capacity - 1) / 2)
        return { bench, slot: Math.min(bench.capacity - 1, Math.max(0, idx)) }
      }
    }
    return null
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

  /** Placement for a hive put on a bench slot (or the nearest free one); null when the bench is full. */
  const benchSlotPatch = (bench: YardBench, requested: number, hiveId: string): HivePlacementPatch | null => {
    const target = resolveFreeSlot(bench, requested, hiveId)
    if (target == null) {
      toast.error('This bench is full')
      return null
    }
    const pos = slotPositionPct(bench, target, yardDims)
    return {
      bench_id: bench.id,
      bench_slot: target,
      map_x: pos.x,
      map_y: pos.y,
      rotation_deg: normaliseDeg(Math.round(Number(bench.rotation_deg))),
    }
  }

  /**
   * Placement for a hive put down at a viewport point: on the bench under that
   * point if there is one (never leave a ground hive standing through a
   * bench), otherwise on the nearest grid intersection. Shared by drag-and-drop
   * and tap-to-place. Alignment is by construction — every hive and bench sits
   * on the same intersections.
   */
  const groundOrBenchPatch = (
    hiveId: string,
    px: { x: number; y: number },
    rect: { left: number; top: number; width: number; height: number },
  ): HivePlacementPatch | null => {
    const onBench = benchAtPoint(px, rect)
    if (onBench) return benchSlotPatch(onBench.bench, onBench.slot, hiveId)
    const snapped = snapPctToGrid(
      clamp(((px.x - rect.left) / rect.width) * 100, 0, 100),
      clamp(((px.y - rect.top) / rect.height) * 100, 0, 100),
      yardDims,
    )
    return { map_x: snapped.x, map_y: snapped.y, bench_id: null, bench_slot: null }
  }

  /** "placed on the map" for a hive coming from the tray, "moved" otherwise. */
  const placedOrMoved = (hiveId: string) => {
    const hive = hives.find(h => h.id === hiveId)
    const benchIds = new Set(benches.map(b => b.id))
    return hive && isHivePlaced(hive, benchIds) ? 'moved' : 'placed on the map'
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setGhost(null)
    const { active, over } = event
    if (!over) return

    // Live viewport rect of the canvas — not dnd-kit's drag-start snapshot.
    const canvasRect = canvasElRef.current?.getBoundingClientRect()
    const activeRect = active.rect.current.translated
    if (!canvasRect || !canvasRect.width || !canvasRect.height || !activeRect) return

    // The dragged item's centre point.
    const centrePx = {
      x: activeRect.left + activeRect.width / 2,
      y: activeRect.top + activeRect.height / 2,
    }

    const idStr = String(active.id)
    const overId = String(over.id)

    // Bench move: any target inside the apiary counts (the pointer may sit over
    // a slot droppable rather than the canvas itself). Lands on the grid.
    if (idStr.startsWith('bench:')) {
      if (overId !== CANVAS_ID && !SLOT_ID_PATTERN.test(overId)) return
      const snapped = snapPctToGrid(
        clamp(((centrePx.x - canvasRect.left) / canvasRect.width) * 100, 0, 100),
        clamp(((centrePx.y - canvasRect.top) / canvasRect.height) * 100, 0, 100),
        yardDims,
      )
      changeBench(idStr.slice('bench:'.length), { map_x: snapped.x, map_y: snapped.y }, 'moved')
      return
    }

    // Hive dropped on a bench slot: land it there (or the nearest free slot).
    const slotMatch = overId.match(SLOT_ID_PATTERN)
    const slotBench = slotMatch ? benches.find(b => b.id === slotMatch[1]) : undefined
    const patch = slotMatch && slotBench
      ? benchSlotPatch(slotBench, Number(slotMatch[2]), idStr)
      : overId === CANVAS_ID
        ? groundOrBenchPatch(idStr, centrePx, canvasRect)
        : null
    if (patch) changeHive(idStr, patch, placedOrMoved(idStr))
  }

  if (loading) {
    return (
      <div role="status">
        <span className="sr-only">Loading apiary map…</span>
        <Skeleton className="w-full aspect-[3/2] rounded-xl" />
      </div>
    )
  }

  // Nothing loaded: say so and offer another go, rather than an empty map that
  // looks like a view-only apiary with no hives.
  if (loadFailed) {
    return (
      <div role="alert" className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-foreground font-medium">The apiary map could not be loaded.</p>
        <p className="text-sm text-text-secondary mt-1 mb-4">Check your signal, then try again.</p>
        <Button tone="success" onClick={retry}>Try again</Button>
      </div>
    )
  }

  const benchById = new Map(benches.map(b => [b.id, b]))
  const placedHives = hives.filter(h => isHivePlaced(h, benchById))
  const unplacedHives = hives.filter(h => !isHivePlaced(h, benchById))
  const selectedHive = selectedId ? hives.find(h => h.id === selectedId) ?? null : null
  const selectedBench = selectedBenchId ? benchById.get(selectedBenchId) ?? null : null
  const movingHive = moving?.kind === 'hive' ? hives.find(h => h.id === moving.id) ?? null : null
  const entrance = yard.yard_entrance_x != null && yard.yard_entrance_y != null
    ? { x: Number(yard.yard_entrance_x), y: Number(yard.yard_entrance_y) }
    : null
  const northAngle = Number(yard.north_angle_deg ?? 0)

  const zoomIndex = Math.max(0, ZOOM_STEPS.indexOf(zoom))
  const canZoomOut = zoomIndex > 0
  const canZoomIn = zoomIndex < ZOOM_STEPS.length - 1 && pxPerUnit < MAX_PX_PER_UNIT

  const rotateHive = (hiveId: string, deg: number, done: string | null) => {
    changeHive(hiveId, { rotation_deg: normaliseDeg(Math.round(deg)) }, done)
  }

  const handleRemove = () => {
    if (!selectedHive) return
    // Nulling the coordinates returns the hive to the unplaced tray.
    changeHive(selectedHive.id, { map_x: null, map_y: null, bench_id: null, bench_slot: null }, 'taken off the map')
  }

  const handleDeleteBench = async (bench: YardBench) => {
    const onBench = hives.filter(h => h.bench_id === bench.id).length
    const ok = await confirm({
      title: 'Delete this bench?',
      message: onBench > 0
        ? `The ${onBench === 1 ? 'hive' : `${onBench} hives`} on it will stay where ${onBench === 1 ? 'it is' : 'they are'}, standing on the ground.`
        : 'The bench will be taken off the map.',
      confirmLabel: 'Delete bench',
      variant: 'danger',
    })
    if (!ok) return
    setSelectedBenchId(null)
    deleteBench(bench.id)
  }

  // A tap on the map while setting the entrance, or while a hive or bench is
  // waiting to be put down. (A tap that lands on a hive or bench reaches here
  // too, after that token's own handler, so the selection set below wins.)
  const handleCanvasClick: CanvasClick = (x, y, clientX, clientY) => {
    if (placingEntrance) {
      setPlacingEntrance(false)
      saveYardSettings({ yard_entrance_x: x, yard_entrance_y: y })
      return
    }
    if (!moving) return
    const rect = canvasElRef.current?.getBoundingClientRect()
    if (!rect || !rect.width || !rect.height) return
    setMoving(null)
    if (moving.kind === 'bench') {
      const snapped = snapPctToGrid(x, y, yardDims)
      changeBench(moving.id, { map_x: snapped.x, map_y: snapped.y }, 'moved')
      selectBench(moving.id)
      return
    }
    const patch = groundOrBenchPatch(moving.id, { x: clientX, y: clientY }, rect)
    if (patch) changeHive(moving.id, patch, placedOrMoved(moving.id))
    selectHive(moving.id)
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
      const title = `${apiaryName ?? 'Apiary'} — Apiary map`
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
    const off = rotatedOffset(slotOffsetUnits(hive.bench_slot, bench.capacity) * pxPerUnit, Number(bench.rotation_deg))
    return { xPct: Number(bench.map_x), yPct: Number(bench.map_y), dxPx: off.dx, dyPx: off.dy }
  }

  const occupiedSlots = (benchId: string) =>
    hives.filter(h => h.bench_id === benchId && h.bench_slot != null).map(h => h.bench_slot as number)

  // One line that says what the next tap on the map will do.
  const tapPrompt = placingEntrance
    ? 'Tap the map where the apiary entrance is.'
    : movingHive
      ? `Tap the map where hive ${movingHive.hive_number} should stand.`
      : moving
        ? 'Tap the map where the bench should stand.'
        : null

  // On a phone the details sit in a panel fixed above the bottom bar, so they
  // are on screen wherever the tapped hive is; on wider screens they follow
  // the map in the page.
  const detailsShell = 'fixed inset-x-3 z-40 above-bottom-nav max-h-[45dvh] overflow-y-auto md:static md:inset-auto md:z-auto md:max-h-none md:overflow-visible'

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setGhost(null)}
    >
      <div className="space-y-4">
        {/* Map controls: zoom, print, and the switch into arranging. */}
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Zoom" className="flex items-center gap-1">
            <IconButton
              onClick={() => setZoom(ZOOM_STEPS[zoomIndex - 1])}
              disabled={!canZoomOut}
              aria-label="Zoom out"
              className="min-h-[48px] min-w-[48px]"
            >
              <ZoomOut className="w-5 h-5" />
            </IconButton>
            <Button size="sm" tone="neutral" onClick={() => setZoom(1)} disabled={!canZoomOut}>
              Fit
            </Button>
            <IconButton
              onClick={() => setZoom(ZOOM_STEPS[zoomIndex + 1])}
              disabled={!canZoomIn}
              aria-label="Zoom in"
              className="min-h-[48px] min-w-[48px]"
            >
              <ZoomIn className="w-5 h-5" />
            </IconButton>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {!arranging && (
              <Button size="sm" tone="neutral" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" /> Print
              </Button>
            )}
            {isOwner && (arranging ? (
              <Button size="sm" tone="success" onClick={stopArranging}>
                <Check className="w-4 h-4 mr-1" /> Done
              </Button>
            ) : (
              <Button size="sm" tone="neutral" onClick={() => setArranging(true)}>
                <Pencil className="w-4 h-4 mr-1" /> Arrange
              </Button>
            ))}
          </div>
        </div>

        {!isOwner && (
          <p className="text-sm text-text-secondary">
            You have view-only access to this apiary, so the layout cannot be changed.
            {unplacedHives.length > 0 && ` ${unplacedHives.length} ${unplacedHives.length === 1 ? 'hive is' : 'hives are'} not on the map yet.`}
          </p>
        )}

        {arranging && (
          tapPrompt ? (
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-forest-600 bg-surface p-3">
              <p className="flex-1 font-medium text-foreground">{tapPrompt}</p>
              <Button size="sm" tone="neutral" onClick={() => { setMoving(null); setPlacingEntrance(false) }}>
                Cancel
              </Button>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              Press and hold a hive, then drag it to its place. Or tap a hive and choose Move. Changes are saved as you make them.
            </p>
          )
        )}

        {/* Apiary canvas — the apiary rectangle at its real proportions. */}
        <YardCanvas
          onCanvasClick={arranging && (placingEntrance || moving) ? handleCanvasClick : undefined}
          canvasElRef={canvasElRef}
          dims={yardDims}
          zoom={zoom}
        >
          {/* North indicator (user-adjustable) */}
          <span className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 text-sm font-semibold text-forest-800 dark:text-forest-200 z-10">
            <ArrowUp className="w-4 h-4" style={{ transform: `rotate(${northAngle}deg)` }} /> N
          </span>

          {/* Apiary entrance marker */}
          {entrance && (
            <span
              aria-hidden
              className="pointer-events-none absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${entrance.x}%`, top: `${entrance.y}%` }}
            >
              <DoorOpen className="w-6 h-6 text-forest-900 dark:text-forest-100" />
              <span className="text-sm font-semibold text-forest-900 dark:text-forest-100 bg-white/80 dark:bg-black/40 px-1 rounded">
                Entrance
              </span>
            </span>
          )}

          {placedHives.length === 0 && benches.length === 0 && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-forest-800 dark:text-forest-200">
              {hives.length === 0
                ? 'This apiary has no hives yet.'
                : !isOwner
                  ? 'No hives have been placed on this map yet.'
                  : arranging
                    ? 'Drag a hive from below onto the map, or tap it and choose Place on map.'
                    : 'No hives are on the map yet. Choose Arrange to place them.'}
            </span>
          )}

          {/* Drop ghost: the grid cell the dragged item will land on. */}
          {ghost && (
            <span
              aria-hidden
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-dashed border-forest-600 bg-forest-500/15"
              style={{
                left: `${ghost.xPct}%`,
                top: `${ghost.yPct}%`,
                width: ghost.wPx,
                height: ghost.hPx,
              }}
            />
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
              onRotate={(deg) => changeBench(bench.id, { rotation_deg: normaliseDeg(Math.round(deg)) }, 'turned')}
              pxPerUnit={pxPerUnit}
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
              onRotate={(deg) => rotateHive(hive.id, deg, 'turned')}
              anchor={benchAnchor(hive)}
              pxPerUnit={pxPerUnit}
            />
          ))}
        </YardCanvas>

        <MapLegend />

        {isOwner && hives.length === 0 && (
          <Button tone="success" onClick={() => router.push(`/dashboard/hives?apiary=${apiaryId}`)}>
            <Plus className="w-4 h-4 mr-1" /> Add a hive
          </Button>
        )}

        {/* Unplaced tray — drag onto the map, or tap one and choose "Place on map". */}
        {arranging && unplacedHives.length > 0 && (
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-sm font-medium text-text-secondary mb-2">
              Hives not on the map yet ({unplacedHives.length})
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
        {isOwner && !arranging && unplacedHives.length > 0 && (
          <p className="text-sm text-text-secondary">
            {unplacedHives.length} {unplacedHives.length === 1 ? 'hive is' : 'hives are'} not on the map yet. Choose Arrange to place {unplacedHives.length === 1 ? 'it' : 'them'}.
          </p>
        )}

        {/* Map setup, used once and then rarely, so it sits below the map. */}
        {arranging && (
          <div className="space-y-3 border-t border-border pt-4">
            <h2 className="text-lg font-bold text-foreground">Map setup</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                tone={placingEntrance ? 'success' : 'neutral'}
                onClick={() => { setMoving(null); setPlacingEntrance(v => !v) }}
                aria-pressed={placingEntrance}
              >
                <DoorOpen className="w-4 h-4 mr-1" />
                {entrance ? 'Move entrance' : 'Set entrance'}
              </Button>

              <div className="flex items-center gap-1">
                <label htmlFor="bench-capacity" className="sr-only">Bench size (hives)</label>
                <select
                  id="bench-capacity"
                  value={benchCapacity}
                  onChange={(e) => setBenchCapacity(Number(e.target.value))}
                  className="px-2 py-1.5 border border-border rounded-md bg-surface text-foreground text-base min-h-[48px]"
                >
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'hive' : 'hives'}</option>
                  ))}
                </select>
                <Button size="sm" tone="neutral" onClick={() => addBench(benchCapacity)}>
                  <Plus className="w-4 h-4 mr-1" /> Add bench
                </Button>
              </div>

              <Button
                size="sm"
                tone={resizing ? 'success' : 'neutral'}
                aria-pressed={resizing}
                onClick={() => {
                  setWidthInput(String(yard.yard_width_m))
                  setDepthInput(String(yard.yard_depth_m))
                  setResizing(v => !v)
                }}
              >
                <Ruler className="w-4 h-4 mr-1" /> Size: {yard.yard_width_m} × {yard.yard_depth_m} m
              </Button>

              <div className="flex items-center gap-1">
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

            {/* Apiary size editor (metres; positions keep their real-world spots) */}
            {resizing && (
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-3">
                <label className="text-sm font-medium text-text-secondary">
                  Width (m)
                  <input
                    type="number"
                    inputMode="decimal"
                    min={2}
                    max={60}
                    step={0.5}
                    value={widthInput}
                    onChange={(e) => setWidthInput(e.target.value)}
                    className="mt-1 block w-28 px-3 py-2 min-h-[48px] text-base border border-border rounded-md bg-surface text-foreground"
                  />
                </label>
                <label className="text-sm font-medium text-text-secondary">
                  Depth (m)
                  <input
                    type="number"
                    inputMode="decimal"
                    min={2}
                    max={60}
                    step={0.5}
                    value={depthInput}
                    onChange={(e) => setDepthInput(e.target.value)}
                    className="mt-1 block w-28 px-3 py-2 min-h-[48px] text-base border border-border rounded-md bg-surface text-foreground"
                  />
                </label>
                <Button
                  size="sm"
                  tone="success"
                  onClick={() => {
                    const w = Number(widthInput)
                    const d = Number(depthInput)
                    saveYardDimensions(w, d)
                    // Keep the panel open on invalid input (saveYardDimensions
                    // toasts the reason) so the user can correct it in place.
                    const valid = [w, d].every(v => Number.isFinite(v) && v >= 2 && v <= 60)
                    if (valid) setResizing(false)
                  }}
                >
                  Apply
                </Button>
                <Button size="sm" tone="neutral" onClick={() => setResizing(false)}>
                  Cancel
                </Button>
                <p className="basis-full text-sm text-text-secondary">
                  Hives and benches keep their real-world positions when the apiary is resized.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Details for the selected hive; hidden while it waits to be put down
            so the map underneath can be tapped. */}
        {selectedHive && !moving && (
          <div className={detailsShell}>
            <HiveInspectorPanel
              hive={selectedHive}
              isPlaced={isHivePlaced(selectedHive, benchById)}
              isReadOnly={isReadOnly}
              onRotate={(deg) => rotateHive(selectedHive.id, deg, null)}
              onMove={() => { setPlacingEntrance(false); setMoving({ kind: 'hive', id: selectedHive.id }) }}
              onRemove={handleRemove}
              onClose={() => setSelectedId(null)}
              entrance={entrance}
              dims={yardDims}
            />
          </div>
        )}

        {/* Bench details: turn, move, delete */}
        {selectedBench && !moving && (
          <div className={detailsShell}>
            <div className="rounded-lg border border-border bg-surface p-4 shadow-lg md:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Bench for {selectedBench.capacity} {selectedBench.capacity === 1 ? 'hive' : 'hives'}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {occupiedSlots(selectedBench.id).length} of {selectedBench.capacity} places taken
                  </p>
                </div>
                <IconButton onClick={() => setSelectedBenchId(null)} aria-label="Close bench details" className="min-h-[48px] min-w-[48px]">
                  <X className="w-5 h-5" />
                </IconButton>
              </div>

              {!isReadOnly && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-secondary">
                      Turned <span className="font-semibold text-foreground">{Math.round(Number(selectedBench.rotation_deg))}°</span>
                    </span>
                    <IconButton
                      onClick={() => changeBench(selectedBench.id, { rotation_deg: normaliseDeg(Number(selectedBench.rotation_deg) - BENCH_STEP_DEG) }, null)}
                      aria-label={`Turn bench ${BENCH_STEP_DEG} degrees anticlockwise`}
                      className="min-h-[48px] min-w-[48px]"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </IconButton>
                    <IconButton
                      onClick={() => changeBench(selectedBench.id, { rotation_deg: normaliseDeg(Number(selectedBench.rotation_deg) + BENCH_STEP_DEG) }, null)}
                      aria-label={`Turn bench ${BENCH_STEP_DEG} degrees clockwise`}
                      className="min-h-[48px] min-w-[48px]"
                    >
                      <RotateCw className="w-5 h-5" />
                    </IconButton>
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      tone="neutral"
                      onClick={() => { setPlacingEntrance(false); setMoving({ kind: 'bench', id: selectedBench.id }) }}
                    >
                      <Move className="w-4 h-4 mr-1" /> Move
                    </Button>
                    <Button size="sm" tone="danger" onClick={() => handleDeleteBench(selectedBench)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Delete bench
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Room at the end of the page so the fixed details panel on a phone
            never covers the last of the content. */}
        {(selectedHive || selectedBench) && !moving && <div aria-hidden className="h-56 md:hidden" />}
      </div>
    </DndContext>
  )
}
