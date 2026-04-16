# Feature: DCA Engine Phase 1 Implementation
**Date:** 16/04/2026
**Status:** Implemented

## 1. Overview
Phase 1 upgrades the current DCA engine from a fixed terrain-depression heuristic to a broader client-side hotspot model. The aim is to improve ranking quality and reduce false confidence without adding new infrastructure, new spatial datasets, or schema changes.

This phase should keep the existing user flow intact on the community map while making the prediction engine behave more like an evidence-weighted ranking system. It should remain fast enough for browser execution and compatible with the current confirmation workflow.

## 2. Scope & Simplicity
* **In Scope:** Replace fixed candidate distances with a wider weighted distance band; replace lowest-elevation flyway selection with a broader directional suitability score; reduce the weight of bowl and convergence logic; separate raw score from confidence; keep the current map flow and client-side architecture.
* **Out of Scope:** New map controls, new backend services, new database tables, land-cover ingestion, community-shared confirmation logic, real-time weather modelling, and higher-resolution terrain sources.
* **Existing Code Impact:** `src/lib/dca-prediction.ts`, `src/hooks/useDCAPredictions.ts`, and the DCA feature documentation.

## 3. Technical Design
### Architecture
Phase 1 should introduce a revised engine with these behaviours:

1. Candidate generation
   - Generate candidates across a wider distance band instead of only 2 km and 3.5 km.
   - Use a small set of weighted candidate distances across the existing likely DCA range.
   - Keep direction labels and flyway output so the current UI does not need structural changes.

2. Directional suitability
   - Replace the current `lowest average elevation wins` rule with a broader directional score based on relative elevation contrast across rings.
   - Use ranked directional suitability rather than binary flyway inclusion where possible.
   - Avoid arbitrary cardinal fallback behaviour on flat terrain; flat or low-contrast terrain should instead lower confidence.

3. Candidate scoring
   - Replace the current `bowl + donut + convergence` dominance with a more balanced score that combines:
     - distance suitability
     - directional suitability
     - local terrain support
     - weak cross-apiary reinforcement
   - Keep the model explainable and deterministic.

4. Confidence
   - Compute confidence from signal quality, not just total score.
   - Penalise flat terrain, sparse support, and fallback-heavy candidates.
   - Prevent single-apiary terrain artefacts from surfacing as high confidence.

5. Confirmations
   - Keep the current user-private confirmation source.
   - Reduce the size of confirmation boosts so they reinforce nearby plausible candidates instead of dominating rank.
   - Preserve the ability for positive confirmations to keep a missed hotspot visible, but keep the resulting confidence conservative in phase 1.

### Database Connections (MCP Server)
* No schema change is planned in this phase.
* Existing reads and writes to `dca_confirmations` stay unchanged.
* No new database access pattern is required beyond the current client flow.

## 4. Edge Cases & Risks
* A wider candidate band can increase noise if thresholds are not tuned carefully.
* Lowering terrain dominance may expose weaknesses in the remaining signals if weights are poorly balanced.
* If confidence logic is too conservative, users may perceive the engine as weaker even if ranking quality improves.
* Cached result shape must remain compatible with the hook and map page.
* Positive confirmations still risk biasing results in sparse-data areas if not damped carefully.

## 5. Implementation Phases
1. Phase 1: Rework the client-side engine scoring and confidence model while preserving the current UI contract.
   - Implemented on 16/04/2026 in the existing client-side engine and hook.
2. Phase 2: Add richer landscape signals such as skyline contrast, openness, shelter, and line-feature guidance.
