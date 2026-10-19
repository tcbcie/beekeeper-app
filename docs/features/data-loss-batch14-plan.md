# Batch 14: Phase 2 Data-Loss Bugs

**Status:** Done 19/10/2026. The owner tested it; committed and pushed.
**Checklist:** `tasks/security-batch14-todo.html`
**Findings:** C4-01, C4-03, C4-04, C4-05, C4-06, C5b-01, C5b-02, C5b-03, C5b-04, C8a-01, C8a-02, C2-03, plus two related bugs found while checking them (C4-01b, C5b-03b). This is Phase 2 fix batch 2. The mating nuc findings (C5a-01 to C5a-03) are batch 15.

## Records

- **C4-01:** `fetchAllData` (`useRecordsData.ts`) no longer sets `loading` back to true on a refetch. Only the first load shows the skeleton, so changing a filter can't unmount an open form.
- **C4-01b:** the Harvest, Feeding, Varroa Check and Varroa Treatment forms load their record **once per record**, using a `loaded…Ref` identity check. `InspectionForm` skips its reset when `initialData` is the same object as last time. Before this, a refreshed hive list, apiary filter or option list re-ran the load effect and wiped unsaved edits, including a newly attached varroa photo.
- **C4-03:** inspection weather is fetched and written **only for new inspections**. An edit leaves the four `weather_*` columns out of the update, so the stored values are kept.
- **C4-04:** `moisture_content` (numeric(4,1), form limited to 0–30%) is now in the harvest insert and update payload.
- **C4-05:** the task update no longer sends `user_id` or `completed`. Both are set on insert only, so an edit can't reopen a done task or take ownership of a team-mate's task.
- **C4-06:** when editing an inspection of the same hive, the brood box list comes from the inspection's saved `brood_frames_per_box`, not the hive's current boxes (see `per-box-brood-frames.md`). Saved per-box rows always have 2–3 boxes (checked live).

## Rearing batches

- **C5b-01:** the grafts section wrapper in `BatchFormSection.tsx` has an `onKeyDown`: Enter in an `<input>` is prevented and the input is blurred, which commits its on-blur save. This covers the inline queen number, weight and date inputs and the four modals, which sit inside the batch `<form>` in the React tree. Textareas keep Enter.
- **C5b-02:** the timeline effect is gone. `timelineFromGraftDate()` fills the four dates for a new batch's defaults, when the user changes the graft date, and for any blank dates on a saved batch. Saved and hand-edited dates are never overwritten.
- **C5b-03:** `useGraftDistributions` returns `error` (true after a failed fetch). The count-persist effect in `useBatchGrafts` waits for `!distLoading && !distError`, because the hatched and mated counts for sold grafts depend on distributions. Both fetches start in the same tick, so there's no window between them.
- **C5b-03b:** a failed grafts fetch now returns early, as the breeder and nuc fetches already did. Before, it fell through with no grafts and saved zero counts.
- **C5b-04:** `createQueenForRecipient`, `createQueenForRecipientFromQueen` and `createQueensForRecipient` return `Promise<boolean>` and check the `create_queen_for_distribution` RPC error. Queen creation is still non-blocking. `warnIfQueenMissing()` shows the warning "Distribution recorded, but the recipient's queen record could not be created." The RPC is idempotent, so a retry can't create a duplicate.

## Tools

- **C8a-01 / C8a-02:** `FinancialRecordForm` and `PurchaseItemForm` get `key={record?.id ?? 'new'}`, so they remount for each record. Both copy their props into state once.

## Export

- **C2-03:** 10 tables added to `DATABASE_EXPORT_TABLES`, and `trace_labels` added to `USER_EXPORT_TABLES` (see `database-export-coverage-and-restore-plan.md`). All 10 have owner-readable RLS and SELECT grants (checked live), so they can't break the personal export, which stops at the first failing table.

## Verification

- `npx tsc --noEmit` shows no errors in `src/`, and ESLint is clean on all changed files.
- qa-engineer: no Critical, High or Medium findings. Two Low notes are left for later batches: no busy indicator while a filter refetches, and the task update has no row-count check (C4-07).
