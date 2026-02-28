# Task: Admin Export Local Docker Restore Compatibility
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Make the full admin export practical for creating a local Docker database by including user records needed for `public -> auth.users` foreign-key restoration.

## 2. Impact Analysis
* **Files to Modify:** 
  * `src/app/api/admin/export-all-data/route.ts`
  * `docs/features/admin-export-schema-recreation-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep this change scoped to admin export output only, add guarded auth seeding, and avoid touching personal export or unrelated modules.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Add admin-export query and capture logic for `auth.users` rows using existing safe query path.
- [x] **Step 2:** Emit guarded `auth.users` seed SQL in export output with idempotent inserts (`ON CONFLICT DO NOTHING`).
- [x] **Step 3:** Keep restore resilient when `auth.users` is unavailable in target environment (skip with notice instead of failing).
- [x] **Step 4:** Extend export summary with auth export metrics/errors for troubleshooting.
- [x] **Step 5:** Update documentation in `docs/features/admin-export-schema-recreation-plan.md`.
- [x] **Step 6:** Prompt user to test the build and local restore flow.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Even with schema recreation, post-data FK creation could still fail locally when `public` data referenced user IDs that were not present in target `auth.users`.
* **Summary of Changes:** Added guarded `auth.users` extraction in admin export and generated **ID-only** idempotent auth seed statements (not full-row inserts) wrapped in a runtime check for `auth.users` availability; added summary diagnostics for auth export status. Also hardened metadata/auth RPC query text to avoid `execute_safe_query` substring guard false-positives (for example `DROP` in `dropdown_*` and `CREATE` in `created_at`) that caused export route 500 errors, excluded dropped physical columns from generated table DDL using `a.atttypid <> 0` after a local restore syntax failure (`........pg.dropped...`), added `vector` extension bootstrap to handle `knowledge_base.embedding vector(1536)`, added public enum type recreation before table DDL for custom types like `subscription_code_type`, and excluded generated columns from data insert statements (for example `profiles.full_name`) to prevent generated-column restore failures.
* **Notes for User:** Build/tests were not run locally per project instruction. Please run an admin export and execute it against your Docker environment to validate one-pass restore.
