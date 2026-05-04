# Feature: Rearing Group Report Batch Scope Fix
**Date:** 04/05/2026
**Status:** Implemented

## 1. Overview
The rearing group report should aggregate only batches that are explicitly linked to the selected rearing group. This keeps private batches and batches assigned to other rearing groups out of the selected group's monthly report totals.

## 2. Scope & Simplicity
* **In Scope:** Add an explicit `rearing_group_id` filter to the report batch query and confirm downstream calculations use only that filtered batch set.
* **Out of Scope:** Changing normal batch visibility, changing invitation behaviour, changing RLS policies, or backfilling any existing batch records.
* **Existing Code Impact:** Minimal impact to the rearing group report hook only, plus this documentation and the task checklist.

## 3. Technical Design
### Architecture
The report already receives the selected group id and fetches group members before querying `rearing_batches`. The fix will keep that flow but require `rearing_batches.rearing_group_id` to match the selected group id before any report totals or derived graft counts are calculated.

### Database Connections (MCP Server)
The issue was confirmed with a direct Supabase MCP query against the live database. No schema change is planned. The implementation will continue using the Supabase client in the application, with the batch query scoped by `rearing_group_id`.

## 4. Edge Cases & Risks
* A member's private batches in the same month must not be counted in a group report.
* A member's batches linked to a different group must not be counted in the selected group report.
* Existing group batches with a null `rearing_group_id` will not appear in group reports until they are explicitly linked to the correct group.
* Queen cell distributions are now filtered by selected group batch ids so same-month distributions from private or other-group batches are excluded.

## 5. Implementation Phases
1. Phase 1: Scope rearing batch retrieval to the selected rearing group.
2. Phase 2: Confirm derived graft and distribution metrics remain aligned to the selected group.
3. Phase 3: Update task tracking and ask the user to test the build and report output.
