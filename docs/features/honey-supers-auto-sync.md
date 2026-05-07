# Honey Supers Auto-Sync from Inspection

## Overview

When a beekeeper records a honey-super adjustment in an inspection's **Given/Taken** section, the change is automatically applied to the hive's stored configuration. The hive card's physical-stack visualisation (`HiveListCard`) reads from `hives.configuration.honey_supers`, so the visual count updates without any extra user action.

This closes the loop between an inspection event ("I added a super today") and the hive's persistent state ("the hive currently has *N* supers on it").

## Behaviour

The Given/Taken honey-supers field is a signed integer per inspection:

- **Positive** = "Given" (super added)
- **Negative** = "Taken" (super removed)
- **Zero** = no change

When the inspection is saved, the corresponding delta is applied to the hive's stored super count.

| Action | Delta applied to hive |
|---|---|
| New inspection saved | `+formData.honey_supers` |
| Existing inspection edited (same hive) | `formData.honey_supers − old.honey_supers` |
| Existing inspection edited (hive changed) | `−old.honey_supers` to old hive, `+formData.honey_supers` to new hive |
| Inspection deleted | `−inspection.honey_supers` |

The configuration count is **clamped at 0** — recording "Taken 3" on a hive that has only 1 super stored leaves the hive at 0 (silently, no warning). A hive cannot have a negative super count.

## Failure mode

The inspection write is the source of truth. The configuration sync is best-effort:

- If the RPC fails → toast warning, inspection still saved. The toast points the user to the hive page to verify.
- The user can fix configuration manually via the hive edit form.

There is no rollback of the inspection on configuration failure. Conversely, if the inspection write itself affects 0 rows (RLS mismatch / stale tab), the configuration sync is **not** attempted and an explicit error toast is raised.

## Data flow

1. User submits inspection from `/dashboard/records`.
2. `handleInspectionSubmit` (in `src/app/dashboard/records/page.tsx`) writes the inspection row, requesting `.select('id')` to verify a row was actually affected.
3. If exactly one row was affected, the helper calls the Postgres RPC `adjust_hive_honey_supers(p_hive_id, p_delta)`.
4. The RPC takes a row-level lock (`SELECT … FOR UPDATE`) on the target hive, computes `GREATEST(0, current + delta)`, and patches **only** the `honey_supers` key inside the JSONB via `jsonb_set`. Other configuration keys (queen excluder, brood boxes, feeder, etc.) cannot be clobbered.
5. The RPC sets `configuration_changed_at = now()` and `configuration_changed_by = auth.uid()` server-side. The existing trigger on `hives` then inserts a row into `hive_configuration_history` for the audit trail.

## Concurrency & atomicity

The write path is fully atomic:

- The row-level lock serialises concurrent inspection submissions on the same hive (e.g. two team members editing simultaneously). Each delta is applied in turn against the freshest value — no lost updates.
- `jsonb_set` on a single key cannot stomp other configuration fields, even if they were modified between calls.
- The clamp-at-zero floor is enforced inside the SQL, not in JS, so it can't be bypassed by a stale snapshot.

## Defensive guards

- **Delta range check (JS).** Adjustments with `|delta| > 100` are rejected with a toast warning; protects against typo-driven catastrophes (e.g. user keys `999` instead of `9`).
- **Integer guard (JS).** `editingInspection.honey_supers` and the deleted row's `honey_supers` are coerced to `0` if not an integer, surviving any future schema drift that might allow nulls or floats.
- **Row-count guard (JS).** Inspection update and delete both `.select()` after the mutation and require exactly one affected row before applying the delta. RLS mismatches that previously silently returned `error: null` are now surfaced.
- **Cross-hive ordering.** When an edit moves an inspection between hives, the new-hive apply runs *before* the old-hive reverse. A partial failure leaves an inflated count (visible) rather than a missing one (silent).

## Audit trail

Every super adjustment driven by an inspection produces an entry in `hive_configuration_history` (via the existing trigger). This is intentional — it gives a "who added/removed a super and when" log alongside the inspection itself.

## Scope (intentionally limited)

- **Honey supers only.** The other Given/Taken fields (Foundation, Brood, Drawn, Drone, Store) remain inspection-only — they are consumable frame-level changes, not part of the hive's physical configuration.
- **No backfill.** Historical inspections with non-zero `honey_supers` are not retroactively applied to current hive configurations. The feature is forward-looking only.
- **No UI feedback on the inspection form.** The Given/Taken control already shows "Given *N*" / "Taken *N*" badges; we don't surface the resulting hive total in the form. The hive card is the single source of visual truth for the hive's current state.

## Files touched

- `src/app/dashboard/records/page.tsx` — added `adjustHiveHoneySupers` helper (RPC wrapper, memoised via `useCallback`); wired into `handleInspectionSubmit` and `handleInspectionDelete` with row-count guards and authoritative server values.
- DB migration `add_adjust_hive_honey_supers_rpc` — Postgres function `public.adjust_hive_honey_supers(uuid, int) RETURNS int`, `SECURITY INVOKER` (RLS preserved).

The `hives.configuration` column and `hive_configuration_history` trigger are pre-existing.
