# Feature: Batch Edit Quantities Default Collapse
**Date:** 04/03/2026
**Status:** Implemented

## 1. Overview
When a user opens an existing rearing batch in the Batch Edit screen, the Batch Quantities section should start collapsed by default. This reduces visual noise on entry while keeping the section instantly accessible via the existing Show/Hide control.

## 2. Scope & Simplicity
* **In Scope:** Set the initial/open-on-edit UI state so Batch Quantities is collapsed when entering edit mode.
* **Out of Scope:** New persistence settings, database changes, redesign of the section layout, or changes to quantity calculations.
* **Existing Code Impact:** `src/app/dashboard/batches/page.tsx` only, using existing local React state.

## 3. Technical Design
### Architecture
The page already uses local state (`quantitiesOpen`) to conditionally render Batch Quantities content. The change will set this state to `false` when opening a batch for editing, so each edit session starts collapsed while manual toggling remains unchanged.

### Database Connections (MCP Server)
No database access, query changes, or schema updates are required for this UI-state adjustment.

## 4. Edge Cases & Risks
* Ensure the Show/Hide button still expands and collapses the panel correctly after the default-state change.
* Ensure opening one batch after another resets to collapsed at edit entry.
* Ensure this does not affect batch save behaviour or any quantity value calculations.

## 5. Implementation Phases
1. Phase 1: Update edit-open state handling for the Batch Quantities panel in `src/app/dashboard/batches/page.tsx`.
2. Phase 2: Verify interaction flow and update task/review documentation.

## 6. Implementation Notes
* The edit handler now sets `quantitiesOpen` to `false` before showing the form, so Batch Quantities is collapsed by default on Batch Edit open.
* The existing Show/Hide toggle remains unchanged and continues to control the section visibility during editing.
