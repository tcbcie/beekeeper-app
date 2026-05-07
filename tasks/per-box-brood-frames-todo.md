# Per-Box Brood Frames — Plan

## Goal

When a hive has more than one brood box, the inspection form must let the user record **Frames with Brood** separately for each box. `right_sized_frames` stays a single hive-level metric.

## Data model

New column on `inspections`:

```sql
ALTER TABLE public.inspections
  ADD COLUMN brood_frames_per_box jsonb;
```

Shape:

```json
[
  { "box": 1, "type": "full", "frames": 7 },
  { "box": 2, "type": "full", "frames": 5 },
  { "box": 3, "type": "half", "frames": 3 }
]
```

- `box`: 1-based index, sorted with `full` boxes first, then `half`.
- `type`: `"full" | "half"` — drives the form label "Box N (full|half)".
- `frames`: 0–12.

`brood_frames` is **kept** as the hive-level total (sum of per-box frames). All existing consumers (HiveListCard, dashboard, AI tools, reports) keep working unchanged. `brood_frames_per_box = null` means single-box mode (today's behaviour).

## UI

In `InspectionForm.tsx`, replace the single `renderNumberSelector` for "Frames with Brood" with a conditional:

- **Hive has 0 or 1 brood box**: render the existing single selector. `brood_frames_per_box` stays `null`.
- **Hive has > 1 brood box**: render N selectors stacked vertically, each labelled "Box 1 (full)", "Box 2 (full)", "Box 3 (half)", etc. Below them, a small read-only "Total: N" line.

State: a single `brood_frames_per_box` array. Selector onChange updates one box's `frames`; `brood_frames` is recomputed as `sum(boxes.frames)` in the same setState call.

## Hive change handling

When `formData.hive_id` changes:
- Resolve the hive's `configuration.brood_boxes_full`, `brood_boxes_half` (and legacy `brood_boxes`).
- Compute box list `[ {box: 1, type: 'full'}, ..., {box: N, type: 'half'} ]`.
- If new total > 1 and `brood_frames_per_box` is null/empty: initialise array with `frames: 0` per box, but seed Box 1 with the current `brood_frames` total so the user's existing single-value isn't lost.
- If new total ≤ 1: clear `brood_frames_per_box` to null.

## Editing historical inspections

Old rows have `brood_frames_per_box = null`. When loaded for edit:
- If the hive currently has > 1 box, build the per-box array from hive config; seed Box 1 with the inspection's `brood_frames`, others 0. Show an inline notice: "Per-box detail wasn't recorded when this inspection was first saved. Box 1 reflects the original total of {N}; please adjust if needed."
- If the hive has ≤ 1 box, leave per-box as null.

## Files touched

- New migration `add_brood_frames_per_box_column` (via Supabase MCP).
- `src/types/records.ts` — add `BroodBoxFrames` type, add field to `Inspection`/`InspectionFormData`, default in `getDefaultInspectionFormData()`.
- `src/components/records/forms/InspectionForm.tsx` — UI + state.
- `src/app/dashboard/records/page.tsx` — extend `editingInspection` mapper.
- `src/components/records/cards/InspectionCard.tsx` — show per-box detail when present (e.g. "Brood: 7 (Box1 4, Box2 3)").
- `docs/features/per-box-brood-frames.md` — feature doc.

## Out of scope

- No backfill of existing inspections.
- No change to `right_sized_frames` (single hive-level value).
- No reports/AI changes — they keep using the `brood_frames` total.
- No history-aware per-box (using configuration_changed_at): we always use the hive's *current* configuration to determine box count when filling in the form.

## Todo

- [x] 1. DB migration via Supabase MCP — `add_brood_frames_per_box_column`.
- [x] 2. Type changes in `records.ts` — `BroodBoxType`, `BroodBoxFrames`; field added to `Inspection` and `InspectionFormData`; default in `getDefaultInspectionFormData()`.
- [x] 3. `editingInspection` mapper extended in `records/page.tsx`.
- [x] 4. Form UI in `InspectionForm.tsx`: box-list memo, sync effect, per-box updater, conditional render with per-box selectors, total line, edit-mode amber notice.
- [x] 5. Card display in `InspectionCard.tsx`: appends per-box breakdown to Brood line when array length > 1.
- [x] 6. Feature doc `docs/features/per-box-brood-frames.md`.
- [ ] 7. User to test.

## Review

### Verification checklist

- Open an inspection on a hive with `configuration.brood_boxes_full = 2, brood_boxes_half = 1`. Frames-with-Brood now shows three selectors: "Box 1 (full)", "Box 2 (full)", "Box 3 (half)", with a running total above.
- Switch hive to a single-box hive — selectors collapse to the original single-row picker; per-box data clears.
- Save with Box 1 = 5, Box 2 = 3, Box 3 = 0 → DB row shows `brood_frames = 8` and `brood_frames_per_box = [{box:1,type:full,frames:5}, {box:2,type:full,frames:3}, {box:3,type:half,frames:0}]`.
- Edit a pre-feature inspection on a multi-box hive → amber notice appears, Box 1 seeded with the original total, boxes 2+ at 0.
- Inspection card shows `Brood: 8 (B1 5, B2 3, B3 0)` for the new row.
