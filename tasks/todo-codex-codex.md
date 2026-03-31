# Task: Nuc Setup Mobile Card Optimisation
**Date:** 31/03/2026
**Status:** Completed

## 1. Objective
Improve the `Nuc Setup` mobile view so nuc cards remain readable on narrow screens, with the action controls no longer squeezing the core nuc details into a cramped column.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/MatingNucsTab.tsx`
  * `docs/features/mating-nucs.md`
  * `docs/features/nuc-setup-mobile-card-layout-plan.md`
* **Simplicity Check:** Keep the change inside the existing mobile card markup and classes. Reflow the header, action tray, and detail rows responsively without changing nuc data, actions, or inspection behaviour.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Refactor the mobile nuc card header in `src/components/batches/MatingNucsTab.tsx` so the expand control, identity block, and action buttons stack and wrap cleanly on small screens while preserving the current desktop layout.
- [x] **Step 2:** Rework the mobile detail metadata layout so key fields read as clear rows or grouped blocks instead of a compressed wrap-heavy inline list.
- [x] **Step 3:** Update documentation in `docs/features/mating-nucs.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The nuc cards used a single horizontal flex row for the expand control, content block, and action buttons. On mobile, the action tray consumed too much width, which forced the metadata into a cramped wrap-heavy column.
* **Summary of Changes:** Reflowed the nuc card layout so mobile actions move onto their own row, upgraded the metadata into clearer surfaced detail blocks, and updated the mating nuc documentation to describe the improved mobile presentation.
* **Notes for User:** No database work was required. Build tests were not run per repository instruction; please verify the `Nuc Setup` tab on a narrow mobile viewport and run your normal build check.
