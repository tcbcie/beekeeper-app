# Hive Bulk Actions (multi-select + group quick actions)

**Status:** Implemented
**Area:** Hives list view — `src/app/dashboard/hives/page.tsx`
**Audience note:** Users are 50+ with reduced eyesight — large tap targets, clear labels, no tiny icons-only controls.

## Goal

Let a beekeeper select one or more hives in the Hives grid and apply a group action:

1. **Move to apiary** — reassign all selected hives to a different apiary in one step.
2. **Clone hive** — quickly create a "sister" hive that reuses the box setup, without copying the queen or history.

## Scope / decisions

### Selection
- A **"Select"** toggle button in the existing filter bar turns selection mode on/off.
- In selection mode, each hive card shows a **large checkbox** (top-left).
- Only the user's **own** hives are selectable (checkbox hidden for team/shared hives), matching the existing Edit/Delete owner rule. Bulk writes only succeed on owned rows under RLS, so this keeps the UI honest.
- A **floating action bar** appears at the bottom of the screen when ≥1 hive is selected: shows the count and the actions (Move to apiary…, Clone, Clear).
- Selection clears after an action completes and when leaving selection mode.

### Move to apiary
- Modal (reusing `ModalShell`) with a single **apiary dropdown** sourced from the existing `apiaries` list (own + team-shared), plus a **"— Remove from apiary —"** option.
- On confirm, each selected hive is updated:
  - `apiary_id` → chosen apiary (or `null` to unassign)
  - `row_in_apiary` → `null`, `order_in_apiary` → `null`
  - Positions are cleared deliberately: the `(apiary_id, row, order)` combination must be unique within an apiary, so carrying old positions into a new yard would risk collisions. The beekeeper re-places each hive afterwards.
- Single Supabase update: `.update({...}).in('id', selectedIds).eq('user_id', userId)`.
- Refetch hives, clear selection, toast success.

### Clone hive (confirmed scope: copy setup config)
For each selected hive, insert a **new** hive that copies the template-worthy fields and resets everything that is physically tied to one colony.

| Field | Clone behaviour |
|-------|-----------------|
| `hive_type` | **Copied** |
| `configuration` (JSONB box setup) | **Copied** |
| `apiary_id` | **Copied** (same yard) |
| `order_direction` | **Copied** |
| `hive_number` | **Auto-generated** — `"<source>-copy"`, then `-copy-2`, `-copy-3`… until unique within the account |
| `queen_id`, `queen_marked`, `queen_marking_color`, `queen_mated`, `queen_clipped` | **None** (a queen can only live in one hive) |
| `is_queenless` | `false` (a fresh hive awaiting a queen, not a flagged-queenless one — so no reason is required) |
| `row_in_apiary`, `order_in_apiary` | **`null`** (position is unique; user places it) |
| `colony_established_date` | **Today** |
| `queen_installed_date` | `null` (no queen yet) |
| `status` | `'active'` |
| `beep_device_id` / `wolf_scale_id` (+ names) | **None** (physical devices, one per hive) |
| `colony_id`, `archived_at`, `archive_reason_id`, `archive_notes` | **None** |
| inspections / feedings / varroa / harvests / tasks / QR tag | **Not copied** (history belongs to the original colony) |
| `configuration_changed_at` / `configuration_changed_by` | now / current user |

- After each insert, write the initial `hive_configuration_history` row (mirrors the existing "Add Hive" create path).
- A confirmation dialog (`useConfirm`) states how many clones will be created before proceeding.
- Refetch hives, clear selection, toast success.

## Files to change

1. **`src/app/dashboard/hives/page.tsx`**
   - Add `selectionMode` + `selectedIds` state and toggle/select handlers.
   - Add a **"Select"** button to the filter bar.
   - Render a **floating bulk action bar** when items are selected.
   - Add `handleBulkMove(apiaryId)` and `handleBulkClone()` (clone field-mapping + unique-number helper + history insert).
   - Pass selection props down to `HiveListCard`.

2. **`src/components/hive/HiveListCard.tsx`**
   - Add props: `selectionMode`, `selected`, `onToggleSelect`.
   - Render a large checkbox (owner-only) and a selected highlight ring.

3. **`src/components/hive/MoveHivesModal.tsx`** (new, small)
   - `ModalShell`-based apiary picker; calls back with the chosen `apiary_id` (or `null`).

4. **`docs/features/hive-bulk-actions.md`** — this document.

## Out of scope (kept simple)
- No bulk delete/archive (riskier; can be added later).
- No copying of historical records or queens.
- No drag-to-position in the destination apiary — user re-places hives via existing edit.

## Edge cases handled
- Selecting only owned hives → RLS-safe writes.
- Empty selection → action bar hidden, actions no-op.
- Clone number collisions → incrementing `-copy-N` suffix checked against existing hive numbers.
- Move into an apiary the user can access only (dropdown already lists own + team-shared).
- Position uniqueness preserved by nulling row/order on move and on clone.
