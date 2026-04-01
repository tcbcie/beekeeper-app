# Feature: Queen Ledger Action Grid Layout
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change compacts the Queen Ledger action column by replacing the previous full-width stacked action rows with a denser two-by-two action grid. The goal is to reduce wasted horizontal space while keeping the inline date-capture flow intact.

## 2. Scope & Simplicity
* **In Scope:** Rework the Queen Ledger action cell layout into a tighter grid and keep the inline action editor directly beneath it.
* **Out of Scope:** Any change to the outcome data model, schema, hook APIs, or the wider ledger table structure.
* **Existing Code Impact:** Limited to the Queen Ledger component and the tracker note.

## 3. Technical Design
### Architecture
The action cell now moves from four full-width label-and-toggle rows to a two-by-two grid of compact action tiles. The inline date-capture editor stays attached to the action cell and expands below the grid when needed.

### Database Connections (MCP Server)
No database or MCP change is needed. This is a presentational refinement on top of the existing Queen Ledger action flow.

## 4. Edge Cases & Risks
* The tighter grid must stay readable on narrower widths.
* The action states still need to be obvious even with less width per tile.
* The inline date-capture editor must still read as belonging to the selected action tile.

## 5. Implementation Phases
1. Phase 1: Rework the Queen Ledger action stack into a compact two-by-two grid.
2. Phase 2: Tighten the surrounding spacing and update the tracker note.
