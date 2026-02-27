# Task: Scale Card Hive Number Contrast Fix
**Date:** 27/02/2026
**Status:** Completed

## 1. Objective
Fix the unreadable hive number text on Scale Overview cards in dark mode by improving header text contrast without changing card behaviour or layout.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/research/HiveScaleCard.tsx`
  * `docs/features/scale-overview-hive-number-contrast-plan.md`
  * `docs/features/scale-overview.md`
  * `tasks/todo.md`
* **Simplicity Check:** The change is limited to header typography classes in one component and documentation updates, avoiding broad theming or structural refactors.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update hive number text styling in `src/components/research/HiveScaleCard.tsx` (normal and error card headers) to ensure strong contrast in dark mode.
- [x] **Step 2:** Adjust adjacent header metadata text colour if needed so the hierarchy remains readable after the contrast change.
- [x] **Step 3:** Update documentation in `docs/features/scale-overview.md`.
- [x] **Step 4:** Prompt user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The hive number label used a generic semantic text token in a tinted header background, which produced insufficient perceived contrast in dark mode.
* **Summary of Changes:** Updated `src/components/research/HiveScaleCard.tsx` to use explicit high-contrast header text colours for hive numbers in both normal and error card headers, and aligned scale-name metadata colours to preserve visual hierarchy.
* **Notes for User:** Build/tests were not run (per project instruction). Please run your normal build verification and confirm the dark-mode Scale Overview card readability.
