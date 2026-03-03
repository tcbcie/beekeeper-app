# Task: Lock Sold Nuc Cards
**Date:** 03/03/2026
**Status:** Complete — awaiting user testing

## Objective
When a nuc is distributed and its status changes to `sold`, lock the nuc card so no accidental data changes can be made. Hide Edit/Retire/Delete buttons, and make the inspection panel read-only (no Add Inspection, Mark Queen, or Edit/Delete on inspection cards). History button stays visible.

## Execution Plan

- [x] Add `readOnly` prop to `NucInspectionCard` — hide Edit/Delete buttons when true
- [x] Add `readOnly` prop to `NucInspectionPanel` — hide Add Inspection + Mark Queen when true, pass to cards
- [x] Update `MatingNucsTab` — hide Edit/Retire/Delete for sold nucs, pass `readOnly` to inspection panel
- [x] Create feature documentation

## Review
**Summary of changes:**
- **NucInspectionCard** — Added optional `readOnly` prop. When true, the Edit and Delete icon buttons are hidden (wrapped in `{!readOnly && ...}`).
- **NucInspectionPanel** — Added optional `readOnly` prop. When true, hides Add Inspection and Mark Queen buttons. Passes `readOnly` down to each `NucInspectionCard`.
- **MatingNucsTab** — Wrapped Edit, Retire, and Delete buttons in `{nuc.status !== 'sold' && ...}`. Passes `readOnly={nuc.status === 'sold'}` to `NucInspectionPanel`. History and Distribute buttons unaffected.

**Scope:** 3 files changed. No new dependencies. No migrations.

**Testing checklist:**
1. Nuc with `sold` status — only History button visible, no Edit/Retire/Delete
2. Expand a sold nuc — past inspections visible but no Add Inspection or Mark Queen
3. Inspection cards in a sold nuc — no Edit/Delete buttons
4. Non-sold nucs — all buttons still work as before
