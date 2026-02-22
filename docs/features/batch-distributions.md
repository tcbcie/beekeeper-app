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
| recipient_user_id | UUID | FK to auth.users — who received it |
| recipient_apiary_id | UUID | FK to apiaries (optional) — destination apiary |
| recipient_hive_id | UUID | FK to hives (optional) — destination hive |
| distribution_date | DATE | When distributed (defaults to today) |
| mating_confirmed | BOOLEAN | Whether the virgin queen mated successfully |
| notes | TEXT | Optional notes |
| user_id | UUID | FK to auth.users — who created the record |
| created_at | TIMESTAMPTZ | Record creation timestamp |

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
2. **Recipient search** — debounced search by name/email, shows "Group" badge for group members
3. **Distribution date** — defaults to today
4. **Recipient's apiary** — shown for virgin/mated queen types
5. **Recipient's hive** — shown for mated queen type when apiary selected
6. **Notes** — optional

### Distribution List

Shown below the graft grid in `BatchGraftsSection`:
- Cell number, type badge, recipient name, date, destination
- Mating confirmed toggle (for queen cell/virgin queen distributions)
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
- **Virgins distributed external** = distributions where type is `queen_cell`/`virgin_queen` AND recipient is NOT a group member
- **Virgins external mated** = same filter + `mating_confirmed = true`

These auto-calculated values are used as defaults. Manual overrides saved in `nihbs_monthly_returns` take precedence.

The UI shows "Auto: X from records" below the manual input fields when auto-calculated values exist.

## Files

| File | Description |
|------|-------------|
| `src/hooks/useGraftDistributions.ts` | Distribution CRUD hook + search functions |
| `src/components/batches/DistributeGraftModal.tsx` | Distribution form modal |
| `src/components/batches/BatchGraftsSection.tsx` | Modified — distribute button, distribution list, bulk operations, sync from counters |
| `src/components/batches/MatingNucsTab.tsx` | Modified — distribute button on nucs |
| `src/hooks/useNIHBSReport.ts` | Modified — auto-calculate distribution counts |
| `src/components/rearing-groups/NIHBSMonthlyReturn.tsx` | Modified — show auto-calculated indicators |
