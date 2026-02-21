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

The summary stats bar updates to reflect the filtered results.

## Shared Apiaries

Shared apiaries are fetched using the same pattern as the hives page:

1. Look up the user's team memberships from `team_members`
2. Fetch shared apiary IDs from `team_apiaries`
3. Query apiaries matching either `user_id = currentUser` or `id IN (sharedApiaryIds)`
4. Enrich each apiary with `is_shared` (computed) and `team_name` (looked up from `teams`)

Shared apiary cards are read-only — the Edit and Delete buttons are hidden.

## Mating Apiary Checkbox

The apiary form includes a "Mating Apiary / Location" checkbox (purple themed). This persists on both create and edit, and is stored as the `is_mating_apiary` column.

## Visual Differentiation (ApiaryCard)

| Category | Left Border | Badge |
|----------|-------------|-------|
| Own | None (default) | None |
| Shared | Blue (`border-l-blue-500`) | "Shared via {team}" (blue) |
| Mating | Purple (`border-l-purple-500`) | "Mating Apiary" (purple) |

## Files Modified

| File | Change |
|------|--------|
| Database migration | Added `is_mating_apiary` column |
| `src/types/apiary.ts` | Added `user_id`, `is_mating_apiary`, `is_shared`, `team_name` to `Apiary`; added `is_mating_apiary` to `ApiaryFormData` |
| `src/app/dashboard/apiaries/page.tsx` | Fetch shared apiaries, category filter, mating checkbox in form |
| `src/components/apiaries/ApiaryCard.tsx` | Coloured left border, category badges, `isReadOnly` prop |
