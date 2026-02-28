# Task: Auth Export Cross-Environment Compatibility
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Fix admin export auth seeding across local environments where PostgREST blocks `auth` schema access and `execute_safe_query` blocks query text containing `create`/`update` substrings in column names.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/api/admin/export-all-data/route.ts`
  * `docs/features/local-auth-export-login-fix-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep the fix surgical by preserving existing export structure and changing only auth-row query shape/normalisation in one route.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Confirm root cause from generated SQL summary/comments and identify auth export path failure conditions.
- [x] **Step 2:** Reshape auth export queries to avoid forbidden keyword substrings while still returning login-capable auth fields.
- [x] **Step 3:** Preserve auth seed SQL emission and summary reporting while wiring to compatible auth query helpers.
- [x] **Step 4:** Update documentation in `docs/features/local-auth-export-login-fix-plan.md`.
- [x] **Step 5:** Prompt user to regenerate export and retry reset/import flow.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Two constraints collided: local PostgREST rejected `auth` schema reads (`public`/`graphql_public` only), and `execute_safe_query` rejected SQL containing `created_at`/`updated_at` due to broad forbidden-keyword matching.
* **Summary of Changes:** Updated auth export helpers to use `execute_safe_query` with a compatible auth column set (excluding `created_at`/`updated_at`), retained login-critical fields (`encrypted_password`, identity data), and kept empty-string field normalisation for GoTrue compatibility.
* **Notes for User:** Build/tests were not run locally per project instruction. Please regenerate the export SQL and run your local reset/import again.

## Review
* Export now avoids both schema-exposure and keyword-guard pitfalls in local setups.
* Auth row seeding is expected to run again, preventing downstream `auth.users` FK failures.
* Existing export/migration structure remains unchanged outside the auth query helper path.
