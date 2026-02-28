# Feature: Inspection Mobile Queen Cells Toggle Alignment Fix
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
Stabilise the `Queen Cells` control layout on mobile so each row keeps its label and YES/NO actions readable, tappable, and contained inside the card boundaries.

## 2. Scope & Simplicity
* **In Scope:** Apply responsive class updates to the shared inspection cell toggle renderer and any equivalent compact action rows in the same form.
* **Out of Scope:** Visual redesign, colour-system changes, business-rule changes, persistence changes, or API changes.
* **Existing Code Impact:** `src/components/records/forms/InspectionForm.tsx` only, plus tracking updates in task and feature documentation.

## 3. Technical Design
### Architecture
Update `renderCellSection` layout primitives so controls use a mobile-first arrangement (stacked or wrapped) and only switch to horizontal alignment at larger breakpoints. This preserves existing handlers and state updates.

### Database Connections (MCP Server)
No database operations are required for this UI layout correction.

## 4. Edge Cases & Risks
* Very narrow screens can clip fixed-width controls if rows are forced single-line.
* Longer labels (for example `Supercedure Cells`) can collide with action buttons if horizontal spacing is rigid.
* Breakpoint regression risk on tablet/desktop if mobile fixes are not scoped with `sm` classes.

## 5. Implementation Phases
1. Phase 1: Refactor `renderCellSection` header/action row classes for mobile containment and tap clarity.
2. Phase 2: Sweep adjacent inspection controls for similar overflow patterns and align to the same responsive approach.
