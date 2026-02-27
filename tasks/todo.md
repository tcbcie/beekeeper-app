# Task: Fix Bulk Run Relation Type Mapping
**Date:** 27/02/2026
**Status:** Completed

## 1. Objective
Fix the TypeScript build error in `useMatingNucBulk.ts` caused by mismatched `rearing_batches` relation shape returned by Supabase.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/hooks/useMatingNucBulk.ts`
  * `tasks/todo.md`
* **Simplicity Check:** Keep the fix local to type mapping in the hook by normalising relation shape (`array` or `object`) before returning typed data.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Add an internal raw-row interface representing the Supabase response shape for bulk runs.
- [x] **Step 2:** Replace direct cast with an explicit mapping that normalises `rearing_batches` to a single object or `null`.
- [x] **Step 3:** Preserve strict output type (`MatingNucBulkRun[]`) without unsafe direct casting.
- [x] **Step 4:** Prompt user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Supabase returned `rearing_batches` in array form for the relation select, while `MatingNucBulkRun` expected a single object, making the direct cast invalid under strict typing.
* **Summary of Changes:** Added `MatingNucBulkRunRow` as a raw response type and mapped rows explicitly in `fetchBulkRuns`, coercing `rearing_batches` from array/object to the expected single-object-or-null output type.
* **Notes for User:** Build/tests were not run locally (per project instruction). Please re-run your Next.js build to confirm the type error is resolved.
