# Task: Dashboard Attention Contrast Fix
**Date:** 01/03/2026
**Status:** Completed

## 1. Objective
Fix low-contrast text/badge rendering in the Dashboard Overview `Attention Needed` block shown in the latest screenshot.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/dashboard/page.tsx`
  * `docs/features/dashboard-attention-contrast-fix-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep this as a local presentational update to existing dashboard alert classes only, with no logic/data changes and no global theme refactor.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Replace the alert container styling with contrast-safe panel classes that stay readable in both light and dark themes.
- [x] **Step 2:** Replace `Attention Needed` chip/link classes with explicit high-contrast amber styles instead of current low-contrast utility combination.
- [x] **Step 3:** Update documentation in `docs/features/dashboard-attention-contrast-fix-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The `Attention Needed` panel used Tailwind `dark:` utility classes for amber background/text, while other app theming relies on class-based semantic styles. This led to unstable contrast in the shown dark-theme context.
* **Summary of Changes:** Updated the dashboard alert block to use `fj-panel-amber` and `fj-text-warning` for theme-aware contrast, and increased alert chip text weight for better readability.
* **Notes for User:** No database or schema changes were made. Build/tests were not run locally per project instruction; please run your normal build check and verify the Dashboard `Attention Needed` section contrast.

## Review
* Implemented a targeted contrast fix for the Dashboard Overview `Attention Needed` area.
* Kept scope minimal by changing styling classes only in `src/app/dashboard/page.tsx`.
* Updated feature documentation in `docs/features/dashboard-attention-contrast-fix-plan.md` and completed task tracking in this file.
