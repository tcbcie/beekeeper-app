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
  latest inspection's recorded values.

## Data model

Follows the existing `brood_frames_per_box` precedent — a nullable `jsonb` column holding a
small array, `NULL` when not recorded.

| Column | Type | Null | Meaning |
|---|---|---|---|
| `inspections.honey_super_fullness` | `jsonb` | yes (default NULL) | `number[]`, one 0–100 integer per super; index 0 = bottom super |

- `NULL` = section never opened (not recorded), distinct from a recorded `0%`.
- On save the array is trimmed to the hive's current super count.

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
