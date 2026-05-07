# Honey Supers Auto-Sync from Inspection — Plan

## Goal

When an inspection's **Given/Taken → Honey Supers** field is non-zero, automatically apply the delta to the corresponding hive's `configuration.honey_supers`. The hive card's physical-stack visual (`HiveListCard`) reads from `configuration.honey_supers` and will update automatically.

## Scope (confirmed)

1. **Honey Supers only.** Frames (foundation/brood/drawn/drone/store) remain inspection-only — they are consumable, not part of physical configuration.
2. **Clamp at 0.** `Math.max(0, current + delta)`. If the user records "Taken 3" but only 1 super exists, configuration goes to 0 silently.
3. **Edit & Delete reverse-adjust.** Edit applies `(new − old)`. Delete applies `−inspection.honey_supers`.
4. **Failure mode = toast warning.** Inspection write is the source of truth; configuration sync is best-effort. If the hive update fails, toast a warning but keep the inspection saved.

## Where this lives

The whole change is in `src/app/dashboard/records/page.tsx`. No new components, no DB migrations, no type changes.

The DB trigger on `hives` already populates `hive_configuration_history` whenever `configuration` changes — audit trail comes for free.

## Implementation

### 1. Helper function

Local helper inside `records/page.tsx`:

```ts
async function adjustHiveHoneySupers(hiveId: string, delta: number) {
  if (delta === 0 || !userId) return

  const { data: hive, error: fetchError } = await supabase
    .from('hives')
    .select('configuration')
    .eq('id', hiveId)
    .maybeSingle()

  if (fetchError || !hive) {
    toast.warning('Inspection saved, but hive configuration could not be read.')
    return
  }

  const currentConfig = (hive.configuration as HiveConfiguration | null) ?? {}
  const currentSupers = currentConfig.honey_supers ?? 0
  const newSupers = Math.max(0, currentSupers + delta)
  if (newSupers === currentSupers) return  // already at floor

  const { error: updateError } = await supabase
    .from('hives')
    .update({
      configuration: { ...currentConfig, honey_supers: newSupers },
      configuration_changed_at: new Date().toISOString(),
      configuration_changed_by: userId,
    })
    .eq('id', hiveId)

  if (updateError) {
    toast.warning('Inspection saved, but hive configuration update failed.')
  }
}
```

### 2. handleInspectionSubmit

After the existing `inserts`/`update` succeeds:

- **Edit**:
  - Same hive: `delta = formData.honey_supers − editingInspection.honey_supers`
  - Different hive: reverse old from old hive (`−editingInspection.honey_supers`), apply new to new hive (`+formData.honey_supers`)
- **Insert**: `delta = formData.honey_supers`

### 3. handleInspectionDelete

Look up the deleted inspection in the in-memory `inspections` list to get `hive_id` and `honey_supers`. After successful delete, call `adjustHiveHoneySupers(inspection.hive_id, -inspection.honey_supers)`.

### 4. Refresh hive list

`HiveListCard` is rendered on `/dashboard/hives`, not on `/dashboard/records`, so no immediate UI refresh is needed on this page. The next visit to the hives page will fetch the updated configuration.

## Documentation

Create `docs/features/honey-supers-auto-sync.md` covering the data flow, scope, clamp/floor behaviour, and the failure mode.

## Todo

- [x] **1. Helper function** — added `adjustHiveHoneySupers(hiveId, delta)` in `records/page.tsx`.
- [x] **2. Submit wiring** — wired into `handleInspectionSubmit`. Edit-same-hive applies `(new − old)`. Edit-different-hive reverses old from old hive and applies new to new hive. Insert applies `+formData.honey_supers`.
- [x] **3. Delete wiring** — `handleInspectionDelete` now looks up the inspection in memory, deletes it, then reverses `inspectionToDelete.honey_supers` against `inspectionToDelete.hive_id`.
- [x] **4. Feature doc** — `docs/features/honey-supers-auto-sync.md` written.
- [ ] **5. User to test** — verify the hive card updates after Given/Taken adjustments; verify edit and delete both reverse correctly; verify clamp-at-0.

## Review

### Summary of changes

- **`src/app/dashboard/records/page.tsx`**:
  - Imported `HiveConfiguration` from `@/types/records`.
  - Added `adjustHiveHoneySupers(hiveId, delta)` — reads the hive's current `configuration` JSONB, computes `Math.max(0, current + delta)`, and writes the merged config back along with `configuration_changed_at` / `configuration_changed_by` so the existing DB trigger logs proper attribution to `hive_configuration_history`. Best-effort: toast-warns on read or write failure but does not roll back the inspection.
  - `handleInspectionSubmit` now calls the helper after a successful insert (`+formData.honey_supers`) or update. The update path branches on hive change: same hive applies `(new − old)`; hive changed reverses old from old hive and applies new to new hive.
  - `handleInspectionDelete` looks the inspection up in the in-memory `inspections` list before deletion and, after a successful delete, reverses `−inspection.honey_supers` against the inspection's hive.

- **`docs/features/honey-supers-auto-sync.md`** — feature doc covering data flow, scope (honey supers only), clamp-at-0 behaviour, edit/delete handling, audit-trail behaviour via the existing trigger, and the toast-warning failure mode.

### Scope honoured

- Touched only one file in `src/`. No new components, no DB migration, no type changes (HiveConfiguration was already exported).
- Other Given/Taken fields (frames) intentionally untouched.
- DB-side audit trail re-uses the existing `hive_configuration_history` trigger — no new trigger or table.

### Notes for verification

- Open inspection form for hive H (currently 1 super in configuration). Set Honey Supers Given/Taken to **+2**. Save. Visit `/dashboard/hives` → H now shows 3 supers in the physical-stack visual.
- Edit the same inspection, change Honey Supers from +2 to +5. Save. Hive H configuration is now 1 + 5 = 6 (delta of +3 applied).
- Edit again, change to **−10**. Save. Hive H clamps to 0 (delta of −15 from current 6, floored).
- Delete the inspection. Hive H gains back `+10` (the absolute value of the −10 stored on the inspection) → so it returns to 10. (Note: deletion reverses what was *recorded on the inspection*, not what *actually changed* — if clamping had occurred this is intentional asymmetry; the inspection log is the source of truth, not the running total.)
- Inspection on hive A with +1, then edit to move to hive B → A loses 1, B gains 1.

### Hardening pass (post-audit)

The Principal Quality Architect audit identified two Critical and three High issues. All have been fixed:

- **C1 — race + JSONB stomp.** The JS read-modify-write was replaced with Postgres RPC `adjust_hive_honey_supers` (`SECURITY INVOKER`, `FOR UPDATE` row lock, `jsonb_set` on a single key). Concurrent submissions on a shared apiary now serialise; other configuration fields cannot be reverted. Migration: `add_adjust_hive_honey_supers_rpc`.
- **C2 — silent zero-row updates.** Both inspection update and delete now `.select()` after the mutation and require exactly one affected row before applying the delta. Stale-tab and RLS-mismatch cases now surface an explicit error toast instead of corrupting hive configuration.
- **H1 — unbounded delta.** Adjustments with `|delta| > 100` short-circuit with a toast warning before hitting the RPC.
- **H2 — cross-hive ordering.** New-hive apply now runs *before* old-hive reverse on edits that change hive — partial failure inflates instead of silently undercounting.
- **H3 — `honey_supers` integer guard.** Both edit and delete coerce the field via `Number.isInteger(...) ? ... : 0` against schema drift.
- **M1 — memoisation.** Helper wrapped in `useCallback([userId, toast])`.
- **M2 — toast wording.** Failure toast now directs the user to "open the hive to verify".
- **M3 — hive list refresh.** `fetchHives(userId)` is awaited after both submit and delete.

## Notes

- No backfill: pre-existing inspections with non-zero `honey_supers` will not be retroactively applied. Going forward only.
- The DB `hive_configuration_history` trigger will record an entry per inspection that mutates the count. That's intentional — provides an audit trail tied to who/when via `configuration_changed_at` / `configuration_changed_by`.
