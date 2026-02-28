# Task: Export Restore Dependency Coverage
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Fix restore failures caused by missing schema dependencies in export output, including auth query keyword-guard edge cases and missing function definitions required by RLS policies.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/api/admin/export-all-data/route.ts`
  * `docs/features/local-auth-export-login-fix-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep the fix surgical by extending the existing export route only, without changing app runtime auth or policy logic.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Confirm restore failures from generated SQL logs and isolate root causes (auth export rejection and missing policy helper functions).
- [x] **Step 2:** Harden auth export query/guard behaviour to avoid forbidden substring traps and identity FK cascades.
- [x] **Step 3:** Export `public` function definitions so policy dependencies exist before RLS policy creation.
- [x] **Step 4:** Update documentation in `docs/features/local-auth-export-login-fix-plan.md`.
- [x] **Step 5:** Prompt user to regenerate export and retry reset/import flow.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Restore failed for two export gaps: auth queries were blocked by safe-query forbidden substring matching, and RLS policies referenced helper functions (for example `can_access_apiary`) that were not exported/recreated.
* **Summary of Changes:** Removed problematic auth query columns, added identities fallback guard when users export fails, and added export of all `public` function definitions before RLS policy creation.
* **Notes for User:** Build/tests were not run locally per project instruction. Please regenerate the export SQL and run your local reset/import again.

## Review
* Export now avoids auth query substring-guard traps and prevents identities FK cascades.
* Function dependencies are recreated before policy blocks, avoiding undefined-function policy failures.
* Existing restore structure remains unchanged outside export dependency coverage.
