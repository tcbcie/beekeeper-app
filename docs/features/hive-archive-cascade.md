# Feature: Hive Archive Cascade

**Date:** 24/07/2026
**Status:** Implemented

## 1. Overview

Archiving a hive now cascades to its dependants so nothing is left falsely "active":

1. **Scale** — any Wolf scale on the hive is disconnected (`wolf_scale_id` / `wolf_scale_name` cleared).
2. **Queen register** — if the hive's assigned queen is `active`, it is set to `retired` and the
   archive reason is appended to `queens.performance_notes` (existing notes preserved).
3. **Queen tracker** — every `graft_distributions` row pointing at the hive
   (`recipient_hive_id`) that is not already failed is marked failed, with
   `queen_failure_reason = 'Hive archived'` and the archive reason in `queen_failure_comment`.

All of this runs in a single transaction, so a hive can never end up archived with its queen still
active.

## 2. Implementation

### RPC — `archive_hive_cascade(p_hive_id, p_archive_reason_id, p_archive_notes) → jsonb`

A `SECURITY DEFINER` function (`search_path = public`). Although definer-owned, it enforces
`user_id = auth.uid()` on the hive lookup, so a caller can only archive their own hive. Steps:

1. Resolve the caller (`auth.uid()`) and load the hive scoped to that user (raises if not owned).
2. Build the reason text: `dropdown_values.value` for the reason id, plus ` — <notes>` when notes
   are present; falls back to the notes, or `'Hive archived'`.
3. Archive the hive and clear the scale columns in one `UPDATE`.
4. Retire the assigned queen only when it is `active`, appending the reason to `performance_notes`.
5. Fail not-already-failed distributions to the hive.
6. Return `{ queen_retired, scale_disconnected, distributions_failed }`.

**Grants:** `EXECUTE` revoked from `public`/`anon`, granted to `authenticated`. The security advisor's
`authenticated_security_definer_function_executable` notice for this function is expected — calling it
is the intended use and access is self-scoped via `auth.uid()`.

### Client

`src/app/dashboard/records/page.tsx` `handleArchiveSubmit` calls the RPC instead of updating `hives`
directly, and surfaces the cascade in the success toast (e.g. *"Hive archived — scale disconnected,
queen retired, 2 tracker entries failed"*). The archive form shows a static note explaining the
cascade before submission.

### Queen tracker

`'Hive archived'` was added to `FAILURE_REASONS` in `QueenTrackerTab.tsx`, so it is a first-class
slice in the Queen Failures report breakdown and a value in the failure-reason filter.

## 3. Behaviour and constraints

- **One-way.** Un-archiving restores the hive only; the retired queen, disconnected scale, and failed
  distributions are not reversed (reversal is lossy — the scale may be reassigned, the queen may have
  moved on).
- The hive keeps its `queen_id` after archiving (historical link); the queen is not unassigned.
- Only an `active` assigned queen is retired; queens already dead/superseded/swarmed/retired are left
  as-is.
- Only distributions that are not already failed are touched.

## 4. Files

- Supabase migration `add_archive_hive_cascade_function`
- `src/app/dashboard/records/page.tsx`
- `src/components/batches/QueenTrackerTab.tsx` (`FAILURE_REASONS`)
- `docs/features/hive-archive-cascade.md`
