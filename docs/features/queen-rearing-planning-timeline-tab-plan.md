# Feature: Queen Rearing Planning Timeline Tab
**Date:** 11/03/2026
**Status:** Implemented

## 1. Overview
Add a new `Planning` tab to the Queen Rearing page so beekeepers can try different graft dates and immediately see how those dates affect queen emergence, mating, laying, and drone preparation. The tab is intended as a practical planning aid rather than a saved workflow.

## 2. Scope & Simplicity
* **In Scope:** Add a new planning tab on `/dashboard/batches`, show queen timeline milestones with weekdays, and derive the linked drone preparation window from either a selected graft date or a target emergence day.
* **Out of Scope:** Persisting planner scenarios, changing rearing batch database fields, adding notifications from planner-only dates, or redesigning the existing Grafting Batch, Mating Nucs, Selection, or Queen Tracker flows.
* **Existing Code Impact:** Primarily `src/app/dashboard/batches/page.tsx` plus one new tab component and the supporting Queen Rearing documentation.

## 3. Technical Design
### Architecture
The batches page will gain a fifth tab rendered on the existing `/dashboard/batches` route. To avoid confusing internal state once a new user-facing `Planning` tab exists, the current `Grafting Batch` tab should use a clearer internal key. The new planning tab will be a client-side component with local state only.

The planner will use one primary source-date input at a time and display the derived milestones in a readable timeline-style layout. Initial assumptions will be explicit in the UI, with weekday labels surfaced alongside each date so the user can compare practical working days at a glance.

The first pass will calculate:
- queen emergence from the selected graft date, or a derived graft date from the selected emergence day, aligned with the existing Queen Rearing timeline already used on the batches form
- a mating-flight window after emergence
- a likely laying window after mating
- the linked drone-rearing lead time needed so mature drones are available when the virgin queen is ready

### Database Connections (MCP Server)
No database access or schema changes are required. This feature is a local planning tool only, so it should not read from or write to planner-specific tables.

## 4. Edge Cases & Risks
* Local date arithmetic must avoid timezone drift so weekdays and dates stay stable.
* Queen mating and laying depend heavily on weather, so the UI must present these as planning windows rather than exact guarantees.
* The new tab must not interfere with the existing `New Batch` action, which should remain tied to the Grafting Batch workflow only.
* Introducing a new user-facing `Planning` tab after recently renaming the old tab requires careful documentation updates to avoid future confusion.

## 5. Implementation Phases
1. Phase 1: Introduce a dedicated internal key for the existing Grafting Batch tab and add the new Planning tab shell to the batches page.
2. Phase 2: Build the local planner UI and date calculations for queen emergence, mating, laying, and drone readiness with clear weekday presentation.
3. Phase 3: Update the Queen Rearing feature documentation so the new five-tab layout and planner behaviour are captured.
