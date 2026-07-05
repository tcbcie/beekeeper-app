// Shared yard-map geometry. One "unit" ≈ one full hive footprint (0.9 units
// square), and 1 unit = 0.5 real metres — so a hive is 0.45 m, close to a
// National. The apiary's rectangle is user-set in metres; the 2D map renders
// units at a live pixel scale and the 3D scene uses units directly, so both
// views are true-to-scale at any apiary size.

export const HIVE_UNIT = 0.9
/** Centre-to-centre spacing of bench slots (small gap between hives). */
export const SLOT_UNITS = 1.05
export const BENCH_DEPTH_UNITS = 1.0
/** Height of the bench's standing surface in the 3D scene. */
export const BENCH_TOP_UNITS = 0.38
/**
 * Fallback 2D pixels per scene unit, used before the canvas is measured and
 * for tray tokens. On the canvas itself the live scale is
 * canvasWidth / yard widthUnits.
 */
export const UNIT_PX = 76

/** Scene units per real metre (1 unit = 0.5 m). */
export const UNITS_PER_METRE = 2

/** The apiary rectangle in scene units. */
export interface YardDims {
  widthUnits: number
  depthUnits: number
}

/** Default apiary size: 5.00 m × 3.33 m (the original fixed 3:2 canvas). */
export const DEFAULT_YARD_WIDTH_M = 5
export const DEFAULT_YARD_DEPTH_M = 3.33

export function yardDimsFromMetres(widthM: number, depthM: number): YardDims {
  return {
    widthUnits: widthM * UNITS_PER_METRE,
    depthUnits: depthM * UNITS_PER_METRE,
  }
}

// Token footprints in scene units (a full hive is square; a nuc is 1:2).
export const FULL_TOKEN_UNITS = { w: 0.9, h: 0.9 }
export const NUC_TOKEN_UNITS = { w: 0.45, h: 0.9 }

export function tokenFootprintUnits(isNuc: boolean): { w: number; h: number } {
  return isNuc ? NUC_TOKEN_UNITS : FULL_TOKEN_UNITS
}

/** Half-extents of a w×h footprint's axis-aligned bounding box after rotation. */
export function rotatedBboxHalfPx(w: number, h: number, deg: number): { hw: number; hh: number } {
  const t = (deg * Math.PI) / 180
  return {
    hw: (Math.abs(w * Math.cos(t)) + Math.abs(h * Math.sin(t))) / 2,
    hh: (Math.abs(w * Math.sin(t)) + Math.abs(h * Math.cos(t))) / 2,
  }
}

// Placement grid: everything (hives and benches) lands on intersections of a
// half-hive-pitch grid (0.5 units = 0.25 m), defined in canonical percent
// space so the layout is identical on every device.
const GRID_PITCH_UNITS = 0.5

/** Grid pitch as canvas percentages for the given apiary size. */
export function gridPcts(dims: YardDims): { x: number; y: number } {
  return {
    x: (GRID_PITCH_UNITS / dims.widthUnits) * 100,
    y: (GRID_PITCH_UNITS / dims.depthUnits) * 100,
  }
}

/** Quantise a canvas-percent point to the nearest grid intersection. */
export function snapPctToGrid(xPct: number, yPct: number, dims: YardDims): { x: number; y: number } {
  const grid = gridPcts(dims)
  const x = Math.min(100, Math.max(0, Math.round(xPct / grid.x) * grid.x))
  const y = Math.min(100, Math.max(0, Math.round(yPct / grid.y) * grid.y))
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
}

/** Local offset of a slot centre along the bench's long axis, in units. */
export function slotOffsetUnits(slot: number, capacity: number): number {
  return (slot - (capacity - 1) / 2) * SLOT_UNITS
}

export function benchLengthUnits(capacity: number): number {
  return capacity * SLOT_UNITS + 0.15
}

/**
 * Rotate a local along-bench offset into a screen/scene delta.
 * Screen y-down and scene z share the same sign convention, so this one
 * function serves both views: at 0° the bench's long axis runs left→right.
 */
export function rotatedOffset(u: number, rotationDeg: number): { dx: number; dy: number } {
  const t = (rotationDeg * Math.PI) / 180
  return { dx: u * Math.cos(t), dy: u * Math.sin(t) }
}

const clampPct = (v: number) => Math.min(100, Math.max(0, v))

/** A bench slot's centre in canvas-percent space (the stored/canonical form). */
export function slotPositionPct(
  bench: { map_x: number | string; map_y: number | string; rotation_deg: number | string; capacity: number },
  slot: number,
  dims: YardDims,
): { x: number; y: number } {
  const u = slotOffsetUnits(slot, bench.capacity)
  const { dx, dy } = rotatedOffset(u, Number(bench.rotation_deg))
  return {
    x: Math.round(clampPct(Number(bench.map_x) + (dx / dims.widthUnits) * 100) * 100) / 100,
    y: Math.round(clampPct(Number(bench.map_y) + (dy / dims.depthUnits) * 100) * 100) / 100,
  }
}
