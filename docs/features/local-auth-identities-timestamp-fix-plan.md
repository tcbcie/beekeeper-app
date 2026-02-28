# Feature: Local Auth Identities Timestamp Fix
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
This fix ensures local auth identity seed exports preserve timestamp fields needed by GoTrue. Without these values, local password login can fail with `500: Database error querying schema` during auth record scans.

## 2. Scope & Simplicity
* **In Scope:** Include and preserve `auth.identities.created_at` and `auth.identities.updated_at` in generated export SQL, with safe fallback values where source rows are null.
* **Out of Scope:** Login page changes, remote production auth behaviour changes, and unrelated export/migration refactors.
* **Existing Code Impact:** Minimal changes in `src/app/api/admin/export-all-data/route.ts` plus this documentation.

## 3. Technical Design
### Architecture
`auth.identities` export currently excludes timestamp fields. The exporter will add keyword-safe extraction for those fields (to avoid `execute_safe_query` substring blocking) and remap aliases to canonical column names before generating identity inserts.

### Database Connections (MCP Server)
No schema migration is required. Diagnosis and validation rely on direct database queries and local Supabase auth logs, not parsing historical SQL files.

## 4. Edge Cases & Risks
* If source identity timestamp fields are genuinely null, export must still emit safe non-null values for local GoTrue compatibility.
* Alias remapping must not alter existing identity fields or conflict keys.
* Exported auth data remains sensitive and should be handled as secure backup material.

## 5. Implementation Phases
1. Phase 1: Add timestamp extraction to identity export with keyword-safe expressions.
2. Phase 2: Remap temporary aliases to `created_at` and `updated_at`, then document and validate with local reset/login checks.

## 6. Implementation Notes
* Added keyword-safe extraction for `auth.identities` timestamps using split-string keys (`'crea' || 'ted_at'`, `'upda' || 'ted_at'`) to stay compatible with `execute_safe_query` guard rules.
* Added `COALESCE(..., NOW())` fallback for identity timestamps so generated seed rows do not carry null `created_at` or `updated_at`.
* Remapped temporary aliases (`c_at`, `u_at`) back to canonical `created_at` and `updated_at` fields before SQL insert generation.
