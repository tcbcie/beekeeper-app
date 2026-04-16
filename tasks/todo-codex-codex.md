# Task: DCA Engine Phase 3 Implementation
**Date:** 16/04/2026
**Status:** Completed

## 1. Objective
Implement phase 3 of the DCA engine redesign by replacing the current lightweight confirmation adjustments with a more disciplined confirmation-prior model, while keeping the existing client-side architecture, Supabase flow, and community-map workflow intact.

## 2. Impact Analysis
* **Files to Modify:** * `src/hooks/useDCAPredictions.ts`
  * `src/lib/dca-prediction.ts`
  * `docs/features/dca-prediction.md`
  * `docs/features/dca-engine-phase3-implementation-plan.md`
* **Simplicity Check:** This phase stays inside the existing hook and prediction engine. It does not add schema changes, backend services, or new map surfaces. The work is limited to improving how existing confirmation data influences ranking, confidence, and cache invalidation.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [ ] **Step 1:** Refactor confirmation input handling so the engine can use structured confirmation priors, including recency-aware positive support and negative suppression, instead of the current blunt nearby score delta.
- [ ] **Step 2:** Update candidate scoring and confidence rules so local confirmation density, polarity, and freshness reinforce or suppress hotspots without overwhelming the terrain and landscape signals from phases 1 and 2.
- [ ] **Step 3:** Update the hook cache key and result post-processing so cached predictions invalidate when local confirmation state changes and the map continues to render the revised predictions cleanly.
- [ ] **Step 4:** Update documentation in `docs/features/dca-prediction.md` and capture the implementation intent in `docs/features/dca-engine-phase3-implementation-plan.md`.
- [ ] **Step 5:** Present the completed phase 3 changes and prompt you to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The current confirmation model still behaves like a small additive patch on top of the engine. It does not account for confirmation age, clustering, or repeated local denials, so it can underuse strong field evidence and overuse weak or stale observations.
* **Summary of Changes:** Implemented structured confirmation priors inside the DCA engine, including recency-aware support, negative suppression, lightweight positive seeding, and cache invalidation tied to confirmation state. Updated the hook to pass observation dates, removed the old post-processing score patch, updated the DCA feature note, and marked the phase 3 plan as implemented.
* **Notes for User:** No build testing was run by me per repository instruction. No database schema change was required for this phase.
