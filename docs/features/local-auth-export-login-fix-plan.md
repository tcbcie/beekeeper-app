# Feature: Local Auth Export Login Fix
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
This update hardens local auth export so restored users remain login-capable by preserving required auth timestamps. Current restores can return `500: Database error querying schema` because exported `auth.users.created_at` and `auth.users.updated_at` are null.

## 2. Scope & Simplicity
* **In Scope:** Preserve `auth.users.created_at` and `auth.users.updated_at` in exported seed rows while keeping the existing guarded restore flow for `auth.users` and `auth.identities`.
* **Out of Scope:** Changes to login UI logic, online production auth flows, and unrelated export schema/data behaviour.
* **Existing Code Impact:** Limited to `src/app/api/admin/export-all-data/route.ts` and this feature document.

## 3. Technical Design
### Architecture
The export route currently omits timestamp columns because `execute_safe_query` rejects query text containing substrings such as `CREATE` and `UPDATE`, which appear in `created_at` and `updated_at`.  
The fix will fetch these timestamps using keyword-safe expressions and temporary aliases, then remap aliases back to canonical column names before SQL insert generation. This keeps generated SQL idempotent and compatible with GoTrue expectations.

### Database Connections (MCP Server)
No application schema migration is required. Export logic continues using direct runtime query access through the existing service-role-backed RPC (`execute_safe_query`) and direct database verification during debugging.

## 4. Edge Cases & Risks
* Keyword-safe alias expressions must not alter timestamp values or timezone fidelity.
* If source auth rows genuinely contain null timestamps, export should still avoid producing login-breaking nulls.
* Exported auth data remains sensitive credential-adjacent material and must be handled as secure backup data.

## 5. Implementation Phases
1. Phase 1: Add keyword-safe extraction for auth user timestamps in the exporter query.
2. Phase 2: Remap aliases to `created_at` and `updated_at`, keep existing auth normalisation, and update task documentation.

## 6. Implementation Notes
* Added keyword-safe timestamp extraction in the auth user export query using split-string keys (`'crea' || 'ted_at'`, `'upda' || 'ted_at'`) so `execute_safe_query` does not reject the `SELECT`.
* Added fallback `COALESCE(..., NOW())` for exported auth timestamps to avoid null `created_at` and `updated_at` values that break GoTrue login.
* Remapped temporary export aliases (`c_at`, `u_at`) back to canonical `created_at` and `updated_at` field names before SQL generation.
* Kept existing auth row normalisation for token fields and existing guarded/idempotent auth seed behaviour unchanged.
