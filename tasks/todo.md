# NIHBS Report: Attribute Batch Metrics to Correct Calendar Month

## Tasks

- [x] 1. Add `emergence_date` to the Supabase select query in useNIHBSReport.ts
- [x] 2. Refactor the batch loop: split metrics across two months — graft metrics go to graft month, post-emergence metrics go to emergence month (including per-apiary data)
- [x] 3. Update feature docs with month attribution logic (noted queens_mated/hybridised as temporary)

## Review

### Summary
The NIHBS report now attributes batch metrics to the correct calendar month based on when the event actually occurred, rather than lumping everything into the graft date month.

### Changes Made

| File | Change |
|------|--------|
| `src/hooks/useNIHBSReport.ts` | Added `emergence_date` to select query |
| `src/hooks/useNIHBSReport.ts` | Replaced monolithic batch loop with split logic: graft metrics (batch_count, cell_count, grafts_accepted) → graft_date month; post-emergence metrics (queens_hatched, queens_mated, queens_hybridised) → emergence_date month |
| `src/hooks/useNIHBSReport.ts` | Added helper functions `getMonth`, `getApiary`, `getEmergenceMonth` to cleanly manage month bucket creation and emergence date fallback |
| `docs/features/queen-rearing.md` | Added "NIHBS Report — Month Attribution Logic" section with table and temporary note |

### Notes
- A single batch may now contribute data to two different monthly buckets (e.g. Jan grafts, Feb hatched)
- If `emergence_date` is null, falls back to `graft_date + 12 days`
- Per-apiary breakdowns follow the same month split
- **Temporary:** queens_mated and queens_hybridised use emergence month as a proxy — documented for future revisiting when explicit dates are available
- 1 code file changed, 1 doc file updated
