# Batch 46: Performance

**Status:** Implemented 29/10/2026, waiting for the owner's test.
**Checklist:** `tasks/performance-batch46-todo.html`
**Database:** three migrations, applied through MCP. The live database is the source of truth; there are no SQL files in the repo.

This is the performance batch the owner added on 25/10/2026, after the audit chunks.

**Owner decisions:**
- Apply the database changes.
- Check the account every 5 minutes, plus once whenever the app comes back on screen.

## A. Database (live, via MCP)

| Change | Before | After |
|---|---|---|
| `match_knowledge_base`, rewritten as plpgsql with `RETURN QUERY EXECUTE … USING` (migration `match_knowledge_base_use_vector_index`) | A SQL function with `SET search_path` can't be inlined, so it was planned without the real query vector and read all 5,609 rows (483 ms; averaged 925 ms) | Uses the HNSW index: about 4 ms. Same signature, results and grants; the same top 5 for a test vector |
| Read rules on `inspections`, `feedings`, `harvests`, `varroa_checks` and `varroa_treatments` (migration `perf_record_rls_owner_shortcut`) | `can_access_hive()` ran for every row: 14.6 ms for 560 inspections | An own-hive path comes first: `hive_id in (select id from hives where user_id = (select auth.uid())) or can_access_hive(...)`. Read by owner: 2.8 ms, and the full check isn't even called |
| Invitation rules on `team_invitations` and `rearing_group_invitations` | Re-read the signed-in e-mail on every row | `(select lower(auth.jwt() ->> 'email'))`, read once per query |
| New index `idx_queens_source_distribution_id` | The one unindexed foreign key | Indexed |
| `net._http_response` | 24 rows in 21 MB; its clean-up was the database's biggest time user | `VACUUM FULL`: 72 kB |
| `cron.job_run_details` (migration `perf_cron_history_cleanup`) | 42 MB, 31,634 rows | A daily job, `purge-cron-run-history` at 03:27, keeps 7 days (680 rows) |

**Checking the rule change.** The new rules were checked three ways:
- **Before:** each user's visible-row count under the old and new expressions, for all five tables. Every user had 0 differences (3,486 inspections, 349 feedings, 139 harvests, 261 checks and 266 treatments in total).
- **After:** under real row-level security, signed in as the largest account (560, 98, 34, 0 and 43 rows).
- **After:** as a team member who only sees other people's hives (225 and 51 rows).

All matched. Insert, update and delete rules are untouched, and the security advisors are unchanged at 14 / 72. `pg_stat_statements` was reset afterwards.

## B. Requests

- **Account check (`dashboard/layout.tsx`):** every 5 minutes while the app is visible, skipped while it is hidden, and run once on returning (`visibilitychange`).
  - **Before:** every 30 seconds, background tabs included. That was about 250,000 calls, the most of anything in the app.
  - **Still in place:** API routes using `requireActive` still check the account on each call.
- **Dashboard team figures:** `fetchTeamStats` runs the first time the closed Teams & Collaboration panel is opened (`teamStatsRequestedRef`), not on every dashboard load. Its two hive queries now run in one `Promise.all`.
- **Apiaries page:**
  - The team-name lookup runs alongside the apiaries query.
  - One `hives` query now embeds each hive's latest inspection (`inspections(inspection_date)`, ordered and limited with `referencedTable`). Before, a second query fetched every inspection ever recorded.
  - The page makes 3 requests in a row instead of 5.

## C. Scales

- **Latest reading only (`latest=1`):** with it, both data routes return just `{ lastValues }` (1 vendor call). The inspection form uses it to fill in the weight; before, it ran the 8-call Wolf summary or the 7-call BEEP summary.
- **Wolf summary:** `lastValues` is now the last reading of the 48-hour hourly series it already fetches, which is exactly what `wolfGetLastValues` returned. That is 7 calls instead of 8.
  - **Not done:** merging the 7-day and 30-day calls into one 60-day call. Wolf doesn't document how daily windows treat the first and last day.
- **Wolf battery (`battery=1`):** `WolfScalePanel` asks once, on its first history request, and the route adds `batteryVoltage`. Before, the tile read `battery_voltage` from history readings, which never carry it, so it never showed.
- **Unused code:** `WolfSensorDisplay.tsx` and `WolfHistoryChart.tsx` are deleted.

## D. Downloads

- **QR logo:** `public/logo-qr.png` (128 px, 7.7 KB) replaces the 613 KB `logo_trans.png` in `HiveQRCode`, `NucQRCode` and the QR tags page. It is drawn at 30–40 px.
- **Loaded when opened, through `next/dynamic` with a spinner:**
  - The records page's five forms. The page also imports the cards and filter bar directly rather than through the barrel.
  - `HiveQRCode` in `InspectionCard`.
  - All nine reports.
  - `HiveFormSection` and the three bulk modals on the Hives list.
  - `QueenFormSection` and `PrintLabelsModal` on the Queens list.
- **Grid library:** `proj4`, through `@/lib/irish-grid`, is imported at its three apiaries-page call sites.
- **Installed app:** `public/manifest.json` has `"start_url": "/dashboard"` and `"id": "/"`, so installed apps keep their identity. The test now expects this.
- **Public trace photo (`TraceCard`):** optimised (`sizes` set) when it is our storage URL, and left unoptimised otherwise.

## E. Lists and offline cache

- **Records page:**
  - It shows `RECORDS_PAGE_SIZE` (50) records with a "Show more" button and a "Showing N of M records" line.
  - The count goes back to 50 when the filters or search change.
  - A record opened from a link is always within the shown part.
  - Search filters on `useDeferredValue(searchTerm)`.
- **Service worker (`public/service-worker.js`):**
  - **Weak signal:** for page loads, after `NAVIGATION_TIMEOUT_MS` (4 s) the saved copy is shown if there is one. Otherwise the page keeps waiting. `event.waitUntil` lets the late network answer still refresh the copy.
  - **Build assets:** the cache keeps the newest 400 (`MAX_STATIC_ENTRIES`).
  - **Trim counts (QA fix):** counted per cache and per kind of entry.
- **Photos:**
  - `images.minimumCacheTTL` is 7 days, and new uploads get `cacheControl: '604800'`.
  - **Change from the plan:** 7 days rather than 30 days or a year. Deleted photos are removed for good after a 7-day grace period, and cached copies shouldn't outlive that by much.

## Not done

- **Hives list:** a "latest records" database function for the hives list. The faster rules make the current approach cheap.
- **Profile reads:** merging the repeated reads. They run side by side, so the gain is small.
- **BEEP:** merging its calls. They run side by side, and a 60-day window might thin the data.
- **Sign-in:** a weak-signal sign-in fast path. It touches sign-in behaviour.
- **For the UI batch:** DM Sans is never loaded, so the app shows Arial.
- **Planned test not written:** a "Show more" test. The records page has no render test setup, and the logic is three lines; the owner's test covers it.

## Rules

- **Read rules:** on record tables, put an own-hive path before access-check functions, then check that the visible rows per user are unchanged.
- **Database functions:** a vector-search function with `SET search_path` uses `RETURN QUERY EXECUTE`.
- **Background polling:** pause it while `document.hidden` is true, and re-check on `visibilitychange`.
- **Loading on demand:** forms, modals and reports that appear on a tap load through `next/dynamic`, as do libraries used only in handlers (`await import`).
- **Long lists:** show them in pages of 50 with "Show more".
