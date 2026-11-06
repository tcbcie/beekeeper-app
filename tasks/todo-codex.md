# Task: Tasks Filter QA Audit
**Date:** 18/09/2026
**Status:** Completed

## 1. Objective
Audit the recent apiary/hive filter changes using the QA engineer skill and harden direct-link behaviour.

## 2. Impact Analysis
* **Files to Modify:** Tasks page, existing feature documentation and task records.
* **Simplicity Check:** Keep corrections inside the already approved filter and direct-link scope. Preserve existing data queries and shared selection storage.

## 3. Execution Plan
*Authorisation: the user requested the QA engineer skill after approving the filter fix, including preservation of direct links. These corrections complete that approved scope.*
- [x] **Step 1:** Audit the diff and related selection flow with an independent source review.
- [x] **Step 2:** Fixed the Medium hive-link filtering regression and guarded incoming hive/task links against restoring known incompatible hive selections. Independent source review found no further issues in the corrections.
- [x] **Step 3:** Ran TypeScript, targeted ESLint and whitespace checks; updated documentation. ESLint and whitespace checks passed. TypeScript reported 97 diagnostics, all in existing test files, with none outside tests. No tests were authored or run; no build was run.

## 4. Post-Task Review
* **Root Cause Found:** Hive-only links added an unintended apiary restriction to tasks with independent apiary associations. Conflicting direct links could also restore a selection cleared by reconciliation in the same effect cycle.
* **Summary of Changes:** Fixed one Medium and one Low issue. Hive-only links use All Apiaries; incoming hive/task links discard known incompatible hive selections before writing shared state. No Critical or High issues were found.
* **Notes for User:** No TypeScript diagnostics outside existing test files; targeted lint and whitespace checks passed. Please verify in the browser and run the build.

## Review
The QA engineer skill audit and independent follow-up review are complete. Both corrections stay within the approved filter/direct-link scope. Repository-wide type-checking remains unsuccessful because of 97 existing test-file diagnostics; changed application code has no reported type errors.

---

# Task: Tasks Apiary and Hive Filter Fix
**Date:** 18/09/2026
**Status:** Completed

## 1. Objective
Make the Tasks & Events Hive dropdown show only hives belonging to the selected apiary, and prevent incompatible hive selections from hiding matching tasks.

## 2. Impact Analysis
* **Files to Modify:** Tasks & Events page, feature documentation and task records.
* **Simplicity Check:** Use the apiary_id already loaded with each hive. Keep the fix local to the Tasks page without extra requests or changes to the shared selection provider.

## 3. Execution Plan
*Plan approved by the user before implementation.*
- [x] **Step 1:** Derive the Hive dropdown options from the selected apiary; All Apiaries continues to show all accessible hives.
- [x] **Step 2:** Clear known incompatible hive selections when switching apiaries and reconcile restored selections once association data is available. Preserve compatible selections, unavailable hive IDs and existing hive/task link behaviour.
- [x] **Step 3:** Reviewed switching apiaries, empty apiaries, shared hives, restored filters and direct links; updated the feature documentation and review notes. Targeted ESLint passed with no warnings or errors; whitespace checks passed.
- [x] **Step 4:** Request user build and browser verification in the hand-off. No build was run.

## 4. Post-Task Review
* **Root Cause Found:** The Hive dropdown rendered all accessible hives, while apiary and hive filters were stored independently without reconciling incompatible selections.
* **Summary of Changes:** Scoped Hive options to the selected apiary, cleared known incompatible selections, aligned hive links with their apiary and preserved missing/archived IDs. Changes are local to the Tasks page.
* **Notes for User:** Targeted ESLint and whitespace checks passed. Source review covered loading failures and direct links. Please run the build and verify the dropdown, switching apiaries, restored filters and task counts in the browser.

## Review
The approved fix is implemented and documented. Review caught and prevented accidental clearing of archived or temporarily unavailable shared-hive selections. No database changes or build tests were performed; live browser verification remains with the user.

---

# Task: Queen Ledger Expanded Detail Layout
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Compact the Queen Ledger expanded detail row and replace the current sparse equal-panel layout with a denser, clearer information layout.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-ledger-expanded-detail-layout-plan.md`
  * `docs/features/queen-tracker.md`
* **Simplicity Check:** This stayed as a focused presentation refactor inside the expanded Queen Ledger row. The data source, actions, and outcome behaviour were preserved while only the layout and grouping of existing information changed.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Replace the current four equal-width detail cards with a denser asymmetric layout that gives more room to the editable Outcomes area and less room to sparse read-only fields.
- [x] **Step 2:** Collapse repetitive single-field stacking into compact key-value grids so the expanded row uses materially less vertical space.
- [x] **Step 3:** Keep all current editable fields available, but group them into a clearer workflow-oriented layout rather than four parallel data buckets.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The detail drawer still treated all information as equal-density content, so sparse reference data consumed the same visual weight as the editable outcomes workspace and forced the expanded row into unnecessary height.
* **Summary of Changes:** Replaced the four-card detail layout with a denser `Reference Context` plus `Outcomes` structure, added compact summary facts, tightened the reference fields into grids, and removed the older bottom chip strip.
* **Notes for User:** No schema or MCP change was needed. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger expanded detail layout refinement.
* **Summary of Changes:** The expanded row now uses a denser asymmetric structure with compact reference facts on the left and a wider outcomes workspace on the right, which materially reduces wasted height and keeps the editable outcome fields together.
* **Notes for User:** Please check the expanded Queen Ledger rows in your normal build flow, especially laptop widths and rows with longer notes or contact details.

---

# Task: Apiary DCA Familiarisation
**Date:** 16/04/2026
**Status:** Completed

## 1. Objective
Map the existing functionality that determines likely Drone Congregation Areas for an apiary, so I can explain the real data flow, scoring rules, user journey, and current limitations before any further work.

## 2. Impact Analysis
* **Files to Modify:** * `tasks/todo-codex.md`
  * `tasks/todo-codex-codex.md`
* **Simplicity Check:** This remained a read-only familiarisation pass over the current implementation. No production feature logic, schema, or user-facing behaviour was changed.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Trace the end-to-end DCA flow from apiary coordinates entry through prediction calculation, cached results, map rendering, and field confirmation storage.
- [x] **Step 2:** Break down how a single apiary contributes to DCA determination, including terrain sampling rings, flyway selection, candidate projection distances, and score thresholds.
- [x] **Step 3:** Summarise the practical rules for when an apiary can be analysed, what data is required, and what outputs the user sees on the map.
- [x] **Step 4:** Document whether a feature note update is needed; if this remains exploration-only, record that no feature documentation change was required.
- [x] **Step 5:** Present the findings and ask you to validate the understanding rather than running build tests.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Not applicable. This was a functional familiarisation pass over the existing DCA implementation.
* **Summary of Changes:** Traced the DCA flow across apiary setup, community map loading, terrain sampling, candidate scoring, local caching, and user-private field confirmations. Confirmed that the existing DCA feature note already matches the implemented behaviour, so no documentation update was required for this task.
* **Notes for User:** No build testing was run per repository instruction. No MCP or database write was required during this familiarisation pass.

## Review
* **Scope Covered:** Existing DCA determination for apiaries.
* **Summary of Changes:** Verified that only the signed-in user's apiaries with saved coordinates are eligible, that each selected apiary contributes terrain samples at 1 km, 2.5 km, and 4 km across 16 directions, and that candidate DCAs are projected at 2 km and 3.5 km before bowl, distance, convergence, and confirmation adjustments are applied.
* **Notes for User:** If you want the next step, I can turn this familiarisation into a narrower review of accuracy assumptions or a change proposal for how DCA should be determined instead.

---

# Task: DCA Prediction Engine Critical Review
**Date:** 16/04/2026
**Status:** Completed

## 1. Objective
Critically examine the current DCA prediction engine against bee-mating and drone congregation research, verify whether the present methods are defensible, and identify the highest-value changes that would improve prediction accuracy.

## 2. Impact Analysis
* **Files to Modify:** * `tasks/todo-codex.md`
  * `tasks/todo-codex-codex.md`
* **Simplicity Check:** This stayed as an analysis-only review. No production code, schema, or feature behaviour was changed during this task.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Audit the current DCA engine and surrounding hook and map integration to isolate its actual biological assumptions, scoring heuristics, and data limitations.
- [x] **Step 2:** Consult primary external resources on drone congregation areas, queen and drone flight distances, terrain and landmark effects, altitude behaviour, and mating-flight ecology to test those assumptions.
- [x] **Step 3:** Compare the implementation directly against the literature and identify what is biologically well supported, weakly supported, or likely incorrect.
- [x] **Step 4:** Produce a ranked set of improvements focused on better accuracy, separating low-risk heuristic refinements from larger model changes that would need new data.
- [x] **Step 5:** Present the review findings and recommended next step, without running build tests.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The current model hard-codes a narrow terrain-based interpretation of DCA formation. Primary studies support some role for horizon and physiography, but not the engine's stronger claims that lowest average elevation, simple terrain bowls, and fixed-distance projections are sufficient proxies for true DCA location.
* **Summary of Changes:** Completed a critical audit of the DCA engine against accessible primary sources. Identified which heuristics are defensible, which are weak, and which should be replaced or downgraded to lower-confidence signals.
* **Notes for User:** No build testing was run per repository instruction. No database or MCP work was required for this review.

## Review
* **Scope Covered:** Accuracy and biological validity of the current DCA engine.
* **Summary of Changes:** Found that the engine is plausible as a lightweight exploratory heuristic, but not well justified as a biologically grounded predictor. The strongest gaps are the reliance on low-elevation averaging, arbitrary flat-land fallback directions, fixed 2 km and 3.5 km candidate distances, user-selection-dependent convergence scoring, and omission of landmark, openness, shelter, weather, and broader colony-density cues supported by the literature.
* **Notes for User:** The most valuable next step is to replace the current single-axis terrain heuristic with a scored evidence model that combines skyline contrast, open sheltered areas, line-feature intersections, wider distance kernels, and better-calibrated confirmation feedback.

---

# Task: DCA Engine Redesign Brief
**Date:** 16/04/2026
**Status:** Completed

## 1. Objective
Produce a concrete redesign brief for the next version of the DCA engine, translating the review findings into a practical v2 design with clear modelling changes, data inputs, scoring strategy, confidence handling, and phased implementation guidance.

## 2. Impact Analysis
* **Files to Modify:** * `tasks/todo-codex.md`
  * `tasks/todo-codex-codex.md`
  * `docs/features/dca-engine-redesign-brief.md`
* **Simplicity Check:** This remained documentation and design only. The brief proposes the smallest evidence-aligned set of changes that would materially improve DCA prediction quality before any higher-cost data or infrastructure work.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Define the redesign brief structure using the feature template and map the current engine shortcomings to specific v2 design goals.
- [x] **Step 2:** Draft the v2 model proposal, including evidence-aligned landscape signals, revised candidate generation, scoring and confidence rules, and a clearer role for confirmations.
- [x] **Step 3:** Break the redesign into implementation phases, separating low-risk heuristic improvements from higher-cost data or infrastructure upgrades.
- [x] **Step 4:** Write the redesign brief in `docs/features/dca-engine-redesign-brief.md`.
- [x] **Step 5:** Present the brief and ask you to validate the design direction rather than running build tests.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The current engine behaves like a fixed terrain rule-set rather than an evidence-weighted hotspot model. The redesign brief addresses that by separating candidate generation, signal scoring, confidence, and confirmation handling.
* **Summary of Changes:** Created a concrete DCA v2 redesign brief covering architecture, scope, risks, data use, and phased implementation. The brief keeps the first iteration client-side and focused on scoring improvements, then stages richer spatial inputs later.
* **Notes for User:** No build testing was run per repository instruction. No database or product-code changes were made.

## Review
* **Scope Covered:** Concrete redesign brief for the next DCA engine version.
* **Summary of Changes:** The new brief reframes DCA prediction as a ranked evidence model that combines terrain, skyline, openness, shelter, landscape guidance, distance suitability, cross-apiary support, and confirmation priors. It also defines a phased path from low-risk heuristic fixes to higher-resolution spatial upgrades.
* **Notes for User:** The next step, if you want to proceed, is to convert phase 1 of the brief into an implementation plan and then make the actual DCA engine changes.

---

# Task: DCA Engine Phase 1 Implementation
**Date:** 16/04/2026
**Status:** Completed

## 1. Objective
Implement phase 1 of the DCA engine redesign by replacing the current narrow terrain heuristic with a broader client-side scoring model, while keeping the existing UI flow and avoiding schema or infrastructure changes.

## 2. Impact Analysis
* **Files to Modify:** * `src/lib/dca-prediction.ts`
  * `src/hooks/useDCAPredictions.ts`
  * `docs/features/dca-prediction.md`
  * `docs/features/dca-engine-phase1-implementation-plan.md`
* **Simplicity Check:** This phase stays inside the existing client-side engine and hook. It will not add new tables, routes, pages, or external services. The work is limited to improving candidate generation, signal weighting, confidence rules, and confirmation handling without expanding the surface area of the feature.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Implement a phase 1 v2 scoring pipeline in the DCA engine that replaces fixed 2 km and 3.5 km projections with a wider weighted distance band and replaces the lowest-elevation flyway rule with a broader directional suitability score.
- [x] **Step 2:** Reduce the dominance of bowl and convergence scoring, add explicit confidence logic that reflects data quality and signal strength, and update confirmation post-processing so it reinforces rather than dominates predictions.
- [x] **Step 3:** Update the hook and any affected result-shaping logic so caching and map integration continue to work with the revised scoring output.
- [x] **Step 4:** Update documentation in `docs/features/dca-prediction.md` and capture the implementation intent in `docs/features/dca-engine-phase1-implementation-plan.md`.
- [x] **Step 5:** Present the completed phase 1 changes and prompt you to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The original DCA model encoded a narrow terrain interpretation as if it were sufficient on its own. Fixed distances, lowest-elevation flyways, and raw-score-led confidence made the output more rigid and more certain than the data justified.
* **Summary of Changes:** Reworked the DCA engine and hook for phase 1. Candidate generation now uses a wider distance band, directional selection uses a broader suitability score, terrain and convergence dominance are reduced, confidence is derived from signal quality instead of raw score alone, and confirmation adjustments now reinforce nearby hotspots with smaller effects. Updated the live DCA documentation and marked the phase 1 implementation plan as implemented.
* **Notes for User:** No build testing was run per repository instruction. Please test the build and review DCA behaviour on the community map.

## Review
* **Scope Covered:** Phase 1 DCA engine implementation.
* **Summary of Changes:** The engine in `src/lib/dca-prediction.ts` now projects hotspot candidates at 1 km, 1.8 km, 2.6 km, 3.4 km, and 4.2 km, scores directions from broader terrain context instead of the single lowest horizon rule, limits bowl support to a weaker terrain signal, caps cross-apiary reinforcement to a supporting role, and calculates confidence from signal quality rather than score thresholds alone. The hook in `src/hooks/useDCAPredictions.ts` now uses a v2 cache namespace and applies smaller, proximity-based confirmation reinforcement.
* **Notes for User:** Please test a few different apiary selections, especially single-apiary, flat-terrain, and previously confirmed hotspots, and compare whether the results now feel less rigid and less overconfident.

---

# Task: DCA Engine Phase 2 Implementation
**Date:** 16/04/2026
**Status:** Completed

## 1. Objective
Implement phase 2 of the DCA engine redesign by adding richer landscape signals beyond bare elevation, while keeping the existing client-side architecture and current map workflow intact.

## 2. Impact Analysis
* **Files to Modify:** * `src/lib/dca-prediction.ts`
  * `src/hooks/useDCAPredictions.ts`
  * `src/app/dashboard/community-map/page.tsx`
  * `docs/features/dca-prediction.md`
  * `docs/features/dca-engine-phase2-implementation-plan.md`
* **Simplicity Check:** This phase still avoids new tables, routes, services, or external datasets. The work stays inside the existing prediction engine and only adds lightweight landscape-derived signals that can be computed from the current terrain input and exposed through the current map UI with minimal changes.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Extend the DCA engine with phase 2 landscape signals, focusing on derived terrain descriptors such as skyline contrast, valley opening, saddle-like support, and lightweight openness or shelter proxies that can be computed cheaply from existing sampling.
- [x] **Step 2:** Refactor result scoring so the new landscape signals contribute explainable sub-scores and materially influence hotspot ranking without making the browser-side calculation unstable or too slow.
- [x] **Step 3:** Update the hook and map-facing result contract as needed so signal breakdowns or revised confidence behaviour continue to render cleanly in the current community-map flow.
- [x] **Step 4:** Update documentation in `docs/features/dca-prediction.md` and capture the implementation intent in `docs/features/dca-engine-phase2-implementation-plan.md`.
- [x] **Step 5:** Present the completed phase 2 changes and prompt you to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Phase 1 still improved ranking mostly through broader directional logic, but it did not yet distinguish several important terrain patterns that make a hotspot more plausible than merely low or weakly supported ground.
* **Summary of Changes:** Extended the DCA engine with derived landscape signals from the existing terrain input, including skyline contrast, valley opening, saddle-like support, and sheltered-opening proxies. Added compact signal explanations to predictions and surfaced them in the existing map popup. Updated the DCA documentation and marked the phase 2 implementation plan as implemented.
* **Notes for User:** No build testing was run per repository instruction. Please test the build and review DCA hotspot ordering and popup explanations on the community map.

## Review
* **Scope Covered:** Phase 2 DCA engine implementation.
* **Summary of Changes:** The engine in `src/lib/dca-prediction.ts` now splits directional evidence into low-horizon, skyline-contrast, and valley-opening signals, evaluates each candidate with 8-point local terrain context, adds saddle and sheltered-opening scores, and uses those signals when ranking hotspots and assigning confidence. The hook in `src/hooks/useDCAPredictions.ts` now uses a `v4` cache namespace, and the map popup in `src/app/dashboard/community-map/page.tsx` shows a compact `Signals:` explanation line.
* **Notes for User:** Please test cases with contrasting landscapes and compare whether the new signal summaries match the shape of the terrain you would expect around plausible DCA hotspots.

---

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
- [x] **Step 1:** Refactor confirmation input handling so the engine can use structured confirmation priors, including recency-aware positive support and negative suppression, instead of the current blunt nearby score delta.
- [x] **Step 2:** Update candidate scoring and confidence rules so local confirmation density, polarity, and freshness reinforce or suppress hotspots without overwhelming the terrain and landscape signals from phases 1 and 2.
- [x] **Step 3:** Update the hook cache key and result post-processing so cached predictions invalidate when local confirmation state changes and the map continues to render the revised predictions cleanly.
- [x] **Step 4:** Update documentation in `docs/features/dca-prediction.md` and capture the implementation intent in `docs/features/dca-engine-phase3-implementation-plan.md`.
- [x] **Step 5:** Present the completed phase 3 changes and prompt you to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Confirmation handling still lived outside the engine as a nearest-confirmation score patch. That made field evidence too blunt, ignored recency and clustering, and allowed cache entries to survive confirmation-state changes.
* **Summary of Changes:** Moved confirmation handling into the DCA engine as structured local priors with recency and distance decay, bounded positive support, bounded negative suppression, and lightweight positive seeding for plausible known hotspots. Updated the hook so it passes observation dates into the engine, keys cached predictions by confirmation state in a new `v5` namespace, and removes the old post-processing adjustment path. Updated the DCA feature note and marked the phase 3 implementation plan as implemented.
* **Notes for User:** No build testing was run by me per repository instruction. Please test the build and review DCA behaviour in areas with recent confirmations, older confirmations, and mixed positive and negative field evidence.

## Review
* **Scope Covered:** Phase 3 DCA engine implementation.
* **Summary of Changes:** The engine in `src/lib/dca-prediction.ts` now converts confirmations into recency-weighted local priors, applies bounded support and suppression directly during candidate scoring, and still allows recent positive confirmations to seed nearby hotspots when terrain generation misses them. The hook in `src/hooks/useDCAPredictions.ts` now removes the old nearest-confirmation score patch, passes `observation_date` into the engine, and uses a `v5` cache namespace keyed by both apiary geometry and confirmation state.
* **Notes for User:** Please test single and multi-apiary predictions in locations with recent confirmations, stale confirmations, and nearby denials so you can judge whether the revised behaviour feels more stable and less arbitrary.

---

# Task: DCA Fallback Hotspot Fix
**Date:** 16/04/2026
**Status:** Completed

## 1. Objective
Ensure that a valid selected apiary on the community map always returns at least one low-confidence DCA hotspot instead of silently returning nothing, and make the fallback state visible in the existing DCA panel.

## 2. Impact Analysis
* **Files to Modify:** * `src/lib/dca-prediction.ts`
  * `src/hooks/useDCAPredictions.ts`
  * `src/app/dashboard/community-map/page.tsx`
  * `docs/features/dca-prediction.md`
  * `docs/features/dca-fallback-hotspot-fix-plan.md`
* **Simplicity Check:** This stays inside the existing DCA engine, hook, and current map panel. It does not add schema changes, new services, or a broader model rewrite. The fix is limited to preserving a bounded fallback result and making the zero-result or fallback state legible to the user.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Adjust the DCA engine filtering so a valid selected apiary can preserve its best candidate as a low-confidence fallback when normal thresholding would otherwise remove every result.
- [x] **Step 2:** Update the result shape and hook flow as needed so fallback-only output is distinguishable from stronger predictions without breaking the current map rendering path.
- [x] **Step 3:** Update the community-map DCA panel so it communicates whether a fallback hotspot was returned or whether no result could be produced at all.
- [x] **Step 4:** Update documentation in `docs/features/dca-prediction.md` and capture the implementation intent in `docs/features/dca-fallback-hotspot-fix-plan.md`.
- [x] **Step 5:** Present the completed fix and prompt you to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The DCA engine filtered all low-scoring candidates out before the map ever received a result, and the community-map panel had no explicit fallback or zero-result state. For flat or single-apiary locations that made a real apiary appear to have no DCA at all.
* **Summary of Changes:** Added a bounded fallback path in the DCA engine so the strongest candidate is preserved as an explicit low-confidence hotspot only when normal filtering yields no result. Extended prediction objects with an `isFallback` flag, exposed run status through the hook, updated the community-map popup and selector panel to distinguish fallback guesses from stronger results, and updated the DCA documentation and fix plan.
* **Notes for User:** No build testing was run by me per repository instruction. Please test the build and verify both normal DCA results and low-confidence fallback results on the community map.

## Review
* **Scope Covered:** DCA fallback hotspot fix.
* **Summary of Changes:** The engine in `src/lib/dca-prediction.ts` now preserves one explicit low-confidence fallback hotspot when normal thresholding removes every candidate for a valid selection, instead of silently returning nothing. The hook in `src/hooks/useDCAPredictions.ts` now tracks whether a calculation returned a stronger result, a fallback-only result, or an empty result, and the community map in `src/app/dashboard/community-map/page.tsx` now surfaces that state in the selector panel and popup copy.
* **Notes for User:** Please test a flat or coastal apiary that previously returned nothing, and compare it against a stronger inland case so you can confirm the app now distinguishes fallback guesses from higher-quality DCA predictions.

---

# Task: TBKA Kilcornan Inspection Transcription
**Date:** 26/04/2026
**Status:** Completed

## 1. Objective
Transcribe the five supplied TBKA Kilcornan inspection PDFs into clean, readable text while preserving the original wording and marking uncertain handwriting explicitly.

## 2. Impact Analysis
* **Files to Modify:** * `tasks/todo-codex.md`
  * `tasks/todo-codex-codex.md`
* **Simplicity Check:** This avoids application changes entirely. The work is limited to reading the supplied scans, extracting the handwritten inspection content, and recording the completed task in the existing task files.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Rasterise or otherwise inspect each supplied PDF page so the inspection handwriting can be read reliably.
- [x] **Step 2:** Transcribe each inspection record into plain text, grouped by source PDF, and mark any illegible or uncertain text explicitly.
- [x] **Step 3:** Perform a consistency pass across the five transcriptions so dates, hive identifiers, and repeated field labels are rendered uniformly without changing meaning.
- [x] **Step 4:** Update `tasks/todo-codex.md` with completed checklist items and append a short review note for the transcription task.
- [x] **Step 5:** Deliver the completed transcriptions to you and note that build testing is not applicable for this non-code task.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Not applicable. This was a transcription task rather than a product defect.
* **Summary of Changes:** Rendered the PDFs into local page images, read the handwritten summary note and four hive sheets directly from those renders, and prepared a cleaned transcription with uncertainty markers where the scan obscures individual words.
* **Notes for User:** No build testing applies for this non-code task. The attached set includes individual sheets for Hives 1, 2, 3, and 5, plus one narrative summary page. Hive 4 is mentioned in the summary note, but there is no standalone Hive 4 sheet among the supplied PDFs.

## Review
* **Scope Covered:** TBKA Kilcornan inspection transcription.
* **Summary of Changes:** Converted the five supplied PDFs into readable local renders, transcribed the handwritten content, standardised the dates and hive references for readability, and flagged the few obscured words instead of guessing.
* **Notes for User:** The narrative note is dated 25 April 2026. The attached Hive 5 sheet is dated 26 April 2026. If you want, I can turn this transcription into a structured inspection table next.

---

# Task: Rearing Group Report Batch Scope Fix
**Date:** 04/05/2026
**Status:** Completed

## 1. Objective
Fix the rearing group report so it only aggregates batches explicitly linked to the selected rearing group, preventing private batches or batches from another group from being included in the selected group's totals.

## 2. Impact Analysis
* **Files to Modify:** * `src/hooks/useRearingGroupReport.ts`
  * `docs/features/rearing-group-report-batch-scope-fix-plan.md`
  * `tasks/todo-codex.md`
* **Simplicity Check:** The fix stayed inside the report data query and documentation. It did not alter group membership, invitations, batch creation, RLS policies, or the normal batch list visibility model.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update the report batch query to include `rearing_group_id` in the selected fields and filter batches with `.eq('rearing_group_id', groupId)`.
- [x] **Step 2:** Review the derived graft and distribution queries to confirm they continue to use only batch ids from the now group-scoped batch set.
- [x] **Step 3:** Update documentation in `docs/features/rearing-group-report-batch-scope-fix-plan.md`.
- [x] **Step 4:** Update `tasks/todo-codex.md` checklist status and append the post-task review after implementation.
- [x] **Step 5:** Prompt user to test the build and verify the selected group report totals.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The report selected batches by group member user ids and month, but did not require those batches to be linked to the selected rearing group.
* **Summary of Changes:** Scoped the report batch query to the selected `rearing_group_id` and limited queen-cell distribution counts to batch ids that belong to that same group.
* **Notes for User:** No build testing was run per repository instruction. Please test the build and verify the selected group report totals.

## Review
* **Scope Covered:** Rearing group report batch scoping.
* **Summary of Changes:** The report now counts grafted, emerged, mated, and queen-cell-distributed values only from batches linked to the selected rearing group.
* **Notes for User:** Please test the build and compare the Tribes QRQB Group report totals against known group-linked batches for May 2026.

# Task: Mobile-first experience and visual design review for people aged 50+
**Date:** 03/11/2026
**Status:** Completed

## 1. Objective
Produce an evidence-based report on mobile usability, accessibility and look and feel, suitable for conversion into a subsequent implementation plan. Account for outdoor beekeeping and variation in ability and experience among people aged 50+.

## 2. Impact Analysis
* **Files to Modify:** Planning and review documentation only; final report in `docs/reviews/mobile-first-50-plus-review-2026-11-03.md` and progress in `tasks/todo-codex.md`.
* **Simplicity Check:** Assess the existing app and recommend prioritised improvements without implementing application changes or introducing dependencies.

## 3. Execution Plan
Approved by the user with execute.
- [x] **Step 1:** Use multiple agents to inspect navigation, shared controls, core field workflows, forms, offline feedback and accessibility, recording precise code evidence.
- [x] **Step 2:** Assess typography, colour, contrast, spacing, visual hierarchy, consistency, screen density, iconography and overall visual identity. Distinguish source-code observations from findings requiring rendered screens or user research.
- [x] **Step 3:** Research current WCAG guidance, Apple and Android design guidance, and relevant exemplary mobile apps using primary sources. Explain transferable patterns and avoid unsupported best-in-class rankings.
- [x] **Step 4:** Evaluate relevant skills, component systems and review frameworks against the existing stack; flag conflicting guidance and avoid unnecessary rewrites.
- [x] **Step 5:** Produce a report covering strengths, prioritised findings, user impact, evidence, recommendations, effort bands, dependencies and measurable acceptance criteria for a future plan.
- [x] **Step 6:** Document verification limits and recommended device, outdoor and representative-user evaluation; complete the progress record and append a Review section. Do not run builds. No feature implementation is included.

## 4. Post-Task Review
* **Root Cause Found:** Uneven use of shared UI patterns, incomplete persistence feedback and conflicting design guidance.
* **Summary of Changes:** Produced a sourced report with 12 prioritised findings, visual direction, comparator patterns, candidate work packages and validation gates.
* **Notes for User:** Source review only; no builds or application changes. Rendered-screen, real-device and user validation remain explicit recommendations.


## Review
* Report delivered in docs/reviews/mobile-first-50-plus-review-2026-11-03.md.
* Confirmed current offline support and avoided repeating superseded findings. Distinguished confirmed defects from conditional risks and visual hypotheses.
* No feature was implemented or modified; a future implementation plan can use the work packages in the report.

# Task: Rendered-screen review and field-study extension
**Date:** 03/11/2026
**Status:** In Progress

## 1. Objective
Extend the existing review with observed rendered-screen evidence and a practical field study, keeping browser observations, simulations and real participant findings distinct.

## 2. Impact Analysis
* **Files to Modify:** Existing review in `docs/reviews/`; new screenshot evidence and field-study materials alongside it; task progress documentation.
* **Simplicity Check:** Review and research only. Reuse existing validation material, correcting superseded offline assumptions. No application changes or builds.

## 3. Execution Plan
Approved by the user. Rendered review and preparation may proceed; participant findings remain dependent on real sessions.
- [ ] **Step 1:** Establish an accessible running app and suitable test account/session. Confirm available browser automation before promising captures; identify safe test data for save/discard scenarios.
- [ ] **Step 2:** Capture dashboard, apiary/hive list, inspection, recovery/outbox and secondary forms at narrow phone widths, enlarged text and both themes. Record environment, viewport, app version and state for each screenshot.
- [ ] **Step 3:** Inspect rendered hierarchy, typography, colour, spacing, clipping, hit areas and keyboard/focus behaviour. Reproduce conditional source findings where possible and revise priorities from observed evidence. Emulation is not real-device validation.
- [x] **Step 4:** Prepare a participant brief, consent wording, recruitment matrix, moderator script, task cards and observation sheets for an initial 6-8 beekeepers aged 50+, with varied experience and access needs.
- [ ] **Step 5:** Have the owner or a facilitator run real-device sessions outdoors and indoors using test records, recording sunlight, device, connectivity, task completion, assistance, errors and visual comfort. Avoid distracting participants during active hive handling. No recruitment messages will be sent without explicit authorisation.
- [ ] **Step 6:** Analyse supplied anonymised observations and incorporate actual field-study findings into the report. Leave this step pending until real evidence exists; do not present simulated users as participants.
- [ ] **Step 7:** Update the review and task record with observed findings, screenshot references, limitations and revised implementation work packages. No build testing is required for documentation-only work.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*

## Progress: public rendered evidence and study preparation
* Captured six public screen states, viewport/full-page screenshots, two keyboard-focus screenshots and the unauthenticated dashboard redirect. Saved browser/version metadata, control geometry and computed styles.
* Inspected the screenshots and documented five rendered findings in the addendum. Linked the addendum and completed field-study pack from the main report.
* Confirmed /dashboard redirects to /login in the fresh browser profile. The Windows Computer Use helper is unavailable; headless Chrome works but has no authenticated session.
* Steps 1-3 and 7 remain partial until protected screens can be reviewed. No application changes or build tests were performed.
* Steps 5-6 remain pending actual participant sessions and anonymised evidence. No participants have been recruited or contacted; no field-study results are claimed.
* Next input: intended app URL and a usable dedicated test-account/session arrangement. The user has been asked without requesting passwords in chat.
## Progress: owner-supplied dashboard screenshots
* Reviewed six authenticated dashboard images and added a linked dashboard assessment with eight prioritised findings, strengths and a proposed composition to validate.
* Kept private screenshot copies in the Git-ignored scratch directory; no personal images were added to the tracked public evidence collection.
* Dashboard appearance is now covered by screenshot evidence. Browser interaction, exact CSS sizes, enlarged text, other protected screens and field-study results remain unverified.
* No app changes or builds. Remaining screenshot request: hive list/detail, inspection step/save area and existing recovery/outbox state.

## Progress: hive list and cards screenshots
* Reviewed five owner-supplied images and added seven visual findings, with separate confidence limits for semantics, touch size, contrast and interaction.
* Retained private image copies only in the Git-ignored scratch directory. Linked the assessment from the main report and updated rendered coverage.
* Next evidence: inspection steps, save/cancel controls and existing recovery/outbox states. Actual field-study observations remain pending.
* No application changes, live-record mutations or builds.

## Progress: inspection screenshots, 4 November 2026
* Reviewed six supplied images covering all five Edit Inspection stages and the save controls. Added seven findings and linked them from the main review and rendered coverage table.
* Confirmed a visible edit-mode wording mismatch and competing progression/save emphasis; distinguished rating ambiguity and reflow/exit risks from unverified behaviour.
* Retained private screenshots only in the Git-ignored scratch directory; no private inspection notes reproduced in the report.
* Dashboard, hive List/Cards and inspection edit-flow appearance are now covered. New/create states, save outcomes, recovery, interactive accessibility and real field sessions remain pending.
* No application changes, live-record mutations or builds.

# Task: Implement the consolidated mobile-first and 50+ improvement plan
**Date:** 04/11/2026
**Status:** Awaiting Approval

## 1. Objective
Implement the approved portion of the consolidated plan in small, reversible packages, preserving the field-journal identity while improving recovery, clarity, accessibility and mobile usability. Plan preparation is complete; application implementation has not begun.

## 2. Impact Analysis
* **Files to Modify:** `docs/features/mobile-first-50-plus-consolidated-implementation-plan-2026-11-04.md`; the scoped modules listed in its impact map; relevant feature/capability documentation; task progress records.
* **Simplicity Check:** Consolidates 39 findings into 12 work packages. Reuses existing UI and persistence; no framework rewrite, planned database migration or domain-rule changes. Conditional changes retain explicit evidence gates.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [ ] **Step 1 - WP01:** Confirm current behaviour and disposable test fixtures, recording unverified scenarios separately. Use multiple agents for bounded code exploration.
- [ ] **Step 2 - WP02:** Surface draft-write outcomes, protect draft deletion and guard reproduced app-owned exit gaps.
- [ ] **Step 3 - WP03:** Correct seasonal/edit/register wording, accurately explain queued sending, verify retries and reconcile superseded capability documentation.
- [ ] **Step 4 - WP04:** Apply field/choice semantics, robust focus handling and verified rating/step-state meanings.
- [ ] **Step 5 - WP05:** Correct confirmed link contrast and measured control/badge colour gaps using shared semantic roles.
- [ ] **Step 6 - WP06:** Fix reproduced clipping and responsive field layouts; verify recovery targets, enlarged text and fixed-action reachability.
- [ ] **Step 7 - WP07:** Distinguish Next from saving, preserve early save, clarify hive context and refine navigation only where evidence supports it.
- [ ] **Step 8 - WP08:** Standardise surfaces, action/status treatment and optional inputs while retaining the established visual identity.
- [ ] **Step 9 - WP09:** Clarify inspection/activity dates, stores freshness and job meaning without changing underlying domain rules.
- [ ] **Step 10 - WP10:** Make theme preferences explicit with a documented migration for legacy auto behaviour.
- [ ] **Step 11 - WP11:** Use participant evidence to decide dashboard ordering, disclosure and view defaults; keep unsupported changes deferred.
- [ ] **Step 12 - WP12:** Complete relevant verification, request owner build checks at each release boundary, update feature documentation and append the implementation Review. Do not run builds as the agent.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*

## Planning Review
* **Completed:** Consolidated all 39 findings with evidence links, priority, effort bands, ownership areas, dependencies, acceptance criteria, validation gates and phased release boundaries.
* **Approval:** Implementation awaits explicit user approval under AGENTS.md. Earlier review approval does not mark these implementation items approved or complete.
* **Remaining External Evidence:** Authenticated behaviour and real participant sessions remain necessary for the designated gates; owner screenshots do not constitute a field study.
* **Changes in This Task:** Planning/report links and checklists only. No application code, database, account data or dependencies changed; no builds run.

## Review: HTML plan export
* Exported the complete consolidated plan to docs/features/mobile-first-implementation-plan.html with accessible section navigation, responsive tables and print styling.
* Preserved all 12 work packages, finding mappings, evidence limitations and the awaiting-approval status. Implementation has not begun.
* Rendered the HTML at 390px and 1280px: no page-level horizontal overflow, all 12 packages present and all internal navigation anchors resolved. No application build run.

# Task: Read-only database evidence review
**Date:** 04/11/2026
**Status:** Complete

## 1. Objective
Resolve review uncertainties about rating semantics, unknown values, activity dates, job counts, stores readings and save constraints using live read-only MCP queries and current application code.

## 2. Impact Analysis
* **Files to Modify:** A database review addendum, the consolidated Markdown/HTML plan, main review links and task records only.
* **Simplicity Check:** Inspect live metadata and bounded account-scoped aggregates. No data/schema mutations, saved SQL parsing, application changes or builds.

## 3. Execution Plan
User explicitly approved this review by asking to proceed with read-only database review. Application implementation remains unapproved.
- [x] **Step 1:** Inspect relevant live columns, constraints, functions and policies through MCP using read-only transactions.
- [x] **Step 2:** Compare findings with current application mappings using parallel bounded code reviews.
- [x] **Step 3:** Use bounded aggregates from the authorised account only where needed to distinguish real data states; omit private row content from documentation.
- [x] **Step 4:** Document resolved facts, confirmed gaps and remaining uncertainties; refine affected plan packages and regenerate its HTML.
- [x] **Step 5:** Verify documentation and append the review summary. No build required for this documentation-only task.

## 4. Post-Task Review
### Review

Completed live MCP metadata inspection, bounded account aggregates and two independent source reviews. Added DB01-DB05 evidence, refined affected implementation packages and regenerated HTML. Confirmed value semantics, date/count definitions and stores freshness; documented partial-save and replay limitations without claiming observed data loss. No database/application changes, saved SQL parsing or builds. Implementation approval and real-device/participant verification remain outstanding.
