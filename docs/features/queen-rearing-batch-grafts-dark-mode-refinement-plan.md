# Feature: Queen Rearing Batch Grafts Dark Mode Refinement
**Date:** 11/03/2026
**Status:** Implemented

## 1. Overview
Refine the dark-mode styling of the Queen Rearing batch-grafts area so the `Individual Cells/Grafts`, `Cell Frame`, and `Queen Tracking` sections feel properly integrated with the rest of the dashboard. The current issue is not functionality, but the fact that tables, status chips, and nested controls still look washed out or light-biased in dark theme.

## 2. Scope & Simplicity
* **In Scope:** Improve dark-mode surfaces, status colours, table/header contrast, row states, and control styling across `BatchGraftsSection`, `CellFrame`, `QueenTrackingSection`, and the shared graft colour tokens.
* **Out of Scope:** Changing graft workflow rules, adding new actions, redesigning the data structure, or altering database behaviour.
* **Existing Code Impact:** Limited to the batch-grafts UI shell, its supporting child components, shared graft display tokens, and the supporting Queen Rearing documentation.

## 3. Technical Design
### Architecture
Keep the current component structure and behaviour, but align the batch-grafts area with the application’s existing dark-theme surface system. This should focus on:
- table headers and rows whose dark-mode contrast is too weak
- status chips and badges that still rely on light-theme colour assumptions
- frame and bulk-action controls whose backgrounds or hover states disappear into the dark canvas
- shared graft status colour constants so the same status renders consistently across frame, table, and mobile views

This remains a presentation-only refinement:
- reuse the current components and data
- preserve the current workflow and interactions
- update only the classes and shared display tokens needed for consistent dark rendering

### Database Connections (MCP Server)
No database access or schema changes are required. This is a client-side theme refinement only.

## 4. Edge Cases & Risks
* The dark-mode fix must not degrade the existing light-mode presentation.
* Shared status colour tokens need to stay consistent across desktop table, mobile cards, and frame cups.
* Table selection, lock states, and disabled rows must remain visually distinct in both themes.
* The refinement should stay local to the batch-grafts UI rather than triggering a wider redesign of Queen Rearing.

## 5. Implementation Phases
1. Phase 1: Audit the batch-grafts components and shared status tokens for incomplete dark-theme styling.
2. Phase 2: Update the affected surfaces, chips, rows, and controls so the area remains legible and coherent in dark mode.
3. Phase 3: Update the Queen Rearing documentation to reflect the dark-mode refinement of the batch-grafts area.
