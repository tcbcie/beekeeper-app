# Planner: earlier break + hive-system & brood-utilisation

> **Status:** Plan (awaiting verification). No database changes (`frame_standards` already exists).

## Why

Three refinements to the Swarm & Varroa planner:

1. **Earlier break** — the break-date slider is pinned at the calculated *earliest feasible* date on
   the left, so the user can't model breaking sooner. Allow it to go ~30 days earlier.
2. **Hive system** — the brood-frame maths is hard-coded to a Dadant deep (9,500 cells/frame). Let the
   beekeeper pick their **frame system** (from the existing `frame_standards`: National, Langstroth,
   Dadant, Smith, Commercial …) and derive cells/frame from its real dimensions.
3. **Brood utilisation** — "wall-to-wall" is never 100% (bees leave a gap along the bottom, corners
   are under-used, and it varies by frame position). Let the user set an **average brood-area
   utilisation %** that scales the usable cells per frame.

## Decisions

| Area | Decision |
|------|----------|
| Earlier break | Slider lower bound = feasible earliest − 30 days; recommendation logic unchanged |
| Hive system source | `frame_standards` table (fallback presets if the fetch fails), same as the Frame Cell Calculator |
| Cells/frame | Hexagon formula on the standard's dimensions (both sides, 5.4 mm worker cell) — reused via a shared helper |
| Brood utilisation | Slider 50–100%, default **80%** |
| Default frame system | First active standard (British National Deep) — changeable; **confirm** |
| Affected outputs | Brood-cell readout and the food budget (`framesToDraw`, comb-drawing honey). Curves are unaffected. |

## Maths

- `cellsPerFrame = round(width_mm × height_mm / (0.866 × 5.4²) × 2)` (both sides).
- `effectiveCellsPerFrame = cellsPerFrame × utilisation%`.
- `framesToDraw = standingBroodCells / effectiveCellsPerFrame` (so lower utilisation → more frames).
- `waxPerFrameKg = (width_mm × height_mm) × (0.12 kg ÷ Dadant area)` — scales comb-drawing honey with
  frame size, so a National frame costs less wax than a Dadant one.
- Comb-drawing honey `= framesToDraw × waxPerFrameKg × 7`.

## Files to change

| File | Change |
|------|--------|
| `src/lib/tbr-model.ts` | `SLIDER_BACK_DAYS`; add `sliderEarliest` to `TbrBounds`; `cellsForFrame()` + `waxForFrameKg()` helpers; `rebuildFoodBudget` takes a `frame { cellsPerBroodFrame, waxPerFrameKg }` (defaults to current Dadant values) |
| `src/hooks/useTbrPlanner.ts` | Load `frame_standards`; `frameStandardId` + `broodUtilisation` state; compute effective cells + wax; feed the food budget; expose all |
| `src/components/tools/TBRPlanner.tsx` | Frame-system picker + utilisation slider; brood readout uses the chosen system; extend the break-date slider 30 days earlier |
| `docs/features/tbr-swarm-planner.md` | Note the hive-system inputs |

No DB changes. No new dependencies.

## Out of scope

- Editing frame standards (that's the existing Frame Standards Manager).
- Per-frame brood maps; we use a single average utilisation %.
