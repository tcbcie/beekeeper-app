# Apiary Categories: Own / Shared / Mating

## Overview

Apiaries are classified into three categories with visual differentiation and filtering:

- **Own Apiaries** — Apiaries the user created and owns. Full edit/delete access.
- **Shared Apiaries** — Apiaries shared via team memberships (through `team_apiaries`). Read-only; displayed with a blue left border and "Shared via {team}" badge.
- **Mating Apiaries** — Locations used for queen mating that the user doesn't actively manage. Displayed with a purple left border and "Mating Apiary" badge.

## Database

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `is_mating_apiary` | `boolean NOT NULL` | `false` | Marks an apiary as a mating location |

No RLS changes were required — existing policies already handle access correctly.

## Category Filter

A dropdown above the apiary grid allows filtering by category:

| Filter | Shows |
|--------|-------|
| All Apiaries | Everything the user can access |
| My Apiaries | Own, non-mating apiaries |
| Shared Apiaries | Apiaries from team memberships (only shown if user is a team member) |
| Mating Apiaries | Own apiaries marked as mating locations |

The summary stats bar updates to reflect the filtered results. The filter is wrapped in `useMemo` for performance. If the user is removed from all teams while "Shared" is selected, the filter auto-resets to "All".

## Shared Apiaries

Shared apiaries are fetched using the same pattern as the hives page:

1. Look up the user's team memberships from `team_members`
2. Fetch shared apiary IDs from `team_apiaries`
3. Query apiaries matching either `user_id = currentUser` or `id IN (sharedApiaryIds)`
4. Enrich each apiary with `is_shared` (computed) and `team_name` (looked up from `teams` via a `Record<string, string>`)

Shared apiary cards are read-only — the Edit and Delete buttons are hidden. Backfill operations (elevation, grid reference) are scoped to owned apiaries only to prevent attempted writes to shared apiaries.

## Mating Apiary Checkbox

The apiary form includes a "Mating Location (Apiary)" checkbox (purple themed), always visible below the Notes field. This persists on both create and edit, and is stored as the `is_mating_apiary` column.

## Form Options Visibility

The "Share apiary location publicly" and "Declare as NIHBS Conservation Area" checkboxes are always visible in the form regardless of whether coordinates have been entered. Conservation area is conditionally shown when sharing is enabled.

## Visual Differentiation (ApiaryCard)

| Category | Left Border | Badge |
|----------|-------------|-------|
| Own | None (default) | None |
| Shared (team member view) | Blue (`border-l-blue-500`) | "👥 Shared via {team}" (blue) |
| Shared (owner view) | Purple (`border-l-purple-500`) | "📤 Shared with {team}" (purple) |
| Mating | Purple (`border-l-purple-500`) | "Mating Apiary" (purple) |

## Known Issue: INSERT RETURNING and RLS

The `apiaries` SELECT RLS policy uses `can_access_apiary(id, auth.uid())`, a `SECURITY DEFINER` function that queries the `apiaries` table. When using `INSERT ... RETURNING` (Supabase `.insert().select()`), PostgreSQL evaluates the SELECT policy on the new row. The `can_access_apiary` sub-query cannot see the uncommitted row, causing a 403.

**Workaround:** The apiary ID is generated client-side using `crypto.randomUUID()` and passed in the INSERT payload, avoiding the need for `RETURNING` entirely.

## Files Modified

| File | Change |
|------|--------|
| Database migration | Added `is_mating_apiary` column |
| `src/types/apiary.ts` | Added `user_id`, `is_mating_apiary`, `is_shared`, `team_name` to `Apiary`; added `is_mating_apiary` to `ApiaryFormData` |
| `src/app/dashboard/apiaries/page.tsx` | Fetch shared apiaries, category filter, mating checkbox in form, client-side UUID generation |
| `src/components/apiaries/ApiaryCard.tsx` | Coloured left border, category badges, `isReadOnly` prop |
