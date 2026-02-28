# Task: Offline Storage URL Normalisation
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Fix offline image loading failures by normalising legacy absolute Supabase storage URLs to the active local Supabase origin, and remove hard-coded storage host assumptions.

## 2. Impact Analysis
* **Files to Modify:**
  * `next.config.ts`
  * `src/lib/storage-url.ts` (new)
  * `src/hooks/useRecordsData.ts`
  * `src/app/dashboard/records/page.tsx`
  * `src/components/records/cards/InspectionCard.tsx`
  * `src/components/records/cards/VarroaCheckCard.tsx`
  * `src/components/ui/ImageZoomModal.tsx`
  * `docs/features/offline-storage-url-normalisation-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep this surgical by adding one shared URL normaliser and applying it only in the records image flow plus config host handling; avoid schema changes and broad UI refactors.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Replace hard-coded Supabase image remote pattern with environment-driven host handling (including local `127.0.0.1:54321` support).
- [x] **Step 2:** Add a shared helper to rewrite legacy `/storage/v1/object/public/...` URLs to `NEXT_PUBLIC_SUPABASE_URL` origin when needed.
- [x] **Step 3:** Apply URL normalisation in records fetch/render paths to eliminate `_next/image` requests to unreachable legacy domains.
- [x] **Step 4:** Update documentation in `docs/features/offline-storage-url-normalisation-plan.md`.
- [x] **Step 5:** Prompt user to test the build and verify record images load offline.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Offline records were still using absolute legacy Supabase storage URLs (`https://<old-ref>.supabase.co/storage/v1/object/public/...`) and `next.config.ts` only allowed a single hard-coded remote host. Local DNS resolution failed for old hostnames, causing `_next/image` 500 errors.
* **Summary of Changes:** Added environment-driven image host configuration plus a shared storage URL normaliser, then applied normalisation in records fetch/render paths and zoom flow so legacy URLs resolve through the active local Supabase origin.
* **Notes for User:** Build/tests were not run locally per project instruction. Please run your local build verification and confirm record images load while offline.

## Review
* Removed hard-coded dependency on one Supabase project hostname for image optimisation.
* Normalised legacy storage URLs at runtime without requiring data migrations.
* Kept the scope limited to records image paths and supporting configuration.
