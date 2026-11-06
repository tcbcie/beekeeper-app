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

# Task: Rearing Group Report Batch Scope Fix
**Date:** 04/05/2026
**Status:** Completed

## 1. Objective
Fix the rearing group report so it only aggregates batches explicitly linked to the selected rearing group, preventing private batches or batches from another group from being included in the selected group's totals.

## 2. Impact Analysis
* **Files to Modify:** * `src/hooks/useRearingGroupReport.ts`
  * `docs/features/rearing-group-report-batch-scope-fix-plan.md`
  * `tasks/todo-codex.md`
* **Simplicity Check:** The fix is limited to the report data query and documentation. It does not alter group membership, invitations, batch creation, RLS policies, or the normal batch list visibility model.

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
