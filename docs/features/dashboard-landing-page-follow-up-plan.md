# Feature: Dashboard Landing Page Follow-up Improvements
**Date:** 12/03/2026
**Status:** Implemented

## 1. Overview
This follow-up improves the redesigned dashboard landing page so it behaves correctly around local dates, sends users to the most useful follow-on views, reduces unnecessary first-load requests, and exposes collapsible content more clearly to assistive technology users.

## 2. Scope & Simplicity
* **In Scope:** Fix the upcoming-events date calculations, add focused deep links into tasks and records, reduce apiary card request pressure on first render, surface dashboard-level load failures at dashboard level, and add proper expanded-state metadata to the collaboration controls.
* **Out of Scope:** Reworking the broader dashboard layout, replacing Supabase queries with a new data architecture, or redesigning the teams/tasks/records pages beyond the targeted improvements above.
* **Existing Code Impact:** Touch the dashboard page, the dashboard stats hook, the apiary weather card component, and the existing task and record landing pages that the dashboard already links into.

## 3. Technical Design
### Architecture
The dashboard will keep its current section order, but the supporting components will become more deliberate about when they fetch, how they report failures, and how they hand users off to destination screens. The landing page remains the coordinator; tasks and records only gain small query-parameter hooks for focused navigation.

### Database Connections (MCP Server)
No schema changes are planned. Existing Supabase queries remain in place, with the dashboard stats hook splitting overview and recent-activity failures so the UI can explain them in the correct section. No saved `.sql` parsing is involved.

## 4. Edge Cases & Risks
* Date-only strings must be treated as local calendar dates, not UTC timestamps, or dashboard counts will drift near timezone changes.
* Deep links must still work for shared hives and shared tasks without accidentally hiding the target record behind existing filters.
* Deferred apiary-card loading must avoid duplicate fetches and should fail quietly when weather or scale services are unavailable.

## 5. Implementation Phases
1. Phase 1: Add local-date helpers and targeted deep-link handling for dashboard destinations.
2. Phase 2: Improve dashboard resilience by splitting error reporting and reducing initial apiary-card request pressure.
3. Phase 3: Add the remaining accessibility metadata and update dashboard feature documentation.

## 6. Implementation Note
The follow-up has been implemented with targeted changes only. The dashboard layout and section order remain intact; the work focused on date correctness, destination usefulness, request timing, failure visibility, and accordion accessibility metadata.

## 7. Review Remediation Note
This follow-up received a targeted review-fix pass on 12/03/2026 to correct three regressions introduced during implementation: timestamp-aware recent-activity dates, archived-hive record deep links, and scale-cache behaviour after transient API failures.
The remediation is now applied: recent activity preserves timestamp-aware rendering where required, dashboard record deep links unhide archived hives before filtering, and apiary scale data is only cached after a fully successful refresh.
