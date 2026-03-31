# Feature: Nuc Setup Mobile Card Layout
**Date:** 31/03/2026
**Status:** Implemented

## 1. Overview
Optimise the `Nuc Setup` nuc cards for mobile screens so the action controls, status badges, and nuc metadata stay readable and tappable without collapsing the detail content into a narrow wrapped column.

## 2. Scope & Simplicity
* **In Scope:** Responsive layout changes to the mobile nuc cards in `MatingNucsTab`, including header stacking, action tray positioning, and clearer mobile metadata grouping.
* **Out of Scope:** Changes to nuc actions, data fetching, inspection logic, or the desktop layout beyond any minimal responsive class adjustments needed to preserve parity.
* **Existing Code Impact:** `src/components/batches/MatingNucsTab.tsx` and the existing mating nuc feature note in `docs/features/mating-nucs.md`.

## 3. Technical Design
### Architecture
The current nuc list renders a single flex row that places the expand button, content block, and action buttons side by side. On mobile, the action cluster consumes too much horizontal space, forcing the content block to wrap aggressively. The fix will split the mobile card into clearer responsive regions: a top identity block, a dedicated mobile-friendly action tray, and a vertically grouped metadata section.

The layout change will rely on responsive Tailwind classes only. Desktop behaviour will remain structurally the same, while mobile will switch to stacked sections with improved spacing and touch targets.

### Database Connections (MCP Server)
No database changes or direct MCP queries are required. This is a presentational client-side layout adjustment only.

## 4. Edge Cases & Risks
* Cards with the optional distribute button must still align cleanly when that action is present or absent.
* Long batch names, queen numbers, and location names must wrap without overlapping the action tray.
* Expanded cards must still open the inspection panel directly below the correct card.
* Desktop layout must remain intact after the responsive class changes.

## 5. Implementation Phases
1. Phase 1: Reflow the card header and action controls for narrow screens.
2. Phase 2: Reformat the mobile metadata rows for better readability and spacing.
3. Phase 3: Update the mating nuc feature documentation to describe the improved mobile presentation.
