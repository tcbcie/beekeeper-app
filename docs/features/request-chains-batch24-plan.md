# Batch 24: Public Embed, Mel's Tools and Group Reports (Request Chains)

**Status:** Implemented 22/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch24-todo.html`
**Findings:** C7b-04 and C7b-01 (GDD), C9b-13, C9b-14 and C6-12 (Mel's tools), C9b-11 and C9b-12 (group reports). This is Phase 2 fix batch 11, following batch 23 (`request-chains-batch23-plan.md`). The smaller admin and Tools items are batch 25.

## GDD weather calls (C7b-04, C7b-01)

`src/lib/gdd.ts` has a new `fetchArchiveDaily(lat, lon, startDate, endDate)`. It returns the Open-Meteo daily archive, or `null` on any failure. Its behaviour:

- **One request per URL while the page is open:** results live in a module-level `Map`.
- **Shared requests:** a request that's already under way is shared with later callers.
- **No cached failures:** a failed request is removed from the map, so the next call retries.
- **Timeout:** the 15-second timeout is kept.

The callers are all client components (the dashboard weather row, Research → GDD, and the public embed), so the cache never lives on the server.

| Where | Before | After |
|---|---|---|
| `PublicGDDTab` (public tcbc.ie embed) and `GDDDataTab` | Up to 11 calls one after another; the current year was fetched 4 times and last year 3 times | One call per distinct year; the accumulation and monthly loops run their years together |
| `fetchCurrentYearGDD` (dashboard) | Its own fetch | Uses the helper |

- **Stale-response guard:** `accumulationRequestRef` and `monthlyRequestRef` let only the newest call set state or clear the spinner. This matters because the years now arrive together, and a slower, older call could otherwise overwrite a newer one.
- **C7b-01:** the monthly average now skips days with a `null` maximum or minimum. Before, those days counted as 0 °C, so the current month read too low on the public embed and in Research.

## Mel's tools (C9b-13, C9b-14, C6-12)

### Per-item loops → `Promise.all` (C9b-13)

Twelve loops awaited one query per hive, nuc or colony in turn:

- **`varroa.ts` (5):** varroa counts, above threshold, needing treatment, treatment counts, last treatment.
- **`inspections.ts` (3):** needing inspection, queen status, inspection counts.
- **`analysis.ts` (2):** best performers, hive scores.
- **`nucs.ts` (1):** overdue nucs.
- **`colonies.ts` (1):** colony overview.

Each loop now maps the list with `Promise.all`, returns a row or `null`, and pushes the rows in the original order. The queries stay one per item on purpose: "latest per hive" in one `.in()` query would hit Supabase's 1,000-row cap and silently drop the oldest hives. The query error handling is unchanged.

### Scale tools (C9b-14)

`compareScaleReadings` and `checkScaleAlerts` use three new helpers in `scales.ts`:

- **`getScaleTokens(userId)`:** reads both vendor tokens once (one `profiles` read via `getServiceSupabase()`, the caller's own row). Before, there was one read per hive.
- **`mapInGroups(items, fn, 5)`:** calls the vendor APIs five hives at a time.
- **`readHiveScale(...)`:** never throws. A failing scale gives no readings and a server log line, so it can't hold up or break the other hives. Before, the error was swallowed silently.

The processing of the readings (latest value, swarm, flow and decline alerts) is unchanged.

### Lineage tool (C6-12)

`getQueenLineage` drops from 10 round trips to 4 after the queen look-up, using the same pattern as `QueenLineageTree` in batch 23:

1. The queen itself.
2. Parents (one `.in('id', ...)`), daughters, siblings and the source batch, all together.
3. Grandparents (the mother's parents, one `.in()`).
4. Great-grandparents (the grandmother's parents, one `.in()`).

Every queen query is scoped to `.eq('user_id', userId)`. The main fetch gained that filter; it was already implied, because `findQueenByNumber` is user-scoped. The depth is fixed at three generations, so a lineage cycle (C6-08) can't loop. The output is unchanged.

## Group reports (C9b-11, C9b-12)

### Rearing-group report (`useRearingGroupReport`): 6 → 3 round trips

The report loaded a list of **every batch id the group ever had** and sent it in one `.in()` request. That list grows without limit, which is the same URL-length failure as C6-15.

The queen-cell distributions now filter through the batch join instead: `rearing_batches!inner(rearing_group_id)` with `.eq('rearing_batches.rearing_group_id', groupId)`. Before the change, two checks against the live database:

- `graft_distributions_batch_id_fkey` is the only foreign key to `rearing_batches`, so the embed is unambiguous.
- Every distribution's `user_id` equals its batch owner's (96 of 96), so the counts per member match.

The batches, the queen-cell distributions and the member names now load together. The graft, distribution and nuc look-ups use `fetchInChunks`.

### NIHBS report (`useNIHBSReport`): 5 → 3 round trips

- **Monthly returns:** the saved returns (`nihbs_monthly_returns`) load together with the members.
- **Mating apiaries:** these are taken straight from the batches' `mating_apiary_id`, and the look-up joins the existing graft, distribution and nuc group.
- **Chunked id lists:** the batch-id lists use `fetchInChunks`.

The saved returns' errors are still ignored, as before: auto-calculated values are shown.

## Verification

- `tsc --noEmit`: 0 errors.
- `eslint` on the changed files: clean.
- Tests: 818 passed, 23 skipped.
- qa-engineer: no Critical or High issues.

## Rules

- Never `await` a query inside a loop over hives or nucs. Use `Promise.all`, and keep "latest per item" as one query per item (see `.claude/skills/ai tools/Skill.md`, rule 7).
- External APIs that may repeat a request on one page (Open-Meteo) go through a shared helper that de-duplicates by URL.
- A group-wide id list goes through a join filter or `fetchInChunks`, never one `.in()`.
