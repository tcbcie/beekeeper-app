# Per-Box Brood Frames

## Overview

When a hive has more than one brood box (full or half-depth), the inspection form lets the user record **Frames with Brood** separately for each box rather than as a single hive-level total. The hive-level `brood_frames` total is still maintained as the sum of per-box values, so all existing consumers (HiveListCard, dashboard analytics, AI tools, reports) keep working unchanged.

`right_sized_frames` stays a single hive-level metric — it describes the colony's fit, not a per-box quantity.

## Data model

New column on `inspections`:

```sql
brood_frames_per_box jsonb
```

Shape:

```json
[
  { "box": 1, "type": "full", "frames": 7 },
  { "box": 2, "type": "full", "frames": 5 },
  { "box": 3, "type": "half", "frames": 3 }
]
```

- `box` — 1-based index, sorted with `full` boxes first then `half`.
- `type` — `"full" | "half"`. Drives the form label "Box N (full|half)".
- `frames` — non-negative integer (0 means an empty box).

`brood_frames_per_box = null` means single-box mode (or hive without explicit box config). The hive-level `brood_frames` remains a free-standing value.

Migration: `add_brood_frames_per_box_column`.

## UI

In `InspectionForm.tsx`, the "Frames with Brood" block is now conditional:

- **Hive has 0 or 1 brood box** — single number selector (today's behaviour). `brood_frames_per_box` is kept as `null`.
- **Hive has > 1 brood box** — one number selector per box, stacked vertically and labelled `Box 1 (full)`, `Box 2 (full)`, `Box 3 (half)`, etc. A read-only "Total: N" line above the selectors shows the running sum.

When a per-box selector value changes, `brood_frames` is recomputed as the sum and stored alongside.

## Hive-change reconciliation

A `useEffect` keyed on the box-list shape keeps `formData.brood_frames_per_box` aligned with the currently-selected hive:

- New hive has ≤ 1 box → clear the array to `null`.
- New hive has > 1 box and the array is `null` → initialise from the box list. **Box 1 is seeded with the existing `brood_frames` total** so the user's already-entered value isn't lost during the transition; remaining boxes start at 0.
- Box list shape changes (e.g. user added or removed a box on the hive while the form was open) → preserve already-entered values for matching `(box, type)` pairs; new boxes start at 0.

## Editing historical inspections

Old rows have `brood_frames_per_box = null`. When loaded for edit on a hive that *now* has > 1 brood box, the sync effect builds the per-box array and seeds Box 1 with the original `brood_frames` total. A small in-form notice (amber) is rendered:

> "Per-box detail wasn't recorded when this inspection was first saved. Box 1 reflects the original total of N; please adjust if needed."

The user can redistribute the value, or save as-is to acknowledge the box-1-only seed.

## Card display

`InspectionCard.tsx` shows the breakdown when present:

```
Brood: 15 (B1 7, B2 5, B3 3)
```

Single-box hives show just `Brood: 7`.

## Files touched

- DB migration `add_brood_frames_per_box_column` (Supabase MCP).
- `src/types/records.ts` — added `BroodBoxType`, `BroodBoxFrames`; added `brood_frames_per_box` to `Inspection` and `InspectionFormData`; default `null` in `getDefaultInspectionFormData()`.
- `src/components/records/forms/InspectionForm.tsx` — box-list memo, sync effect, per-box updater, conditional render.
- `src/app/dashboard/records/page.tsx` — `editingInspection` mapper coalesces missing `brood_frames_per_box` to default.
- `src/components/records/cards/InspectionCard.tsx` — appends per-box breakdown to the Brood line when present.

## Out of scope

- No backfill of historical inspections.
- No change to `right_sized_frames` (stays hive-level).
- No history-aware box list (we always use the hive's *current* configuration to determine box count for the form).
- No reports/AI changes — they keep using the `brood_frames` total which we maintain server-correct as the sum.
