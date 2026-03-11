# Feature: Queen Rearing Planning Snapshot Overlap Regression Fix
**Date:** 11/03/2026
**Status:** Implemented

## 1. Overview
Correct the responsive regression introduced in the planner snapshot refresh where the `From` and `Until` date blocks can overlap at intermediate desktop widths. The layout direction is correct overall, but one breakpoint now allows side-by-side date panels before there is enough width to support them.

## 2. Scope & Simplicity
* **In Scope:** Fix the responsive breakpoint and card layout behaviour of the planner snapshot date blocks so they never overlap.
* **Out of Scope:** Changing planner calculations, altering the tone system, redesigning the overall desktop shell, or revisiting unrelated planner sections.
* **Existing Code Impact:** Limited to `QueenRearingPlanningTab.tsx` and the supporting Queen Rearing documentation.

## 3. Technical Design
### Architecture
Keep the current planner shell and surfaced card language, but harden the responsive behaviour of the snapshot date blocks. The implementation should focus on:
- moving the side-by-side date layout to a wider breakpoint or otherwise gating it by available width
- preserving clear separation between `From` and `Until` without shrinking the date text into overlap
- keeping the snapshot cards visually consistent with the newly introduced desktop dark layout

This remains a presentation-only regression fix:
- reuse the current planner structure
- keep the current dark-mode direction
- adjust only the breakpoint and small supporting spacing rules needed to stop overlap

### Database Connections (MCP Server)
No database access or schema changes are required. This is a client-side layout regression fix only.

## 4. Edge Cases & Risks
* The regression fix must stop overlap at intermediate desktop widths without degrading the mobile layout.
* The date blocks should still use the side-by-side arrangement when there is genuinely enough horizontal room.
* The fix must not reintroduce the previous cramped desktop presentation.
* The planner logic and date content must remain untouched.

## 5. Implementation Phases
1. Phase 1: Audit the current snapshot breakpoint that reintroduced date overlap.
2. Phase 2: Adjust the responsive date-block layout so the cards stack or widen appropriately before overlap occurs.
3. Phase 3: Update the Queen Rearing documentation to reflect the regression fix.
