# Batch 27: Irish Dates on the Server

**Status:** Implemented 23/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch27-todo.html`
**Migration:** `supabase/migrations/20261023120000_server_dates_batch27.sql`, applied through MCP.
**Follows:** batch 19 (client dates) and batch 26 (the dashboard RPC). This is Phase 2 fix batch 14.

Server code runs in UTC, but task dates and times are entered as Irish wall-clock values. In Irish summer time, UTC is an hour behind, so anything that reads them as UTC is an hour out, and a day out between midnight and 1 am.

## A. Edge functions (deployed through MCP, `verify_jwt` unchanged at false)

Before deploying, each deployed copy was compared with the repo; all matched.

- **`supabase/functions/_shared/dublin-time.ts`** (new):
  - `dublinDate()`: today's Irish date.
  - `addDaysISO()`: adds days to a date.
  - `dublinLocalToInstant(date, 'HH:MM')`: turns an Irish date and time into the real moment. It works out the Irish offset with `Intl.formatToParts` and corrects once more across clock changes.
  - `formatDateIrish()`: DD/MM/YYYY by string split.
  - It's bundled into each function that imports it (uploaded as `../_shared/dublin-time.ts`). It was checked with Node against summer, winter and both 2026 clock-change days.
- **`task-event-reminders` (v14), every 15 minutes:**
  - **Wrong time zone:** `getHoursUntil` read `start_date` + `start_time` as UTC (`new Date(date)` then `setHours`), so every reminder was an hour late from late March to late October. It's replaced by `getMinutesUntil`, which uses `dublinLocalToInstant` (09:00 when no time is set).
  - **Sub-hour reminders:** the send check compared `Math.floor` hours with `Math.floor(reminder_minutes_before / 60)`, so any reminder under 60 minutes only fired once the event had started. It now compares minutes directly.
  - **Query window:** the window uses Irish dates. "daily" is today and tomorrow (it was three days).
  - **Email text:** the "In N hours" text uses the corrected minutes.
- **`weekly-email-digest` (v17):** "today" and the 7-day window are Irish dates compared as strings. `daysUntil` comes from UTC midnights of those dates, so it's exact.
- **`notify-admin-new-user` (v10), `send-team-invitation` (v16), `send-rearing-group-invitation` (v10):** `toLocaleDateString` gets `timeZone: 'Europe/Dublin'`, so the sign-up time and expiry dates show in Irish time.

## B. Database "today" fill-ins

These used `current_date` (UTC) when the app sent no date:

- **Column defaults:**
  - `crm_orders.order_date`
  - `dca_confirmations.observation_date`
  - `graft_distributions.distribution_date`
  - `mating_nuc_inspections.inspection_date`
  - `queen_weights.weighed_at`
  - `wild_colonies.observation_date`

  These are now `((now() AT TIME ZONE 'Europe/Dublin')::date)`.
- **Functions:**
  - `_crm_apply_payment_state`
  - `archive_hive_cascade`
  - `create_mating_nuc_bulk`
  - `create_queen_for_distribution`
  - `crm_create_order`, including its `ORD-YYYY` prefix
  - `ensure_nuc_reared_queen`
  - `log_colony_movement`
  - `promote_distributed_queen_on_mating`

  Several exist only in the live database, so the migration re-creates each from its own `pg_get_functiondef` with only `current_date` replaced by the Irish date. Before and after, the permissions, SECURITY DEFINER flag and search path were identical (checked), and no `current_date` is left.
- **Left as is:** `mating_nucs.queen_emerged_at`, `setup_date` and `mating_confirmed_at` are `timestamptz` but stored as midnight UTC (plain dates; checked live), so their `::date` casts are already correct.

## C. App server code

- **`src/lib/dublin-date.ts`** (new): `BEEKEEPER_TIME_ZONE`, `toDublinDate`, `todayInDublin` and `addDaysISO` move here from `src/lib/ai/tools/utils.ts`, which re-exports them, so Mel's tools are unchanged. A new helper, `dublinDayStartUtc(date)`, gives the instant an Irish day begins.
- **Scale charts, custom range** (`/api/beep/data`, `/api/wolf-waagen/data`): `new Date('YYYY-MM-DD')` then `setHours(23,59,59,999)` ran 01:00 to 00:59 Irish time in summer. The range is now `dublinDayStartUtc(start)` up to 1 ms before the Irish midnight after the end day.
- **Mel `getHivesNeedingTreatment`:** the cutoff is an Irish date compared as a string (`>=`), so a treatment exactly N days ago counts, as in the other tools.
- **Admin:** the news article `published_date` (`toDublinDate`) and the export file name (`todayInDublin`) use the Irish date.

## Not changed

- **No `TZ` on Vercel.** Code relying on a UTC runtime (`formatCrmDate`, the vendor API parameters) would break; explicit Irish dates are safer.
- **`getFullYear()` year look-ups:** these are only wrong on New Year's night, when Irish time equals UTC.
- **Separate issues noticed:** `task-event-reminders` re-queries all tasks once per profile, and reads a `team_hive_access` table that doesn't exist (C2-04). Neither is a date issue.

## Verification

- `tsc --noEmit`: 0 errors.
- `eslint` on the changed files: clean.
- Tests: 818 passed, 23 skipped.
- Helper checks in Node: 18 of 18 cases, including both clock-change days.
- The first `task-event-reminders` run on the new version (09:15 UTC, 23/10/2026) returned 200 `{"success":true}` (checked in `net._http_response`).
- qa-engineer: no Critical or High issues.

## Rules

- Server "today": `todayInDublin()` in the app, `dublinDate()` in edge functions, and `(now() AT TIME ZONE 'Europe/Dublin')::date` in SQL.
- A stored Irish date and time becomes a moment with `dublinLocalToInstant`, never `new Date(date)` plus `setHours`.
- Any date formatted on the server needs `timeZone: 'Europe/Dublin'`.
