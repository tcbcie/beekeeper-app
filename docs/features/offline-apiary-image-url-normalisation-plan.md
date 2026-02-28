# Feature: Offline Apiary Image URL Normalisation
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
This change extends offline image URL normalisation to apiary pages so restored legacy image URLs do not break `next/image` when they reference an old Supabase project hostname.

## 2. Scope & Simplicity
* **In Scope:** Apply existing storage URL normalisation to apiary list, apiary detail, and apiary edit preview/image click paths.
* **Out of Scope:** Database rewrites, remote host wildcarding, and changes to non-apiary image flows.
* **Existing Code Impact:** Limited to apiary page components/hooks and feature documentation.

## 3. Technical Design
### Architecture
Apiary data may contain absolute image URLs from a previous Supabase project (`https://<old-ref>.supabase.co/storage/v1/object/public/...`).
Those URLs currently pass directly into `next/image` in apiary components, which triggers host validation and offline fetch failures.

The fix reuses `normaliseStoragePublicUrl` so apiary image URLs are rewritten to the current `NEXT_PUBLIC_SUPABASE_URL` origin before render or modal preview.

### Database Connections (MCP Server)
No schema or data migration is required. The fix is runtime-only URL adaptation in the app layer.

## 4. Edge Cases & Risks
* Null or malformed URLs must not crash render paths.
* Non-storage URLs should remain unchanged.
* Shared apiaries and owned apiaries must behave identically for image display.

## 5. Implementation Phases
1. Phase 1: Normalise apiary image URLs at data-fetch boundaries.
2. Phase 2: Normalise apiary image URLs in card/detail/form render and interaction paths.

## 6. Implementation Notes
* Reused `normaliseStoragePublicUrl` for apiary list fetch, apiary detail fetch, apiary card thumbnails, apiary detail header image, and image zoom click path.
* Normalised existing apiary image URL before edit-form preview initialisation, so legacy URLs no longer break `next/image` inside form previews.
* Kept scope limited to apiary flows only; no schema/data migration required.
