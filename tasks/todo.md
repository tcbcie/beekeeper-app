# Add Irish Grid Reference (10km) to Apiary Details

## Tasks

- [x] 1. Install proj4 and @types/proj4
- [x] 2. Database migration — add `grid_reference` (text, nullable) to `apiaries`
- [x] 3. Create `src/lib/irish-grid.ts` — pure conversion utility (WGS84 → Irish Grid 10km ref)
- [x] 4. Update `src/types/apiary.ts` — add `grid_reference` to both interfaces
- [x] 5. Update `src/app/dashboard/apiaries/page.tsx` — form field, lookup, backfill, save
- [x] 6. Update `src/app/dashboard/apiaries/[id]/page.tsx` — display grid ref in Location section
- [x] 7. Create `docs/features/irish-grid-reference.md`

## Review

### Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | `package.json` | Added `proj4` + `@types/proj4` dependencies |
| 2 | DB migration | `ALTER TABLE apiaries ADD COLUMN grid_reference text NULL` |
| 3 | `src/lib/irish-grid.ts` | **New file** — `toIrishGridRef(lat, lng)` using proj4 to convert WGS84 → Irish Grid 10km ref |
| 4 | `src/types/apiary.ts` | Added `grid_reference` to both `Apiary` and `ApiaryFormData` interfaces |
| 5 | `src/app/dashboard/apiaries/page.tsx` | Added import, `lookupGridReference()` helper, calls in both coordinate handlers, `backfillGridReferences()` on load, grid_reference in formData init/reset/save/edit, read-only form field |
| 6 | `src/app/dashboard/apiaries/[id]/page.tsx` | Shows "Irish Grid: N16" below elevation in Location section |
| 7 | `docs/features/irish-grid-reference.md` | **New file** — Feature documentation |

### How It Works
- Grid reference is computed synchronously (pure maths via proj4) — no API call needed
- Auto-populated when coordinates change via geocoding or map picker
- Existing apiaries are backfilled on page load (same pattern as elevation)
- Returns null for locations outside the Irish Grid (UK mainland etc.)
- Displayed as a read-only field in the form and on the detail page
