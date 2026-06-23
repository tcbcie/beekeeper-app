# TBR Swarm-Prevention Planner

> **Status:** Design / plan (awaiting implementation). Live calculator — no database changes.

## Purpose

Help the beekeeper decide **when** to perform a **Total Brood Removal (TBR)** so that the
colony's induced brood break controls swarming *and* the colony rebuilds its forager force to
peak across the summer nectar flow (typically bramble/blackberry). The aim is to bridge the gap
between the early spring crop (harvested ~mid-May) and the summer crop, maximising foragers for
the second flow.

### What TBR is

When a colony is in swarming mode and queen cells have been broken twice (~7 days apart), all
frames carrying brood at any stage are removed and replaced with foundation/drawn empty comb. The
colony behaves as if it has swarmed (a natural swarm leaves with no brood) and restarts its brood
nest from scratch. It takes roughly 4 days to draw enough comb for the queen to resume laying, then
~21 days for the first new brood to emerge.

## Decisions

| Area | Decision |
|------|----------|
| Placement | Card on the existing `/dashboard/tools` page (new `tbr` section) |
| Persistence | Live calculator only — no DB writes |
| Crop dates | 3-tier resolution (observed → averaged+projected → general estimate) |
| Prediction | GDD-projection, early/late aware |
| Optimisation | Maximise average forager force across the summer-flow window |
| Location | Mandatory apiary selection; no cross-island generalisation |
| Crops | Selectable spring crop & summer flow (regional: rapeseed east, dandelion west) |

## The model

`T` = day TBR is performed. A daily cohort simulation driven by adjustable constants:

| Constant | Default | Meaning |
|----------|---------|---------|
| Re-lay delay | 4 days | Comb drawn before queen resumes laying (`T+4`) |
| Egg → emergence | 21 days | First new brood emerges at `T+25` |
| Emergence → forager | 21 days | House-bee phase; first new foragers at `T+46` |
| Queen lay rate | 1200/day | Adjustable 1000–1500; sets rebuild slope |
| Forager active span | 21 days | Governs decay of the standing force during the gap |

### Forager-force curve

- `emergence(d)` = steady `L` for `d < T`; `0` for `T ≤ d < T+25`; `L` for `d ≥ T+25`.
- `foragers(d)` = Σ `emergence(e)` for `e` where `e+21 ≤ d < e+42`.

Result: steady force → decline through the gap → trough ~`T+42–46` → recovery from `T+46`.
Foragers keep being recruited from already-emerged house bees up to ~`T+21`, which is the
"bridge" that carries the colony into the gap.

### Scoring

For each candidate `T`, score = average forager force across `[flowStart, flowEnd]`, constrained
to `T ≥ spring-crop end`. Recommended `T*` maximises the score. The beekeeper can override via the
slider and watch the score/curve respond.

## Crop-date resolution (3 tiers)

| Tier | Source | When |
|------|--------|------|
| 1 — Observed | Apiary's `gdd_records.start_date` for the crop, this season | Record exists this year |
| 2 — Averaged + projected | Historical average GDD-at-bloom at that apiary, projected onto this year's GDD curve | Prior-year history, no record yet |
| 3 — General estimate | `vegetation_info.typical_gdd_range` midpoint + `bloom_period`, projected | No history for that crop at that apiary |

### GDD projection

- Accumulated GDD to date: existing `fetchCurrentYearGDD(lat, lon)` in `src/lib/gdd.ts`.
- Forward projection: location's recent average daily GDD accrual (no new API).
- Predicted date = today + (targetGDD − accumulatedGDD) / dailyRate.
- Each resolved date carries a tier badge indicating confidence.

## Interface

- Apiary picker (required); spring-crop and summer-flow pickers pre-filled from the apiary's records.
- Chart.js forager-force curve with shaded bands (spring crop, brood gap, summer flow).
- TBR-date slider + lay-rate slider; advanced disclosure for biological constants.
- Recommendation panel: suggested `T*`, milestone dates, flow-coverage score, plain-language guidance.
- 50+ accessibility: large targets, high contrast, readable minimum font sizes.

## Files

| File | Change |
|------|--------|
| `src/lib/tbr-model.ts` | NEW — simulation, scoring, optimal-date search, crop-date resolution + projection |
| `src/types/tbr.ts` | NEW — model interfaces |
| `src/hooks/useTbrPlanner.ts` | NEW — data loading & plan computation |
| `src/components/tools/TBRPlanner.tsx` | NEW — UI |
| `src/app/dashboard/tools/page.tsx` | EDIT — add `tbr` section (type + card + tab) |

No database changes. No new dependencies (Chart.js, date-fns, gdd.ts already present).

## Data available (from the live GDD database, June 2026)

- **Summer flow** — Blackberry recorded 11 Jun 2026 / 27 Jun 2025, GDD ~1267–1612 (avg ~1497).
- **Spring crop** — Oil Seed Rape (GDD ~200–450, Apr–Jun), Hawthorn (GDD ~775, late Apr–May),
  Dandelion (GDD ~474).

These observed records anchor Tier 1; `vegetation_info` provides the Tier 3 fallbacks.
