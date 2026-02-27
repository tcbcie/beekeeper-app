# Feature: Mating Nuc Status Default and Apiary-Backed Location Input
**Date:** 27/02/2026
**Status:** Implemented

## 1. Overview
This feature sets the default status for new mating nuc entries to `Cell Introduced` and improves `Mating Location` by offering a dropdown of apiaries available to the user (owned and shared), while still allowing optional manual text input. This reduces repetitive entry and improves consistency without removing flexibility.

## 2. Scope & Simplicity
* **In Scope:**
  * Default single-create mating nuc status to `cell_introduced`.
  * Load user-accessible apiaries (owned + shared via teams) for location suggestions.
  * Replace the single-create `Mating Location` text input with an optional dropdown + manual entry pattern.
  * Keep bulk mating nuc form unchanged for this task.
* **Out of Scope:**
  * Database schema changes.
  * New apiary management UI.
  * Changes to edit/history/list display logic beyond keeping existing values compatible.
* **Existing Code Impact:**
  * `src/components/batches/MatingNucsTab.tsx` (single form state, data fetch, UI input control)
  * `tasks/todo.md`

## 3. Technical Design
### Architecture
The change remains local to `MatingNucsTab`:
1. Set single-form default `status` to `cell_introduced` in initial and reset state.
2. Introduce local apiary options state and fetch logic.
3. Reuse the existing shared-apiary access pattern (team memberships + team_apiaries + owned apiaries) to build a deduplicated option list.
4. Render an optional `Mating Location` control that supports both selecting a known apiary and typing a custom value.

### Database Connections (MCP Server)
No schema changes are required. Supabase queries used in the component:
1. `team_members` by `user_id` to determine teams.
2. `team_apiaries` by `team_id` to gather shared apiary IDs.
3. `apiaries` filtered by owned or shared IDs to populate dropdown options.

## 4. Edge Cases & Risks
* User has no apiaries: dropdown should still allow manual entry.
* Shared apiary records may duplicate owned entries: options must be deduplicated.
* Existing `mating_location` free-text values must continue to display/edit correctly.
* Query failure should fail gracefully with toast feedback and preserve manual entry path.

## 5. Implementation Phases
1. Phase 1: Update single-form defaults (`status`) and reset behaviour.
2. Phase 2: Add apiary option retrieval (owned + shared) and local state.
3. Phase 3: Replace location input with optional selectable suggestions plus manual input fallback.
4. Phase 4: Update task documentation and prompt user to test build.

Implementation completed in `src/components/batches/MatingNucsTab.tsx` with no database schema changes.
