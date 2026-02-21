# Apiary Categories: Own / Shared / Mating — Implementation Plan

## Tasks

- [x] 1. Database migration — Add `is_mating_apiary` column to `apiaries` table
- [x] 2. Update TypeScript types — Add `user_id`, `is_mating_apiary`, `is_shared`, `team_name` to `Apiary` interface; add `is_mating_apiary` to `ApiaryFormData`
- [x] 3. Update `fetchApiaries` — Fetch team memberships + shared apiaries (same pattern as hives page), enrich with `is_shared` and `team_name`
- [x] 4. Add category filter dropdown — `all` / `own` / `shared` (if team member) / `mating`, client-side filtering
- [x] 5. Add mating apiary checkbox to form — Initial state, resetForm, handleEdit, dataToSave, and form UI
- [x] 6. Update ApiaryCard — Coloured left border (blue=shared, purple=mating), category badge, `isReadOnly` prop to hide edit/delete
- [x] 7. Pass `isReadOnly` from page to ApiaryCard for shared apiaries
- [x] 8. Create feature documentation — `docs/features/apiary-categories.md`

## Review

### Summary of Changes

**Database:** Added `is_mating_apiary boolean NOT NULL DEFAULT false` column to the `apiaries` table via Supabase migration. No RLS changes needed.

**Types (`src/types/apiary.ts`):** Extended `Apiary` with `user_id`, `is_mating_apiary`, `is_shared`, and `team_name`. Extended `ApiaryFormData` with `is_mating_apiary`.

**Fetch logic (`apiaries/page.tsx`):** Rewrote `fetchApiaries` to follow the hives page pattern — fetches team memberships, shared apiary IDs via `team_apiaries`, then queries with `.or()` to include both owned and shared apiaries. Each apiary is enriched with computed `is_shared` and looked-up `team_name`.

**Category filter (`apiaries/page.tsx`):** Added `categoryFilter` state and a `<select>` dropdown with options: All / My / Shared (conditional on team membership) / Mating. Client-side `filteredApiaries` array drives rendering and stats.

**Mating checkbox (`apiaries/page.tsx`):** Added purple-themed checkbox in the form after the notes field. Wired into `formData`, `resetForm`, `handleEdit`, and `dataToSave`.

**ApiaryCard (`ApiaryCard.tsx`):** Added `isReadOnly` prop. Shared cards get blue left border + "Shared via {team}" badge. Mating cards get purple left border + "Mating Apiary" badge. Edit/Delete buttons hidden when `isReadOnly`.

### Files Changed

| File | Change |
|------|--------|
| Database (migration) | Added `is_mating_apiary` column |
| `src/types/apiary.ts` | Added new fields to both interfaces |
| `src/app/dashboard/apiaries/page.tsx` | Shared apiary fetching, category filter, mating checkbox, `isReadOnly` pass-through |
| `src/components/apiaries/ApiaryCard.tsx` | Coloured borders, badges, read-only mode |
| `docs/features/apiary-categories.md` | New feature documentation |
