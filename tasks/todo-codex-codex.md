# Task: Queen Ledger Expanded Detail Layout
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Compact the Queen Ledger expanded detail row and replace the current sparse equal-panel layout with a denser, clearer information layout.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-ledger-expanded-detail-layout-plan.md`
  * `docs/features/queen-tracker.md`
* **Simplicity Check:** This remained a focused layout refactor inside the expanded Queen Ledger row. The data, editing behaviour, and outcome controls stayed intact, while only the grouping and presentation of the existing content changed.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Replace the current four equal-width detail cards with a denser asymmetric layout that gives more room to the editable Outcomes area and less room to sparse read-only fields.
- [x] **Step 2:** Collapse repetitive single-field stacking into compact key-value grids so the expanded row uses materially less vertical space.
- [x] **Step 3:** Keep all current editable fields available, but group them into a clearer workflow-oriented layout rather than four parallel data buckets.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The expanded ledger row was still laid out as four equal cards even though the read-only context was sparse and the editable outcomes needed materially more room. That forced the view into unnecessary height and made the working area feel cramped.
* **Summary of Changes:** Rebuilt the expanded row into a denser two-panel layout, added a compact reference fact strip, folded read-only context into tighter grids, widened the outcomes workspace, and removed the old bottom chip strip.
* **Notes for User:** No MCP or schema change was needed. Build tests were not run per repository instruction.
