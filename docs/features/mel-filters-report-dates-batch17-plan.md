# Batch 17: Mel's Status Filters and Report Dates

**Status:** Done 19/10/2026. The owner tested it; committed and pushed.
**Checklist:** `tasks/security-batch17-todo.html`
**Findings:** C9b-01, C9b-02, C9b-03, C9b-04, C9b-05, C9b-06, C9b-07 and C9b-20 (Phase 2, Chunk 9b). This is Phase 2 fix batch 5.

## Mel's status filters (C9b-01/02/03)

Supabase `.eq`/`.in` are case-sensitive, and several tools filtered on values the database never stores. Real values were checked against check constraints and live counts.

| Tool (`src/lib/ai/tools/`) | Before | After |
|---|---|---|
| `getQueenInventory` | `'Active'`, so always empty | `'active'` (the Queens page's default) |
| `getActiveBatches`, `getUpcomingBatchEvents` | six invented statuses, so always empty | `.neq('status', 'completed')` (the Batches page's rule; also covers older `'grafted'` rows) |
| `getNucsNeedingInspection` | `'pending'` (doesn't exist), virgin, mating | `ACTIVE_NUC_STATUSES`: setup, cell_introduced, graft_introduced, virgin, mating. Laying nucs stay out; `getNucsReadyForHarvest` covers them |
| `getMatingNucs` | `'active'` passed straight through | `'active'` maps to `ACTIVE_NUC_STATUSES`; the enum accepts every real status |
| `searchWildColonies` | missing statuses | adds `pending_review` and `unconfirmed` |
| `getDeceasedColonies` | everything not active | `deceased` and `swarmed` only (the tool's described meaning) |

## Raw IDs (C9b-07)

- `getHiveOverview` returns `colony` (the colony number, through `colonies!hives_colony_id_fkey`) instead of `colonyId`.
- `getRearingBatchDetails` uses an explicit select and returns `motherQueen` (the queen number, through `queens!rearing_batches_mother_queen_id_fkey`) instead of `motherQueenId`. Multi-breeder batches have no single mother and show "Unknown".
- Scale tools fall back to "Unnamed scale" rather than the maker's device ID.

## Irish "today" (C9b-20)

`src/lib/ai/tools/utils.ts` gains:
- `todayInDublin()`, `toDublinDate()` and `addDaysISO()`.
- `daysSince`/`daysUntil` now count **calendar days in Europe/Dublin** (0 = today, 1 = tomorrow). The old version floored UTC milliseconds, so `daysUntil` was off by one day all the time.
- `formatDate` also uses Dublin time, so timestamps show the right day.

The tasks, queens, analysis, feeding and inspections tools use these for "today" and look-back windows. `getUpcomingBatchEvents` now compares calendar dates, so events due today are no longer dropped.

## Reports

- **C9b-04:** `useReportFilters` recalculates preset periods (all, 3 months, 6 months, 1 year) from today on every render using `getPresetRange()` (`src/lib/date-utils.ts`, local calendar). Only "custom" uses its saved dates. Before, the saved dates froze on the first visit, so a week later the DAFM report dropped that week's treatments.
- **C9b-05:** in Varroa Monitoring, "All hives" plus an apiary now filters through `hives!inner(..., apiary_id)`, as the DAFM report does. Archived hives' history stays in.
- **C9b-06:** `hives.archived_at` and `varroa_checks.check_date` are timestamps, so their end bound is now `.lt(col, nextDay(endDate))` (new `nextDay()` in `date-utils.ts`). Today's archives and checks are included. Date columns keep `.lte`.

## Verification

- `npx tsc --noEmit` shows no errors in `src/`, and ESLint is clean.
- qa-engineer found no issues.
- `.claude/skills/ai tools/Skill.md` gains rule 6: exact stored statuses, `todayInDublin()`, and no raw IDs.
