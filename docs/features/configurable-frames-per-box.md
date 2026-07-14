# Configurable Frames per Brood Box

## Overview

The number of frames a brood box holds is now set per hive in **Hive setup**, and the
inspection form's frame pickers ("Frames with Brood", per-box selectors, and
"Right-Sized to How Many Frames") render that many buttons instead of a fixed 1–10.
This supports boxes that hold more than ten frames.

Full-depth and half-depth boxes have independent frame counts.

## Data model

Two optional fields on `HiveConfiguration` (`src/types/hive.ts`), stored in the
existing `hives.configuration` JSONB column — **no migration required**:

```ts
frames_per_full_box?: number  // default 10 when unset
frames_per_half_box?: number  // default 10 when unset
```

Any hive saved before this feature has neither field; everywhere they are read we
coalesce with `?? 10`, so historical hives behave exactly as before.

## Hive setup UI

`src/app/dashboard/hives/page.tsx` — the Hive Configuration section gains two
−/+ steppers: **Frames per Full-Size Box** and **Frames per Half-Size Box**
(clamped to 1–20). Defaults of `10` are set in the new-hive form and coalesced in
the edit mapper.

## Inspection form

`src/components/records/forms/InspectionForm.tsx`:

- `renderNumberSelector` takes a `max` argument and generates `1…max` buttons in a
  `flex flex-wrap` layout so counts above ten wrap cleanly.
- A `framesForType(type)` helper returns the selected hive's `frames_per_half_box`
  for half-depth boxes, otherwise `frames_per_full_box` (each `?? 10`).
- Call wiring:
  - Single-box "Frames with Brood" → `framesForType(broodBoxList[0]?.type)`.
  - Per-box selectors (multi-box) → `framesForType(box.type)`.
  - "Right-Sized to How Many Frames" → `frames_per_full_box ?? 10`.

## Out of scope

- No change to how `brood_frames` totals are stored or consumed downstream.
- No backfill — unset configuration is treated as 10 frames.
