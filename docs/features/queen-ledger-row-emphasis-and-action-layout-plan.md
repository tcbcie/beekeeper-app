# Feature: Queen Ledger Row Emphasis And Action Layout
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This pass tightens the operational scan path of the Queen Ledger. It strengthens row-level emphasis so the active row is obvious, moves the live outcome actions to the front of the table where they are easier to reach, trims the Status column so it does not waste horizontal space, replaces the current read-only badge with a calmer row-level cue, and restores explicit date entry for outcome dates.

## 2. Scope & Simplicity
* **In Scope:** Stronger selected-row styling, a distinct read-only row treatment, moving the overwintered and hybridised controls beside the Details control, compressing the Status column, and restoring explicit user-controlled date entry for the outcome dates.
* **Out of Scope:** Filter changes, visibility-rule changes, NIHBS changes, or a broader table redesign.
* **Existing Code Impact:** The work stays primarily within `src/components/batches/QueenTrackerTab.tsx`, with a small supporting change in `src/hooks/useQueenTracker.ts` so overwintered dates can be user-controlled in the new leading action cells.

## 3. Technical Design
### Architecture
The Queen Ledger remains a table-first client-rendered view. This pass changes the composition and emphasis of the summary row, moves the outcome controls to the leading edge, and restores direct date editing for those controls. The row treatment now carries more of the state signalling, which allows the Status column to become narrower and more focused.

### Database Connections (MCP Server)
No schema or migration change is required. The existing ledger data already includes the read-only state, overwintered and hybridised values, and the stored dates needed for the revised presentation and user-controlled date entry. The supporting update path now accepts an explicit overwintered date so the new leading action cells can persist the user-entered value instead of always stamping today.

## 4. Edge Cases & Risks
* Stronger row emphasis must remain readable when a row is both selected and expanded.
* Read-only styling must be distinct without making the row look disabled or broken.
* Moving the action controls left must still work on narrower widths without creating a cramped leading edge.
* Restored manual date entry must remain aligned with the guarded mutation flow so user-entered dates do not drift from persisted state.

## 5. Implementation Phases
1. Phase 1: Rework row emphasis, read-only treatment, and leading action-column layout.
2. Phase 2: Restore explicit outcome-date entry, tighten the Status column, and update the tracker note.
