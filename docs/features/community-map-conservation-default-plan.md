# Feature: Community Map Conservation Toggle Default
**Date:** 16/03/2026
**Status:** Draft

## 1. Overview
Adjust the Community Apiary Map so conservation areas are hidden by default on first load. This makes the initial view less cluttered while preserving the existing ability to enable the layer manually.

## 2. Scope & Simplicity
* **In Scope:** Change the default client-side visibility state for conservation areas and document the behaviour.
* **Out of Scope:** Any map redesign, marker styling changes, new persistence for filter preferences, or backend data changes.
* **Existing Code Impact:** Touch only the community map page component and this feature note.

## 3. Technical Design
### Architecture
The community map already controls optional layers through local React state. This change will reuse that pattern by initialising the conservation-area flag to `false` while leaving the existing toggle button and layer rendering checks unchanged.

### Database Connections (MCP Server)
No database change is required. Conservation-area data can continue to load as it does now; only the initial visibility of the rendered layer changes.

## 4. Edge Cases & Risks
* The conservation-area toggle must still enable the map circles and markers immediately after load.
* The stats badge can continue showing the conservation-area count even when the layer starts hidden.
* The change must not affect the defaults for user apiaries, shared apiaries, wild colonies, or DCA predictions.

## 5. Implementation Phases
1. Phase 1: Flip the initial conservation-area visibility state to off in the community map page.
2. Phase 2: Document the new default behaviour for future maintenance.
