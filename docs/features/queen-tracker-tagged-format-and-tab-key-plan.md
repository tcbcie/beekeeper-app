# Feature: Queen Tracker Tagged Format And Tab Key
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change aligns the Queen Tracker wording and URL shape with the current product language. Tagged queens will display as `Queen Tagged (#xx)`, and the batches-page tab query value will move from `virgins` to `queens`.

## 2. Scope & Simplicity
* **In Scope:** Update the tagged badge format and rename the batches-page tab key to `queens`.
* **Out of Scope:** Renaming biological stage terms such as `virgin_queen`, changing database enums, or altering Queen Tracker data loading and lifecycle logic.
* **Existing Code Impact:** Keep the work limited to the Queen Tracker component, the batches-page tab state, and the related Queen Tracker documentation.

## 3. Technical Design
### Architecture
The Queen Tracker already receives `queen_number` for tagged queens, and the batches page already derives the active tab from the query string. This change only adjusts how the tracker formats tagged numbers and how the batches page resolves and writes the Queen Tracker tab key.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP work are required. The change is presentational and routing-related only.

## 4. Edge Cases & Risks
* Any old `?tab=virgins` links will no longer open the Queen Tracker tab after the rename.
* The tab query must consistently use `?tab=queens` everywhere after the change.
* Database enums and domain terms like `virgin_queen` must remain untouched where they describe lifecycle stage rather than the tab key.

## 5. Implementation Phases
1. Phase 1: Update tagged queen formatting in the tracker to use `Queen Tagged (#xx)`.
2. Phase 2: Rename the batches-page Queen Tracker tab key to `queens` and remove the old `virgins` query handling.

## 6. Implementation Notes
- Tagged queens now render as `Queen Tagged (#xx)` in the tracker badge row.
- The batches page now uses `?tab=queens` for the Queen Tracker tab.
- The old `virgins` tab key handling was removed, while true lifecycle terms such as `virgin_queen` remain unchanged.
