# Task: Queen Lineage Investigation
**Date:** 31/03/2026
**Status:** Completed

## 1. Objective
Correct the queen lineage displays so the tree and detail views show the stored parentage accurately. Live database checks showed the screenshot is not caused by a stored `1B`/`36-DA` cycle, so the fix needs to address the lineage fetch path and keep defensive guards for future bad lineage data.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/QueenLineageTree.tsx`
  * `src/hooks/useQueenDetail.ts`
  * `src/app/dashboard/queens/page.tsx`
  * `src/app/dashboard/queens/lineage/page.tsx`
  * `docs/features/queen-lineage.md`
* **Simplicity Check:** Keep the change inside the existing queen UI and hooks. Replace the ambiguous self-referencing embeds with explicit parent lookups, then add light validation and cycle guards without changing the broader queen data model.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Replace ambiguous self-referencing parent fetches in the queen detail hook and per-queen lineage tree with explicit ID-based lookups so parent cards match the stored `mother_id` and `father_id` values.
- [x] **Step 2:** Add surgical validation to queen create/edit flows so a queen cannot be assigned a mother or father that would create a cyclical lineage loop, and hide invalid parent choices in the form.
- [x] **Step 3:** Harden the lineage overview page and per-queen tree so repeated lineage links are handled safely and do not disappear or render misleading duplicate ancestry.
- [x] **Step 4:** Update documentation in `docs/features/queen-lineage.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Live MCP queries showed the stored rows were sane for the investigated queens. The incorrect lineage display is most likely caused by the client-side self-referencing embeds resolving the wrong relationship direction for parent data, with no extra protection against repeated lineage links.
* **Summary of Changes:** Replaced the parent self-join embeds in the queen detail hook and per-queen lineage tree with explicit `queens.id` lookups, added form-side lineage cycle prevention, hardened both lineage views against repeated links, and updated the feature note to match the new behaviour.
* **Notes for User:** The live database was checked through the Supabase MCP during investigation, rather than inferring lineage solely from local code. Build tests were not run per repository instruction; please test the build.

## Review
* **Scope Covered:** Queen lineage detail and overview rendering, queen form lineage validation, and lineage documentation.
* **Summary of Changes:** The lineage detail and detail-page parent summary now resolve parents directly from stored IDs, parent dropdowns now hide any descendant that would create a loop, and both lineage views now warn and degrade safely when repeated lineage links are encountered.
* **Notes for User:** Please test the queen detail page, the queens edit form, and the lineage overview page, then run your normal build check.
