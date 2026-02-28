# Task: Local Login Credentials Failing After Restore
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Fix local login failures (`Invalid login credentials`) caused by incomplete auth export data, so restored local environments support password-based sign-in.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/api/admin/export-all-data/route.ts`
  * `docs/features/local-auth-export-login-fix-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep changes scoped to export generation logic only, preserving existing table export flow while extending auth export from ID-only seeding to login-capable auth user/identity seeding.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Extend export metadata/types to include login-capable auth seed rows (`auth.users` core fields and `auth.identities`) instead of ID-only auth rows.
- [x] **Step 2:** Generate idempotent auth seed SQL blocks that are restore-safe and guarded when `auth` schema objects are unavailable.
- [x] **Step 3:** Update export summary/comments to reflect auth users and identities export counts and any auth export errors.
- [x] **Step 4:** Update documentation in `docs/features/local-auth-export-login-fix-plan.md`.
- [x] **Step 5:** Prompt user to regenerate export, restore locally, and test login offline.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Admin full export seeded `auth.users` with ID-only rows. After restore, `auth/v1/token?grant_type=password` had no usable password credential data, causing `400 Invalid login credentials`.
* **Summary of Changes:** Extended auth export to include login-capable `auth.users` fields and `auth.identities` rows, switched auth seed SQL from ID-only inserts to full-row idempotent inserts, and updated export summary metadata to report both auth users and identities counts/errors.
* **Notes for User:** Build/tests were not run locally per project instruction. Regenerate the admin export SQL, restore into local Supabase, then test password login (for example `demo@hivecraic.com`).

## Review
* The export route now captures the data needed for local password authentication, not just foreign-key compatibility.
* Auth seed restoration remains restore-safe and idempotent, with guards for missing `auth.users`/`auth.identities`.
* Documentation was updated to reflect the implemented auth export behaviour and constraints.
