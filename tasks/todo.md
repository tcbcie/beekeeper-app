# Task: Offline Apiary Image URL Normalisation
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Fix apiary page image failures by normalising legacy Supabase storage URLs in apiary list/detail/form flows before they reach `next/image`.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/dashboard/apiaries/page.tsx`
  * `src/components/apiaries/ApiaryCard.tsx`
  * `src/hooks/useApiaryDetail.ts`
  * `src/app/dashboard/apiaries/[id]/page.tsx`
  * `docs/features/offline-apiary-image-url-normalisation-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Reuse existing `src/lib/storage-url.ts` helper and patch only apiary-specific fetch/render points to keep impact minimal.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Normalise apiary image URLs when fetching apiary list and apiary detail data.
- [x] **Step 2:** Normalise apiary image URLs at render/click points in apiary cards and detail header image.
- [x] **Step 3:** Ensure edit-form preview path uses normalised existing image URL.
- [x] **Step 4:** Update documentation in `docs/features/offline-apiary-image-url-normalisation-plan.md`.
- [x] **Step 5:** Prompt user to test the build and confirm apiary images load offline.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Apiary list/detail/form components still passed legacy absolute Supabase storage URLs directly to `next/image`, triggering hostname validation failure (`next-image-unconfigured-host`) and offline fetch errors.
* **Summary of Changes:** Applied runtime storage URL normalisation across apiary data fetch/render/preview flows so old storage URLs are rewritten to the active Supabase origin before rendering.
* **Notes for User:** Build/tests were not run locally per project instruction. Please restart dev server and verify apiary images render in list/detail/form views while offline.

## Review
* Eliminated direct legacy-host usage in apiary `next/image` paths.
* Reused existing shared normaliser for consistency with records flow.
* Preserved current apiary feature behaviour with minimal code impact.
