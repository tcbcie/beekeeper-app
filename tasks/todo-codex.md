# Task: Queen Ledger Row Emphasis And Action Layout
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Strengthen the Queen Ledger row emphasis and tighten the table layout by making the selected row materially clearer, reducing wasted space in the Status column, replacing the read-only badge with row-level visual treatment, moving the outcome actions beside the Details control, and restoring explicit user-controlled date entry for outcome dates.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `src/hooks/useQueenTracker.ts`
  * `docs/features/queen-tracker.md`
  * `docs/features/queen-ledger-row-emphasis-and-action-layout-plan.md`
  * `tasks/todo-codex.md`
  * `tasks/todo-codex-codex.md`
* **Simplicity Check:** This keeps the change inside the Queen Ledger presentation layer plus the existing outcome mutation path. The ledger filters, permissions, and NIHBS boundary remain unchanged.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Rework the row styling so selected rows and read-only rows are visually distinct at table scale without relying on the current subtle tint or the `Read only` badge.
- [x] **Step 2:** Move the `Overwintered` and `Hybridised` action controls to the left beside `Details`, then compress the `Status` column so it carries only the core lifecycle information in a tighter layout.
- [x] **Step 3:** Restore explicit user-controlled date entry for the outcome actions so overwintered and hybridised dates can be set by the user rather than only auto-stamped or hidden in secondary text.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The selected-row treatment was too subtle for a dense ledger, the Status column was carrying too many cues, read-only signalling depended on a badge instead of the row itself, and the table layout no longer exposed user-controlled outcome dates in the direct action path.
* **Summary of Changes:** Strengthened selected and read-only row treatment, moved overwintered and hybridised controls to the leading edge with inline date inputs, narrowed the Status column, and extended the overwintered mutation path so user-entered dates persist directly from the ledger row.
* **Notes for User:** No filter, visibility-rule, or NIHBS logic changed. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger row emphasis and action layout pass.
* **Summary of Changes:** The selected row now stands out materially more, read-only rows are signalled by row treatment rather than a badge, the outcome controls have moved to the leading edge with direct date entry, and the Status column is tighter.
* **Notes for User:** Please check the Queen Ledger in your normal build flow, especially selected-row visibility, read-only owner-view rows, the new left-hand outcome controls, and manual overwintered or hybridised date entry.
