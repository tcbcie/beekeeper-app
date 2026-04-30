# Varroa Disease Indicator — Plan

## Goal

Add Varroa as a seventh entry in the **Disease Indicators** section of the Inspection form. It follows the same 1-5 star rating pattern as the existing six (AFB, EFB, Chalkbrood, Nosemosis, DWV, IAPV & CBPV), and additionally records *where* the mite was observed: on bees, in worker brood, in drone brood, or any combination.

This is distinct from the existing `varroa_checks` table (sugar shake / mite-count records). This is a *visual observation* tracked alongside other disease ratings on a normal inspection.

## Data model

Add five columns to the `inspections` table:

| Column | Type | Default | Meaning |
|---|---|---|---|
| `varroa_disease` | `smallint` | `0` | Severity rating (0 = not recorded, 1–5 = star level) |
| `varroa_seen_on_bees` | `boolean` | `false` | Observed on adult bees |
| `varroa_seen_in_brood` | `boolean` | `false` | Observed in capped brood |
| `varroa_brood_worker` | `boolean` | `false` | If in brood: worker brood affected |
| `varroa_brood_drone` | `boolean` | `false` | If in brood: drone brood affected |

Migration done via Supabase MCP `apply_migration`, per CLAUDE.md.

## UI

In the existing Disease Indicators collapsible block, after `IAPV & CBPV` add a new tile:

```
Varroa                                     [Clear]
[★] [★] [★] [★] [★]    ← 1-5 stars (same renderStarRating helper)

Where seen:
[ ] On bees     [ ] In brood
   ├─ when "In brood" is ticked:
   ├─ [ ] Worker brood
   └─ [ ] Drone brood
```

Behaviour:
- Stars use the existing `renderStarRating` helper — no styling change.
- The location checkboxes are always visible (no need to gate by rating > 0) so the user can record observations at level 0 too if they want.
- Worker/Drone sub-checkboxes only render when "In brood" is ticked. Unticking "In brood" automatically clears them.
- "Clear" button next to the label resets all five fields (rating + 4 booleans), matching the existing one-click reset on the other indicators.

## Other places that reference disease fields

Whenever new inspection columns are added, these files also need touching:

1. `src/types/records.ts`
   - `Inspection` interface (line ~83-88) — add 5 fields
   - `InspectionFormData` interface (line ~257-262) — add 5 fields
   - `getDefaultInspectionFormData()` (line ~419-424) — add defaults
2. `src/app/dashboard/records/page.tsx` (line ~217-222) — extend the editingInspection mapper for edit mode
3. `src/components/records/cards/InspectionCard.tsx` (line ~82, 298-303) — include in `hasDisease` check and the display row
4. `src/components/records/forms/InspectionForm.tsx` (line ~1053-1058) — render the new tile
5. `docs/features/varroa-disease-indicator.md` — feature doc (per CLAUDE.md)

The submit handler in `records/page.tsx` already spreads `formData` directly into the insert, so no changes there.

## Todo

- [x] **1. DB migration** — applied via Supabase MCP as `add_varroa_disease_indicator_columns` (5 columns added with `NOT NULL DEFAULT`).
- [x] **2. Types** — extended `Inspection`, `InspectionFormData`, `getDefaultInspectionFormData()` in `src/types/records.ts`.
- [x] **3. Edit mapper** — extended `editingInspection` mapping in `src/app/dashboard/records/page.tsx`.
- [x] **4. Form UI** — added the Varroa tile in `InspectionForm.tsx` with stars + "Where seen" checkboxes; unticking "In brood" auto-clears worker/drone; Clear resets all five fields.
- [x] **5. Card display** — extended `InspectionCard.tsx` `hasDisease` check and added the Varroa row.
- [x] **6. Feature doc** — `docs/features/varroa-disease-indicator.md`.
- [ ] **7. User to test** — per CLAUDE.md, user runs `npm run build` and verifies in browser.

## Open questions for you

1. **Naming.** I'm using `varroa_disease` to match the existing `<name>_disease` pattern. OK?
2. **Location vs rating.** Should the location checkboxes still be enterable at rating = 0 (i.e. "I saw mites but couldn't gauge severity")? My default is yes — they're independent observations.
3. **Card label.** On the inspection card I'm planning `Varroa: ★★ (bees, drone brood)`. Want a different format?

## Review

### Summary of changes

- **DB**: migration `add_varroa_disease_indicator_columns` added five `NOT NULL` columns to `inspections` (`varroa_disease smallint`, four booleans for location). Existing rows backfill to `0`/`false`, which is correct — we don't have visual-observation data for past inspections.
- **`src/types/records.ts`**: added the five fields to both `Inspection` and `InspectionFormData`, plus defaults in `getDefaultInspectionFormData()`. No other type was affected.
- **`src/app/dashboard/records/page.tsx`** (line ~217–227): extended the `editingInspection` mapper so editing an old inspection coalesces missing values to defaults. The submit handler already spreads `formData` directly into the insert/update, so the new columns flow through automatically.
- **`src/components/records/forms/InspectionForm.tsx`**: inside the Disease Indicators grid, added a 7th tile with the existing `renderStarRating` plus a "Where seen" sub-section. Two top-level checkboxes (On bees / In brood); the In-brood checkbox's `onChange` clears `varroa_brood_worker` and `varroa_brood_drone` when unticked. Worker/Drone sub-checkboxes only render while In brood is true. The Varroa Clear button resets all five fields.
- **`src/components/records/cards/InspectionCard.tsx`**: introduced `hasVarroa` and added it to `hasDisease`. Built a `varroaLocations` array (bees / worker brood / drone brood, or generic "brood" if In brood is set with no sub-flags). Display row formats as `Varroa: ★★ (bees, drone brood)` when both rating and location exist; rating-only and location-only variants both render correctly.
- **`docs/features/varroa-disease-indicator.md`**: feature doc covering data model, UI, display, files touched, and explicit out-of-scope items (alerting, dashboard, backfill).

### Scope honoured

- Single-touchpoint extension to the existing Disease Indicators pattern. No new components, helpers, or hooks introduced.
- No mention of `varroa_checks` was changed — the existing quantitative-monitoring flow is unaffected.
- No backfill or report aggregation was added; deferred until requested.

### Notes for verification

- Subscribed user opening a new inspection: Disease Indicators panel shows seven tiles, Varroa last. Star tile + "Where seen" checkboxes underneath.
- Tick **In brood** → Worker / Drone brood checkboxes appear. Untick → they vanish *and* the underlying booleans reset (verifiable by re-opening the form: sub-flags are cleared).
- Click **Clear** on the Varroa tile → rating returns to 0 *and* all four location flags clear.
- Save an inspection with rating=2, On bees + In brood + Drone brood ticked → Records list card displays `Disease: ... Varroa: ★★ (bees, drone brood)`.
- Save with rating=0, On bees ticked only → card displays `Disease: ... Varroa: (bees)` (no stars).
- Edit an old inspection (created before this migration) → Varroa tile shows clean default state (0 / all unticked) without errors.
