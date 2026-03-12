# Batch Distribution Tracking

## Overview

Tracks the distribution of queen cells, virgin queens, and mated queens from rearing batches to recipients. Each graft can be distributed once, recording who received it, the destination apiary/hive, and whether mating was confirmed for virgin distributions.

The NIHBS monthly report auto-calculates external distribution counts from these records.

## Database

### `graft_distributions` table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| graft_id | UUID | FK to batch_grafts (UNIQUE — one distribution per graft) |
| batch_id | UUID | FK to rearing_batches |
| distribution_type | TEXT | `queen_cell`, `virgin_queen`, or `mated_queen` |
| recipient_user_id | UUID | FK to auth.users — who received it (NULL for external recipients) |
| recipient_apiary_id | UUID | FK to apiaries (optional) — destination apiary (app users only) |
| recipient_hive_id | UUID | FK to hives (optional) — destination hive (app users only) |
| distribution_date | DATE | When distributed (defaults to today) |
| mating_confirmed | BOOLEAN | Whether the virgin queen mated successfully |
| mating_confirmed_date | DATE | Date mating was confirmed (set automatically to today when toggled on, cleared to NULL when toggled off) |
| notes | TEXT | Optional notes |
| user_id | UUID | FK to auth.users — who created the record |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| external_recipient_name | TEXT | Free-text name for non-app recipients |
| external_recipient_email | TEXT | Free-text email for non-app recipients |
| external_recipient_phone | TEXT | Free-text mobile for non-app recipients |
| external_recipient_location | TEXT | Apiary / mating location (closest Eircode) for non-app recipients |
| mating_location | TEXT | Apiary / mating location (closest Eircode) for app-user queen cell distributions |

### RLS Policies

- **Users can manage own distributions** — `user_id = auth.uid()`
- **Group owners can view member distributions** — SELECT on distributions where batch belongs to a group member (for NIHBS report)

### Helper Functions

- `search_users_for_distribution(search_text)` — search users by name/email for recipient picker
- `get_recipient_apiaries(recipient_uuid)` — get a recipient's apiaries
- `get_recipient_hives(recipient_uuid, apiary_uuid)` — get a recipient's active (non-archived) hives in an apiary

## UI

### Distribute Button

Appears on grafts (in `BatchGraftsSection`) and nucs (in `MatingNucsTab`) when in a distributable status:

**Grafts:** `accepted`, `caged`, `emerged`, `in_nuc`, `mated`
**Nucs:** `virgin`, `mating`, `laying` (only when linked to a graft)

Distribution type is auto-detected from status:
- `accepted` / `caged` → Queen Cell
- `emerged` / `in_nuc` / `virgin` / `mating` → Virgin Queen
- `mated` / `laying` → Mated Queen

### DistributeGraftModal

Modal form with:
1. **Type badge** — auto-detected, read-only
2. **Recipient mode toggle** — three options:
   - **Group Member** (hidden when no group) — shows the group member list to pick from
   - **App User** — debounced search by name/email; shows "Group" badge for group members in results
   - **Other Beekeeper** — free-text fields: Name, Email, Mobile, Apiary/Mating Location (closest Eircode, mandatory); submit enabled when at least one contact field is filled and location is provided
3. **Distribution date** — defaults to today
4. **Recipient's apiary** — shown for queen cell, virgin queen, and mated queen types (app user mode only)
5. **Apiary / Mating Location (closest Eircode)** — free-text field shown for all distribution types to app users; at least one of apiary or mating location must be filled before submission
6. **Recipient's hive** — shown for mated queen type when apiary selected (app user mode only)
7. **Notes** — optional

### Distribution List

Shown below the graft grid in `BatchGraftsSection`. Each card shows:
- Cell number and type badge
- "Distributed to [name] ([email])" — if only name or email is known, shows whichever is available; never shows "Unknown" for registered users. Recipient name resolved as: `full_name` → `first_name + last_name` → `email`
- "to [Apiary Name][, Hive N] on DD/MM/YYYY" — or just "on DD/MM/YYYY" if no apiary was recorded
- Mating location line (if set): `Mating location: D01 AB12` — shown for app-user distributions with a mating location
- Apiary location line (if any location data present): `Grid: X1Y2 • Elev: 45m • 52.1234°, -6.5678°` — each part labelled and only shown if present
- Queen info line (if set on the graft at time of distribution): `Queen marked • Queen #123`
- Mating confirmed toggle (for queen cell/virgin queen distributions) — when confirmed, the confirmed date is shown in green ("Mated: DD/MM/YYYY"); toggling off clears the date
- Delete button to remove distribution and revert graft status

### Bulk Operations

#### Select Mode

Toggle via the **Select** button in the graft grid header. In select mode:
- Each card shows a checkbox icon — click cards to select/deselect
- Selected cards get a green ring highlight
- Individual action buttons (distribute, delete) are hidden — use the bulk action bar instead
- Click **Done** to exit select mode and clear selections

#### Bulk Action Bar

Appears when at least one graft is selected:
- **{N} selected** count with **Select All** / **Deselect All** links
- **Change Status** dropdown — bulk-updates all selected grafts via `.in('id', ids)`
- **Distribute** button — opens `DistributeGraftModal` in bulk mode for distributable grafts
- **Delete** button — bulk-deletes selected grafts with confirmation

#### Bulk Distribute

Uses the same `DistributeGraftModal` with `bulkGrafts` prop:
- Title shows "Distribute {N} Grafts"
- Distribution type auto-detected from the most advanced status among selected grafts
- Each graft's `previous_graft_status` is stored individually
- Single bulk `.insert()` for distribution records + single `.in()` update for graft statuses

#### Sync from Counters

**"Sync from Counters"** button in the Quick Actions bar (visible when batch counters are set). On click:
1. Filters out `failed` and `sold` grafts (locked statuses)
2. Sorts remaining by cell number
3. Assigns in order: first N → `mated`, next → `emerged`, next → `accepted`, remainder → `grafted`
4. Confirmation dialog shows the breakdown
5. Executes grouped `.update().in()` calls (max 4 queries)

Batch counter values (`grafts_accepted`, `queens_hatched`, `queens_mated`) are passed from the form.

### Side Effects

On distribute: graft status → `sold`, nuc status → `sold` (if from nuc)
On delete: graft status reverted to previous status (stored in `previous_graft_status`)

## NIHBS Report Integration

The `useNIHBSReport` hook auto-calculates from distribution records:
- **Distributed outside group** (row 24) = `virgin_queen` and `mated_queen` distributions where recipient is NOT a group member (`queen_cell` excluded — tracked separately on row 28)
- **Successfully mated outside group** (row 26) = same filter + `mating_confirmed = true` OR `distribution_type = 'mated_queen'` (mated queens are already mated at distribution time)
- **Sealed queen cells distributed** (row 28) = all `queen_cell` distributions (regardless of recipient), tracked per-apiary by `distribution_date` month (not batch emergence month)
- No subtraction from queens_hatched/queens_mated — batch values already reflect only queens that actually hatched/mated in possession
- Only group-assigned batches (with `rearing_group_id`) are included in the NIHBS report
- **Graft-derived fallback:** When batch counters are NULL, counts are derived from individual graft statuses. For `sold` grafts, the `distribution_type` determines the actual stage reached: `queen_cell` → accepted only, `virgin_queen` → hatched, `mated_queen` → hatched + mated

These auto-calculated values are used as defaults. Manual overrides saved in `nihbs_monthly_returns` take precedence.

The UI shows "Auto: X from records" below the manual input fields when auto-calculated values exist.

## Code Hardening (02/03/2026)

The following defensive improvements were applied to the distribution code:

- **Stale-fetch guard** — `fetchDistributions` uses a request counter ref to discard responses from superseded requests, preventing race conditions when batch ID changes rapidly
- **Nullish coalescing for status revert** — `deleteDistribution` uses `??` instead of `||` for the `previousStatus` fallback, so empty strings are preserved rather than silently defaulting to `'mated'`
- **Conditional refetch** — `handleDistributeSave` only refetches grafts and distributions on success, avoiding unnecessary network calls on failure
- **Double-submit prevention** — `DistributeGraftModal` uses a synchronous ref guard alongside React state to prevent duplicate submissions before re-render
- **Hoisted constant** — Status ordering array for bulk distribution type detection moved to module level to avoid per-iteration allocation

## Files

| File | Description |
|------|-------------|
| `src/hooks/useGraftDistributions.ts` | Distribution CRUD hook + search functions |
| `src/components/batches/DistributeGraftModal.tsx` | Distribution form modal |
| `src/components/batches/BatchGraftsSection.tsx` | Modified — distribute button, distribution list, bulk operations, sync from counters |
| `src/components/batches/MatingNucsTab.tsx` | Modified — distribute button on nucs |
| `src/hooks/useNIHBSReport.ts` | Modified — auto-calculate distribution counts |
| `src/components/rearing-groups/NIHBSMonthlyReturn.tsx` | Modified — show auto-calculated indicators |
