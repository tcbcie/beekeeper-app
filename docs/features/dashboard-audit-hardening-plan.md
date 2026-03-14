# Feature: Dashboard Audit Hardening
**Date:** 14/03/2026
**Status:** Implemented

## 1. Overview
Harden the dashboard apiary data path so it behaves predictably under slow networks, partial downstream failures, and incomplete inspection data. This pass focuses on correctness and resilience rather than adding new user-facing capability.

## 2. Scope & Simplicity
* **In Scope:** Add request sequencing guards to the dashboard hook, treat nullable brood observations defensively in the queen-issue roll-up, and preserve valid partial scale results when one scale request fails.
* **Out of Scope:** Database schema changes, dashboard redesign, new API routes, or changes to how inspections are recorded.
* **Existing Code Impact:** Touch only the dashboard stats hook, the apiary dashboard card component, and the related dashboard feature documentation.

## 3. Technical Design
### Architecture
`useDashboardStats` remains the single enrichment point for dashboard apiary data, but now uses request versioning so stale async work cannot overwrite newer state. The brood-risk derivation distinguishes explicit brood absence from unknown brood data, and `ApiaryWeatherRow` now continues rendering scale data when only a subset of scale endpoints returns successfully.

### Database Connections (MCP Server)
No schema change is required. The existing inspection query already fetches the fields needed for this hardening pass. The defensive change is in how nullable inspection values are interpreted in application code, not in how they are stored.

## 4. Edge Cases & Risks
* A retry or second dashboard load must not be overwritten by an earlier slower request.
* Null brood fields must not create a false broodless run.
* Explicit brood absence should still contribute to the 21-day brood warning.
* A single scale timeout or HTTP failure must not blank out successful scale readings from other hives.
* The hardening must not disturb the existing apiary warning semantics for valid positive signals.

## 5. Implementation Phases
1. Phase 1: Add request-scoped stale-response protection and tighten brood-state derivation in the dashboard hook.
2. Phase 2: Preserve partial scale data on the apiary card and document the hardening behaviour.

## 6. Implementation Review
* Added a request id guard around dashboard fetch state writes so only the newest in-flight request can update the hook state.
* Tightened brood inference so only an explicit `brood_frames === 0` observation can extend a broodless run; null brood fields are treated as unknown.
* Removed the all-or-nothing scale failure behaviour so successful scale responses still render when another endpoint fails.
