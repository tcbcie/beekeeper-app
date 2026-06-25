# Swarm & Varroa Brood-Break Planner

> **Status:** Implemented. Live calculator — no database changes.
> Supports two interventions (TBR and queen caging) — see also
> `swarm-varroa-planner-expansion.md` for the design of the caging/population expansion.

## Purpose

Help the beekeeper decide **when** to induce a **brood break** so that it (a) controls swarming and
(b) leaves the colony **broodless for an oxalic-acid varroa treatment**, while the colony still
rebuilds its forager force to peak across the summer nectar flow (typically bramble/blackberry). The
aim is to bridge the gap between the early spring crop (harvested ~mid-May) and the summer crop.

### Two methods (toggle)

- **Total Brood Removal (TBR)** — all frames carrying brood are removed and replaced with
  foundation/drawn comb. The colony behaves as if it swarmed and restarts its brood nest. ~4 days to
  draw comb before the queen re-lays, then ~21 days to first emergence. Strongest reset, but the
  colony must redraw comb and loses its standing brood.
- **Queen caging** — the queen is confined for 21 days (clears worker brood) or 24 days (also clears
  drone brood, a varroa reservoir). The caged queen can't leave, so a swarm returns. The existing
  brood keeps emerging for ~3 weeks before the gap opens, and the comb and most brood are preserved —
  far cheaper in stores than TBR.

Both are modelled as a **single zero-emergence window** in the colony's emergence schedule, differing
only in when it opens (TBR at day 0; caging at +21 days, after the pipeline drains). TBR is the
`gapStart = 0` special case, so its output is unchanged by the caging expansion.

### Varroa treatment window

Both methods produce a broodless period (no capped brood) suitable for a single oxalic-acid
treatment. It is derived from the same gap parameters for both methods:
`broodlessStart = gapStart`, `broodlessEnd = gapEnd − cappedPhase` (capped phase ≈ 12 days). The UI
shows the exact window.

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

### Two curves: forager force + overall population

The planner draws **two stacked charts** with the date sliders between them so an adjustment moves
both in view at once:

- **Forager force** (top, **% of full strength**) = Σ `emergence(e)` for bees aged `H..H+F`
  (H = emergence→forager, F = foraging career), summed over two cohorts so post-break bees can
  forage at a precocious age when enabled. Normalised because the *timing* recommendation is what
  matters here, and that timing is independent of lay rate (it cancels in the ratio).
- **Overall population** (bottom, **absolute bees**) = the same emergence integrated over the
  **full adult lifespan** (`H + F`), excluding the gap. Shown as real head-counts so the lay rate
  visibly scales the colony. Population leads foragers — today's emerging bees are tomorrow's
  foragers — which is why it matters most for the gentler caging scenario.

Emergence is steady `L` everywhere except the zero-emergence window `[gapStart, gapEnd)`:
- TBR: `gapStart = 0`, `gapEnd = reLay + eggToEmergence` (≈25).
- Caging: `gapStart = eggToEmergence` (≈21), `gapEnd = gapStart + cageDuration + releaseRelay`.

Result: steady force → decline through the gap → a deep, wide trough (with an 8-day career the
standing force is exhausted ~8 days after the gap reaches foraging age, so foragers fall near zero
until ~`T+46`) → recovery from `T+46`. Already-emerged house bees bridge the early part of the gap.

### Scoring

For each candidate `T`, score = average forager force across `[flowStart, flowEnd]`, constrained
to `T ≥ spring-crop end`. Recommended `T*` maximises the score. The beekeeper can override via the
slider and watch the score/curve respond.

## Crop-date resolution (3 tiers)

Each crop resolves a **bloom start** (recorded at ~10% in bloom) and a **bloom end** (recorded when
under 5% is still worth foraging). The start uses the GDD tiers below; the end is anchored on the
resolved start.

**Bloom start:**

| Tier | Source | When |
|------|--------|------|
| 1 — Observed | Apiary's `gdd_records.start_date` for the crop, this season | Record exists this year |
| 2 — Averaged + projected | Historical average GDD-at-bloom at that apiary, projected onto this year's GDD curve | Prior-year history, no record yet |
| 3 — General estimate | `vegetation_info.typical_gdd_range` midpoint + `bloom_period`, projected | No history for that crop at that apiary |

**Bloom end** (mirrors the start, anchored on the resolved start date):

| Tier | Source | When |
|------|--------|------|
| 1 — Observed | This season's `gdd_records.end_date` | Recorded this year |
| 2 — Average duration | `start + round(avg(end − start))` from prior records with both dates | Prior-year bloom-length history |
| 3 — Fixed fallback | `start + fallbackDurationDays` (summer 35, spring 30) | No duration history |

The resolved window drives the shaded flow band, the recommendation scoring window, and the
crop-picker readout (shown as `start → end`).

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

## Rebuild food budget & starvation risk

An early break rebuilds during a nectar gap, so the planner estimates what the rebuild costs and
whether the colony can pay for it. Comb is always costed from foundation (worst case).

**Honey (from stores — the starvation risk):**
- Comb drawing: `framesToDraw × 0.12 kg wax × 7` (kg honey per kg wax; Whitcomb 1946).
- Brood food: `beesFed × 59.4 mg` carbohydrate per larva.
- Upkeep + warmth: `avgAdults × 4 mg/day × rebuildDays`, plus a 0.5× thermoregulation/nursing overhead.

**Pollen (mostly foraged):** `beesFed × 150 mg` (125–187.5 mg per worker reared). Stored beebread
only covers ~0.75 kg, so the rest must be foraged fresh — a cold/wet spell stalls the rebuild
regardless of honey stores.

**Starvation flag:** the model finds the earliest worthwhile nectar source (nectar value ≥ 3)
predicted at/after the break using the GDD resolver. If none arrives before the colony's own
foragers recover, it warns and shows how much to leave or feed; otherwise it notes the income date.

Everything scales with lay rate (bigger colony → bigger bill). Figures are estimates with wide error
bars — they size the decision, not a feeding schedule.

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
