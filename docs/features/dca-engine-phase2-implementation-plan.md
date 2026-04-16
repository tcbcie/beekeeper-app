# Feature: DCA Engine Phase 2 Implementation
**Date:** 16/04/2026
**Status:** Implemented

## 1. Overview
Phase 2 strengthens the DCA engine by adding richer landscape signals derived from the existing terrain input instead of relying mainly on broad directional suitability and local terrain support. The purpose is to make hotspot ranking more evidence-rich without introducing new infrastructure or external spatial datasets.

This phase should preserve the current community-map interaction model while improving the engine’s ability to distinguish between merely low terrain and more plausible congregation landscapes.

## 2. Scope & Simplicity
* **In Scope:** Add derived terrain descriptors such as skyline contrast, valley opening, saddle-like support, and lightweight openness or shelter proxies; make those signals affect ranking and confidence; optionally expose compact signal explanations in the existing map flow.
* **Out of Scope:** New backend services, new terrain or land-cover providers, new tables, full line-feature ingestion, machine learning, or major map UX redesign.
* **Existing Code Impact:** `src/lib/dca-prediction.ts`, `src/hooks/useDCAPredictions.ts`, `src/app/dashboard/community-map/page.tsx`, and the DCA feature documentation.

## 3. Technical Design
### Architecture
Phase 2 should extend the phase 1 client-side engine in four areas:

1. **Derived terrain descriptors**
   - Compute additional candidate-level signals from the current terrain sample layout and a small number of extra neighbour checks.
   - Target signals:
     - **Skyline contrast:** stronger distinction between attractive directional gaps and merely lower average terrain
     - **Valley opening:** reward directions where terrain appears to open outward rather than remain uniformly enclosed
     - **Saddle-like support:** detect candidates that behave more like passes, junctions, or balanced openings than simple depressions
     - **Lightweight openness or shelter proxy:** reward candidates with some surrounding structure but penalise excessively exposed or fully closed terrain

2. **Explainable scoring**
   - Keep the phase 1 distance and support logic, but make the new landscape signals first-class score components.
   - Preserve determinism and browser safety.
   - Ensure no single new signal dominates the final rank in isolation.

3. **Confidence refinement**
   - Let the presence of several independent landscape signals raise confidence.
   - Let conflicting signals, weak terrain structure, or heavy fallback use suppress confidence.
   - Preserve conservative handling for flat or low-contrast areas.

4. **Result shaping**
   - Where practical, expose a compact signal breakdown so the current UI can explain why a hotspot ranked well.
   - Keep the existing map markers, circles, and flyway lines unless a small popup wording change is needed.

### Database Connections (MCP Server)
* No schema change is planned in this phase.
* Existing reads and writes to `dca_confirmations` stay unchanged.
* No new database access path is required.

## 4. Edge Cases & Risks
* Additional terrain probes can increase browser work if not kept tightly bounded.
* Derived signals can become noisy in flat or low-resolution DEM areas.
* More explainable output can drift out of sync with the UI if the map popup contract is not updated carefully.
* Confidence may still appear subjective unless the rules remain simple and auditable.

## 5. Implementation Phases
1. Phase 1: Add richer landscape-derived signals to the existing engine and integrate them into ranking.
   - Implemented on 16/04/2026 in the existing client-side engine and map popup flow.
2. Phase 2: Expose compact signal explanations and adjust confidence thresholds if the new signals materially change hotspot ordering.
