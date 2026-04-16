# Feature: DCA Engine Phase 3 Implementation Plan
**Date:** 16/04/2026
**Status:** Implemented

## 1. Overview
Phase 3 redesigns how field confirmations influence DCA prediction results. Instead of applying a small score bump or penalty after prediction, the engine should treat confirmations as local priors that strengthen, preserve, or suppress nearby hotspots according to their proximity, recency, and density. The goal is to make confirmation handling more biologically and operationally credible without introducing new infrastructure or changing the current user workflow.

## 2. Scope & Simplicity
* **In Scope:** Replace the current nearby confirmation adjustment with structured confirmation priors; use positive and negative confirmations inside the prediction flow; weight confirmations by recency and clustering; update cache invalidation so stale cached predictions do not survive confirmation changes; keep the current map display and confirmation storage flow.
* **Out of Scope:** New database tables, shared community confirmations, weather-aware confirmation models, backend scoring services, manual moderation flows, and major popup redesign.
* **Existing Code Impact:** `src/hooks/useDCAPredictions.ts`, `src/lib/dca-prediction.ts`, and the DCA feature note.

## 3. Technical Design
### Architecture
Phase 3 should move confirmation handling from a late score patch into a proper evidence input to the prediction engine.

The intended structure is:
1. Load existing user-private confirmations as today.
2. Convert each confirmation into a lightweight prior with:
   - polarity: positive or negative
   - recency weight derived from `observation_date`
   - local influence radius
   - support strength that decays with distance
3. Aggregate nearby priors per candidate so the engine sees:
   - positive support from repeated or recent confirmations
   - suppressive pressure from repeated or recent denials
   - a balanced net effect when the same area has mixed evidence
4. Fold that evidence into candidate score and confidence as bounded support, not as a dominant override.
5. Preserve known local hotspots when they still have meaningful support, but do not let a single stale confirmation permanently lock them in place.

Positive confirmations should:
* reinforce nearby hotspots more strongly when several recent confirmations cluster together
* help preserve plausible hotspots that might otherwise fall just below the normal visibility threshold
* contribute to explanation flags or signal summaries where appropriate

Negative confirmations should:
* suppress nearby hotspots with a stronger effect when several denials cluster locally
* reduce confidence as well as raw score
* avoid acting as absolute bans when the surrounding landscape evidence remains strong

The hook should stop applying a separate post-prediction score delta once the engine owns confirmation priors directly.

### Database Connections (MCP Server)
No database schema or query-shape change is required for this phase.

The current Supabase flow remains sufficient:
* read `dca_confirmations` for the signed-in user
* continue storing new confirmation records through the existing insert path
* continue treating confirmations as user-private only

No direct MCP database changes are planned.

## 4. Edge Cases & Risks
* Stale confirmations could distort results if recency decay is too weak.
* Mixed positive and negative confirmations in the same area could produce unstable ranking if balancing rules are too aggressive.
* Local confirmation clusters could still dominate the model unless the support contribution stays bounded.
* Cache invalidation must account for confirmation additions so old predictions do not survive after field feedback changes.
* Sparse confirmation history must degrade gracefully so the engine still works from terrain and landscape evidence alone.

## 5. Implementation Phases
1. Phase 1: Add structured confirmation priors and remove the current post-processing score patch.
2. Phase 2: Integrate recency, density, and suppression weighting into candidate scoring and confidence.
3. Phase 3: Update cache invalidation and documentation so the revised confirmation model is reflected consistently across the feature.
