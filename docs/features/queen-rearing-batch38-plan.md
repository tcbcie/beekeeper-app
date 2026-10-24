# Batch 38: Queen Rearing

**Status:** Implemented 24/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch38-todo.html`
**Database:** no schema change. One approved data backfill: `supabase/migrations/20261024120000_queen_rearing_batch38_breeder_backfill.sql`, applied through MCP.
**Findings:**
- **Fixed:** C5b-16, C5b-13, C5a-06, C5a-07, C5b-15, C5a-12, C5a-15, C5a-17, C5a-19, C5a-20 and C5b-19.
- **Closed or left:** C5a-13, C5a-14, C5a-16, C5b-18 and C5b-20.

This is Phase 2 fix batch 25.

## A. Selection scoring: C5b-16

- **Before:** `batches/page.tsx` averaged every inspection, but unrated fields are stored as 0. The live database had 1,314 of 1,891 inspections with no swarming rating, 830 with no brood rating and 1,809 with no chalkbrood rating. So:
  - unrated swarming and chalkbrood scored as perfect after inversion;
  - unrated brood dragged the average down;
  - empty honey stores scored 1.

  Each weight tap also refetched every hive with no stale guard.
- **Now:**
  - **`src/lib/selection-scoring.ts`:** `averageRated` uses only values above 0. `honeyStoresRating` treats empty text as unrated. `scoreHives` uses 3 (the scale middle) for a field with no ratings. `formatAverage` shows "–".
  - **`HiveScore.averages`:** each average is now `number | null`.
  - **The page:** it loads the hives in an effect on `[activeTab, userId, selectedApiary]` with a sequence ref, then scores them in a `useMemo`. A failed load shows "Couldn't load your hives".
  - **Test:** `tests/lib/selection-scoring.test.ts`.

## B. Breeders and mothers: C5b-13, C5a-06, C5a-07

- **C5b-13: the lock.** `BatchFormSection` locks the single Breeder Queen select once cells exist.
  - `breedersLocked` also covers cells generated in the same session, through `BatchGraftsSection`'s `onGraftsExist`.
  - The save rule still uses `editingBatchHasGrafts`, which is set when the editor opens. So a breeder set picked before generating in that session is still saved (QA fix).
- **C5b-13: stamping.** `useBatchGrafts` takes `motherQueenId` and stamps it on cells generated without ranges (single-breeder). The 871 older cells were backfilled after the owner approved it; afterwards 0 were missing and 0 disagreed with their batch.
- **C5a-06:** in `MatingNucsTab`'s cell picker, choosing a cell always sets "Grafted from" to the cell's breeder, else the batch mother, else blank. Before, it set the value only when the cell had a breeder, so the previous cell's breeder stayed.
- **C5a-07:** the nuc card and history use `nucBreederNumber`: the nuc's queen, then the cell's breeder (`queens!batch_grafts_breeder_queen_id_fkey`), then the batch mother (`queens!rearing_batches_mother_queen_id_fkey`). This is the same order as Nuc Reports.
- **Live data:** no nuc was affected.

## C. Loading and errors: C5b-15, C5a-12, C5a-15, C5a-17

- **C5b-15:** `useBatchGrafts` has `loadFailed` and `retryLoad`. `loading` stays true on failure, so the batch counts aren't overwritten. The section shows "Couldn't load grafts" with Try again.
- **C5a-12:**
  - **Nuc inspection sync:** `NucInspectionPanel.syncNucFromInspections` returns false when the nuc or graft write fails, so its existing warning shows. A delete shows "deleted" only when the sync worked.
  - **Nuc list:** a failed nuc load now shows a toast.
  - **Distributing from a nuc:** a failed "queen distributed" update now shows a toast.
- **C5a-15:** the nuc form's cell list (`fetchGrafts`) reads through `fetchAllPages`. The largest account has 660 cells.
- **C5a-17:** `useQueenTracker` reads both distribution queries through `fetchAllPages`, ordered by date then id. Errors show their `.message`.

## D. Screens: C5a-19, C5a-20, C5b-19

- **C5a-19:** about 40 controls go to `text-base` and `min-h-12`. They are in:
  - the tracker editors and filters
  - the nuc cell search
  - `DistributeGraftModal`
  - `NucInspectionPanel`
  - the `NucReportsTab` dates
  - the `CellFrame` inputs
  - the batches page filters
  - the moved modals
- **C5a-20:** the tracker table is `min-w-[36rem]` on phones (`48rem` from `md`).
  - **Queen column:** the header and cells are `sticky left-0 z-10` with opaque backgrounds (`stickyCellClass`).
  - **Expanded row:** its details sit in a sticky, screen-wide wrapper.
- **C5b-19:** `BreederRangeModal`, `ConfirmMatingModal`, `DistributeGraftModal` and `MatingNucsTab`'s history and bulk-site dialogs use `ModalShell`. `ConfirmMatingModal`'s own document Escape listener is removed; it ignored the dialog stack, so Escape on its "are you sure?" closed both.

## E. Closed or left

- **C5a-13:** handlers are already wrapped, and Supabase returns errors rather than throwing.
- **C5a-14:** the tracker and nuc lists already have guards.
- **C5a-16 / C5b-20:** `select('*')` on narrow tables with no column grants. Nothing is broken.
- **C5b-18:** about 63 database calls in 8 UI files. Moving them would be a large refactor with no visible benefit.

## Rules

- Ratings stored as 0 mean "not rated". Average only values above 0 (`averageRated`).
- Single-breeder cells carry `breeder_queen_id`, and the breeder picker locks once cells exist. Readers still fall back to the batch mother.
- Hand-made `fixed inset-0` modals should use `ModalShell`. Never add a document-level Escape listener to a modal that opens `useConfirm`.
