# Feature: Queen Ledger Action Alignment And Reflow
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change tightens the Queen Ledger action column by centring the labels over their controls and reflowing the remaining actions when `Mated` is absent. The goal is to make the action cell feel balanced without increasing row height.

## 2. Scope & Simplicity
* **In Scope:** Label alignment and conditional reflow of the existing action controls.
* **Out of Scope:** Any change to the action model, schema, hook APIs, or the wider ledger table structure.
* **Existing Code Impact:** Limited to the Queen Ledger component and the tracker note.

## 3. Technical Design
### Architecture
The action labels now sit centred above their controls, and the grid collapses cleanly when `Mated` is not present so there is no dead slot in the action cell. The inline date-capture editor stays directly below the active controls.

### Database Connections (MCP Server)
No database or MCP change is needed. This is a presentational refinement only.

## 4. Edge Cases & Risks
* The reflow must stay predictable across rows with and without `Mated`.
* Centring the labels must not make the action cell feel looser.
* The inline date-capture editor must remain visually attached to the active control set.

## 5. Implementation Phases
1. Phase 1: Centre the labels and remove the empty-slot layout when `Mated` is absent.
2. Phase 2: Tighten the action cell and update the tracker note.
