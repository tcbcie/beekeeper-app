# Feature: Batch & Traceability Image URL Normalisation
**Date:** 09/03/2026
**Status:** Implemented

## 1. Overview
This change extends offline image URL normalisation to the Traceability Tool (honey provenance) and the public Honey Trace page so restored legacy image URLs do not break `next/image` when they reference an old Supabase project hostname.

## 2. Scope & Simplicity
* **In Scope:** Apply existing storage URL normalisation to apiary images displayed in the batch preview and public trace page.
* **Out of Scope:** Database rewrites, remote host wildcarding, and changes to non-traceability image flows.
* **Existing Code Impact:** Two files, one import and one-line wrap each.

## 3. Technical Design
### Architecture
The Traceability Tool fetches `image_url` from the apiaries table, and the public trace page receives `apiary_image_url` from the `get_public_batch_info` RPC. Both paths pass raw URLs directly into `next/image`, which fails when the stored URL references a previous Supabase project hostname.

The fix reuses `normaliseStoragePublicUrl` from `src/lib/storage-url.ts` to rewrite legacy URLs to the current `NEXT_PUBLIC_SUPABASE_URL` origin at data-fetch time, before the URL reaches any render path.

### Database Connections (MCP Server)
No schema or data migration is required. The fix is runtime-only URL adaptation in the app layer.

## 4. Edge Cases & Risks
* Null or malformed URLs are handled safely by `normaliseStoragePublicUrl` (returns null or unchanged string).
* Non-storage URLs remain untouched.
* The public trace page is a server component, so `NEXT_PUBLIC_SUPABASE_URL` is available at build/render time.

## 5. Implementation Notes
* `src/components/tools/TraceabilityTool.tsx`: imported `normaliseStoragePublicUrl` and wrapped the `apiaryImageUrl` assignment at fetch time.
* `src/app/(trace)/trace/[batchCode]/page.tsx`: imported `normaliseStoragePublicUrl` and normalised `apiary_image_url` after RPC response before render.
