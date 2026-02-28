# Task: Admin Export RLS Recreation for Local Restore
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Add row-level security export support to the full admin export so the generated SQL can recreate RLS policies and table-level RLS state in local Docker restores.

## 2. Impact Analysis
* **Files to Modify:** 
  * `src/app/api/admin/export-all-data/route.ts`
  * `docs/features/admin-export-schema-recreation-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep changes scoped to admin export SQL generation only, using existing metadata-query and SQL-builder patterns without touching unrelated routes or user-facing export paths.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Add metadata extraction for table-level RLS flags (`relrowsecurity`, `relforcerowsecurity`) for exported `public` tables.
- [x] **Step 2:** Add metadata extraction for `pg_policy` entries and assemble idempotent SQL policy creation blocks.
- [x] **Step 3:** Emit post-data RLS SQL in restore-safe order (policies then table RLS state) after foreign keys.
- [x] **Step 4:** Extend export summary metadata with RLS policy/state counts.
- [x] **Step 5:** Update documentation in `docs/features/admin-export-schema-recreation-plan.md`.
- [x] **Step 6:** Prompt user to test local restore/build flow.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Admin export recreated schema/data but omitted RLS objects, so a fresh local restore could not fully mirror production access-control behaviour.
* **Summary of Changes:** Implemented RLS metadata export in admin full export route, including policy metadata (`pg_policy`) and per-table RLS state flags (`pg_class`). Added post-data SQL emission for idempotent policy creation and table RLS state replay, then added RLS counts to export summary metadata. Updated feature documentation with RLS restore coverage and two-pass guidance when `auth` dependencies are intentionally deferred.
* **Notes for User:** Build/tests were not run locally per project instruction. Please run your normal build and execute a fresh local restore from the generated admin export SQL.
