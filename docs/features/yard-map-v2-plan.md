# Feature: Yard Map v2 — Entrance-Relative Orientation, Benches, Full Hive Rendering, Queen Lineage

**Date:** 02/07/2026
**Status:** Implemented (03/07/2026)

## 1. Overview

Five connected upgrades to the Yard Map (2D + 3D), driven by how beekeepers actually visualise a
yard — walking in through its entrance, not reading a compass:

* **A. Yard entrance + user-set north** — the user places a **yard entrance marker** on the map;
  hive orientation is then set visually relative to that entrance. North stays, but as a
  **user-adjustable** indicator rather than an assumed "up".
* **B. Free rotation of the hive body** — replaces the 8-way entrance arrow. The whole footprint
  rotates to any angle (drag-to-rotate handle + accessible nudge buttons); the entrance is the
  hive's front face and turns with it.
* **C. True footprints** — full-size hives render square; **nucs render as rectangles** in 2D
  (3D already does), rotating with the body.
* **D. Benches** — the user creates a bench sized for N hives, positions/rotates it, and drops
  hives onto its slots. **The bench carries its hives** when moved or rotated. Rendered in 2D and
  fully in 3D (top + legs, hives elevated).
* **E. Full-detail 3D hives + queen lineage** — the 3D model honours every configuration field
  (floor open/closed, feeder type, entrance reducer, frame orientation, excluder, supers), and the
  view surfaces the queen's designation plus lineage (mother, where mated) in the inspector and on
  the selected hive's label.

## 2. Scope & Simplicity

* **In Scope:** the items above, across the existing 2D (`YardMap`) and 3D (`YardScene3D`) views;
  data migration from the compass model; the subscription/opt-in gating stays exactly as is.
* **Out of Scope:** editing in 3D (stays view-only); multi-tier benches or other furniture types;
  metre-accurate dimensions; lineage *trees* on the map (the full tree stays on the queen page);
  multi-breeder graft-level mother resolution (no lineage UI consumes `batch_grafts.breeder_queen_id`
  yet — noted as a known limitation, mirrors the queen detail page).
* **Existing Code Impact:** the orientation migration touches exactly the 9 known
  `entrance_direction` consumer sites (2 type defs, 1 select, 1 save, 2 rotation tables, yaw math,
  CSS rotate, aria label, inspector cycle logic) — all inside the yard-map feature files.

## 3. Technical Design

### A. Data model (via Supabase MCP — no .sql files)

**Migration 1 — `apiaries` (yard frame of reference):**

| Column | Type | Default | Description |
| --- | --- | --- | --- |
| `yard_entrance_x` | numeric(5,2) | NULL | Entrance marker, 0–100 % of canvas (NULL = unset) |
| `yard_entrance_y` | numeric(5,2) | NULL | as above |
| `north_angle_deg` | smallint | 0 | Where north points on the map, degrees clockwise from "up" |

**Migration 2 — `hives` (rotation replaces compass):**

| Column | Type | Default | Description |
| --- | --- | --- | --- |
| `rotation_deg` | numeric(5,1) | NULL | Body rotation in map space, 0–359.9; entrance = front face |
| `bench_id` | uuid FK → yard_benches | NULL | Bench the hive sits on (NULL = on the ground) |
| `bench_slot` | smallint | NULL | Slot index on the bench (0-based) |

Backfill: `rotation_deg = DIRECTION_DEGREES(entrance_direction)` for placed hives (N=0 … NW=315,
interpreted with the default north = up, so nothing visually moves). `entrance_direction` is then
**deprecated in place** (kept for one release as a safety net, no longer read or written).

**Migration 3 — `yard_benches` (new table):**

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid | RLS owner scope (policies mirror `hives`) |
| `apiary_id` | uuid FK → apiaries | |
| `map_x`, `map_y` | numeric(5,2) | Bench centre, 0–100 % |
| `rotation_deg` | numeric(5,1) | Bench orientation |
| `capacity` | smallint | 1–6 hive slots |
| `created_at` | timestamptz | |

RLS: owner-only CRUD, SELECT extended via `can_access_apiary` like hives. Slot geometry is derived
in code (slots spaced along the bench's long axis), never stored.

### B. Orientation model

* All rotation is **map-space degrees** (0 = entrance faces the top of the canvas, clockwise).
  The map itself *is* the yard as the beekeeper sees it — the entrance marker anchors that mental
  frame, so "relative to the entrance" is achieved visually rather than with brittle relative maths.
* **Inspector aid:** with an entrance marker set, the panel shows a plain-language readout, e.g.
  *"Entrance faces towards / away from / left of the yard entrance"*, computed from the hive→marker
  bearing vs `rotation_deg`.
* **Rotation UI (2D, selected hive):** a drag-to-rotate handle on the token (free angle) plus
  large ±15° nudge buttons in the inspector for accessibility; angle readout in degrees.
* **North:** the compass indicator rotates to `north_angle_deg`; an "Adjust north" control in a new
  yard **edit toolbar** lets the user drag it to match reality. 3D scene rotates its N indicator
  to match.
* **Entrance marker:** placed/moved from the same toolbar (a gate icon on the canvas edge);
  rendered in 2D and as a simple gate/post pair in 3D.

### C. Footprints (2D)

`HiveToken` becomes footprint-true: square for `hive_size='full'`, ~1:2 rectangle for `'nuc'`,
rotated by `rotation_deg` via CSS transform. Labels stay horizontal (counter-rotated) for
readability. Drag/drop maths unchanged (centre-point percentages).

### D. Benches

* **2D:** an "Add bench" control (capacity picker 1–6) drops a bench at canvas centre; the bench is
  draggable and rotatable like a hive. Dropping a hive whose centre lands on a bench snaps it to the
  nearest free slot (`bench_id` + `bench_slot` written; `map_x/map_y` also written to the slot's
  derived position so all existing rendering keeps working). Moving/rotating a bench recomputes and
  writes its hives' positions in one batch. Removing a hive from a bench (drag off) clears the link.
  Deleting a bench grounds its hives in place.
* **3D:** bench = top slab + four legs; hives on a bench render elevated to bench height.

### E. Full-detail 3D hive + queen lineage

* **3D fidelity** (matching the 2D card's conventions): open mesh floor → lighter slab with visible
  gap; closed → solid; entrance reducer → narrowed entrance notch; feeder → slab on top (`top`) or
  small block at the entrance (`entrance`/`boardman`) / no visual for `frame`; frame orientation →
  thin lines on the top box face (warm = parallel to entrance, cold = perpendicular); roof slab on
  top to finish the model.
* **Lineage data** — extend the existing single `useApiaryMap` query only:
  `queens(id, queen_number, marking_color, mating_station, mated_at_eircode, distributed_mother_queen, mother:queens!mother_id(id, queen_number))`.
  One round-trip, no new endpoints. Mother = FK join, falling back to the
  `distributed_mother_queen` snapshot (same rule as the queen detail page).
* **Display:** floating 3D labels stay compact (hive no. + queen no.). The **selected** hive's
  label expands with the lineage line, and the inspector gains it too:
  *"Q123 · Mother: RZ018 · Mated: @ Glenview (D02X285)"* — omitting parts that are unknown.

## 4. Edge Cases & Risks

* **Backfill correctness:** compass→degrees conversion assumes north = up (true for all existing
  data since `north_angle_deg` starts at 0); nothing moves visually.
* **Bench slot conflicts:** snapping picks the nearest *free* slot; a full bench rejects the drop
  (toast). Batch position updates on bench move are optimistic with rollback (existing
  `saveHivePlacement` pattern, extended for multi-row).
* **Orphaned links:** bench deletion clears `bench_id/bench_slot` on its hives in the same
  operation; FK is `ON DELETE SET NULL` as the DB-level backstop.
* **Rotated-token hit areas:** rotation must not shrink the ≥44px touch target; the hit area stays
  axis-aligned and generous.
* **Dense labels (3D):** unchanged compact labels by default; only the selected label expands.
* **Free rotation on touch:** the rotate handle needs a large grab zone; the ±15° inspector buttons
  are the guaranteed-accessible path.
* **Lineage privacy/nulls:** all lineage fields nullable; render nothing rather than "Unknown"
  noise on the map.

## 5. Implementation Phases

1. ✅ **Orientation core:** migrations 1–2 (MCP) + backfill; replaced compass with `rotation_deg`
   across the 9 consumer sites; free-rotate handle + ±15° nudges; entrance marker + adjustable
   north (2D toolbar + 3D indicators); entrance-relative readout in the inspector.
2. ✅ **Footprints:** square vs rectangular (nuc) tokens in 2D, rotating with the body,
   counter-rotating labels, 96px hit container.
3. ✅ **3D fidelity:** open/closed floor on stand feet, feeder types, entrance reducer,
   warm/cold frame-orientation lines, roof — all from `configuration`.
4. ✅ **Benches:** `yard_benches` + RLS (advisor-clean); 2D add/move/rotate/delete + slot
   snapping (bench carries its hives; delete grounds them); 3D bench slab on legs with hives
   elevated at their exact slots via shared `yard-geometry`.
5. ✅ **Queen lineage:** single-query extension (`queens!mother_id` self-join +
   `mating_station`/`mated_at_eircode`/`distributed_mother_queen`); inspector lineage line;
   3D labels show hive + queen number, expanding with lineage when selected.
6. ✅ **Polish + docs:** aria-hidden pointer-only rotate handle (nudge buttons are the
   accessible path), 48px toolbar targets, queen numbers in the 3D accessible hive list,
   docs updated.

Each phase was independently committed and testable on the deployed app.

## See also

* `apiary-yard-map.md`, `apiary-3d-view.md` — the current v1 being extended.
* `queen-lineage-pedigree.md` — the lineage string grammar reused for the inspector line.
* `nav-feature-gating.md` — gating (unchanged: subscription + opt-in).
