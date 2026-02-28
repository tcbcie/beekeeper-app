# Feature: Records And UI Hardening Pass
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
Harden the Records inspection flow and related UI controls to improve resilience under network latency, malformed responses, and edge-case state transitions. The goal is to prevent hidden submission lockups, stale form data reuse, and fragile runtime class generation issues.

## 2. Scope & Simplicity
* **In Scope:** Defensive updates in `records/page.tsx`, `InspectionForm.tsx`, and `NotificationStatusCard.tsx`.
* **Out of Scope:** Database schema changes, API contract changes, and broad component rewrites.
* **Existing Code Impact:** Limited to local functions and render logic in the three files above.

## 3. Technical Design
### Architecture
The hardening pass adds guarded network fetch wrappers with timeout and response validation, enforces deterministic loading-state cleanup in submission flow, replaces dynamic CSS class interpolation with static mappings, and fixes form reset behaviour on edit-to-new transitions without introducing regressions during ordinary re-renders.

Implemented detail:
* Added a timeout-aware JSON fetch helper in `src/app/dashboard/records/page.tsx` and applied it to weather/geocoding calls.
* Added stronger weather payload type checks and guaranteed `fetchingWeather` reset via `finally` in inspection submit flow.
* Replaced dynamic selector class interpolation in `src/components/records/forms/InspectionForm.tsx` with static mapped classes.
* Added edit-to-new transition-safe form reset logic in `InspectionForm` to avoid stale inspection data retention.
* Replaced dynamic notification border class interpolation in `src/components/NotificationStatusCard.tsx` with typed static class mapping.

### Database Connections (MCP Server)
No direct database changes are required. Existing Supabase reads/writes are retained as-is and only wrapped with safer control flow.

## 4. Edge Cases & Risks
* Weather or geocoding endpoints can stall, timeout, or return malformed JSON.
* Form state can persist unexpectedly when switching from edit mode back to a new inspection.
* Dynamic Tailwind class interpolation can fail style generation in optimised builds.
* Notification status colour classes can silently break if generated dynamically at runtime.

## 5. Implementation Phases
1. Phase 1: Add resilient weather fetch helper and submission-state cleanup in records inspection flow.
2. Phase 2: Harden inspection form state transitions and static style/class mappings.
3. Phase 3: Replace dynamic notification status border classes with typed static mappings.
