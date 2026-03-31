# Feature: Queen Rearing and Lineage Hardening
**Date:** 31/03/2026
**Status:** Implemented

## 1. Overview
Harden the Queen Rearing tab shell and the recently updated lineage views so navigation state, fetched lineage data, and derived queen detail state remain accurate during refreshes, deep links, and rapid record changes.

## 2. Scope & Simplicity
* **In Scope:** Centralise Queen Rearing tab metadata, keep tab clicks and the `?tab=` query parameter aligned, guard lineage fetches against stale async updates, reset derived hive and sighting state safely, and align the affected feature documentation.
* **Out of Scope:** Database migrations, server-side lineage constraint work, UI redesigns, or behavioural changes inside the individual Queen Rearing tab components.
* **Existing Code Impact:** `src/app/dashboard/batches/page.tsx`, `src/components/QueenLineageTree.tsx`, `src/hooks/useQueenDetail.ts`, and the related feature notes in `docs/features/`.

## 3. Technical Design
### Architecture
The Queen Rearing page will move to a single static tab configuration that defines each tab id, label, and render target once. Navigation buttons and valid-tab checks will read from that shared definition, and a dedicated tab setter will update both local state and the router query string without a full page reload.

The lineage tree and queen detail hook will use request-scoped guards so older async responses cannot overwrite the latest selected queen. Derived state that depends on the current queen assignment, such as hive and sightings, will be cleared before applying new results so an unassigned queen never inherits stale UI state from the previous record.

### Database Connections (MCP Server)
Direct MCP inspection of `public.queens` confirms `mother_id` and `father_id` are plain self-referencing foreign keys with no database-level cycle constraint. Live data review also showed no direct self-parent rows and no two-node mother cycles at the time of planning. No schema changes are planned for this hardening pass.

## 4. Edge Cases & Risks
* Invalid or missing `?tab=` values must fall back safely to `grafting`.
* Browser back and forward navigation must not reopen a different tab from the one shown in the UI.
* Rapid queen changes must not allow an older lineage request to replace newer data.
* Queens without an assigned hive must clear stale hive and sighting cards instead of displaying the previous queen's assignment.
* Documentation must stay aligned with the current tab names so operators can follow the live workflow accurately.

## 5. Implementation Phases
1. Phase 1: Refactor the Queen Rearing tab shell to use a single configuration and durable URL synchronisation.
2. Phase 2: Harden lineage fetch lifecycles and reset derived queen detail state defensively.
3. Phase 3: Update the affected feature documentation and task notes to match the shipped behaviour.
