# Task: Global Button Style Conflict Fix
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Remove codebase-wide style conflicts where custom Tailwind button styles are overridden by default `Button` base/neutral classes.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/globals.css`
  * `docs/features/global-button-style-conflict-fix-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Apply one global CSS-specificity adjustment to existing `.fj-btn*` selectors so per-instance utility classes can reliably override defaults without refactoring dozens of component files.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Lower specificity of `.fj-btn` base/tone selectors in `globals.css` using `:where(...)` so custom utility classes win when explicitly provided.
- [x] **Step 2:** Verify candidate affected button patterns across the codebase are covered by the global fix (custom `bg-*`, `text-*`, `hover:*`, and compact icon-style classes).
- [x] **Step 3:** Update documentation in `docs/features/global-button-style-conflict-fix-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Shared `.fj-btn` selectors had equal specificity with Tailwind utility classes, so default neutral/base styles could override explicit per-instance button styling across multiple screens.
* **Summary of Changes:** Updated shared button selectors in `src/app/globals.css` to `:where(...)` for base, size, and tone variants (including hover rules), reducing specificity so explicit utility classes now win consistently without per-file refactors.
* **Notes for User:** No database changes were made. Build/tests were not run locally per project instruction. Please run your normal build check and spot-check key screens with custom-styled buttons.

## Review
* Applied a global CSS fix instead of patching dozens of files individually.
* Audited codebase usage and confirmed broad candidate coverage via selector-level specificity change.
* Documented the implementation in `docs/features/global-button-style-conflict-fix-plan.md`.
