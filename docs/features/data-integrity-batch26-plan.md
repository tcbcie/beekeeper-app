# Batch 26: Lineage, Invitations and Dashboard Dates (Data Integrity)

**Status:** Implemented 23/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch26-todo.html`
**Migration:** `supabase/migrations/20261023100000_data_integrity_batch26.sql`, applied through MCP.
**Findings:** C6-08 (lineage cycles), C6-09 (the pending-invitation backstop), and the server half of C3-07/C3-29 (the dashboard RPC's UTC date). This is Phase 2 fix batch 13.

## A. Queen lineage cycles (C6-08)

**How it happened:**

1. Editing breeder queen M, the mother picker offered reared candidates (`graft:<id>`) without filtering, including one reared from M's own graft.
2. On save, `ensure_reared_queen_record` created D with `mother_id = M`.
3. Only then did the cycle check run. It walks the page's queen list, and D wasn't in it, so the check passed.
4. The update set `M.mother_id = D`, giving M → D → M.

The database had no guard.

**Database:**

- **`queens_not_own_parent`:** a CHECK that `mother_id` and `father_id` are never the queen's own id.
- **`queens_prevent_lineage_cycle()` trigger function:** a recursive walk up from the new mother and father. If the queen is among their ancestors, the change is refused with "Queen X can't have one of her own descendants as a parent." (`check_violation`).
  - **Terminates:** `UNION` drops repeats, so the walk always ends.
  - **Sees everything:** `SECURITY DEFINER` with `search_path = public`, so it also sees ancestors the caller can't read.
  - **Not callable:** EXECUTE is revoked from PUBLIC, anon and authenticated.
  - **When it runs:** a `BEFORE UPDATE OF mother_id, father_id` trigger, only when either value changes. An INSERT can't close a loop, because nothing points at a new row yet; the CHECK covers an insert naming its own id.
- **Before adding it:** 0 of 202 live queens were in a cycle (checked).
- **Live test (rolled back):** a daughter as mother is refused, a queen as her own father is refused, and an ordinary new mother is allowed.

**App:**

- **`RearedQueenCandidate.mother_id`** (`useQueensList`): the cell's `breeder_queen_id`, else the batch's `mother_queen_id`. This is the same rule as `ensure_reared_queen_record`.
- **`QueenFormSection`:**
  - The cycle check runs before promotion. A reared candidate is judged by her would-be mother, so a refused save leaves no stray record.
  - Candidates whose would-be mother is the queen or one of her descendants are hidden.
- **Silent save errors:** `QueenFormSection` and `DropdownManagement` (two forms) only reported `error instanceof Error`. Supabase returns plain error objects, so every failed save, including a duplicate queen number or a trigger refusal, showed nothing. They now show the message, or a plain fallback.

**Low, not fixed:** two concurrent updates of related queens could each pass the check. That needs simultaneous edits by one beekeeper.

## B. Invitations (C6-09 backstop)

**The old rules:** `team_invitations_unique` and `rearing_group_invitations_group_id_email_status_key` were `UNIQUE (team/group, email, status)`.

- **Re-joining blocked:** a former member's old `accepted` row made `accept_*` fail when they were invited again. Three former rearing-group members were in that position.
- **Case-sensitive:** emails differing only in case counted as different.

**Now:** the old rules are dropped and replaced with partial unique indexes, `team_invitations_one_pending_per_email` and `rearing_group_invitations_one_pending_per_email`, on `(team_id | group_id, lower(email)) WHERE status = 'pending'`. There were no conflicting rows (checked).

**Pages** (`apiary-team`, `rearing-team`):

- The "already invited" check reads a list instead of `.maybeSingle()`, which returned an error (and was skipped) when two rows matched. Its error is now checked.
- All declined rows are deleted before re-inviting. The rearing-team page now checks that delete.
- A `23505` refusal shows "An invitation has already been sent to this email."
- Expired invitations still count as pending, as before; the owner cancels and re-invites.

## C. Dashboard dates (C3-07/C3-29, server side)

`get_dashboard_overview` used `current_date` (UTC) in six places:

- tasks due today
- inspections in the last 7 days
- hives not inspected in 14 days
- varroa in the last 30 days
- the 21-day queen checks
- queens over 2 years old

Between midnight and 1 am Irish summer time, each was a day out.

`CREATE OR REPLACE` with the same signature, guard and body now uses `v_today := (now() AT TIME ZONE 'Europe/Dublin')::date`. Grants are unchanged (authenticated yes, anon no), and the client needs no change.

**Still open (write-time fallbacks):** these use `current_date` only when no date is sent:

- `create_mating_nuc_bulk`
- `log_colony_movement`
- `archive_hive_cascade`
- `create_queen_for_distribution`
- `promote_distributed_queen_on_mating`
- `ensure_nuc_reared_queen`
- `crm_create_order`
- `_crm_apply_payment_state`

The `task-event-reminders` edge function also uses UTC dates.

## Verification

- `tsc --noEmit`: 0 errors.
- `eslint` on the 5 changed files: clean.
- Tests: 818 passed, 23 skipped.
- qa-engineer: no Critical or High issues.
- `get_advisors` (security): nothing new.

## Rules

- A queen's parents can't form a loop. The database refuses it, so the form must show insert/update errors.
- Show Supabase errors via `(error as { message?: string })?.message`. They are plain objects, so `error instanceof Error` is false.
- One pending invitation per team/group and email. History rows (accepted, declined) never block.
- Database "today" is `(now() AT TIME ZONE 'Europe/Dublin')::date`, never `current_date`.
