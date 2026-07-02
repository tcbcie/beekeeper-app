# Feasibility: 3D Apiary View (Rotatable Yard with Rendered Hives)

**Date:** 02/07/2026
**Status:** Assessment (not scheduled)
**Requested by:** Max Dampford

## 1. The idea

Render the apiary as a **3D scene**: each hive drawn as a stack of boxes reflecting its
**current configuration** (brood boxes, supers, queen excluder, floor), placed on a yard
ground-plane at its map position and facing its entrance direction, with the whole yard
**orbitable** — the user can spin, tilt and zoom to view the hives from any angle.

**Verdict: technically feasible, moderate effort.** The data we need already exists, and the
app already ships a WebGL renderer (`mapbox-gl`). The real work is not the 3D maths — it is
keeping a heavy library off the critical path and making orbit controls usable for our
audience. Recommendation: a **time-boxed spike** (see §7) before committing.

## 2. Premise check — what "current configuration" actually is

Worth correcting up front: `hive_type` in this app is the hive's **purpose/origin**
(`Production`, `Bee production`, `Split`, `Swarm`) — **not** a box standard like National or
Langstroth (that only survives as a stale comment in `src/lib/db-schema.ts`). The physical
structure that should drive a 3D model lives in the `configuration` JSONB on the `hives` row
(`src/types/hive.ts:3-16`, `:69`):

| Field | Meaning | 3D use |
| --- | --- | --- |
| `honey_supers` (0–4) | supers stacked on top | N short boxes at the top |
| `brood_boxes_full` (0–4) | full-depth brood boxes | N tall boxes |
| `brood_boxes_half` (0–4) | half/shallow brood boxes | N medium boxes |
| `queen_excluder` (bool) | excluder between brood and supers | thin slab divider |
| `varroa_mesh_floor` (str) | open vs solid floor | base slab |
| `hive_size` (`full`/`nuc`) | nuc renders half-width | box footprint width |
| `frame_orientation` (`warm`/`cold`) | frame direction | (optional) frame lines |

The fixed top-to-bottom stacking order is **already codified** for the 2D card in
`src/components/hive/HiveListCard.tsx:296-356` (supers → excluder → half brood → full brood →
floor). A 3D renderer reuses that exact ordering, extruded upward.

**Key consequence:** we render **parametric boxes** (scaled cuboids), not 3D art assets. There
is no modelling pipeline, no GLTF/mesh downloads, no per-hive geometry to author or store.
Box dimensions and colours are not in the DB today (colours are hard-coded Tailwind; no mm
data) — we define sensible constant box heights/widths in code, as the 2D card already does.

## 3. What we can reuse (data is ready)

Everything the scene needs already exists on the `hives` row:

* **Ground position** — `map_x` / `map_y` (0–100 % of the yard) → map to scene X/Z.
* **Orientation** — `entrance_direction` (8-point compass, already mapped to degrees in
  `HiveToken.tsx`'s `DIRECTION_DEGREES`) → hive yaw; draw an entrance notch on that face.
* **Box stack** — the `configuration` fields above.
* **Identity / status** — `hive_number`, `status`, `is_queenless`, queen info → billboard label
  and colour, identical to the 2D token.
* **Interaction/persistence** — the existing `useApiaryMap` hook, `saveHivePlacement`
  (optimistic + rollback + RLS scoping), the read-only/owner gating, and the
  `HiveInspectorPanel` (details + "Open hive" backlink) can all be reused unchanged. A click on
  a 3D hive opens the same panel.

**One small data gap:** `useApiaryMap`'s current `select(...)` does **not** fetch
`configuration`. Adding `configuration` to that select (and defaulting a sensible stack when it
is `null`) is the only data change required — no migration, no new columns.

## 4. Library options

No 3D library is installed today. Options:

| Option | Notes | Fit |
| --- | --- | --- |
| **react-three-fiber + @react-three/drei** (recommended) | Declarative React wrapper over three.js; `drei` gives `OrbitControls`, `Text`/`Billboard`, `Environment`, `Bounds`. Matches our React 19 component model. | **Best** — least glue code, parametric boxes are trivial |
| Raw three.js | Imperative; more boilerplate, manual React lifecycle wiring. | Workable, more code |
| Reuse `mapbox-gl` custom layer / `deck.gl` | We already ship mapbox WebGL, but extruding parametric hive boxes in a map layer is awkward and ties the feature to Mapbox. | Poor fit |
| `@google/model-viewer` | For pre-authored 3D model files — we have none and want parametric. | Wrong tool |

Cost: `three` + `fiber` + `drei` add roughly **150–200 KB gzipped**. That is the central risk,
addressed below.

## 5. Risks & constraints

* **🔴 Bundle weight vs a struggling perf budget.** The app already misses Core Web Vitals on
  mobile (documented LCP 4.63s, CLS 0.63 in `mobile-performance-lcp-cls.md`). A 3D library must
  therefore live **entirely on its own route**, loaded via `dynamic(() => import(...), { ssr:
  false })` (the established pattern, e.g. the yard-map page), so it never touches the shared or
  critical bundle. Non-negotiable.
* **🟠 Accessibility for a 50+, reduced-eyesight audience.** 3D orbit controls are inherently
  fiddlier than a flat top-down map. Mitigations: keep the **2D yard map as the default**, make
  3D an explicit opt-in ("3D view"); large reset-camera button; constrained orbit (no upside-down);
  camera-facing billboard labels with large text; pinch-zoom + one-finger orbit only. 3D is an
  *enhancement*, not a replacement.
* **🟠 Mobile GPU / battery.** A yard of parametric boxes (dozens of hives × a few boxes each) is
  trivial for any WebGL-capable GPU; use instanced/shared geometry and a capped pixel ratio.
  Real risk is sustained battery drain — pause rendering when idle (`frameloop="demand"`).
* **🟡 WebGL availability / fallback.** ~99% of devices support WebGL, but we must feature-detect
  and fall back to the 2D map with a clear message rather than a blank canvas.
* **🟡 PWA / offline.** The service worker is hand-written (no Workbox). New JS chunks load on
  demand; a first visit while offline would fail to load the 3D bundle — acceptable, since this
  is an online, exploratory view, but the fallback to 2D must cover it.
* **🟢 Editing in 3D.** Dragging hives to reposition is far harder in 3D than the current 2D
  drag. Recommendation: **3D is view-only**; editing stays in the 2D yard map. This keeps scope
  small and avoids a fragile 3D drag interaction.

## 6. Effort estimate

* Parametric hive component (box stack from `configuration`) + scene + `OrbitControls` +
  ground plane + placing hives by `map_x/map_y` and `entrance_direction`: **~2–3 days** for a
  working view.
* Billboard labels, click→inspector reuse, WebGL fallback, `frameloop="demand"`, camera reset,
  touch tuning, and accessibility polish: **~2–3 further days**.
* Total for a shippable, isolated, view-only 3D route: **roughly one week**, low blast radius
  (new route + one added field in `useApiaryMap`'s select; nothing else touched).

## 7. Recommended next step — a spike

Before committing, build a throwaway spike behind a dynamic route
(`/dashboard/apiaries/[id]/map/3d`): add `@react-three/fiber` + `drei`, render the yard ground,
place each hive's parametric box stack from `configuration`, and enable orbit controls. Measure
the added bundle size on that route and test orbit usability on a real mid-range phone. If it
feels good and the isolated bundle is acceptable, promote it to a planned feature with its own
implementation doc; if not, we drop the dependency with nothing else affected.

## 8. Bottom line

* **Possible?** Yes. The data model (`configuration` + `map_x/map_y` + `entrance_direction`)
  already supports it, and parametric boxes avoid any 3D-asset pipeline.
* **Cheap?** No. The cost is bundle isolation and touch/accessibility polish, not the 3D maths.
* **How to de-risk?** A one-route spike, 2D map stays the default, 3D is view-only.

## See also

* `apiary-yard-map.md` — the 2D yard layout this would build on (`map_x`, `map_y`, `entrance_direction`).
* `mobile-performance-lcp-cls.md` / `dashboard-performance.md` — the performance budget any heavy lib must respect.
* `honey-supers-auto-sync.md` / `per-box-brood-frames.md` — how the box configuration is sourced and kept current.
