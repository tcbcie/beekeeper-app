# Task: Queen Ledger Expanded Detail Layout
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Compact the Queen Ledger expanded detail row and replace the current sparse equal-panel layout with a denser, clearer information layout.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-ledger-expanded-detail-layout-plan.md`
  * `docs/features/queen-tracker.md`
* **Simplicity Check:** This stayed as a focused presentation refactor inside the expanded Queen Ledger row. The data source, actions, and outcome behaviour were preserved while only the layout and grouping of existing information changed.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Replace the current four equal-width detail cards with a denser asymmetric layout that gives more room to the editable Outcomes area and less room to sparse read-only fields.
- [x] **Step 2:** Collapse repetitive single-field stacking into compact key-value grids so the expanded row uses materially less vertical space.
- [x] **Step 3:** Keep all current editable fields available, but group them into a clearer workflow-oriented layout rather than four parallel data buckets.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The detail drawer still treated all information as equal-density content, so sparse reference data consumed the same visual weight as the editable outcomes workspace and forced the expanded row into unnecessary height.
* **Summary of Changes:** Replaced the four-card detail layout with a denser `Reference Context` plus `Outcomes` structure, added compact summary facts, tightened the reference fields into grids, and removed the older bottom chip strip.
* **Notes for User:** No schema or MCP change was needed. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger expanded detail layout refinement.
* **Summary of Changes:** The expanded row now uses a denser asymmetric structure with compact reference facts on the left and a wider outcomes workspace on the right, which materially reduces wasted height and keeps the editable outcome fields together.
* **Notes for User:** Please check the expanded Queen Ledger rows in your normal build flow, especially laptop widths and rows with longer notes or contact details.
