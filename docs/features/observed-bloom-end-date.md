# Observed Bloom End Date (5% threshold) in the planner

> **Status:** Plan (awaiting verification). No database changes — `gdd_records.end_date` already exists.

## Why

A bloom observation has two data points, each with a defined threshold:

- **Bloom start** — recorded when **~10%** of the crop is in bloom (the existing `start_date`).
- **Bloom end** — recorded when **less than 5%** of the crop is still worth foraging on
  (the existing, under-used `end_date`).

Two gaps today:

1. The **GDD Tracker** form labels the two dates but never states the 10% / 5% thresholds, so
   different observations aren't comparable.
2. The **Swarm & Varroa planner** ignores `end_date` — it always assumes the flow lasts a fixed
   35 days (spring crop 30 days). The observed "finished" date therefore has no effect on the
   recommendation or the shaded flow band.

## Decisions

| Area | Decision |
|------|----------|
| DB | No change — `gdd_records.end_date` (nullable `date`) already exists, partly populated |
| Tracker | Add threshold guidance to the two date fields (10% start / <5% end) |
| Planner | Use the observed `end_date` for the flow/crop window when present; otherwise estimate |
| End estimate (no observation) | 3-tier, mirroring the start: observed → average observed duration → fixed fallback |

## End-date resolution (mirrors the existing start-date tiers)

`resolveCropDate` will additionally return `endDate`:

1. **Observed** — this season's record has an `end_date` → use it directly.
2. **Average duration** — no observed end this year, but prior years at this apiary have both dates →
   `start + round(avg(end − start))`.
3. **Fixed fallback** — no duration history → `start + fallbackDurationDays` (summer 35, spring 30,
   the current constants).

The end is always anchored on the resolved **start** date, so it stays consistent across tiers.

## Files to change

| File | Change |
|------|--------|
| `src/types/tbr.ts` | `ResolvedCropDate` gains `endDate: string \| null` |
| `src/lib/tbr-model.ts` | `GddRecordLite` gains `endDate`; `resolveCropDate` resolves `endDate` (3-tier) with a `fallbackDurationDays` arg; `planFromResolved` takes a resolved `springEndDate` and uses the resolved summer end instead of the +35 default |
| `src/hooks/useTbrPlanner.ts` | Select `end_date`; map to `endDate`; pass resolved spring/summer end dates into the plan |
| `src/components/tools/TBRPlanner.tsx` | Show the resolved bloom-end date in the crop-picker readout (so the user sees the window the plan uses) |
| `src/components/tools/GDDTracker.tsx` | Helper text: "Recorded when ~10% of the crop is in bloom" / "Recorded when under 5% is still worth foraging" |
| `docs/features/tbr-swarm-planner.md` | Note the observed-end-date window |

No new dependencies. No migration.

## Out of scope

- Storing a GDD value at the end date (we only store start GDD; end is duration-based when projected).
- Back-filling end dates on historical records.
