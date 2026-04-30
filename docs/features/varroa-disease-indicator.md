# Varroa Disease Indicator

## Overview

A new entry in the Inspection form's **Disease Indicators** section that lets a beekeeper record visual observation of *Varroa destructor* during a routine inspection. It captures both severity (1–5 star rating, identical to the other six disease indicators) and **where** the mite was observed: on adult bees, in worker brood, in drone brood, or any combination.

This is **separate from** the existing varroa monitoring tools:

- **`varroa_checks`** table — quantitative monitoring (sugar shake, alcohol wash, sticky board) with mite counts and infestation rates.
- **Varroa disease indicator** (this feature) — qualitative observation noted during a normal inspection, sat alongside AFB / EFB / Chalkbrood etc.

The two complement each other and are intentionally separate.

## Data model

Five new columns on `public.inspections`:

| Column | Type | Default | Meaning |
|---|---|---|---|
| `varroa_disease` | `smallint` | `0` | Severity rating, 0 = not recorded, 1–5 stars |
| `varroa_seen_on_bees` | `boolean` | `false` | Mite observed on adult bees |
| `varroa_seen_in_brood` | `boolean` | `false` | Mite observed in capped brood |
| `varroa_brood_worker` | `boolean` | `false` | If in brood: worker brood affected |
| `varroa_brood_drone` | `boolean` | `false` | If in brood: drone brood affected |

Migrations:
- `add_varroa_disease_indicator_columns` — column creation.
- `add_varroa_disease_range_check` — `CHECK (varroa_disease BETWEEN 0 AND 5)` to defend against out-of-range writes from outside the form.

The location flags are independent of the rating — a user can record "saw mites on bees" without committing to a 1–5 severity. Worker/drone brood booleans are only meaningful when `varroa_seen_in_brood` is true; the form clears them automatically when the parent flag is unticked.

### Invariants

- The application enforces: `(varroa_brood_worker OR varroa_brood_drone) ⇒ varroa_seen_in_brood`. The form clears worker/drone whenever In-brood is unticked.
- A row violating that invariant (only possible via raw SQL) is rendered defensively: the card display gates worker/drone display on `varroa_seen_in_brood`, so phantom sub-flags are not surfaced to users.

## UI

In `src/components/records/forms/InspectionForm.tsx`, inside the Disease Indicators collapsible block:

1. A 7th `renderStarRating` tile labelled **Varroa**, identical layout to the existing six.
2. Below the stars: a "Where seen" sub-section with two checkboxes — **On bees** and **In brood**.
3. When **In brood** is ticked, two indented sub-checkboxes appear: **Worker brood** and **Drone brood**.
4. Unticking **In brood** automatically clears both worker and drone flags.
5. The tile's **Clear** button (provided by `renderStarRating`) resets all five fields, not just the rating.

### Accessibility

- The "Where seen" row is wrapped in `role="group"` with `aria-labelledby` referencing the visible heading, so screen readers announce the checkbox grouping.
- The conditional Worker / Drone sub-row has its own `role="group"` with an `sr-only` heading describing the dependent context. Without this, the visible indentation would carry meaning that assistive tech could not access.

## Display

`src/components/records/cards/InspectionCard.tsx` extends the existing Disease line:

```
Disease: AFB: ★★  Varroa: ★★ (bees, drone brood)
```

The Varroa row shows:

- Stars when `varroa_disease > 0`.
- A parenthesised location list joined with commas — `bees`, `worker brood`, `drone brood`. If `varroa_seen_in_brood` is true with neither sub-flag set, the list contains a generic `brood` instead.
- The card row appears whenever any of: rating > 0, `varroa_seen_on_bees`, `varroa_seen_in_brood` is true.

## Files touched

- `src/types/records.ts` — `Inspection`, `InspectionFormData`, `getDefaultInspectionFormData()`.
- `src/app/dashboard/records/page.tsx` — `editingInspection` mapper.
- `src/components/records/forms/InspectionForm.tsx` — Disease Indicators tile.
- `src/components/records/cards/InspectionCard.tsx` — Disease display row.
- DB migration `add_varroa_disease_indicator_columns` (Supabase).

## Out of scope

- No alerting / threshold logic — that belongs to the existing `varroa_checks` flow which already calculates infestation rates and `action_threshold_reached`.
- No reports/dashboard aggregation — can be added later if requested.
- No backfill: historical inspections default to `0`/`false`, which is correct (we have no data on whether varroa was visible during those inspections).
