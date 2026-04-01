# Feature: Queen Ledger Outcome Date Capture Flow
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change tightens the Queen Ledger action experience so date-bearing outcomes are not applied until the user explicitly confirms the relevant date. The table stays compact, but the action itself now requires date capture instead of silently defaulting and relying on a later detail edit.

## 2. Scope & Simplicity
* **In Scope:** A more deliberate action flow for date-bearing ledger outcomes, keeping the dates editable in the expanded details while removing the current blind-toggle pattern.
* **Out of Scope:** Schema changes, hook-level data-model changes, or a redesign of the wider Queen Ledger table structure.
* **Existing Code Impact:** Limited to the Queen Ledger table component and the tracker note.

## 3. Technical Design
### Architecture
The row action now opens a compact inline capture step at the point of action, requires the date, and only then commits the outcome write. The main table remains date-free, while the expanded details continue to show and allow later edits to the stored dates.

### Database Connections (MCP Server)
No schema or MCP database change is needed. The implementation will continue to use the existing outcome update paths already wired into the tracker hook.

## 4. Edge Cases & Risks
* The action flow must stay compact enough not to blow out the table width.
* The user must still be able to clear an already-recorded outcome without being forced through an unnecessary date prompt.
* The same interaction model should be applied consistently across the affected outcomes so the ledger does not feel mixed or unpredictable.

## 5. Implementation Phases
1. Phase 1: Replace the immediate-toggle pattern with an inline date-capture action flow.
2. Phase 2: Keep expanded detail editing intact and update the tracker note.
