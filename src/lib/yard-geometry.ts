// Shared yard-map geometry. One "unit" ≈ one full hive footprint (0.9 units
// square). The 2D map renders units at a fixed pixel scale; the 3D scene uses
// units directly, so bench slots line up identically in both views.

export const HIVE_UNIT = 0.9
/** Centre-to-centre spacing of bench slots (small gap between hives). */
export const SLOT_UNITS = 1.05
export const BENCH_DEPTH_UNITS = 1.0
/** Height of the bench's standing surface in the 3D scene. */
export const BENCH_TOP_UNITS = 0.38
/** 2D pixels per scene unit (a 68px hive token / 0.9 units). */
export const UNIT_PX = 76

// 2D token footprints in pixels (a full hive is square; a nuc is ~1:2).
export const FULL_TOKEN_PX = { w: 68, h: 68 }
export const NUC_TOKEN_PX = { w: 40, h: 80 }

export function tokenFootprintPx(isNuc: boolean): { w: number; h: number } {
  return isNuc ? NUC_TOKEN_PX : FULL_TOKEN_PX
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
// half-hive-pitch grid (0.5 units), defined in canonical percent space so the
// layout is identical on every device. 0.5 units = 5 % of width; the vertical
// pitch is 1.5× that because the canvas is 3:2.
export const GRID_X_PCT = 5
export const GRID_Y_PCT = 7.5

/** Quantise a canvas-percent point to the nearest grid intersection. */
export function snapPctToGrid(xPct: number, yPct: number): { x: number; y: number } {
  const x = Math.min(100, Math.max(0, Math.round(xPct / GRID_X_PCT) * GRID_X_PCT))
  const y = Math.min(100, Math.max(0, Math.round(yPct / GRID_Y_PCT) * GRID_Y_PCT))
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

// The 3D yard is 10 units wide with a 3:2 aspect, so 1 unit = 10 % of canvas
// width, and a vertical unit spans 15 % of canvas height (10 % × 3/2).
const UNIT_TO_PCT_X = 10
const PCT_Y_PER_PCT_X = 1.5

const clampPct = (v: number) => Math.min(100, Math.max(0, v))

/** A bench slot's centre in canvas-percent space (the stored/canonical form). */
export function slotPositionPct(
  bench: { map_x: number | string; map_y: number | string; rotation_deg: number | string; capacity: number },
  slot: number,
): { x: number; y: number } {
  const u = slotOffsetUnits(slot, bench.capacity) * UNIT_TO_PCT_X
  const { dx, dy } = rotatedOffset(u, Number(bench.rotation_deg))
  return {
    x: Math.round(clampPct(Number(bench.map_x) + dx) * 100) / 100,
    y: Math.round(clampPct(Number(bench.map_y) + dy * PCT_Y_PER_PCT_X) * 100) / 100,
  }
}
