# Feature: Records Stale Image Removal Hardening
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
This change ensures stale record image references can be removed properly and that missing storage files do not produce brittle record-card behaviour. The goal is to let users clear invalid image URLs from records and keep record actions usable even when the original file has already been deleted from storage.

## 2. Scope & Simplicity
* **In Scope:** Fix image remove state handling in records forms; add graceful thumbnail fallback for missing inspection and varroa check images.
* **Out of Scope:** Storage bucket migrations, bulk data cleanup scripts, and redesign of records UI layout.
* **Existing Code Impact:** Limited to records form/card components and this feature documentation file.

## 3. Technical Design
### Architecture
Current records forms clear only local preview/file state when a user removes an existing image, but the persisted `image_url` can remain unchanged and is then re-saved.  
The fix will align remove behaviour with persisted form state by nulling `image_url` when users remove an image in edit mode.  

For stale URLs that still exist in records, cards will include a minimal render fallback once image loading fails, so the row remains clean and action buttons stay fully usable.

### Database Connections (MCP Server)
No database schema changes are required. Existing record update calls already run through the app's Supabase client paths. No `.sql` parsing will be used.

## 4. Edge Cases & Risks
* Removing a newly selected file and removing a pre-existing stored URL must both produce predictable outcomes.
* Thumbnail fallback must not hide valid images after successful loads.
* Form submit must preserve unchanged image URLs unless the user explicitly removes or replaces them.

## 5. Implementation Phases
1. Phase 1: Correct remove-image behaviour in inspection and varroa check forms so stale URLs can be cleared from persisted form data.
2. Phase 2: Add defensive thumbnail fallback in records cards and verify record actions remain unaffected under missing-image scenarios.

## 6. Implementation Notes
* Added explicit remove handlers in inspection and varroa check forms to clear both local preview state and persisted `formData.image_url`.
* Added `next/image` error fallbacks in inspection and varroa check cards so stale missing files collapse to an inline placeholder thumbnail instead of persistent broken renders.
* Kept scope constrained to records form/card image behaviour only; no schema or API contract changes.
