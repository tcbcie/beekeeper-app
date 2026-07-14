# Configurable Frames per Brood Box — Plan

## Goal

Let the beekeeper set how many frames a brood box holds, in the Hive setup, so the
inspection form's "Frames with Brood" picker can render more than the current
hard-coded 1–10. Full-depth and half-depth boxes get their own frame counts.

## Decisions (confirmed with user)

- **Separate values**: `frames_per_full_box` and `frames_per_half_box`.
- **Control**: −/+ stepper (min 1, max 20) in Hive setup.
- **Default 10** everywhere it's unset → existing hives behave exactly as today.
- No DB migration — `configuration` is JSONB.

## Data model

Add to `HiveConfiguration` (`src/types/hive.ts`):

```ts
frames_per_full_box?: number
frames_per_half_box?: number
```

## UI — Hive setup (`src/app/dashboard/hives/page.tsx`)

- Add two −/+ steppers in the Hive Configuration grid:
  "Frames per Full-Size Box" and "Frames per Half-Size Box" (min 1, max 20).
- Add `frames_per_full_box: 10, frames_per_half_box: 10` to the two `configuration`
  defaults (new-hive form init at ~L87 and ~L1128) and coalesce in the edit mapper
  (~L886) with `?? 10`.

## UI — Inspection form (`src/components/records/forms/InspectionForm.tsx`)

- `renderNumberSelector` gains a `max` param; button list becomes
  `Array.from({ length: max }, (_, i) => i + 1)`.
- Button container switches from the fixed `md:grid-cols-11` grid to
  `flex flex-wrap` so any count (incl. >10) wraps cleanly; Clear becomes a normal
  wrapped item.
- Helper `framesForType(type)` → `half` uses `frames_per_half_box ?? 10`, else
  `frames_per_full_box ?? 10`, read from `selectedHive?.configuration`.
- Pass the right max into each call:
  - Single-box "Frames with Brood": `framesForType(broodBoxList[0]?.type)`.
  - Per-box selectors (multi-box): `framesForType(box.type)`.
  - "Right-Sized to How Many Frames": `frames_per_full_box ?? 10`.

## Out of scope

- No change to how brood_frames totals are stored/consumed.
- No backfill; unset config = 10.

## Todo

- [x] 1. Type: add two fields to `HiveConfiguration`.
- [x] 2. Hive setup: two steppers + defaults + edit-mapper coalesce.
- [x] 3. Inspection form: `max` param, flex-wrap layout, `framesForType`, wire calls.
- [x] 4. Feature doc in `docs/features/`.
- [ ] 5. User to test.

## Review

### Changes made

- **`src/types/hive.ts`** — added `frames_per_full_box?` and `frames_per_half_box?`
  to `HiveConfiguration`.
- **`src/app/dashboard/hives/page.tsx`** — added two −/+ steppers (1–20) to the
  Hive Configuration section; seeded `10` in both new-hive defaults and coalesced
  `?? 10` in the edit mapper.
- **`src/components/records/forms/InspectionForm.tsx`** — `renderNumberSelector`
  now takes a `max` (default 10) and renders `1…max` in a `flex flex-wrap` layout;
  added `framesForType(type)` and wired it into the single-box, per-box, and
  right-sized frame pickers.
- **`docs/features/configurable-frames-per-box.md`** — feature doc.

No DB migration — `configuration` is JSONB and unset fields fall back to 10.

### To verify (user)

- Hive setup: set Frames per Full-Size Box to 12 → inspection "Frames with Brood"
  on that (single full-box) hive shows buttons 1–12.
- Multi-box hive with a half box on a different half-box count → each box's picker
  reflects its own type's frame count.
- Existing hive never touched since the update → pickers still show 1–10.
- "Right-Sized to How Many Frames" honours the full-box count.
