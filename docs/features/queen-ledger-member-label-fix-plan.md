# Feature: Queen Ledger Member Label Fix
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
The Queen Ledger `Member` filter can show duplicate `Unknown member` entries even when the underlying group members and batch owners have valid profile names. This fix restores the proper member labels so group owners can filter ledger rows by the real distributing member.

## 2. Scope & Simplicity
* **In Scope:** Fix batch owner name derivation in the Queen Ledger data mapping and keep the existing filter behaviour intact.
* **Out of Scope:** Changing group membership logic, altering filter structure, or changing ledger permissions and NIHBS behaviour.
* **Existing Code Impact:** The work stays within `src/hooks/useQueenTracker.ts` and the Queen Ledger feature note.

## 3. Technical Design
### Architecture
The Queen Ledger continues to build its filter options from the mapped ledger rows returned by `useQueenTracker`. This change corrects the owner-name mapping at source so the existing `Member` filter receives proper labels instead of falling back to `Unknown member`.

### Database Connections (MCP Server)
No schema change is required. The live database was checked through the MCP server to confirm that the relevant group members and batch owners already have valid profile names, so this is an application mapping issue rather than a missing-data issue.

## 4. Edge Cases & Risks
* Joined profile records may be returned in array or object form and should be normalised consistently.
* Owner labels should still fail safely when a profile is genuinely missing.
* The fix should not disturb the existing visibility or editability rules for ledger rows.

## 5. Implementation Phases
1. Phase 1: Correct the batch owner profile join handling in the Queen Ledger hook.
2. Phase 2: Update the feature note to reflect the corrected member-label behaviour.
