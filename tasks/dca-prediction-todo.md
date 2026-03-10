# DCA (Drone Congregation Area) Prediction - Todo

## Overview
Add terrain-based DCA prediction to the community map. Client-side elevation analysis using Open-Meteo batch API. Predictions rendered as a rose/pink toggleable layer following the conservation areas pattern.

**No new DB tables, no new API routes, no new pages.**

---

## Tasks

- [x] **Task 1: Batch Elevation Utility** — `src/lib/elevation.ts`
  - Add `fetchElevationBatch()` that accepts array of `{latitude, longitude}`
  - Chunks into batches of 100 (Open-Meteo limit)
  - Returns `(number | null)[]` matching input order

- [x] **Task 2: DCA Prediction Engine** — `src/lib/dca-prediction.ts` (new)
  - Types: `DCAPrediction`, `DCAFlyway`, `DCAResult`
  - `generateSamplePoints()` — 48 points per apiary (16 directions x 3 rings)
  - `findFlywayDirections()` — average elevations per direction
  - `projectCandidates()` — place candidates along flyway at 2km and 3.5km
  - `scoreCandidate()` — bowl (0-40), donut (0-20), convergence (0-40)
  - `predictDCAs()` — main entry point, returns `{ predictions, flyways }`
  - Filter score > 40, merge within 500m, return top 5

- [x] **Task 3: React Hook** — `src/hooks/useDCAPredictions.ts` (new)
  - `useDCAPredictions(apiaries)` with lazy `calculate(selectedApiaryIds)`
  - localStorage cache with 24h TTL
  - Returns `{ predictions, flyways, loading, error, calculate, clear }`
  - Cap at 10 apiaries

- [x] **Task 4: Community Map Integration** — `src/app/dashboard/community-map/page.tsx`
  - State: `showDCAPredictions`, `selectedDCAApiaries`
  - Layer cleanup: add DCA layers/sources to removal arrays
  - Map layers: `dca-fill`, `dca-outline`, `dca-flyway-lines` (rose/pink #e11d48)
  - Apiary selector panel with checkboxes + "Predict" button
  - Toggle button with Crosshair icon in visibility filters
  - Stats badge entry (rose dot)
  - Legend entry (rose circle with dashed border)
  - Centre markers with popups (score, confidence, contributing apiaries)

- [x] **Task 5: Documentation** — `docs/features/dca-prediction.md`

---

## Review

### Changes Summary

**New files (2):**
- `src/lib/dca-prediction.ts` — Pure-function prediction engine (~220 lines). Samples terrain in 16 directions at 3 distance rings, identifies flyways (lowest elevation directions), projects candidate DCAs at 2km and 3.5km, scores them (bowl shape + donut distance + convergence), merges nearby results, returns top 5.
- `src/hooks/useDCAPredictions.ts` — React hook (~100 lines) with lazy calculation, localStorage cache (24h TTL, keyed by apiary IDs + coordinates), 10-apiary cap, and abort-on-unmount handling.

**Modified files (2):**
- `src/lib/elevation.ts` — Added `fetchElevationBatch()` that accepts arrays of points, chunks into batches of 100, and returns elevations matching input order.
- `src/app/dashboard/community-map/page.tsx` — Added DCA toggle, apiary selector panel, map layers (rose/pink circles + dashed flyway lines), DCA markers with popups, stats badge, and legend entry. Follows conservation areas pattern exactly.

**Documentation (1):**
- `docs/features/dca-prediction.md` — Full feature documentation with algorithm explanation, UI description, file map, and edge cases.

### Architecture Notes
- Entirely client-side — no database tables, no API routes, no new pages
- Prediction engine is pure functions (no side effects) — easy to test
- API calls happen only via the hook's `calculate()` method (lazy, not on mount)
- Results cached in localStorage to avoid repeat API calls for same apiaries
- DCA toggle hidden when user has no apiaries with coordinates

### Code Audit Hardening (post-implementation)
Applied 7 fixes across 3 files:

**Critical:**
- `elevation.ts` — Added 10s AbortController timeout on all fetch calls (prevents permanent UI freeze if API hangs)

**High:**
- `dca-prediction.ts` — Replaced double `apiaries.find()!` non-null assertion with `apiaryMap.get()` + null guard (prevents crash + O(1) lookup)
- `useDCAPredictions.ts` — Replaced boolean abortRef with monotonic callId counter (fixes race condition on concurrent calculate calls)
- `dca-prediction.ts` — Moved `isFlat` detection from global to per-apiary (fixes incorrect scoring when flat + hilly apiaries mixed)
- `useDCAPredictions.ts` — Added structural validation on localStorage cache reads (prevents crash on corrupted cache)

**Medium:**
- `dca-prediction.ts` — Added polar latitude guard to `offsetPoint` (prevents Infinity from division by cos(90°))
- `elevation.ts` — Added NaN/Infinity coordinate sanitisation on input points (prevents malformed API URLs)
- `dca-prediction.ts` — Removed dead `flywayInfo` variable
