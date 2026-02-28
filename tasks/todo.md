# Task: Local Auth Identities Timestamp Integrity
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Fix local password login `500` failures after restore by ensuring exported `auth.identities` rows include non-null `created_at` and `updated_at` values required by GoTrue scans.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/api/admin/export-all-data/route.ts`
  * `docs/features/local-auth-identities-timestamp-fix-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep this surgical by extending existing auth identity export mapping only; no login UI changes, no schema migrations, no broad refactor.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Extend auth identity export selection to fetch `created_at` and `updated_at` through keyword-safe expressions compatible with `execute_safe_query`.
- [x] **Step 2:** Remap temporary identity timestamp aliases back to canonical columns before SQL generation, preserving existing identity export behaviour.
- [x] **Step 3:** Update documentation in `docs/features/local-auth-identities-timestamp-fix-plan.md`.
- [x] **Step 4:** Prompt user to regenerate export, reset local DB, and test login/build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** GoTrue login still failed with `500: Database error querying schema` because imported `auth.identities.created_at` and `auth.identities.updated_at` were null. GoTrue scans identity timestamps and fails on nil values.
* **Summary of Changes:** Extended identity export to include keyword-safe timestamp extraction, added fallback timestamp values, and remapped identity timestamp aliases to canonical columns before SQL generation.
* **Notes for User:** Build/tests were not run locally per project instruction. Please regenerate export SQL, reset/import local database, and retest login/build.

## Review
* Fixed identity timestamp coverage in auth seed export while remaining compatible with `execute_safe_query` keyword restrictions.
* Added resilient timestamp fallbacks to avoid nil timestamp scan failures in local GoTrue.
* Updated feature documentation for future restore troubleshooting.
