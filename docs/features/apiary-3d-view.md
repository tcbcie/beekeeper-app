# Feature: 3D Apiary View

**Date:** 02/07/2026
**Status:** Implemented

## 1. Overview

A rotatable 3D view of an apiary yard, reached from the 2D Yard Map via **"3D view"**
(`/dashboard/apiaries/[id]/map/3d`). Each hive is drawn as a **parametric stack of boxes** built
from its current `configuration` (brood boxes, half boxes, queen excluder, honey supers, floor),
placed on the ground by its `map_x`/`map_y` and oriented to its `entrance_direction`. The user can
**orbit, tilt and zoom** the whole yard. It is **view-only** — placement/editing stays on the 2D map.

Promoted from the earlier spike (see `apiary-3d-view-feasibility.md`) with hive-number labels and an
accessibility pass.

## 2. How it works

* **Model:** `Hive3D.tsx` builds the box stack bottom→top (floor → full brood → half brood →
  excluder → supers), mirroring the 2D `HiveListCard` order and colours. Nucs render at half width.
  No 3D assets — just scaled cuboids, so there is nothing to author or store.
* **Scene:** `YardScene3D.tsx` renders a react-three-fiber `Canvas` with `frameloop="demand"`
  (renders only on interaction, to save battery), a grass ground-plane + reference grid, and
  `OrbitControls` (pan disabled, tilt clamped above the horizon, min/max zoom distance).
* **Data:** reuses `useApiaryMap` (which now also selects `configuration`). Only hives with both
  `map_x` and `map_y` are shown; unplaced hives are counted and noted.
* **Interaction:** tapping a hive (in 3D or via the accessible list) opens the shared
  `HiveInspectorPanel` in read-only mode — details + **Open hive** backlink.

## 3. Labels & accessibility

* **Labels:** each hive carries a camera-facing `Html` badge showing its number — high-contrast
  (white background, dark text), ringed red when queenless and forest when selected. Large enough
  for the 50+ / reduced-eyesight audience; `pointer-events: none` so it never blocks a tap.
* **Reset view:** a large (≥44px) "Reset view" button recentres the camera via the `OrbitControls`
  ref, so users can always recover from a disorienting angle.
* **Accessible alternative:** the 3D canvas is not keyboard/screen-reader navigable, so a
  **"Hives on this yard"** list of focusable buttons is rendered below it — each selects the hive
  (opening the inspector with its Open-hive link), giving a full keyboard path. The `<canvas>`
  carries an `aria-label` pointing to this list.
* **WebGL fallback:** if the device can't run WebGL, a message + link back to the 2D map is shown
  instead of a blank canvas.

## 4. Performance & isolation

* three.js / `@react-three/fiber` / `@react-three/drei` load **only on this route** via
  `dynamic(() => import(...), { ssr: false })`, so they never touch SSR or the shared bundle —
  respecting the app's mobile LCP/CLS budget (see `mobile-performance-lcp-cls.md`).
* `frameloop="demand"` avoids a continuous render loop; the hidden hit-area mesh keeps short stacks
  easy to tap without extra draw cost.

## 4b. v2 additions (03/07/2026)

* **Full-detail hives** — the parametric model now honours the whole configuration: open varroa
  floors render as grey mesh on stand feet (solid amber when closed), entrance reducers pinch the
  notch, top feeders are a slab under the roof and entrance/boardman feeders a block at the door,
  warm/cold frame orientation draws lines on the brood box face, and every hive gets an
  overhanging roof.
* **Free rotation + yard frame** — hive yaw comes from `hives.rotation_deg`; the yard entrance
  renders as a gate (posts + lintel) and the north indicator follows `apiaries.north_angle_deg`.
* **Benches** — `yard_benches` render as a slab on legs, with hives elevated at their exact slots
  (shared `src/lib/yard-geometry.ts` keeps 2D and 3D identical).
* **Queen lineage** — labels show `hive · Qnumber`; the selected hive's label expands with
  "Mother: … · Mated: …", and the accessible hive list includes queen numbers.

## 4c. Printing (03/07/2026)

A **Print** button beside "Reset view" captures the scene *as currently framed* (orbit to the
angle you want first). The capture runs `html-to-image` over the scene wrapper so the floating
hive labels and north badge are included — the WebGL canvas is readable because the renderer runs
with `preserveDrawingBuffer: true`. Output opens in a print window (name + date + image, Save as
PDF included); a blocked pop-up falls back to a PNG download. Shared helper:
`src/lib/print-layout.ts`.

## 5. Files

| File | Role |
| --- | --- |
| `src/components/apiaries/Hive3D.tsx` | Parametric hive box stack + entrance notch + `Html` label |
| `src/components/apiaries/YardScene3D.tsx` | Canvas, orbit controls, ground, reset button, accessible list, WebGL fallback |
| `src/app/dashboard/apiaries/[id]/map/3d/page.tsx` | 3D route (dynamic, client-only) |
| `src/app/dashboard/apiaries/[id]/map/page.tsx` | "3D view" link on the 2D Yard Map |
| `src/hooks/useApiaryMap.ts` | Now also selects `configuration` for the box stack |

## 6. Out of scope

* Editing/placement in 3D (stays on the 2D map).
* Real background imagery, obstacles, or metre-accurate dimensions.
* Per-hive colours/dimensions in the DB (derived in code, as the 2D card does).

## See also

* `apiary-3d-view-feasibility.md` — the original assessment and spike.
* `apiary-yard-map.md` — the 2D yard layout providing `map_x`, `map_y`, `entrance_direction`.
* `mobile-performance-lcp-cls.md` — the performance budget the dynamic import respects.
