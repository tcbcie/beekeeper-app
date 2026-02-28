# Task: Records Stale Image Removal Fix
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Fix stale record image handling so users can genuinely remove broken image references and the records list degrades gracefully when a storage object no longer exists.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/records/forms/InspectionForm.tsx`
  * `src/components/records/forms/VarroaCheckForm.tsx`
  * `src/components/records/cards/InspectionCard.tsx`
  * `src/components/records/cards/VarroaCheckCard.tsx`
  * `docs/features/records-stale-image-removal-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep scope to image-state handling in existing records components only, with no schema changes, no broad refactors, and no new data flows.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update inspection and varroa check form image-remove behaviour so removing an existing image also clears `formData.image_url` before submit.
- [x] **Step 2:** Add a lightweight thumbnail fallback in records cards to avoid repeated noisy rendering failures when stale image URLs point to missing storage objects.
- [x] **Step 3:** Update documentation in `docs/features/records-stale-image-removal-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Records form image removal only cleared local preview/file state, but did not clear persisted `formData.image_url`, so stale URLs were re-saved and kept triggering failing image fetches.
* **Summary of Changes:** Added explicit remove handlers in inspection and varroa check forms to null `image_url` on removal; added thumbnail error fallback in inspection and varroa check cards with reset-on-URL-change behaviour.
* **Notes for User:** No database or schema changes were made. Build/tests were not run locally per instruction; please run your normal build check and validate the records flows in your environment.

## Review
* Implemented a form-state fix so removing an image now truly removes the stored URL on save.
* Added resilient UI fallback for missing inspection and varroa check thumbnails to keep cards usable when files are stale.
* Updated `docs/features/records-stale-image-removal-plan.md` to `Implemented` with concrete implementation notes.
