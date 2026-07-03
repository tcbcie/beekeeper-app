# Feature: Apiary Yard Map (Hive Layout)

**Date:** 02/07/2026
**Status:** Implemented

## 1. Overview

Today an apiary's hives are shown only as a flat list ordered by hive number. This feature adds a **visual yard map**: a rectangular canvas representing the physical bee yard, onto which the beekeeper can **freely place each hive** by dragging it, and set which way the **hive entrance faces** (8-way compass). Each hive on the map shows a small summary and **backlinks to its full hive record** (`/dashboard/hives/[id]`).

The goal is a spatial "at a glance" view of the yard that mirrors reality — useful for orientation on site, planning inspections, and recording where colonies actually sit. Positions are stored per hive so the layout persists across devices.

This is a **greenfield** feature: no existing spatial/canvas layout exists. It sits alongside (and does not replace) the existing hive list and the GPS-based community map.

## 2. Scope & Simplicity

* **In Scope:**
  * A new route `/dashboard/apiaries/[id]/map` rendering a responsive rectangular yard canvas.
  * Drag-and-drop free placement of hives on the canvas (via `@dnd-kit/core`).
  * Persisting each hive's position as **percentage coordinates** (resolution-independent) plus an **8-way entrance direction**.
  * A small on-map hive token showing `hive_number`, queen presence and status, with the entrance indicated visually.
  * A tap/click popover per hive with key detail and an **"Open hive"** backlink to `/dashboard/hives/[id]`.
  * An "unplaced hives" tray for hives with no coordinates yet, to drag onto the map.
  * A "Yard Map" entry point (Quick Action) from the apiary detail page.

* **Out of Scope (kept deliberately simple):**
  * Custom yard shapes/polygons — the canvas is a single fixed-aspect **rectangle** only.
  * Uploading a real background photo/satellite image behind the layout.
  * Obstacles/features (sheds, trees, fences), measurement/scale in metres, or GPS alignment.
  * Multi-select / bulk drag, snapping to a grid, or auto-arrange.
  * Free-angle rotation — entrance is limited to 8 compass directions.
  * Any change to the existing GPS community map or the ordinal `row_in_apiary`/`order_in_apiary` grid (left untouched).

* **Existing Code Impact (minimal):**
  * `hives` table — add three nullable columns (`map_x`, `map_y`, `entrance_direction`).
  * `src/types/hive.ts` — add the three fields to the `Hive` interface.
  * `src/app/dashboard/apiaries/[id]/page.tsx` — add one "Yard Map" Quick Action button.
  * New files only for the canvas (route + components + a small hook). No existing component is rewritten.
  * `package.json` — add `@dnd-kit/core`.

## 3. Technical Design

### Architecture

**Route:** A dedicated sub-route `src/app/dashboard/apiaries/[id]/map/page.tsx` rather than a section on the existing detail page. This keeps the detail page unchanged, gives the canvas full width, and lets the drag library load only when needed (dynamic import, `ssr: false`).

**Coordinate model:** Positions are stored as **percentages (0–100)** of the canvas width/height, not pixels. This makes the layout identical on phone and desktop and avoids re-computation when the container resizes. On drag end, the pixel delta from `@dnd-kit` is converted to a percentage using the measured canvas bounding rectangle and clamped to `[0, 100]`.

**Placed vs unplaced:** A hive with `map_x`/`map_y = NULL` is "unplaced" and appears in a tray beneath the canvas. Dragging it onto the canvas sets its coordinates; a placed hive can be dragged again to reposition, or removed back to the tray.

**Rendering:**
* `DndContext` (from `@dnd-kit/core`) wraps the canvas.
* Each hive token is a `useDraggable` element positioned absolutely at `left: map_x%`, `top: map_y%` (translated by the active drag transform while dragging).
* The canvas is a `useDroppable` rectangle with a grass-style background and a subtle north indicator.
* The **entrance** is drawn as a small notch/arrow on the token, rotated to one of 8 compass directions (N, NE, E, SE, S, SW, W, NW). A control on the selected hive cycles the direction; a matching `rotate-45` step class set renders it.
* Tapping a token opens a lightweight popover (`hive_number`, queen number/marking, status, queenless flag) with an **Open hive** link.

**Persistence:** A small hook `src/hooks/useApiaryMap.ts` loads the apiary's hives (including the new fields) and exposes `savePosition(hiveId, x, y, direction)`. Saves are debounced on drag end and written with a scoped Supabase update (`.eq('id', hiveId).eq('user_id', userId)`), respecting RLS. Failures roll the token back to its previous position and surface a toast.

**Accessibility (50+ / reduced eyesight):** Large tokens with high-contrast borders, minimum font sizes per house rules, generous tap targets for the direction/remove controls, and `@dnd-kit` keyboard sensors so tokens can also be nudged without a pointer.

### Database Connections (MCP Server)

All schema changes are applied **via the Supabase MCP server** (`apply_migration`), not by parsing `.sql` files. Use `list_tables` first to confirm current `hives` columns, then apply:

**Migration: `add_yard_map_to_hives`**

| Column | Type | Default | Nullable | Description |
| --- | --- | --- | --- | --- |
| `map_x` | `numeric(5,2)` | `NULL` | yes | Horizontal position, 0–100 % of canvas width |
| `map_y` | `numeric(5,2)` | `NULL` | yes | Vertical position, 0–100 % of canvas height |
| `entrance_direction` | `text` | `NULL` | yes | One of `N,NE,E,SE,S,SW,W,NW` (CHECK constraint) |

* A `CHECK` constraint restricts `entrance_direction` to the 8 valid values (or NULL).
* No new RLS policies required — the existing per-user/team `hives` policies already govern these columns.
* Reads/updates go through the existing browser Supabase client with `user_id` scoping. After the DDL, run `get_advisors` for security/perf lint per project practice.

## 4. Edge Cases & Risks

* **Null / partial coordinates:** treat a hive as unplaced unless *both* `map_x` and `map_y` are non-null; guard against one being set without the other.
* **Out-of-bounds drops:** clamp percentages to `[0, 100]` so a token can never be lost off-canvas.
* **Canvas not yet measured:** if the bounding rect is 0 (pre-layout), defer coordinate conversion until measured to avoid divide-by-zero / NaN writes.
* **Concurrent edits / shared apiaries:** last-write-wins per hive; scope updates by `id` + `user_id` and reload on focus so a team-mate's move isn't silently clobbered wholesale.
* **Save failure / offline:** optimistic update with rollback to the previous position and a clear toast; never leave the UI showing an unsaved position as saved.
* **Archived hives:** excluded from the map by default (filter `archived_at IS NULL`) to avoid clutter.
* **Overlapping tokens:** allowed (real yards stack), but selected token renders on top (raised z-index) so it stays draggable.
* **Bundle weight:** `@dnd-kit/core` and the canvas load only on this route via dynamic import so the rest of the app is unaffected.
* **Touch vs mouse:** configure both Pointer and Keyboard sensors; verify drag works on mobile Safari/Chrome (primary target device).

## 5. Implementation Phases

1. ✅ **Phase 1 — Data model:** Via MCP migration `add_yard_map_to_hives`, added `map_x`, `map_y`, `entrance_direction` (with range + value CHECK constraints) to `hives`; ran `get_advisors` (no new advisories). Added the fields to `src/types/hive.ts`.
2. ✅ **Phase 2 — Data hook:** `src/hooks/useApiaryMap.ts` loads an apiary's non-archived hives with the new fields and exposes `saveHivePlacement(hiveId, patch)` with optimistic update + rollback; computes `isOwner` for read-only mode.
3. ✅ **Phase 3 — Canvas + drag:** Added `@dnd-kit/core`; built the rectangular `useDroppable` canvas (`YardMap.tsx`) and draggable hive tokens (`HiveToken.tsx`) at percentage positions, with centre-point conversion, `[0,100]` clamping, and save on drag end. Route at `src/app/dashboard/apiaries/[id]/map/page.tsx` (dynamic, `ssr:false`).
4. ✅ **Phase 4 — Entrance + summary + backlink:** `HiveInspectorPanel.tsx` — 8-way clockwise/anticlockwise entrance control (with live triangle indicator on the token), hive summary, and **Open hive** link to `/dashboard/hives/[id]`.
5. ✅ **Phase 5 — Unplaced tray + entry point:** Unplaced-hives tray with drag-to-place; **Remove from yard** (nulls coordinates → returns to tray); **Yard Map** Quick Action added to the apiary detail page.
6. ✅ **Phase 6 — Polish:** 48×48px touch targets on panel controls, keyboard sensor, larger/higher-contrast labels, `role`/`aria-label` on the canvas, and distinct empty states (no hives vs none placed).

## 6. Files

| File | Role |
| --- | --- |
| `hives` table (MCP migration `add_yard_map_to_hives`) | New `map_x`, `map_y`, `entrance_direction` columns + CHECK constraints |
| `src/types/hive.ts` | Added the three placement fields to the `Hive` interface |
| `src/hooks/useApiaryMap.ts` | Loads map hives; `saveHivePlacement` with optimistic update + rollback |
| `src/hooks/index.ts` | Barrel export for `useApiaryMap` |
| `src/components/apiaries/YardMap.tsx` | `DndContext` + droppable yard canvas, drag→percentage persistence |
| `src/components/apiaries/HiveToken.tsx` | Draggable hive token with entrance indicator |
| `src/components/apiaries/HiveInspectorPanel.tsx` | Selected-hive details, entrance control, remove, backlink |
| `src/app/dashboard/apiaries/[id]/map/page.tsx` | Yard Map route (dynamic, client-only) |
| `src/app/dashboard/apiaries/[id]/page.tsx` | "Yard Map" Quick Action pill |

## Yard Map v2 (03/07/2026)

The layout model was substantially extended — see `yard-map-v2-plan.md` for the full design:

* **Orientation** — `hives.rotation_deg` (free-angle body rotation, 0–359.9, clockwise from
  canvas-up) replaces the 8-way `entrance_direction` compass (deprecated in place, backfilled).
  Rotation is set with a drag handle on the selected token or ±15° inspector nudges.
* **Yard frame** — `apiaries.yard_entrance_x/y` (entrance marker, set by tapping the yard) and
  `apiaries.north_angle_deg` (user-adjustable north). The inspector reads out facing relative to
  the entrance ("Faces towards the yard entrance" etc.), since beekeepers think "as I walk in".
* **Footprints** — tokens are top-down footprints: square full hives, 1:2 rectangular nucs,
  rotating bodily with counter-rotating labels.
* **Benches** — `yard_benches` table (centre, rotation, capacity 1–6; RLS mirrors hives) +
  `hives.bench_id`/`bench_slot`. Hives snap to free slots, adopt the bench facing, and move with
  the bench; deleting a bench grounds its hives. Slot geometry lives in `src/lib/yard-geometry.ts`
  and is shared by the 2D map (px), the 3D scene (units) and the stored percent positions.
* **Queen lineage** — the map query embeds `queens!mother_id` (with the
  `distributed_mother_queen` snapshot fallback) plus `mating_station`/`mated_at_eircode`;
  `describeQueenLineage()` renders "Mother: … · Mated: @ … (…)" in the inspector and on the
  selected 3D label.

## Printing

A **Print** button (available to read-only viewers too) snapshots the map to a high-resolution
PNG via `html-to-image` (selection cleared first; the bench grab tab is excluded via
`data-noprint`) and opens a minimal print window — apiary name, date, image — triggering the
browser print dialogue (which includes Save as PDF). If the pop-up is blocked, the PNG downloads
instead with a toast. Shared helper: `src/lib/print-layout.ts`. The 3D view has the same button
(see `apiary-3d-view.md`).

## Access & gating

The Yard Map (and its 3D view) is a **premium, opt-in** feature, gated exactly like the CRM
module:

* **Requires an active subscription AND opt-in.** `profiles.enable_yard_map` (boolean, default
  `false`) is the preference; `useYardMapEnabled()` ANDs it with `resolveActiveSubscription()`.
* **Profile toggle** — a "Yard Map" switch under **Profile → Preferences** that appears **only for
  active subscribers** (mirrors the CRM toggle). Saving fires `notifyYardMapPrefChanged()` so gated
  UI refreshes live.
* **Entry point** — the "Yard Map" Quick Action on the apiary detail page renders only when
  `yardMapEnabled` is true.
* **Route guard** — `src/app/dashboard/apiaries/[id]/map/layout.tsx` redirects to `/dashboard` on
  direct URL access when the feature is off; it covers both `/map` and the nested `/map/3d`.
* **Server-side note:** yard-map writes are plain `hives.map_x/map_y/entrance_direction` column
  updates (no billable value), so gating is UI + route level. If defence-in-depth is wanted later,
  add a trigger rejecting those column changes without an active subscription.

See `nav-feature-gating.md` for the shared gating mechanism.

## See also

* `distributed-queen-hive-placement.md` — "placement" as a queen→hive data association (not spatial).
* `team-member-hive-placement.md` — hive→apiary assignment and RLS for shared apiaries.
* `community-map-all-apiaries-layer.md` — the separate GPS/Mapbox map of apiary *locations*.
* `drag-drop-quick-action.md` — existing drag-and-drop interaction precedent.
