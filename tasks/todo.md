# Task: Dark Mode Consistency Fixes
**Date:** 27/02/2026
**Status:** Completed

## 1. Objective
Implement the approved dark mode fixes by stabilising global theme tokens and hydration behaviour, then correcting light-only status and badge styling on key dashboard pages.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/globals.css`
  * `src/app/layout.tsx`
  * `src/app/providers/theme-provider.tsx`
  * `src/app/dashboard/page.tsx`
  * `src/app/dashboard/support/page.tsx`
  * `src/app/dashboard/settings/page.tsx`
  * `src/app/dashboard/settings/subscription-history/page.tsx`
  * `src/app/dashboard/hives/[id]/page.tsx`
  * `src/app/dashboard/queens/[id]/page.tsx`
  * `src/app/dashboard/apiary-team/page.tsx`
  * `src/app/dashboard/rearing-team/page.tsx`
  * `src/app/reset-password/page.tsx`
  * `docs/features/dark-mode-consistency-fixes-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** This approach targets only the audited problem areas and reuses existing semantic token patterns to avoid broad refactors.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Add missing semantic colour tokens and `color-scheme` handling in `src/app/globals.css`.
- [x] **Step 2:** Improve theme bootstrap and hydration behaviour in `src/app/layout.tsx` and `src/app/providers/theme-provider.tsx`.
- [x] **Step 3:** Fix light-only status/badge colour classes on the audited dashboard pages.
- [x] **Step 4:** Update documentation in `docs/features/dark-mode-consistency-fixes-plan.md`.
- [x] **Step 5:** Prompt user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):**
  1. Semantic token drift: widely used classes (`bg-surface-secondary`, `bg-muted`, `text-text-muted`, `text-muted-foreground`) were not fully mapped in global theme tokens.
  2. Theme hydration gap: the app could render light first and switch after mount, causing a visible mismatch and inconsistent browser theme colour.
  3. Light-only status classes: selected high-traffic pages still used light-only badges/alerts without dark variants.
* **Summary of Changes:**
  1. Added missing semantic tokens and colour aliases in `src/app/globals.css`, including `color-scheme` handling for `.light` and `.dark`.
  2. Added pre-hydration theme bootstrap in `src/app/layout.tsx` and improved `ThemeProvider` synchronisation in `src/app/providers/theme-provider.tsx` (including theme-colour meta updates and cross-tab sync).
  3. Patched audited dashboard and auth pages with missing `dark:` variants for status badges, alert blocks, and marking-colour chips.
  4. Created and expanded implementation documentation at `docs/features/dark-mode-consistency-fixes-plan.md`, including file list and manual verification checklist.
* **Notes for User:**
  1. Build/tests were not run, per project instruction.
  2. Please run your normal build verification and dark-mode smoke test across the touched pages.
