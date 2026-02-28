# Feature: Local Auth Export Login Fix
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
This change upgrades admin full export auth seeding so local restores can authenticate users with email and password, removing the current `Invalid login credentials` failure caused by ID-only auth seeding.

## 2. Scope & Simplicity
* **In Scope:** Export additional auth seed data required for password login (`auth.users` login fields and `auth.identities`) with idempotent, guarded restore SQL.
* **Out of Scope:** Changes to login UI logic, online production auth flows, or broad auth schema refactors.
* **Existing Code Impact:** Limited to `src/app/api/admin/export-all-data/route.ts` and supporting documentation.

## 3. Technical Design
### Architecture
The export route currently emits minimal `auth.users` ID-only inserts. The fix extends auth export to include login-capable auth user data and identity records, then emits restore-safe `INSERT ... ON CONFLICT ...` blocks guarded by `to_regclass` checks so restores remain non-fatal when auth objects are unavailable.

### Database Connections (MCP Server)
No application schema migration is required. Export logic will continue using direct runtime metadata/query access via existing service-role-backed RPC (`execute_safe_query`), rather than parsing `.sql` files.

## 4. Edge Cases & Risks
* Auth schema differences between source and target may cause insert mismatches if non-portable columns are exported.
* Exported auth data contains sensitive credential-related fields and must be handled as highly sensitive backup material.
* If auth export queries fail, the SQL output must degrade gracefully with clear notices instead of aborting full public data export.

## 5. Implementation Phases
1. Phase 1: Extend auth export query/model to retrieve login-capable auth user rows plus identities.
2. Phase 2: Emit guarded idempotent SQL for auth users/identities and update export summary + documentation.

## 6. Implementation Notes
* Replaced ID-only `auth.users` export with login-capable auth seed rows, including `encrypted_password` and metadata fields required by Supabase Auth.
* Added `auth.identities` export and restore blocks so identity records are recreated alongside users.
* Excluded generated auth columns from inserts (`auth.users.confirmed_at`, `auth.identities.email`) to avoid restore failures.
* Kept auth seed SQL idempotent and guarded with `to_regclass` checks to remain non-fatal when auth objects are unavailable.
* Follow-up fix: direct `supabaseAdmin.schema('auth')` reads were not portable in local environments where PostgREST only exposes `public` and `graphql_public`.
* Final fix: auth extraction now uses `execute_safe_query` again but excludes `created_at`/`updated_at` columns so the RPC keyword guard does not reject the query text.
* Auth user rows continue to be normalised for GoTrue-sensitive empty-string fields before SQL generation.
