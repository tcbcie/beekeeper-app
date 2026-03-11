# Feature: Queen Rearing Grafting Batch Tab Rename
**Date:** 11/03/2026
**Status:** Implemented

## 1. Overview
Rename the first Queen Rearing batches tab from `Planning` to `Grafting Batch` so the interface describes the graft-focused workflow more clearly. The change is limited to visible terminology and supporting documentation.

## 2. Scope & Simplicity
* **In Scope:** Update the user-facing tab label on `/dashboard/batches` and align the main Queen Rearing documentation with the renamed term.
* **Out of Scope:** Renaming internal state keys, routes, database fields, or batch lifecycle concepts beyond the visible tab wording.
* **Existing Code Impact:** Limited to `src/app/dashboard/batches/page.tsx`, `docs/features/queen-rearing.md`, and `docs/features/overview-pages-improvement.md`.

## 3. Technical Design
### Architecture
The batches page will continue to use the existing `planning` tab key internally. Only the displayed tab label and documentation copy will change to `Grafting Batch`, which keeps behaviour and component logic unchanged.

### Database Connections (MCP Server)
No database access or schema changes are required. This rename is confined to UI text and documentation, so no MCP database queries are expected.

## 4. Edge Cases & Risks
* Leaving the internal tab key unchanged creates a small terminology mismatch in code, but it materially lowers regression risk.
* Documentation may drift if secondary references to the old tab name are missed.
* Any external screenshots or guides that still show `Planning` would need a separate follow-up outside this scoped change.

## 5. Implementation Phases
1. Phase 1: Confirm the Queen Rearing tab references that are genuinely user-facing and keep the edit set narrow.
2. Phase 2: Rename the batches page tab label to `Grafting Batch` without altering internal tab state or behaviour.
3. Phase 3: Align the Queen Rearing feature documentation and overview notes with the renamed terminology.
