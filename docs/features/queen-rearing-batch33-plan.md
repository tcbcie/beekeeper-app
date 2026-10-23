# Batch 33: Queen Rearing Records

**Status:** Implemented 23/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch33-todo.html`
**Migration:** `supabase/migrations/20261023180000_queen_rearing_batch33.sql`, applied through MCP.
**Findings:** C5b-09, C5a-08, C5a-09, C5b-07, C5b-08, C5a-11, C8a-14, C5b-06, C6-06 and C5b-14. This is Phase 2 fix batch 20. Two agents checked each finding against the code and the live database. Batch 34 covers CRM and traceability, and batch 35 records and hives.

## A. Distributed grafts: C5b-09

- **Before:** the live FK `graft_distributions_graft_id_fkey` was `ON DELETE CASCADE`. Deleting a graft silently removed:
  - its distribution;
  - the Queen Tracker row;
  - the NIHBS distribution and mated counts;
  - the link to the recipient's queen (`queens.source_graft_id` is set to null).

  The row lock in the Queen Tracking table was screen-only. "Sold" could be picked by hand, which dropped a mated queen out of the NIHBS return.
- **Database:** the FK is now `ON DELETE NO ACTION`. It is checked at the end of the statement, so deleting a whole batch still works: that statement also removes the distributions through `graft_distributions_batch_id_fkey`.
  - Tested live in a rolled-back block: a graft delete is refused, a batch delete succeeds, and no distributions are left behind.
  - No database function deletes grafts, batches or distributions directly.
- **Screen and hook:**
  - `useBatchGrafts` refuses a status change or delete on a graft with a distribution, and maps error 23503 to a clear message.
  - The table bulk status change and delete skip distributed grafts and say how many were skipped.
  - `QueenTrackingSection` hides the status picker and Delete on distributed rows even when unlocked. Unlocking still allows marking, queen number, weight and date.
  - "Sold" is removed from `TABLE_STATUSES`. An older graft left as sold without a distribution still shows the status in its select, so it can be corrected.
  - `distributedGraftIds` moved up in the hook so the row handlers can use it.

## B. Mating nuc edit and delete: C5a-08, C5a-09

- **Before:**
  - Editing a nuc to a new cell reset the old graft to `sealed` and cleared `queen_marked` and `queen_number`, whatever its status (mated, failed, sold).
  - Delete did the same to an emerged queen, and reset the graft *before* deleting the nuc.
  - Several writes ignored errors and still showed success.
- **Now** (`MatingNucsTab.tsx`):
  - `releaseGraftFromNuc` moves only a graft still `in_nuc`: to `emerged` if `queen_marked`, otherwise `sealed`. The number and marking are kept. The old "this clears the queen number" warning is removed, because the number is now kept.
  - Delete removes the nuc first, then releases the cell.
  - Every follow-up write on create, edit, retire and delete is checked. `reportSaved` shows a partial-failure message instead of a plain success.

## C. Mixed bulk distribution: C5b-07

- **Before:** one `distribution_type` (the furthest-along stage) was recorded for every graft. Sealed cells sent with a mated queen were all recorded as mated queens, which over-counted NIHBS and created "active" queens for the recipient.
- **Now:** `DistributeGraftModal` works out the type per graft. If they differ (`mixedStages`), it shows a message in place of the type badge and disables Save. Redistribution with `distributionTypeOverride` is unaffected.

## D. Mated date and Mated tick: C5b-08, C5a-11

- **C5b-08:**
  - **The new trigger:** `trg_sync_distributed_queen_mated_date` (`AFTER UPDATE OF mating_confirmed_date`, SECURITY DEFINER, no client EXECUTE) copies a corrected date to the recipient's `active` queen. It matches on `source_graft_id`, or on `source_distribution_id` for registry queens. It only changes a queen whose `mated_date` still equals the old date.
  - **Left to existing flows:** first confirmations (old date null) still go through `promote_distributed_queen_on_mating`, and clears are unchanged.
  - **Tested live:** in a rolled-back block, the queen's date followed the correction.
- **C5a-11:**
  - The tracker's Mated icon and the Mated window's Clear now ask first, through `useConfirm`, as clearing a failure already did.
  - `setDistributionMatingConfirmation` now defaults `clearLocationOnClear` to `false`, so a cleared confirmation keeps its mating site. Re-confirming from the tracker sends no location.

## E. Smaller fixes

- **C8a-14:** `useNIHBSReport` throws on `returnsError`. Before, the report rendered auto values, and Save upserted them over the saved overrides.
- **C5b-06:** bulk distributions pass `distribution_date` and `mating_location` to `createQueensForRecipient`, as the single path does. No hive is passed, because bulk never places queens.
- **C6-06:**
  - `redistributeQueen` now awaits the recipient's queen creation and returns `false` if it fails.
  - The queen page marks its own copy `distributed` and detaches the hive only after that succeeds. Failures to mark the queen or detach the hive are shown to the user.
  - Retrying is safe, because `create_queen_for_distribution` is idempotent.
- **C5b-14:** if `replace_batch_breeder_queens` fails on create, the new batch is deleted before the error is shown, so a retry doesn't hit "name already used".

## Rules

- A graft with a distribution can't be deleted (FK `NO ACTION`). Remove the distribution first (`deleteDistribution` deletes it, then reverts the graft status).
- `sold` is set only by distributing; never offer it as a manual status.
- A bulk distribution must be a single stage.
- Moving a graft out of a nuc never clears its queen number or marking.
