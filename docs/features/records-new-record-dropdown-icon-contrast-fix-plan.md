# Feature: Records New Record Dropdown Icon Contrast Fix
**Date:** 01/03/2026
**Status:** Implemented

## 1. Overview
Improve visual contrast for the Records `New Record` dropdown, with specific focus on icon legibility and consistent readability of option labels across interaction states.

## 2. Scope & Simplicity
* **In Scope:** Styling updates in the `NewRecordDropdown` option rows and icons to improve contrast in dark mode.
* **Out of Scope:** Dropdown behaviour changes, form-routing changes, record creation logic changes, and global design-system refactors.
* **Existing Code Impact:** `src/components/records/NewRecordDropdown.tsx`.

## 3. Technical Design
### Architecture
Apply explicit per-state class combinations on dropdown rows and explicit icon classes so contrast is deterministic rather than inherited. Keep changes local to the dropdown component.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP interactions are required.

## 4. Edge Cases & Risks
* Hover, focus-visible, and active states must all remain legible on dark backgrounds.
* Icon clarity must improve without shifting row layout or touch-target size.
* The fix must not change dropdown open/close or selection behaviour.

## 5. Implementation Phases
1. Phase 1: Tighten row colour-state classes to preserve high contrast in all interaction states.
2. Phase 2: Strengthen icon visibility with explicit icon styling and verify readability consistency.

## 6. Implementation Notes
* Updated `src/components/records/NewRecordDropdown.tsx`.
* Replaced previous row-state classes with explicit high-contrast combinations for hover, focus-visible, and active states in both light and dark contexts.
* Added explicit icon classes for blue and indigo groups, and increased icon size/stroke to `size={17}` and `strokeWidth={2.25}` for stronger legibility.
* No behaviour, API, or database changes were made.
