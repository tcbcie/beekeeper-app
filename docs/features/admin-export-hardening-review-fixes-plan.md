# Feature: Admin Export Hardening Review Fixes
**Date:** 04/03/2026
**Status:** Implemented

## 1. Overview
Apply production-grade hardening to the admin export path and settings export trigger by enforcing strict mode payload validation, reducing sensitive over-fetching, handling large datasets safely, and improving network failure behaviour in the UI.

## 2. Scope & Simplicity
* **In Scope:** Admin export mode parsing, auth row fetch scoping, paged table export retrieval, and frontend timeout/error handling.
* **Out of Scope:** Changing export business semantics, removing storage bucket/policy export, and adding schema migrations.
* **Existing Code Impact:** `src/app/api/admin/export-all-data/route.ts` and `src/components/settings/ProfileExport.tsx`.

## 3. Technical Design
### Architecture
1. Replace permissive request-body parsing with strict mode parsing that preserves legacy empty-body behaviour but rejects malformed non-empty payloads.
2. Query auth seeds by selected export mode at source-query level (avoid all-user over-fetch then in-memory filter).
3. Export public table rows in pages to avoid silent truncation and excessive memory pressure from single-shot table reads.
4. Add frontend request timeout and robust non-JSON error handling.

### Database Connections (MCP Server)
No schema migration required. Existing service-role and safe query runtime access remain unchanged.

## 4. Edge Cases & Risks
* Empty request body must continue to default to `complete` for backward compatibility.
* Non-empty malformed JSON must not silently downgrade to full export.
* Paged reads must avoid missing pages and must preserve SQL output correctness.
* Timeout handling should surface actionable user-facing errors without leaving stuck loading state.

## 5. Implementation Phases
1. Phase 1: Harden mode parsing + auth query scoping.
2. Phase 2: Introduce paged table data export retrieval and maintain output summary semantics.
3. Phase 3: Harden UI request/error path and document final behaviour.

## 6. Implementation Notes
* Replaced permissive mode parsing with strict request-body parsing:
  * Empty body still defaults to `complete` for backward compatibility.
  * Non-empty malformed body now returns `400` instead of silently falling back to full export.
* Removed all-user auth over-fetch in `schema_admin_only` mode:
  * `fetchAuthUserSeedRows` and `fetchAuthIdentitySeedRows` now accept optional user scoping.
  * Auth seed rows are filtered at query source, not post-fetch in memory.
* Hardened table data export retrieval:
  * Added paged reads (`range`) to avoid single-shot table fetch behaviour.
  * Added deterministic `id` ordering when available.
  * Added per-table SQL chunk buffering to prevent partially written table SQL on page-read errors.
* Hardened frontend admin export request handling:
  * Added timeout via `AbortController`.
  * Added strict duplicate-submit guard.
  * Added robust error message handling for both JSON and non-JSON responses.
* Storage export behaviour remains included for admin exports (`storage.buckets` + storage policies), including `schema_admin_only`.
