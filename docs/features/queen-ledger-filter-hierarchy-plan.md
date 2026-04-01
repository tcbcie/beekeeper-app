# Feature: Queen Ledger Filter Hierarchy
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
The Queen Ledger needs a proper drill-down filter flow so users can narrow records by group, then by member, then by batch. The same ledger must also include non-group batches, but those records must remain outside the NIHBS reporting path.

## 2. Scope & Simplicity
* **In Scope:** Expand the ledger data source to include non-group batches owned by the current user; add dynamic Group -> Member -> Batch filters; make the available filter options depend on whether the current user owns the selected group or is only a member; keep ledger tracking behaviour consistent across group and non-group rows.
* **Out of Scope:** Database migrations, NIHBS report redesign, new permissions, or changes to true lifecycle terms such as `virgin_queen`.
* **Existing Code Impact:** The work should stay limited to the Queen Ledger hook, the Queen Ledger tab, and the Queen Tracker feature note.

## 3. Technical Design
### Architecture
The ledger hook will return a broader, still permission-safe row set. Group-linked rows will continue to respect the current owner/member visibility rules, while non-group rows will be limited to the current user's own batches. The tab will derive its filter options from the visible rows so the hierarchy stays dynamic without introducing extra synchronisation problems.

The filter flow will work like this:
1. Group filter chooses either a specific group, all visible groups, or a non-group scope.
2. Member filter is derived from the rows inside the selected scope.
3. Batch filter is derived from the rows that remain after the group and member filters.

For group owners, the member filter can expose all visible contributing members inside the selected group. For ordinary members, it should only expose the rows they can already see, which in practice keeps the filter aligned with their own batches.

### Database Connections (MCP Server)
The live schema audit confirms that `rearing_batches.rearing_group_id` is nullable and that non-group batches already exist. The ledger query therefore needs to stop assuming every visible row belongs to a group.

The current NIHBS report path already restricts batches with `rearing_group_id = groupId`, which excludes non-group batches from report totals. The implementation should preserve that boundary and avoid any shared filtering logic that could weaken it.

## 4. Edge Cases & Risks
* Group owners can see member rows that ordinary members cannot edit, so filter options must not imply broader write access.
* A selected member or batch can become invalid when the user changes the group scope, so downstream filters must reset defensively.
* Non-group rows do not have a group or member context beyond the batch owner, so the UI must label that scope clearly rather than forcing them into a fake group.
* Empty option sets must degrade cleanly to "all" rather than trapping the ledger in a no-results state.

## 5. Implementation Phases
1. Phase 1: Broaden and annotate the ledger row set so it can represent both group-linked and non-group batches safely.
2. Phase 2: Add derived filter helpers and a cascading filter state model for group, member, and batch.
3. Phase 3: Update the Queen Ledger UI and documentation while preserving the existing NIHBS report boundary.
