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
| Emergence → forager | 21 days | House-bee phase (age at first foraging); first new foragers at `T+46` |
| Queen lay rate | 1200/day | Adjustable 1000–2500; scales absolute headcounts |
| Foraging career | 8 days | Days a bee forages before dying (Visscher & Dukas 1997); governs the dip depth |

**Total adult lifespan** = emergence→forager + foraging career = 29 days (derived). Peak foragers =
`layRate × foragingCareer`; peak adult population = `layRate × adultLifespan` — both shown in the UI.

### Forager-force curve

- `emergence(d)` = steady `L` for `d < T`; `0` for `T ≤ d < T+25`; `L` for `d ≥ T+25`.
- `foragers(d)` = Σ `emergence(e)` for `e` where `e+H ≤ d < e+H+F` (H = 21, F = 8), summed over two
  cohorts so post-break bees can forage at a precocious age when that option is enabled.

Result: steady force → decline through the gap → a deep, wide trough (with an 8-day career the
standing force is exhausted ~8 days after the gap reaches foraging age, so foragers fall near zero
until ~`T+46`) → recovery from `T+46`. Already-emerged house bees bridge the early part of the gap.

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
- TBR-date slider + lay-rate slider (1000–2500/day, with a live brood-cells / Dadant-frames readout).
- **Precocious-foraging toggle** — when on, post-break bees forage ~7 days younger, modelling the
  accelerated recovery of a forager-depleted colony. Off by default (conservative estimate).
- Recommendation panel: suggested `T*`, milestone dates, flow-coverage score, plain-language guidance.
- Late-break warning when the first new foragers arrive after the flow starts (false-win guard).

## Model validation (peer-reviewed)

| Parameter | Model | Literature | Notes |
|-----------|-------|-----------|-------|
| Egg → emergence | 21 d | 21 d (3+6+12) | Confirmed (Winston) |
| Emergence → forager | 21 d, plastic | ~21–23 d normal; 7–14 d precocious under forager loss | Precocious toggle models the plastic case |
| Foraging career | 8 d | ~7 d median (Visscher & Dukas 1997) | Now a separate constant from adult lifespan, so both the dip and absolute headcounts are correct |
| Total adult lifespan | 29 d (derived) | ~4–6 wk summer | = house-bee phase (21 d) + foraging career (8 d) |
| Queen lay rate | 1000–2500/d | peak ~2000/d (Laidlaw & Page 1997) | Real Dadant colonies observed ~2200/d |
| Recovery asymptote | = original | colonies often overshoot | The model is a deliberate conservative lower bound |

The simulation is a two-cohort model: pre-break bees forage at the normal age; post-break bees forage
at the (optionally precocious) age, so the dip onset is governed by the old bees and the recovery speed
by the new ones. The forager-strength curve is normalised to steady state, so the recommended **timing**
is independent of the lay-rate value.
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
