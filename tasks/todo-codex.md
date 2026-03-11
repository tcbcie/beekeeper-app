# Task: Queen Rearing Planning Desktop Dark Layout Reset
**Date:** 11/03/2026
**Status:** Completed

## 1. Objective
Fix the remaining desktop dark-mode issues in the Queen Rearing `Planning` tab so the planner reads as one coherent dark-first interface rather than a pale outer shell with mismatched pastel cards.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenRearingPlanningTab.tsx`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-rearing-planning-desktop-dark-layout-reset-plan.md`
* **Simplicity Check:** Kept this limited to the planner presentation layer. The timeline calculations, date offsets, local state flow, and persistence behaviour were left unchanged.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Audit the current `Planning` top section for light-biased desktop surfaces, weak text contrast, and snapshot cards whose pastel fills do not belong in dark mode.
- [x] **Step 2:** Recompose the top planning band in `src/components/batches/QueenRearingPlanningTab.tsx` into a darker, more coherent desktop layout with consistent surfaced cards, restrained accent usage, and stronger content hierarchy.
- [x] **Step 3:** Update the relevant Queen Rearing documentation in `docs/features/` to note the desktop dark-layout reset for the planner.
- [x] **Step 4:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The planner still depended on fixed pastel fills and a stretching two-column desktop shell. That left the control panel over-tall and made the snapshot cards look disconnected from the rest of the dark theme.
* **Summary of Changes:** Rebuilt the planner's desktop shell around surfaced theme tokens, stopped the right-hand panel from stretching to the full left-column height, replaced pastel summary cards with restrained accent-rail cards, and aligned the lower timeline cards to the same visual language.
* **Notes for User:** No database MCP work was required. I did not run build tests, per repo instruction; please verify the planner in your normal browser/build check.

## Review
* **Root Cause:** The planner was not failing because of one missing dark class. The real issue was that the desktop composition mixed a light outer shell, fixed colour snapshot panels, and a stretched control card, so dark mode never felt coherent as a whole.
* **Changes Made:** Replaced the top planner band with a dark-first surfaced shell, introduced non-pastel summary cards with accent rails and compact date blocks, moved the control panel onto a matching surfaced card that no longer stretches unnaturally, and carried the same surfaced accent treatment into the lower queen and drone timeline cards.
* **Testing Needed:** Please open `/dashboard/batches`, switch to `Planning`, view it on desktop in dark mode, and confirm the top band and lower timeline cards now read as one coherent layout.
