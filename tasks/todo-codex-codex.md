# Task: Queen Rearing and Lineage Hardening Review
**Date:** 31/03/2026
**Status:** Completed

## 1. Objective
Address the review findings from the Queen Rearing tab reorder, then harden the recently shipped lineage changes so tab navigation, async state, and documentation remain consistent under refreshes, rapid navigation, and missing relationship data.

## 2. Impact Analysis
* **Files to Modify:** * `src/app/dashboard/batches/page.tsx`
  * `src/components/QueenLineageTree.tsx`
  * `src/hooks/useQueenDetail.ts`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-lineage.md`
  * `docs/features/mating-nucs.md`
  * `docs/features/virgin-queen-tracker.md`
  * `docs/features/mating-nuc-qr-codes.md`
  * `docs/features/overview-pages-improvement.md`
  * `docs/features/queen-rearing-lineage-hardening-plan.md`
* **Simplicity Check:** This keeps the work surgical: one source of truth for Queen Rearing tabs, safe client-side URL/state synchronisation, targeted lineage fetch guards, and documentation alignment. No schema changes or feature redesigns are planned.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Consolidate the Queen Rearing tab metadata into a single configuration and make tab clicks keep `?tab=` in sync with the visible tab.
- [x] **Step 2:** Harden `src/components/QueenLineageTree.tsx` so stale async lineage responses cannot overwrite the current queen after rapid navigation or collapse/expand changes.
- [x] **Step 3:** Harden `src/hooks/useQueenDetail.ts` so hive and sighting state is reset safely when a queen has no active hive assignment or when a newer fetch replaces an older one.
- [x] **Step 4:** Update documentation in `docs/features/queen-rearing.md`, `docs/features/queen-lineage.md`, and the related Queen Rearing docs so labels and behaviour match the live UI.
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The Queen Rearing shell kept tab ids, labels, URL handling, and render order in separate client-side structures, while the lineage detail views still allowed older async responses to overwrite newer queen state. The `public.queens` table currently enforces only self-referencing foreign keys, so lineage safety still depends on the client paths.
* **Summary of Changes:** Centralised Queen Rearing tab metadata and URL synchronisation, added request-ownership guards to the lineage tree and queen detail hook, reset derived hive and sighting state defensively, and aligned the affected feature notes with the live tab labels and lineage behaviour.
* **Notes for User:** Supabase MCP review confirmed there is no database-level lineage cycle constraint and no current direct self-parent or two-node mother cycles in live data. Build tests were not run per repository instruction; please verify the UI and run your normal build check.
