# Swarm & Varroa Brood-Break Planner — Expansion Plan

> **Status:** Plan (awaiting verification). Extends the existing TBR planner. No database changes.

## Why

The current planner models **one** intervention — Total Brood Removal (TBR) — and shows **one**
curve (forager strength). A brood break serves *two* purposes:

1. **Swarm control** — interrupt the brood cycle so the colony abandons swarm preparations.
2. **Varroa treatment** — the resulting broodless window lets the beekeeper treat with oxalic acid
   (no capped brood for the mites to hide in).

There is a second way to achieve both without dismantling the nest: **caging the queen**. A caged
queen cannot leave, so if the colony swarms the swarm returns; after ~21 days (worker brood) or ~24
days (to also clear drone brood) the colony is broodless and can be treated. Caging keeps the comb
and most of the standing brood, so it is far cheaper in stores than TBR.

This expansion lets the beekeeper **choose the method**, **configure both models**, and **see the
overall colony population** alongside the forager force (population is the leading indicator of the
future forager supply, which matters most for the gentler caging scenario).

## The unifying model insight

Both methods are a **single zero-emergence window** in the colony's daily emergence schedule. They
differ only in when the window opens and what else they cost.

| | Gap start (offset from `T`) | Gap length | Comb | Standing brood |
|---|---|---|---|---|
| **TBR** | `0` | `reLay + eggToEmergence` (≈25) | redrawn from foundation | removed (lost) |
| **Caging** | `eggToEmergence` (≈21) | `cageDuration + releaseRelay` (≈21–24) | retained | emerges normally |

Define `gapStart`, `gapEnd = gapStart + gapLen`. Then **everything generalises**:

- **Emergence** = lay rate `L` for every offset except `[gapStart, gapEnd)`.
- **Forager force** — existing two-cohort closed form, with the cohort split moved from `0`/`gapLen`
  to `gapStart`/`gapEnd`:
  - normal-age cohort: emergence days `e < gapStart`
  - post-gap cohort: emergence days `e ≥ gapEnd` (optionally precocious)
- **Colony population** = same emergence integrated over the **full adult lifespan**
  (`emergenceToForager + foragingCareer`) instead of the foraging window:
  `population(t) = L × (count of e in [t−lifespan+1, t] excluding [gapStart, gapEnd))`.
- **Broodless (oxalic) window** = `broodlessStart = gapStart`, `broodlessEnd = gapEnd − cappedPhase`
  (capped phase ≈ 12 days). TBR → `[T, T+13)`; caging (21 d) → `[T+21, T+30)`.

With TBR's `gapStart = 0` this is **identical** to the current output — caging is purely additive.

## What the user will see

- A **method toggle** (segmented control): *Total Brood Removal* ↔ *Cage the Queen*.
- **Two stacked charts** (forager strength above as **% of full strength**; overall colony
  population below as **absolute bees**, so the lay rate visibly scales it). The date sliders sit
  between the charts so an adjustment moves both in view at once. Caging visibly keeps the
  population high through the swarm weeks while TBR drops both early.
- A **Varroa treatment window** callout (broodless start/end) — "treat with oxalic acid between …".
- **Method-aware controls**: cage duration (21 worker / 24 drone-brood preset) for caging; comb-draw
  / re-lay delay for TBR; shared biology (egg→emergence, emergence→forager, foraging career, lay
  rate, precocious toggle) for both.
- Method-aware milestones, food budget, warning text and explanation.

## Model parameters (configurable)

| Constant | Default | TBR | Caging | Meaning |
|----------|---------|-----|--------|---------|
| Lay rate | 1200/d | ✓ | ✓ | scales absolute head-counts |
| Egg → emergence | 21 d | ✓ | ✓ | worker development; sets caging gap start |
| Emergence → forager | 21 d | ✓ | ✓ | house-bee phase |
| Foraging career | 8 d | ✓ | ✓ | dip depth + steady-state foragers |
| Comb-draw / re-lay delay | 4 d | ✓ | — | TBR gap length component |
| Cage duration | 21 d | — | ✓ | preset 21 (worker) / 24 (drone brood) |
| Cage release re-lay | 1 d | — | ✓ | small delay before the freed queen lays (comb already drawn) |
| Precocious foraging | off | ✓ | (✓) | mainly relevant to TBR's deep early dip |

## Food budget (method-aware)

**Decided: minimal for now.**

- **TBR** — unchanged (comb redraw + brood food + upkeep; starvation risk against stores).
- **Caging** — keep the existing budget maths but drop the comb-draw line and show a plain note that
  the nest and most brood are retained, so the rebuild is far cheaper than TBR. A full method-aware
  recompute (reduced brood food, upkeep of the retained population) is deferred to a later pass.

## Files to change

| File | Change |
|------|--------|
| `src/types/tbr.ts` | Add `InterventionMethod`; add `cageDurationDays`, `cageReleaseRelayDays`; add `population` to curve points; add broodless-window + release fields to milestones |
| `src/lib/tbr-model.ts` | `broodGap(c, method)`; generalise forager closed form; add `populationAtOffset`; method-aware milestones/coverage/recommendation/food budget |
| `src/hooks/useTbrPlanner.ts` | `method` state; thread into plan + food budget; reset override on method change |
| `src/components/tools/TBRPlanner.tsx` | Method toggle; second chart line; varroa window callout; method-aware controls/labels/text |
| `docs/features/tbr-swarm-planner.md` | Fold in the caging method + population curve |

No database changes. No new dependencies.

## Out of scope (this pass)

- Persisting plans to the database.
- Drone-brood-trapping specifics beyond the 24-day cage preset.
- Mite-population modelling (we show the *window*, not a mite kill estimate).
