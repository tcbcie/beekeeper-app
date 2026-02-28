# Feature: Offline Storage URL Normalisation
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
This change makes image URLs resilient in offline/local development by rewriting legacy absolute Supabase storage URLs to the active Supabase origin. It prevents image fetch attempts to unreachable remote project domains after local data restores.

## 2. Scope & Simplicity
* **In Scope:** Environment-driven image host config and runtime URL normalisation for record images rendered via Next Image and zoom modal.
* **Out of Scope:** Database migrations, bulk data rewriting in stored tables, and redesign of image components outside the affected records flow.
* **Existing Code Impact:** Targeted updates in `next.config.ts`, records data/render modules, and one shared URL helper.

## 3. Technical Design
### Architecture
Legacy records can contain fully-qualified storage URLs from previous Supabase projects (for example `https://<old-ref>.supabase.co/storage/v1/object/public/...`).  
When running locally offline, these domains cannot resolve, causing `_next/image` fetch failures.

The solution has two parts:
1. Move image host allow-listing from a single hard-coded hostname to environment-derived patterns (plus local fallback).
2. Normalise storage URLs at runtime by preserving the storage path and swapping only the origin with `NEXT_PUBLIC_SUPABASE_URL`.

### Database Connections (MCP Server)
No schema changes are required. This is a runtime URL adaptation in the web app layer and does not rely on parsing `.sql` files.

## 4. Edge Cases & Risks
* Non-storage URLs must remain untouched.
* Invalid URLs must fail safely and return unchanged values.
* Local `NEXT_PUBLIC_SUPABASE_URL` must be present and valid, otherwise the helper should avoid destructive rewriting.

## 5. Implementation Phases
1. Phase 1: Add environment-aware image host configuration and shared storage URL normaliser.
2. Phase 2: Apply normaliser in records data/render paths and document offline validation steps.

## 6. Implementation Notes
* Replaced hard-coded image remote host configuration with environment-derived Supabase host handling and a local fallback for `http://127.0.0.1:54321`.
* Added `src/lib/storage-url.ts` with `normaliseStoragePublicUrl` to rewrite legacy absolute Supabase storage URLs to the active `NEXT_PUBLIC_SUPABASE_URL` origin while preserving storage path and query.
* Applied URL normalisation to records data fetch (`inspections`, `varroa_checks`), records image cards, records image zoom modal, and records image click flow.
