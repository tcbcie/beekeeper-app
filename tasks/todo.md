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
* **Summary of Changes:** Added guarded `auth.users` extraction in admin export and generated idempotent auth seed statements wrapped in a runtime check for `auth.users` availability; added summary diagnostics for auth export status.
* **Notes for User:** Build/tests were not run locally per project instruction. Please run an admin export and execute it against your Docker environment to validate one-pass restore.
