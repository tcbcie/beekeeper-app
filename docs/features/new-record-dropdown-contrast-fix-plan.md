# Feature: New Record Dropdown Contrast Fix
**Date:** 01/03/2026
**Status:** Implemented

## 1. Overview
Improve readability of the Records page `New Record` dropdown options by enforcing stable, high-contrast text and interaction states across light and dark themes.

## 2. Scope & Simplicity
* **In Scope:** Update dropdown option button styling in `NewRecordDropdown` so default, hover, focus, and active states remain legible.
* **Out of Scope:** Any record-creation flow changes, dropdown behaviour changes, or global button-system refactor.
* **Existing Code Impact:** `src/components/records/NewRecordDropdown.tsx`.

## 3. Technical Design
### Architecture
This is a contained presentation update to existing dropdown buttons. The fix ensures each row uses deliberate state classes and avoids inherited button styles that can conflict with custom dropdown row styling.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP database interactions are needed for this UI fix.

## 4. Edge Cases & Risks
* Hover and active states must stay readable on desktop and touch devices.
* Focus-visible styling must remain clear for keyboard users.
* Changes should preserve the current dropdown layout and click behaviour.

## 5. Implementation Phases
1. Phase 1: Remove conflicting inherited button styling from dropdown rows and define explicit row state styling.
2. Phase 2: Validate contrast consistency across all dropdown items and update documentation.

## 6. Implementation Notes
* Updated `src/components/records/NewRecordDropdown.tsx`.
* Dropdown item buttons now use `unstyled` to avoid inheriting `fj-btn` neutral background/text styles that conflict with custom dropdown row styling.
* Added explicit base, hover, and active text/background classes for blue-group and indigo-group rows in both light and dark themes.
* Added `overflow-hidden` on the dropdown panel to keep rounded-corner row backgrounds visually clean.
* No logic, data, or schema changes were made.
