# Feature: Scale Overview Hive Number Contrast Fix
**Date:** 27/02/2026
**Status:** Implemented

## 1. Overview
Improve readability of the hive number label in Scale Overview cards when the application is in dark mode, ensuring the card header text remains clearly legible for quick identification.

## 2. Scope & Simplicity
* **In Scope:** Update text colour classes in `HiveScaleCard` header rows for accessible contrast in dark mode contexts.
* **Out of Scope:** Reworking global theme tokens, redesigning card layout, changing data fetching, or altering scale calculations.
* **Existing Code Impact:** Minimal; one UI component (`src/components/research/HiveScaleCard.tsx`) plus documentation updates.

## 3. Technical Design
### Architecture
This is a presentational adjustment in the existing `HiveScaleCard` component. The fix will update header text utility classes for the hive number (and related metadata only if needed) so contrast remains sufficient across card header backgrounds.

### Database Connections (MCP Server)
No database queries or schema changes are required. Existing Supabase usage remains unchanged.

## 4. Edge Cases & Risks
* Header text could become too dark in light mode if class changes are not balanced.
* Contrast improvements for the hive number could reduce visual hierarchy if secondary text is not adjusted accordingly.
* The error-state header and normal-state header must remain consistent after the change.

## 5. Implementation Phases
1. Phase 1: Apply contrast-safe text classes to hive number labels in both standard and error header variants.
2. Phase 2: Verify secondary header text hierarchy and update feature documentation for Scale Overview.
