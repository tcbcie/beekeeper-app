# Task: Settings Export Coverage and Restore Verification
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Ensure `Profile & Data Export` and `Export Complete Database` cover all current `public` tables, then make the generated SQL restore-oriented with deterministic ordering and clear constraints/prerequisites.

## 2. Impact Analysis
* **Files to Modify:** 
  * `src/app/api/admin/export-all-data/route.ts`
  * `src/components/settings/ProfileExport.tsx`
  * `src/lib/database-export.ts` (new, if used as shared source of truth)
  * `docs/features/database-export-coverage-and-restore-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep changes surgical by touching only export-related files, avoid broad refactors, and centralise table metadata once to prevent future drift.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Create a single shared export-table definition that includes all current `public` tables and wire both export paths to use it.
- [x] **Step 2:** Update admin export SQL generation to be restore-oriented (stable ordering, transactional wrapper, and explicit restore notes/limitations).
- [x] **Step 3:** Update personal export table coverage to match intended scope and remove table-list drift from hardcoded duplicates.
- [x] **Step 4:** Re-run MCP verification queries to confirm full table coverage and identify remaining restore constraints (including cross-schema FKs).
- [x] **Step 5:** Update documentation in `docs/features/database-export-coverage-and-restore-plan.md`.
- [x] **Step 6:** Prompt user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Export logic depended on a missing `exec_sql` RPC and duplicated hardcoded table lists that had drifted behind the live schema, causing incomplete backups and inconsistent behaviour between admin and personal exports.
* **Summary of Changes:** Added shared export table metadata and SQL serialisation helpers in `src/lib/database-export.ts`; updated admin and personal export paths to use the same 60-table list; removed `exec_sql` dependency; added restore-oriented SQL framing (`BEGIN/COMMIT`), best-effort trigger disable/enable blocks in admin export, explicit restore prerequisites/limitations, and per-table summary/error reporting in both exports.
* **Notes for User:** MCP verification now shows 60/60 `public` tables covered by the shared list. Restore remains schema-dependent: run migrations first and ensure required `auth.users` records exist (there are 37 `public` FKs to `auth.users`). Build/tests were not run locally per project instruction.
