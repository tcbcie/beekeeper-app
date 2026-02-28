# Task: Auth Export Forbidden-Substring Edge Cases
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Fix remaining auth export failures caused by forbidden-keyword substring matching (`DELETE` in `deleted_at`) and prevent follow-on identity FK errors when user export is skipped.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/api/admin/export-all-data/route.ts`
  * `docs/features/local-auth-export-login-fix-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep the fix surgical by adjusting only auth query columns and error-guard logic in the existing export route.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Confirm failure from generated SQL comments (`auth.users export error`) and isolate forbidden keyword substring cause.
- [x] **Step 2:** Remove problematic auth query fields that trigger forbidden keyword matching while retaining login-critical export columns.
- [x] **Step 3:** Add identities-export guard so identities are not seeded when auth users export fails.
- [x] **Step 4:** Update documentation in `docs/features/local-auth-export-login-fix-plan.md`.
- [x] **Step 5:** Prompt user to regenerate export and retry reset/import flow.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** `execute_safe_query` performs broad substring matching for forbidden operations; `deleted_at` contains `DELETE`, so auth user export was rejected and auth identity inserts then violated FK constraints.
* **Summary of Changes:** Removed `deleted_at` from auth user export query and added a hard guard to skip identities export whenever auth users export fails, preventing FK breakage during restore.
* **Notes for User:** Build/tests were not run locally per project instruction. Please regenerate the export SQL and run your local reset/import again.

## Review
* Export now avoids the `DELETE` substring trap in auth user query text.
* Identities seeding is now blocked when users seeding fails, preventing FK cascade failures.
* Existing restore structure remains unchanged outside auth export guards.
