# Task: Local Auth Export Timestamp Integrity
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Fix local password login failures after restore by ensuring exported `auth.users` rows retain non-null `created_at` and `updated_at` values required by GoTrue.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/api/admin/export-all-data/route.ts`
  * `docs/features/local-auth-export-login-fix-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep the change surgical by only adjusting auth export field extraction and row normalisation; no login UI changes, no broad database refactors.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update auth user export selection to include timestamp fields through keyword-safe SQL expressions so `execute_safe_query` does not reject the query.
- [x] **Step 2:** Map aliased timestamp fields back to canonical `created_at` and `updated_at` columns before SQL generation, preserving existing auth normalisation behaviour.
- [x] **Step 3:** Update documentation in `docs/features/local-auth-export-login-fix-plan.md`.
- [x] **Step 4:** Prompt user to regenerate export, reset local DB, and test login/build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** GoTrue failed local password login with `500: Database error querying schema` because imported `auth.users.created_at`/`updated_at` were null. They were omitted from export due substring-based keyword filtering in `execute_safe_query` (`CREATE`/`UPDATE` matching inside column names).
* **Summary of Changes:** Updated auth export to fetch timestamps via keyword-safe expressions, remapped aliases to canonical `created_at`/`updated_at`, and kept existing auth normalisation/idempotent seed generation intact.
* **Notes for User:** Build/tests were not run locally per project instruction. Regenerate export SQL, run local reset/import, then test login and confirm build behaviour.

## Review
* Fixed exporter timestamp coverage for `auth.users` while remaining compatible with `execute_safe_query` guards.
* Prevented login-breaking null timestamps by providing safe `NOW()` fallback when source values are absent.
* Updated feature documentation to reflect the implemented timestamp-integrity fix.
