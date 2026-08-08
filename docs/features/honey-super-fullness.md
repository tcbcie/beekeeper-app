# Honey Super Fullness

Record, per inspection, how full each honey super is (0–100%), and show the most recent
recorded value as a mini gauge beside each super on the hive card.

## Overview

- The inspection form gains an **optional, collapsible** "Honey Super Fullness" section.
- The number of controls is **dynamic** — one slider per honey super, driven by the hive's
  current `configuration.honey_supers` count.
- Recording control: native **range slider (0–100%, step 5)** per super — large, glove- and
  low-vision-friendly touch target.
- Display: a small **circular mini gauge** drawn beside each super in the hive card, using the
  **last inspection that actually recorded fullness** (the last known level — fullness is optional,
  so most inspections leave it unrecorded).
- 3D yard view: a honey-coloured band wraps **all four faces** of each super, rising in proportion
  to fullness, with a camera-facing **% label** so it reads at any angle without rotating the hive.

## Data model

Follows the existing `brood_frames_per_box` precedent — a nullable `jsonb` column holding a
small array, `NULL` when not recorded.

| Column | Type | Null | Meaning |
|---|---|---|---|
| `inspections.honey_super_fullness` | `jsonb` | yes (default NULL) | `number[]`, one 0–100 integer per super; index 0 = bottom super |

- `NULL` = section never opened (not recorded), distinct from a recorded `0%`.
- On save the array is trimmed to the hive's current super count, and an array trimmed to nothing
  collapses back to `NULL`. When **editing** an existing inspection the originally recorded length
  is preserved instead, so readings taken before supers were removed are never destroyed.

### Carry-forward and removed supers

A new inspection pre-fills fullness from the hive's most recent inspection (supers don't empty
between visits, so `0%` would be a misleading default). That carry-forward is **bounded by the
hive's current super count** — supers removed since the last visit are dropped rather than carried.

This matters because the slider count is `max(configured, recorded)`, where the `recorded` term
exists so that editing an older inspection still shows every historical reading. If the carried
array kept its old length, it would outvote a now-smaller configured count and every future
inspection would keep offering sliders for supers that are no longer on the hive — a state that
never self-corrects, because each inspection carries the stale length forward again.

The invariant is enforced in two places: the carry-forward slices to the configured count
(`InspectionForm.tsx`), and the save path trims before persisting (`records/page.tsx`).

## Files touched

- **DB migration** (Supabase MCP): add `honey_super_fullness` column.
- `src/types/records.ts` — add field to `Inspection`, `InspectionFormData`, and the default factory.
- `src/components/records/forms/InspectionForm.tsx` — collapsible sliders section.
- `src/app/dashboard/records/page.tsx` — passes super count to the form; array flows through the
  existing save spread.
- `src/components/records/cards/InspectionCard.tsx` — read-only summary line.
- `src/app/dashboard/hives/page.tsx` — enrich hives with latest inspection fullness.
- `src/components/hive/SuperFullnessGauge.tsx` — new mini-gauge component.
- `src/components/hive/HiveListCard.tsx` — render gauge beside each super.

## Out of scope

- 3D yard-map (`Hive3D.tsx`) gauge overlay — possible follow-up.
- No change to the `honey_supers` given/taken adjustment logic.

## Pre-fill from last inspection (added later)

A **new** inspection now seeds its Super Fullness gauges from the hive's most recent inspection
instead of resetting every gauge to 0 (supers don't empty between visits, so 0 was misleading).

- `records/page.tsx` builds `previousSuperFullnessByHive` (newest-first `inspections`, first
  occurrence per hive) and passes it to `InspectionForm`.
- `InspectionForm` mirrors the existing right-sized-frames prefill: `getPreviousSuperFullness`
  plus a hive-keyed effect that seeds `honey_super_fullness` **only when not editing**, so
  historical inspections are never overwritten. If the hive has no prior inspection the gauges
  stay unset (default 0). See [inspection-right-sized-frames-prefill-plan.md](inspection-right-sized-frames-prefill-plan.md).

## Newly added super reads 0% on the Hive Setup card (added later)

`HiveListCard` previously showed **no gauge** for a configured super with no recorded reading —
so adding a super in Hive Setup (beyond the last inspection's `last_super_fullness` array) left it
blank. A configured super with no recorded reading now reads **0%** (empty) instead of blank,
matching the mental model that a freshly added / not-yet-inspected super is empty. The 3D yard
view (`Hive3D.tsx`) was updated to match: an unrecorded super now reads 0% in the camera-side
gauge column (and renders with no fill overlay, since the fill is only drawn for fullness > 0).

## Previous-reading trend note on the Hive Setup card (added later)

To show a trend at a glance, each super box now shows a small **`was X%`** note beside its gauge
**only when the value changed** from the previous recorded reading. The shared previous-reading
date is shown once as a `Previous readings: DD/MM/YYYY` caption beneath the stack (all supers'
previous values come from the same prior inspection, so the date is not repeated per super).

- `useHivesList` derives `previous_super_fullness` (the second inspection that recorded fullness,
  since inspections are newest-first) and `previous_super_fullness_date`, added to the `Hive` type.
- `HiveListCard` renders the per-super `was X%` note (only when changed) and the shared caption
  (shown only when at least one super changed and a previous date exists).
- Scope: the Hive Setup card only (`HiveListCard`, fed by `useHivesList`); the 3D/map views are
  unchanged.
