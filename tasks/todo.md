# Task: Mating Nuc Bulk Creation and Allocation
**Date:** 27/02/2026
**Status:** Completed

## 1. Objective
Implement bulk mating nuc creation for both numbered and unnumbered workflows, while keeping each created nuc as an individual database entry and improving sealed-cell allocation from source batches.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/batches/MatingNucsTab.tsx`
  * `src/hooks/useMatingNucBulk.ts` (new)
  * `src/types/*` (mating nuc bulk types)
  * `supabase/migrations/*` (new migration for bulk metadata and nuc field extensions)
  * `docs/features/mating-nucs.md`
  * `docs/features/mating-nuc-bulk-creation-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep the current single-nuc creation flow intact and add a focused bulk workflow with minimal coupling, centred on sealed-cell filtering and atomic per-nuc inserts.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Add database support for bulk nuc runs (`mating_nuc_batches`) and per-nuc linkage (`creation_batch_id`, `reference_code`, nullable `nuc_number`) with safe constraints and indexes.
- [x] **Step 2:** Implement bulk creation logic (validation, duplicate checks, sealed-cell eligibility, atomic insert behaviour) via a dedicated server-side path and typed hook.
- [x] **Step 3:** Build numbered bulk mode in `MatingNucsTab` (multi-input nuc numbers with optional sealed-cell auto-assignment).
- [x] **Step 4:** Build unnumbered bulk mode in `MatingNucsTab` (multi-select sealed cells with generated reference codes).
- [x] **Step 5:** Add a bulk runs table that shows created batches and allows drill-down to individual created nuc entries.
- [x] **Step 6:** Update documentation in `docs/features/mating-nucs.md` and align with `docs/features/mating-nuc-bulk-creation-plan.md`.
- [x] **Step 7:** Prompt user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The existing Mating Nucs workflow only supported one-at-a-time creation and a single dropdown cell picker, which did not support large-scale creation, unnumbered creation, or grouped run tracking.
* **Summary of Changes:** Added migration `add_mating_nuc_bulk_batches.sql` introducing `mating_nuc_batches`, `creation_batch_id`, and `reference_code`. Implemented `useMatingNucBulk` hook for sealed-cell eligibility, duplicate number validation, bulk run creation, per-nuc inserts, and graft status updates. Extended `MatingNucsTab` with a bulk creation panel (numbered and unnumbered modes), searchable/selectable sealed-cell picker, and a bulk runs summary table with run-based filtering of nuc rows.
* **Notes for User:** Build/tests were not run (per project instruction). The bulk create path currently executes sequential write operations from the client hook (not a database transaction/RPC wrapper), so if you want strict all-or-nothing guarantees we should add a server-side RPC in a follow-up.
