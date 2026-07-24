# Feature Plan: Hive Archive Cascade

**Date:** 24/07/2026
**Status:** Planned — awaiting approval

## 1. Goal

When a hive is archived, cascade the archival to its dependants so nothing is left in a stale
"active" state:

1. **Scale** — disconnect any scale assigned to the hive.
2. **Queen register** — if the hive has an **active** queen, set it to `retired` and record the
   archive reason.
3. **Queen tracker** — for any distribution pointing at the hive, mark it **failed** with the
   archive reason.

Motivating case: hive **64-DA** (rico.zmarzly@gmail.com) — active, Wolf scale `R4JLXN`, active queen
`7W`, 0 tracker distributions. It will be archived through the app once this ships (no one-off DB
change).

## 2. Confirmed decisions

- **Scope:** feature only; the user archives 64-DA in-app afterwards.
- **Tracker reason:** add `Hive archived` to the failure-reason list; set
  `queen_failure_reason = 'Hive archived'` and `queen_failure_comment = <archive reason> — <notes>`.
- **Un-archive:** one-way. Un-archiving restores the hive only; the retired queen, disconnected
  scale, and failed distributions are **not** reversed (reversal is lossy).

## 3. Data-model facts (verified live via MCP)

- Scale lives on `hives.wolf_scale_id` / `hives.wolf_scale_name` (no separate scale table).
  Disconnect = set both to `null`.
- `queens.status` is free text; `retired` is already an established value. Only notes column is
  `queens.performance_notes` → the reason is **appended** (existing notes preserved).
- `graft_distributions.recipient_hive_id` is the tracker→hive link.
- Archive reason is `hives.archive_reason_id` → `dropdown_values.value`, plus free-text
  `hives.archive_notes`.
- Single archive write path today: `src/app/dashboard/records/page.tsx:1109` (`handleArchiveSubmit`).

## 4. Design — atomic RPC

Rather than 3–4 separate client updates (a hive could end up archived with its queen still active if
one fails), do it in one transaction via a `SECURITY DEFINER` function.

### `archive_hive_cascade(p_hive_id uuid, p_archive_reason_id uuid, p_archive_notes text) returns jsonb`

1. Resolve `v_uid := auth.uid()`; look up the hive **scoped to `user_id = v_uid`** (raise if not
   found — prevents archiving another user's hive despite `SECURITY DEFINER`).
2. Build `v_reason_text` = `dropdown_values.value` for the reason id (if any), with
   ` — <notes>` appended when notes are present; fall back to notes or `'Hive archived'`.
3. **Archive the hive:** `archived_at = now(), archive_reason_id, archive_notes, status = 'archived'`,
   and clear `wolf_scale_id`, `wolf_scale_name` in the same UPDATE.
4. **Retire the queen** (only when `hives.queen_id` is set and that queen's `status = 'active'`):
   `status = 'retired'`, and append `Retired on archive of hive <n>: <reason>` to
   `performance_notes`. The hive keeps its `queen_id` (historical link).
5. **Fail tracker distributions:** for `graft_distributions` where
   `recipient_hive_id = p_hive_id AND user_id = v_uid AND queen_failed = false`, set
   `queen_failed = true, queen_failed_date = current_date, queen_failure_reason = 'Hive archived',
   queen_failure_comment = v_reason_text`.
6. Return `jsonb` `{ queen_retired, scale_disconnected, distributions_failed }` so the client can
   craft an informative toast.

**Grants/security** (per project DB-hardening rules):
- `search_path = public` pinned on the function.
- `REVOKE EXECUTE ... FROM public, anon;` then `GRANT EXECUTE ... TO authenticated;`
- Run `get_advisors` after the migration and act on any finding.

Applied via MCP `apply_migration` (no SQL file).

## 5. Client change

`records/page.tsx` `handleArchiveSubmit`: replace the direct `hives` update with
`supabase.rpc('archive_hive_cascade', { p_hive_id, p_archive_reason_id, p_archive_notes })`, then the
existing `fetchHives` / `fetchArchiveRecords` refresh. Toast becomes informative when the RPC reports
a retired queen / disconnected scale / failed distributions.

## 6. Other code

- `QueenTrackerTab.tsx` — add `'Hive archived'` to `FAILURE_REASONS` (also makes it a first-class
  slice in the Queen Failures report and a value in the failure filter).
- Archive form — add a short static note that archiving also retires the hive's queen, disconnects
  any scale, and fails linked tracker distributions (transparency; no per-hive lookup).
- `docs/features/` — document the cascade (new `hive-archive-cascade.md` or fold into an existing
  archiving/reports doc).

## 7. Out of scope

- No un-archive reversal (decided).
- The hive keeps its `queen_id` after archiving (historical); the queen is not unassigned.
- Only the **active** assigned queen is retired; queens already dead/superseded/swarmed/retired are
  left unchanged.
- Only **not-already-failed** distributions to the hive are touched.

## 8. Todo

- [ ] MCP migration: `archive_hive_cascade` function + grants; run `get_advisors`.
- [ ] Client: swap `handleArchiveSubmit` to the RPC + informative toast.
- [ ] `FAILURE_REASONS`: add `Hive archived`.
- [ ] Archive form: transparency note.
- [ ] Docs.
- [ ] Verify (`tsc`/`eslint`); prompt user to test archiving in-app.

## 9. Review

Implemented as planned.

- **Migration `add_archive_hive_cascade_function`** — `archive_hive_cascade` RPC (`SECURITY DEFINER`,
  `search_path = public`, self-scoped via `auth.uid()`); `EXECUTE` revoked from public/anon, granted to
  authenticated. Security advisor shows only the expected `authenticated_security_definer_function_executable`
  notice (intended).
- **`records/page.tsx`** — `handleArchiveSubmit` now calls the RPC and builds an informative toast from
  its `{ queen_retired, scale_disconnected, distributions_failed }` result; archive form carries a
  transparency note.
- **`QueenTrackerTab.tsx`** — `'Hive archived'` added to `FAILURE_REASONS`.
- **Docs** — `docs/features/hive-archive-cascade.md`.
- **Verification** — `tsc --noEmit` and `eslint` clean on the changed files. No one-off DB change to
  64-DA (user will archive it in-app).
