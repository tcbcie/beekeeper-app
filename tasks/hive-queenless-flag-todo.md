# Add "Confirmed Queenless" flag to hives

## Problem

When a hive swarms, the old queen has left. Currently the only options are:
- Link a queen record via the Queen dropdown
- Leave the dropdown on "Record manual" and toggle Queen Marked/Mated/Clipped

Neither says "this hive has no queen". The hive card has no visual signal that
the colony is queenless, so it looks identical to a healthy queen-right hive.

## Solution

Add a persistent hive-level boolean `is_queenless`.

- New column on `hives` table: `is_queenless boolean NOT NULL DEFAULT false`
- New toggle on the Edit Hive form, sitting directly under the Queen dropdown
  (it changes the meaning of the queen section, so placement matters)
- When `is_queenless = true`, the Queen Marked / Mated / Clipped section is
  hidden (those traits describe a queen that isn't there)
- Red "Queenless" badge on the hive card in `/dashboard/hives` so the state
  is obvious at a glance
- Persisted on insert and update via the existing submit path

## Out of scope

- Inspection records: `queen_seen` already exists as a per-inspection
  observation. We are NOT auto-flipping `is_queenless` from inspections; the
  user is the source of truth ("confirmed" means deliberate).
- Hive detail page (`/dashboard/hives/[id]`): can follow in a separate change
  if the user wants — keeping this PR focused on the card + form.
- Auto-clearing `queen_id` when marking queenless: deliberately not done.
  The historical link to the previous queen record is worth keeping.

## Files touched

| File | Change |
|---|---|
| DB migration (via MCP) | Add `is_queenless` column |
| `src/types/hive.ts` | Add `is_queenless` to `Hive` and `HiveFormData` |
| `src/app/dashboard/hives/page.tsx` | Default value, form toggle, submit payload, edit-mode hydration, conditional rendering of the marked/mated/clipped section |
| `src/components/hive/HiveListCard.tsx` | Red "Queenless" badge |

## Todo

- [x] Apply DB migration via Supabase MCP
- [x] Reconcile legacy `status='queenless'` rows to `status='active' + is_queenless=true`
- [x] Update `src/types/hive.ts`
- [x] Add toggle to Edit Hive form, gate the marked/mated/clipped UI on `!is_queenless`
- [x] Remove "Queenless" from the Status dropdown (now orthogonal to status)
- [x] Wire submit / edit handlers / default form state
- [x] Add red badge to HiveListCard
- [x] Add red badge to the hive detail page
- [x] Add red badge to the apiary detail page (and extend `useApiaryDetail` projection)
- [x] Drive existing red-badge logic from `is_queenless` instead of `status==='queenless'`
- [x] Document in `docs/features/hive-queenless-flag.md`
- [x] Review section

## Review

The scope widened slightly during implementation when I discovered the
legacy `status='queenless'` enum value already drove a red badge on three
surfaces (card, hive detail, apiary detail). Rather than leave two
competing sources of truth, I migrated 12 existing rows to the new flag
(setting `status='active'` because a queenless hive is still a live
colony) and removed the redundant `'queenless'` option from the Status
dropdown.

Files touched:

| File | Change |
|---|---|
| `migrations: add_is_queenless_to_hives` | New boolean column with `NOT NULL DEFAULT false`, comment explaining independence from `queen_id` |
| `migrations: migrate_queenless_status_to_is_queenless_flag` | Reconcile legacy enum rows |
| `src/types/hive.ts` | Add `is_queenless: boolean` to `Hive` and `HiveFormData` |
| `src/app/dashboard/hives/page.tsx` | Default state, edit hydration, submit payload, new full-width red toggle below Status, removed `<option value="queenless">`, gate marked/mated/clipped on `!is_queenless` |
| `src/components/hive/HiveListCard.tsx` | New `<span>Queenless</span>` pill rendered when `hive.is_queenless && !hive.archived_at` |
| `src/app/dashboard/hives/[id]/page.tsx` | Same pill in the Status row; status enum class branch for `queenless` removed |
| `src/app/dashboard/apiaries/[id]/page.tsx` | Same pill in the apiary's hive list; status enum class branch removed |
| `src/hooks/useApiaryDetail.ts` | Added `is_queenless` to the projection and `ApiaryHive` interface |
| `docs/features/hive-queenless-flag.md` | New feature doc |

## Audit findings (post-implementation)

- **HIGH (fixed):** the first cut of the toggle was `md:col-span-2` inserted
  between the Status and Type dropdowns, breaking the form's
  `md:grid-cols-2` pairings for every subsequent row. Moved the toggle to
  sit above the Queen Status block instead, where there's already an
  adjacent full-width section. Original pairings restored.
- **MEDIUM (deferred):** `hives.status` has no DB-level CHECK constraint.
  Production rows include mixed-case (`Active`) and out-of-enum (`Weak`,
  legacy `archived`) values. Removing the `queenless` option from the
  dropdown is safe today because that exact value was migrated, but the
  schema would happily accept new writes of any string. A CHECK
  constraint should be added as a separate normalisation effort that
  also resolves the `Weak` and casing-inconsistency rows. Out of scope
  here because data cleanup needs a human decision on `'Weak'`.
- **LOW (deliberate):** when `is_queenless = true` the hidden
  `queen_marked` / `queen_mated` / `queen_clipped` / `queen_marking_color`
  values stay in formData and persist to DB. Harmless because nothing
  reads them while queenless is on, and the values are preserved for
  when the user un-toggles. Clearing on toggle would be destructive and
  surprising.
- **LOW (project-wide, not new):** the toggle has no `aria-pressed` /
  `role="switch"` semantics. Matches the existing Queen Marked / Mated /
  Clipped buttons in the same form, so fixing one in isolation would
  create inconsistency. Logged as a project-wide a11y item.

## Things to verify (user)

- Open an existing hive (e.g., one of the 12 migrated rows) → it should
  show the red Queenless badge on the list + detail + apiary pages, and
  the Status should read "active" with the toggle ticked.
- Create a fresh hive → toggle off by default, no badge.
- Tick the toggle on a healthy hive, save → red badge appears
  everywhere, marked/mated/clipped UI disappears in edit mode.
- Untick the toggle → badge disappears, marked/mated/clipped UI returns
  with prior values intact (we never cleared them).
