# Feature: Dashboard Attention Contrast Fix
**Date:** 01/03/2026
**Status:** Implemented

## 1. Overview
Improve readability in the Dashboard Overview `Attention Needed` section by applying contrast-safe panel and chip styles that remain clear across light and dark themes.

## 2. Scope & Simplicity
* **In Scope:** Update visual classes in the dashboard alert container and its linked chips.
* **Out of Scope:** Any dashboard data logic changes, alert threshold changes, or global design-system refactor.
* **Existing Code Impact:** `src/app/dashboard/page.tsx` only.

## 3. Technical Design
### Architecture
This is a targeted class-level styling update in the existing `Attention Needed` JSX block. The fix will rely on established in-project utility/panel/chip styles with stronger colour contrast pairings.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP interactions are required.

## 4. Edge Cases & Risks
* Alert chips must remain readable for all alert counts and icon/text combinations.
* Hover states must not reduce contrast below accessible levels.
* Styling changes should not impact alert links or click behaviour.

## 5. Implementation Phases
1. Phase 1: Apply contrast-safe panel styles to the alert container.
2. Phase 2: Apply explicit high-contrast chip/link styles for alert items and document implementation.

## 6. Implementation Notes
* Updated `src/app/dashboard/page.tsx` in the `Attention Needed` block.
* Replaced the alert container utility combination with `fj-panel-amber` so dark-theme styling follows the app's class-based theme system.
* Replaced heading/icon amber text utilities with `fj-text-warning` for reliable theme-aware contrast.
* Increased alert chip label weight (`font-semibold`) while keeping existing `fj-chip-amber` semantics.
* No logic, data, or schema changes were made.
