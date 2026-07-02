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
