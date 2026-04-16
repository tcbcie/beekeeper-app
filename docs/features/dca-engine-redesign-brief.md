# Feature: DCA Engine Redesign Brief
**Date:** 16/04/2026
**Status:** Draft

## 1. Overview
Redesign the DCA engine so that it behaves like an evidence-weighted landscape model instead of a narrow terrain-depression heuristic. The next version should still produce practical DCA guidance on the community map, but it should express uncertainty more honestly, use a broader set of biologically plausible signals, and separate low-cost heuristic improvements from later upgrades that need richer spatial data.

The immediate goal is not to produce a scientifically definitive DCA detector. The goal is to replace the current overconfident assumptions with a better-grounded ranking model that is more likely to surface plausible DCA hotspots and less likely to present terrain artefacts as strong predictions.

## 2. Scope & Simplicity
* **In Scope:** Redesign candidate generation, scoring, confidence assignment, and confirmation handling for the DCA engine; define the data inputs required for a v2 model; define phased implementation work for a minimal viable v2 and later higher-accuracy upgrades.
* **Out of Scope:** Real-time weather simulation, full machine learning, community-shared confirmation data, automated field-truth collection, major map UX redesign, and new public-location privacy models.
* **Existing Code Impact:** `src/lib/dca-prediction.ts`, `src/hooks/useDCAPredictions.ts`, `src/lib/elevation.ts`, `src/app/dashboard/community-map/page.tsx`, and the existing DCA feature note.

## 3. Technical Design
### Architecture
The current engine should be replaced by a multi-signal scoring pipeline with explicit confidence bands:

1. **Eligibility and input preparation**
   - Keep the current requirement that only user-owned apiaries with valid coordinates can be used.
   - Continue to support user selection of apiaries and a cap on calculation size for browser safety.
   - Preserve client-side execution for the first v2 iteration to avoid backend and privacy expansion.

2. **Candidate generation**
   - Stop projecting candidates only at fixed 2 km and 3.5 km points.
   - Generate a wider set of candidate hotspots using a weighted distance kernel across roughly 0.5 km to 5 km from each selected apiary.
   - Use multiple generation strategies:
     - skyline or horizon-contrast directions
     - saddles, depressions, and valley openings from DEM-derived terrain
     - open-area and edge-adjacent sites where available
     - intersections or sparse linear features where available
     - previously confirmed local hotspots
   - The output of this stage should be a larger candidate pool with provenance metadata for each candidate rather than a pre-ranked final result.

3. **Signal scoring**
   - Replace the current `bowl + donut + convergence` structure with a weighted evidence model.
   - Each candidate should receive a score contribution from independent signals:
     - **Distance suitability:** Prefer a broad band rather than two fixed rings.
     - **Skyline contrast:** Reward directions with distinctive horizon or terrain contrast, not merely the lowest average elevation.
     - **Terrain structure:** Reward saddles, depressions, and valley openings where present, but treat them as one signal only.
     - **Openness and shelter:** Reward open spaces with surrounding structure and penalise exposed or cluttered sites.
     - **Landscape guidance:** Reward plausible line features or directional corridors when present.
     - **Cross-apiary support:** Reward candidates supported by several nearby apiaries, but treat this as a weak-to-moderate signal, not a dominant one.
     - **Field evidence:** Use confirmations as calibration and reinforcement, not as a blunt additive override.
   - Each signal should retain its own sub-score so the UI and future audits can explain why a hotspot ranked highly.

4. **Confidence model**
   - Separate raw candidate score from user-facing confidence.
   - Confidence should depend on:
     - number of independent signals present
     - quality of the underlying data
     - number of contributing apiaries
     - strength and recency of confirmations
     - whether the candidate relied on fallback logic
   - A single-apiary candidate in flat or poorly structured terrain should remain low confidence even if it is the best local guess.

5. **Confirmation handling**
   - Stop treating confirmations as a simple `+15/-15` rule.
   - Treat positive confirmations as local priors that:
     - increase the baseline plausibility of nearby candidates
     - preserve known hotspots through later recalculations
     - decay in certainty over time if never reconfirmed
   - Treat negative confirmations as local suppressors rather than absolute denials.
   - Keep confirmations user-private in v2 unless a later privacy design is approved.

6. **Output**
   - Return ranked hotspots with:
     - overall score
     - confidence band
     - contributing apiaries
     - signal breakdown
     - reason flags such as `terrain-supported`, `landscape-supported`, `confirmation-supported`, or `fallback-only`
   - Maintain existing map circles and flyway visualisation where possible, but align labels and popups to the new evidence model.

### Database Connections (MCP Server)
No database schema change is required for the initial redesign brief.

For v2 phase 1:
* Continue reading the existing `dca_confirmations` table through the current Supabase client flow.
* Continue storing user-private confirmation records only.
* No new database writes are needed beyond the existing confirmation workflow.

For later phases, if approved:
* Evaluate whether additional landscape layers should be precomputed or fetched through a dedicated spatial data service instead of ad hoc browser-side lookups.
* Any future schema or spatial index work should be validated through direct database access via MCP rather than by inspecting saved SQL exports.

## 4. Edge Cases & Risks
* A richer scoring model can still become overconfident if the UI compresses nuanced evidence into a simple high/medium/low label.
* Browser-side calculations may become too slow if terrain, openness, and line-feature analysis are all added without careful batching and caching.
* Low-resolution elevation data can mislead the model if treated as sufficient for fine-grained hotspot placement.
* Confirmation feedback can introduce local bias if a user repeatedly confirms a convenient but biologically weak area.
* Flat, urban, coastal, or heavily wooded landscapes may remain difficult to model without richer land-cover inputs.
* If wider colony-density priors are introduced later, privacy and consent rules must remain explicit.

## 5. Implementation Phases
1. Phase 1: Rebuild the scoring model inside the existing client-side engine.
   - Replace fixed candidate distances with a weighted distance band.
   - Replace `lowest elevation` flyway logic with a broader directional suitability score.
   - Reduce the dominance of terrain bowls and convergence.
   - Separate raw score from confidence.
   - Preserve the current map UI with minimal wording updates.

2. Phase 2: Introduce landscape signals beyond bare elevation.
   - Add derived terrain descriptors such as saddles, valley openings, and skyline contrast.
   - Add lightweight openness and shelter proxies where they can be computed cheaply.
   - Add explainable signal breakdowns to result objects and popups.

3. Phase 3: Redesign confirmation handling.
   - Replace the current additive `+/-15` adjustment.
   - Add confirmation recency, density, and suppression logic.
   - Ensure cached predictions invalidate correctly when local confirmation priors change.

4. Phase 4: Add richer spatial inputs if phase 1 and 2 still leave accuracy too weak.
   - Evaluate higher-resolution DEM or land-cover data.
   - Evaluate whether selected spatial analysis should move off the browser for performance and repeatability.
   - Reassess whether broader colony-density priors can be introduced without undermining privacy.

5. Phase 5: Validate and calibrate.
   - Compare v2 predictions against existing confirmations and structured field checks.
   - Tune signal weights using observed outcomes rather than intuition alone.
   - Update the community-map wording so users understand that DCA output is a ranked hotspot estimate, not a verified point location.
