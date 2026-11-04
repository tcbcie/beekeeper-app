# Feature: Mobile-first usability and visual consistency - consolidated implementation plan
**Date:** 04/11/2026
**Status:** Draft - findings verified 04/11/2026, awaiting implementation approval

## 1. Overview

Improve HiveCraic for mobile field work and users aged 50+, preserving the warm field-journal identity, labelled bottom navigation, generous controls and five-stage inspection flow. Prioritise protection of observations, accurate feedback and understandable controls before broader changes to page composition.

This is the single implementation backlog for the five review documents. It consolidates **39 findings into 12 work packages**, with overlaps explicitly mapped. The reviews remain the evidence record; their separate suggested work lists are superseded by this plan.

| Evidence | IDs | Review |
| --- | --- | --- |
| Source review and standards research | F01-F12 | [Main review](../reviews/mobile-first-50-plus-review-2026-11-03.md) |
| Browser-rendered public pages | R01-R05 | [Public-screen review](../reviews/mobile-first-rendered-review-2026-11-03.md) |
| Owner-supplied dashboard images | D01-D08 | [Dashboard review](../reviews/mobile-first-dashboard-screenshot-review-2026-11-03.md) |
| Owner-supplied hive List/Cards images | H01-H07 | [Hive review](../reviews/mobile-first-hive-screenshot-review-2026-11-03.md) |
| Owner-supplied Edit Inspection images | I01-I07 | [Inspection review](../reviews/mobile-first-inspection-screenshot-review-2026-11-04.md) |
| Code and live-database verification | Verdicts for every ID; new issues V01-V22 | [Verification](../reviews/mobile-first-findings-verification-2026-11-04.md) |

**Database evidence update (04/11/2026):** The [read-only database review](../reviews/mobile-first-database-review-2026-11-04.md) refines the original 39 findings. Live metadata and scoped aggregates establish model/calculation facts, not successful failure recovery or participant outcomes. Implementation remains unapproved.

**Verification update (04/11/2026):** The [verification of findings](../reviews/mobile-first-findings-verification-2026-11-04.md) checked every finding against the current code and the live database. Of the 39 findings, 27 are confirmed, 11 are partly right (overstated, mis-described or partly built already) and one needs a device; none was wrong. Of DB01-DB05, four are confirmed and one is partly right. It found 22 further issues, tracked here as V01-V22. Each package below carries a **Verification refinement**; where it conflicts with the original package text, the refinement wins. The four owner decisions it raised were decided on 04/11/2026; see *Owner decisions*.

**Evidence limits:** public-page rendering and authenticated screenshots exist. Authenticated interactions, current real-device behaviour and field-study outcomes remain unverified. Screenshot concerns are not automatically confirmed accessibility failures. Existing-inspection editing is not equivalent to creating a new offline inspection.

**Approval boundary:** preparing this plan is complete. Implementation has not begun. Approval authorises the bounded work below; packages marked conditional still require their stated evidence before a behavioural change. No account credentials, recruitment messages, production-data experiments or database migrations are implied.

## 2. Scope & Simplicity

* **In Scope:** targeted save/recovery safeguards; truthful copy; accessible field/choice semantics; readable contrast and reflow; consistent action/state styling; clearer hive/date context; limited visual refinements; user validation of larger information-order changes.
* **Out of Scope:** a framework or native-app rewrite, a new brand, replacing all components, changing rating scales or historical values, changing biological inspection/feed thresholds without a separate product decision, building new offline editing capability, or claiming a completed field study.
* **Existing Code Impact:** reuse current components and local persistence. The following is an initial ownership map, not permission to modify every file listed. Re-read current code and narrow each patch before implementation.

| Area | Likely existing modules |
| --- | --- |
| Drafts, local queue and inspection persistence | `src/lib/inspection-draft.ts`, `src/lib/inspection-outbox.ts`, `src/lib/inspection-discard.ts`, `src/components/records/InspectionOutbox.tsx`, `src/components/records/UnfinishedInspectionNotice.tsx`, `src/components/OfflineIndicator.tsx`, `src/app/dashboard/records/page.tsx` |
| Inspection stages, ratings and navigation | `src/components/records/forms/InspectionForm.tsx`, `src/components/records/forms/InspectionStepper.tsx` (star ratings are drawn by `renderStarRating` in `InspectionForm.tsx`; `src/components/ui/RatingButtons.tsx` is unused), `src/components/ui/ToggleRow.tsx`, `src/components/ui/FormActionRow.tsx`, `src/hooks/useNavigationGuard.ts`, `src/hooks/useBackNavigation.ts` |
| Shared fields, focus and surfaces | `src/components/ui/fieldSemantics.tsx`, `src/components/ui/RadioChoiceGroup.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Surface.tsx`, `src/components/ui/ModalShell.tsx`, `src/hooks/useDialogA11y.ts`, `src/app/globals.css` |
| Secondary forms | `src/components/tools/PurchaseList/PurchaseItemForm.tsx`, `src/components/tools/ProfitLoss/FinancialRecordForm.tsx` |
| Public access screens and theme | `src/app/login/page.tsx`, `src/app/forgot-password/page.tsx`, `src/components/ui/PageShell.tsx`, `src/app/providers/theme-provider.tsx`, `src/components/theme-switcher.tsx`, `src/app/layout.tsx` |
| Dashboard and hive views | `src/app/dashboard/page.tsx`, `src/components/dashboard/SeasonalLeadCard.tsx`, `src/components/dashboard/TodoList.tsx`, `src/components/dashboard/SeasonalReminders.tsx`, `src/lib/seasonal-lead.ts`, `src/lib/dashboard-todo.ts`, `src/components/chat/ChatButton.tsx`, `src/app/dashboard/hives/page.tsx`, `src/hooks/useQueenDetail.ts`, `src/components/hive/HiveListRow.tsx`, `src/components/hive/HiveListCard.tsx`; relevant route/selector code only after tracing each changed interaction |

Keep changes in separate, reversible work packages. Do not mix a visual pass with persistence or classification changes in the same patch. Preserve unrelated work in the checkout.

## 3. Technical Design

### Architecture

Retain Next.js, React, Tailwind, the shared UI layer and Dexie. Prefer local improvements over new dependencies. Use a small set of semantic roles for primary/secondary/destructive actions, selected choices, status labels and links. Avoid broad utility overrides whose consequences cannot be checked across both themes.

The target visual direction is a calm, practical field journal: warm neutral ground, readable dark text, restrained forest emphasis, purposeful status colours, a limited serif accent and consistent surfaces. WCAG and mobile access needs take precedence over aesthetic skill suggestions for compact desktop controls, unfamiliar navigation or automatic clock-based appearance changes.

**Priority:** P1 addresses lost-work, access or interpretation risks; P2 addresses consistency and friction; P3 is evidence-dependent restructuring. **Effort:** S is a small bounded change, M spans several related components/states, L requires multiple journeys or participant evidence. These are relative planning bands, not delivery promises.

#### WP01 - Establish the behavioural baseline

**P1 prerequisite | M | Evidence: F05, F08, F09, H05, I05, I07, V02-V04.**

Use a dedicated disposable dataset and accessible authenticated session. Record create versus edit behaviour, dirty exits, local draft/queue/server states, validation, hidden dialog controls, selected hive context and keyboard/safe-area reachability. Check unchecked choices; the meaning of step ticks is already settled in code (visited). Reproduce suspected failures without modifying personal records.

**Output:** a short scenario matrix stating observed, passes, fails or untested, with platform/version. Lack of access leaves a scenario untested, not failed. This does not block source-confirmed copy or label fixes; it gates behaviour-sensitive fixes and release claims.

**Database refinement - WP01:** Add DB05 disposable-fixture scenarios for lost responses, failed local persistence, super-adjustment crash windows, partial task creation and concurrent edits. Record DB01 unknown/zero/negative contracts. The read-only review did not execute these scenarios.

**Verification refinement - WP01:** The navbar Back cannot be reached while the form is open: below 768 px the form is full-screen, and at 768 px and above the navbar Back is hidden. Record the desktop Records Home button as the known unguarded exit (V03). Add scenarios: a failed queue write followed by a lost response, giving a duplicate row and deleted photos (V02); typing lost when the form closes within the 800 ms draft delay (V04); an unreadable draft; and Android double Back with CloseWatcher.

**Progress - WP01 (04/11/2026):** Code pass and Chrome runs complete in the [WP01 baseline](mobile-first-wp01-baseline.md): 32 scenarios and the DB01 value contract. All 11 Chrome scenarios behaved as the code predicted; 7 confirm defects for WP02-WP07. Phone-width scenarios moved to the owner's phone checklist, which is pending.

#### WP02 - Protect unfinished observations

**P1 | M | Evidence: F01, F02, F05, I05, V02-V04. Depends on WP01 for exit-path changes.**

Return and display draft-write outcomes: complete, photographs omitted, or failed. Preserve live inputs if persistence fails. Confirm draft deletion with clear consequences and a safe keep option. Guard reachable app-owned exits consistently; treat native Back and platform CloseWatcher support separately. Preserve the existing distinction between new drafts and edits; assess an edit-recovery feature separately if needed.

**Acceptance:** blocked/full storage never produces false recovery assurance; omitted photographs are disclosed; one mistaken restart tap cannot delete the only draft; agreed reachable exits preserve work or ask clearly. No history-stack trapping, duplicate drafts after save or cross-account recovery.

**Database refinement - WP02:** Preserve recovery information and operation identity when local progress writes fail or server receipt is uncertain. A saved inspection does not establish that super adjustment and follow-up tasks completed. See DB05.

**Verification refinement - WP02:** Route the desktop Records Home button through the existing discard confirmation (V03). Rewrite the "still here on this phone" message, which is shown when nothing was kept (V02). Write the latest draft when the form closes instead of cancelling the pending save (V04). Do not delete uploaded photos while the server outcome is uncertain (V02). Confirming Start again and returning a write result from `saveInspectionDraft` are each small, self-contained changes.

**Progress - WP02 (04/11/2026):** Code complete, awaiting the owner's build test and a re-run of S01, S02, S09-S11, S15 and S17. Home on Records asks first; Start again asks first; a waiting draft write happens when the form closes; the form says when the phone could not keep a copy or its photos; an unstored, unsent save keeps its photos and reuses its id on Save again; the no-signal message now says the work is in the form. Not changed: unreadable drafts, browser Back (by design), drafts for edits. See `inspection-drafts.md` and `inspection-outbox.md`.

#### WP03 - Make state and task wording truthful

**P1 | S/M | Evidence: F06, F12, D01, I01, R02, V18-V20. Depends on WP02 for persistence-state wording.**

Replace the contradictory winter label with a neutral seasonal heading, subject to owner sign-off because the label is in the agreed dashboard specification. Use edit-specific review wording such as “Review your changes before updating this inspection”. Make login/register headings, copy and primary submit action agree (Enter already keeps the current mode). Explain that queued sending requires the app to be open with a connection; distinguish waiting, retry needed and sent. Add bounded visible-app retry only after examining existing idempotency and concurrency handling. Correct superseded offline claims in the earlier validation pack and capability documentation.

**Acceptance:** existing records are not described as never recorded; a local save is never described as server receipt; registration mode has a matching primary action; retries do not duplicate records or overwrite newer changes. Documentation matches the shipped behaviour for both create and edit.

**Database refinement - WP03:** Persisted row IDs protect inspection/task retries, but the live super-adjustment RPC is not replay-idempotent. Do not broaden its automatic retries. Define recovery for failed local persistence and partial task creation. Any transactional RPC or operation-ledger migration requires a separate proposal and approval. See DB05.

**Verification refinement - WP03:** Outbox copy lives in `InspectionOutbox.tsx` (lines 82 and 119), `records/page.tsx` (line 872) and `OfflineIndicator.tsx` (line 57). "Waiting" also covers expired sessions, server errors and another tab sending, so stop calling every case "no signal" (V20). Make a refused follow-up task leave a lasting notice, not just a toast. Warn when the super adjustment changes nothing because the hive is not visible (V19). Fix both review-step lines used in edit mode (`InspectionForm.tsx` lines 2553 and 2602) and the literal backticks on the reset page (V18). Widen the documentation fixes to `mobile-first-over-50-ux-remediation-plan.md`, `inspection-drafts.md` and `inspection-save-any-step.md`, and update `dashboard-today-screen.md` if the winter label changes. Edit conflicts need a database proposal, because inspections have no version column.

**Progress - WP03 (04/11/2026):** Code complete, awaiting the owner's build test. Winter label is now "Winter: just check food"; the review step says what is and is not saved, separately for edits; the login description and green button follow the mode; waiting-inspection messages no longer claim "no signal" and say sending needs the app open; "this phone" is now "this device"; reset page backticks removed; post-send warnings stay until closed; a super count the server could not change now warns. Old documents corrected or given dated update notes. Deferred: automatic retry while the app stays open (the super change must first be made safe against a failed progress write), and edit conflicts (needs a database proposal).

#### WP04 - Make fields, choices and ratings understandable

**P1 | M | Evidence: F03, F08, I03, I04, V01, V05-V08. Depends on WP01 for focus reproduction and existing scale meaning.**

Adopt shared labels/descriptions/errors in the sampled purchase and financial forms. Use native radio semantics for choices, reusing `RadioChoiceGroup`/`RadioInput`. Filter dialog focus candidates for actual visibility/focusability while preserving stack and focus restoration. Add visible, accessible rating meanings using the established scale direction. Ticks mean visited (`InspectionStepper.tsx`); decide whether a tick is the right mark for that and rename the misleading `isComplete`. Verify unknown versus negative values before changing checkbox presentation; do not introduce a new data state without design review.

**Acceptance:** labels focus their fields; assistive technology identifies field names, selected choices and rating meaning; hidden controls cannot break modal focus; selected/unknown/no states remain consistent with existing records. Historical rating values are unchanged.

**Database refinement - WP04:** Queen/egg checkboxes save unchecked as false and collapse existing NULL on edit. Ratings use zero for unrecorded despite some database defaults of three. Preserve historical values and agree unknown-state presentation and rating anchors. Fix queen averages to exclude unrated zeroes, as hive averages and selection scoring already do (`averageRated`), and prevent unrecorded super fullness becoming zero. No historical data migration is authorised. See DB01/DB04.

**Verification refinement - WP04:** Target `renderStarRating` in `InspectionForm.tsx`; `RatingButtons.tsx` is unused (V08). Include the disease ratings, where more stars means worse (V07). Label every field in both secondary forms, not a sample, and make the financial "Type" label name its group. Fix the purchase form's Low priority, which looks the same selected or not (V01). Queen averaging is a calculation defect that skews the queen comparison table (V05). Super fullness has three false-zero paths: other supers set to 0 when one is changed, unrecorded supers shown as 0%, and non-numbers saved as 0 (V06). Whether previous readings carry into a new inspection is an owner decision. For dialog focus, also stop Shift+Tab escaping from the panel itself.

#### WP05 - Apply accessible colour and status tokens

**P1 measured failures, P2 remaining candidates | S/M | Evidence: F04, D08, H06, R05, V10, V14, V15, V17.**

Correct the source-confirmed forest text-link pairing with an accessible semantic token. Measure actual control boundaries, badge colours and both-theme states before fixing screenshot-only concerns. Keep meaningful queen/configuration colours while standardising metadata and status styling. Retain text or other indicators alongside colour.

**Acceptance:** normal text reaches 4.5:1 on its actual surface; applicable non-text indicators reach 3:1; focus and selected states remain distinguishable. No regression to already-corrected white-on-fill pairs. Do not claim a screenshot-derived ratio or require decorative dividers to meet control-boundary rules.

**Verification refinement - WP05:** These are measured failures, no longer candidates: forest-600 text at 3.1-3.3:1 in light, used 125 times across the app, 59 of them with no dark colour (4.45:1 on the dark surface, V10); the Full Size badge at 1.74:1 in light (V14); field borders at 1.26:1 light and 1.42:1 dark; and the dark voice button at 4.12:1 (V15). Use forest-800 in light (forest-700 fails on elevated cream) and forest-300/400 in dark. Underline links inside sentences, such as View Changes (V17). Give field borders their own token rather than darkening the shared `--border-color`. Include the assistant button, which the earlier white-on-green fix missed.

#### WP06 - Improve narrow-screen and enlarged-text layouts

**P1 reproduced clipping, P2 other layouts | M | Evidence: F07, R01, R04, H04, I07, V16.**

Fix login brand/label wrapping and mobile padding without hiding overflow. Stack the three two-column rows in the purchase form and the financial Date/Amount row, and allow choice groups to reflow. Enlarge the standalone access-screen links: Forgot Password, Request reactivation and Back to Login. Test five-stage navigation and the action bar before selecting a responsive alternative. Give Add hive a visible label and show Clear without opening Filters on phones; preserve search and comfortable targets.

**Acceptance:** supported 200% text enlargement and 320 CSS-pixel reflow do not clip meaningful content or controls; essential standalone controls target 48x48 CSS pixels; fields and actions remain reachable with the keyboard and safe areas. Root-font stress, browser zoom and device font settings are recorded separately. Fixed bars are changed only where obstruction is reproduced.

**Verification refinement - WP06:** F07 is estimated to squeeze the category field even at normal text size on 360-390 px phones; if a device check confirms it, raise it to P1. Make the photo picker reachable by keyboard (V16). Check whether "Update Inspection" wraps to two lines at 320 px, and the 72 px space kept under the fixed Hives button at enlarged text. The login clipping came from a root-font stress test; repeat it with browser zoom and phone font settings.

#### WP07 - Clarify progression, inspection scope and exits

**P1 action distinction, P2 navigation refinement | M | Evidence: I02, I05, F09, H05, V09, V22. Depends on WP01, WP02 and WP06.**

Give Next and saving distinct emphasis on intermediate stages; retain deliberate early save. Make the final stage's save action primary. Show concise hive/visit context and clarify previous-stage versus close behaviour. Verify dashboard two-tap selection and the persistent inspection action; improve the chooser or scroll/focus instruction if confusion is reproduced. Preserve selected-apiary context without silently choosing a hive.

**Acceptance:** users predict Next versus Save changes correctly; save remains possible without completing optional sections; the intended hive is explicit before observations are entered; all exits respect WP02. Any chooser change is checked against both touch and pointer navigation.

**Verification refinement - WP07:** Next and Save are the same colour (#166534), so give them different emphasis (V09); the last step already makes Save the only main button. Pass the selected apiary from the Hives New inspection button (V22); whether a hive remembered from earlier that day is still preselected is an owner decision. The dashboard already scrolls the apiaries into view after the first tap; only moving focus and announcing the instruction remain. Previous and Close already have accessible names, and Close already asks before discarding; what remains is a hive context line and keeping Close reachable. Update the out-of-date phone layout in `inspection-save-any-step.md`.

#### WP08 - Unify visual presentation without changing information order

**P2 | M | Evidence: F10, D04, D06, D07, H02, H06, I06, R03. Depends on WP05-WP07 where shared components overlap.**

Standardise section surfaces, clickable rows, badges and action roles. Keep hive identity ahead of repeated card navigation; make secondary actions visibly secondary. Reduce redundant access-screen framing/credits above the form. Give voice/photo input consistent treatment and mobile wording. Verify the assistant's actual function and accessible name before changing its label or emphasis. Keep status pills distinct from actions.

**Acceptance:** equivalent components look related in light and dark; the primary task remains apparent; optional voice/photos are discoverable without dominating; personal identity and beekeeping imagery are preserved. Review representative screens together. No unmeasured rendering-performance claim, wholesale colour removal or reduced touch sizes.

**Verification refinement - WP08:** Status pills are already non-interactive; the fix is wording, because "Heft", "Check" and "To do" read as instructions. The assistant's accessible name is "Open Mel", so it can be judged now. "Click to upload / or drag and drop" appears in four files. The voice button bypasses the shared button tones. On access screens only the credits and extra framing need moving; the version already sits last.

#### WP09 - Clarify time, observations and stores meaning

**P1 meaning clarification, P2 presentation | M | Evidence: D02, H01, H07, V11-V13. Depends on verified existing calculations.**

Name what recency measures; separate inspection age, latest activity and stores-observation date. Explain percentage scale and thresholds according to current rules. Distinguish historical observations from actionable jobs and make count definitions understandable. Add appropriate descriptive context before considering changes to classification.

**Acceptance:** labels match the actual calculation; old readings do not appear live; users understand what a job count includes. Do not change inspection/feed thresholds, task resolution rules or interpret historical records differently without a separately justified decision.

**Database refinement - WP09:** Hive badges measure inspection age; dashboard visits include other activity. Jobs count grouped tasks, concerns, an in-season visit suggestion and scale alerts, not individual tasks or unique hives. Stores carry dated seasonal readings; NULL is not zero. Explain these distinctions and test same-day ties, stale readings and winter suppression. Whether non-task events qualify as due tasks remains a product decision; none qualified in the scoped sample. See DB02-DB04.

**Verification refinement - WP09:** There are three different overdue rules. The Hives summary counts 14 days or more and never switches off in winter; the dashboard needs more than 14 days, counts any record and is off November to February; hive day counts use UTC, so they read a day low just after midnight in summer time (V11). Build on the existing Recorded, Suggested, Task and Scale labels, and add dates to queenless, varroa and grouped-task rows. List rows show stores only below Enough and never with a date. The stores starting value can come from any past reading, not just this season's (V12). A shared apiary's page shows no concerns (V13). Whether the Hives "Need inspection" count should switch off in winter is an owner decision.

#### WP10 - Make appearance preferences explicit

**P2 | M | Evidence: F11, V21.**

Provide clear Light, Dark and Use device setting options. If a schedule is retained, label it separately. Preserve existing explicit preferences. Decide and document how an existing stored auto preference maps to the new choices; avoid silently treating clock-based auto as consent to a different behaviour. Keep provider, initial bootstrap and native-control colour scheme aligned.

**Acceptance:** no first-paint theme mismatch; choices persist; system changes affect only the device-setting choice; manual selection is not overwritten; app text accurately describes switching behaviour. Verify both themes after the token/layout changes.

**Verification refinement - WP10:** The switcher already shows "Auto · 6am-8pm", so the gap is the missing Use device setting option and the clock default. The mapping decision must also cover users with no saved preference, who default to clock-based Auto. Add a device check of the two browser-bar colour tags, of which only the first is updated (V21). The Tailwind dark-mode fix is already done.

#### WP11 - Validate information order and disclosure before changing defaults

**P3 conditional | M/L | Evidence: D03, D05, H03, H04; supporting H02, R03. Depends on WP07-WP09 and representative-user evidence.**

Compare the current dashboard with a short attention summary followed by apiaries and expandable supporting content. Compare Cards with optional setup detail and a shorter operational summary. Consider fewer recent visits and concise seasonal guidance with full detail available. Retain List and Cards and existing user choice; do not assume a new default from screenshots alone.

**Acceptance:** task-start success and recognition of important work are maintained or improved; advice and history remain findable; appearance and comfort ratings support the change. If evidence is mixed, keep the current ordering/default and ship only the independently supported improvements. One short formative comparison can guide a bounded iteration; avoid an app-wide redesign.

**Verification refinement - WP11:** Three candidate changes already exist: To do stops at five with Show all, Recent visits links to View All Records, and List is already the phone default. Compare tighter limits rather than adding these. Add Upcoming Events and the new hive model and photo row (03/11) to the evidence; Cards are probably longer than the screenshots show.

#### WP12 - Verify, document and prepare release

**P1 release gate | M/L including external sessions | Evidence: all packages and the [field-study pack](../reviews/mobile-first-field-study-pack-2026-11-03.md).**

Repeat relevant device and participant tasks against each changed release candidate. Record known gaps, update feature/capability documentation and the task checklist, and append the review summary. Keep private recordings, identifiers and raw screenshots outside source control. Request the owner to run the build; do not run it as the agent.

**Acceptance:** critical loss/access/save-understanding scenarios pass; affected screenshots and behaviour are reviewed; the owner reports the build result; unresolved limitations and deferred hypotheses are explicit. No participant results are invented or inferred from owner screenshots.

### Database Connections (MCP Server)

No schema change or production-data migration is planned. Use existing application models and review evidence first. If ratings, timestamp meaning, task state or save receipt needs database verification, use a direct MCP database connection and scoped read-only queries; never parse saved SQL files. Use disposable test records for mutation scenarios. If correct unknown/negative semantics require a schema change, stop that subtask at a concrete proposal for separate approval rather than quietly expanding scope.

### Owner decisions (decided 04/11/2026)

1. **Winter label (WP03):** change "Winter: nothing to do" to "Winter: just check food". In winter the card only shows food checks (Heft, and Record feed when a scale hive loses weight), so the label stays true. Update `dashboard-today-screen.md` to match.
2. **"Need inspection" in winter (WP09):** switch it off from November to February, like the dashboard, and use the same rule (more than 14 days, local dates). Fix the UTC day count at the same time.
3. **Super fullness (WP04):** do not carry readings into a new inspection. Each visit starts as "not recorded", with last visit's reading shown beside it as a hint. The same principle suggests the stores dial should stop seeding 50 (to be settled in WP04/WP09).
4. **Starting from Hives (WP07):** pass the apiary being viewed and leave the hive for the beekeeper to choose. The remembered hive still applies when starting from Records.

## 4. Edge Cases & Risks

| Risk | Required handling |
| --- | --- |
| Interrupted writes, storage limits, attachment failures | Distinguish partial from complete persistence; preserve visible data; do not clear the draft before confirmed safe hand-off. |
| Reconnect, double taps, concurrent tabs, expired session | Check idempotency and user ownership; prevent duplicate/incorrect saves; preserve recovery across permitted session interruptions. |
| Edits versus new records | Verify separately; no promise of offline edit support based on new-inspection queuing. |
| Old data and scale direction | Preserve stored values, unknown/no distinction and existing rating meaning; validate labels against the model. |
| Native Back, CloseWatcher and keyboard behaviour | Record browser/platform differences; do not trap history or rely on hidden navbar controls being reachable. |
| Personal-account testing | Use read-only observations for the owner's real account; destructive/failure scenarios need disposable fixtures. |
| Theme preference migration | Document legacy auto behaviour, preserve explicit choices and keep bootstrap/provider in sync. |
| Enlarged text and fixed chrome | Use actual layout/focus measurements plus visual inspection; no blanket padding changes from cropped screenshots. |
| Small participant sample | Report raw counts and contrary evidence; no population claims or compliance certification. |
| Multiple patches touching shared UI | Land shared semantics/tokens before page-level polish; check affected consumers in both themes. |
| Unavailable authenticated session | Complete safe source-confirmed changes when approved; leave interaction-dependent gates open rather than declaring success. |

Verification should be proportionate. Use targeted lint/type checks and existing relevant checks for changed code; avoid blanket test runs and tests that simply mirror a cosmetic edit. Behavioural verification is essential for persistence and exits. No agent-run build. Ask the owner to test the build at each intended release boundary.

Real-device coverage: iPhone/Safari and Android/Chrome, browser and installed PWA, a modest handset, portrait/landscape, software keyboard, larger text, both themes, reduced motion, VoiceOver/TalkBack and keyboard navigation. Layout coverage should include 320/360/390/430 CSS-pixel widths; emulation is recorded as emulation.

Use the prepared 6-8-person field study before adopting WP11's default/order changes. For each core task report unaided completion and assistance as raw counts. The earlier 90% proposed gate means all succeed for a task attempted by only 6-8 people; do not hide failures in averages or repeated attempts. Investigate any lost work, false server-save belief or access barrier even if only one participant encounters it. Record appearance, reading comfort and action clarity separately. Conduct baseline sessions before relevant changes where possible, then repeat with order/learning effects documented.

## 5. Implementation Phases

1. **Phase 0 - Confirm baseline and scope (WP01).** Re-read current code with multiple agents for bounded exploration, inventory actual states and use disposable fixtures. Record unknowns. Safe copy/label fixes can be prepared in parallel after approval; no dependency on complete participant recruitment.
2. **Phase 1 - Protect work and remove clear barriers (WP02-WP05).** Separate commits/patches for persistence, state wording, semantics and colour. Fix source-confirmed problems first; reproduce conditional navigation/focus cases before changing behaviour. **Release A gate:** targeted checks pass, owner build check and critical create/edit/recovery scenarios verified. Do not claim reliability if storage/exit scenarios remain untested.
3. **Phase 2 - Improve the working flow and visual consistency (WP06-WP10).** Complete responsive controls before action/context refinements, then shared visual treatment. Clarify dates and appearance preferences without changing domain rules. **Release B gate:** coherent screenshots across representative screens, both themes and enlarged text; real-device form/keyboard/save checks; owner build check.
4. **Phase 3 - Validate and apply bounded information-order changes (WP11).** Run baseline/comparison sessions using the field-study pack. Apply only changes supported by task and preference evidence. If access or participants are unavailable, keep this phase pending and retain existing defaults.
5. **Phase 4 - Retest and close the programme (WP12).** Retest affected tasks, document capabilities and known gaps, request final owner build verification and update the review/checklists. **Release C gate:** evidence supports each adopted change; no unresolved critical loss/access issue in agreed scenarios. Retain low-confidence suggestions as deferred backlog, not completed work.

### Finding coverage and de-duplication

| Findings | Work package(s) |
| --- | --- |
| F01, F02 | WP02 |
| F03 | WP04 |
| F04 | WP05 |
| F05 | WP01, WP02 |
| F06, F12 | WP03 |
| F07 | WP06 |
| F08 | WP01, WP04 |
| F09 | WP01, WP07 |
| F10 | WP08 |
| F11 | WP10 |
| R01, R04 | WP06 |
| R02 | WP03 |
| R03 | WP08; WP11 if broader composition/default decisions follow |
| R05 | WP05 |
| D01 | WP03 |
| D02 | WP09 |
| D03, D05 | WP11 |
| D04, D06, D07 | WP08 |
| D08 | WP05 |
| H01, H07 | WP09 |
| H02 | WP08; WP11 for competing composition variants |
| H03 | WP11 |
| H04 | WP06; WP11 for changes to default information density |
| H05 | WP01, WP07 |
| H06 | WP05, WP08 |
| I01 | WP03 |
| I02 | WP07 |
| I03 | WP04 |
| I04 | WP04 |
| I05 | WP01, WP02, WP07 |
| I06 | WP08 |
| I07 | WP01, WP06 |
| DB01 | WP01, WP04 |
| DB02, DB03 | WP09 |
| DB04 | WP04, WP09 |
| DB05 | WP01, WP02, WP03, WP12 |
| V01, V05-V08 | WP04 |
| V02-V04 | WP01, WP02 |
| V09, V22 | WP07 |
| V10, V14, V15, V17 | WP05 |
| V11-V13 | WP09 |
| V16 | WP06 |
| V18-V20 | WP03 |
| V21 | WP10 |

A finding listed in multiple packages has shared dependencies, not multiple independent implementations. Track acceptance against the original finding ID. WP12 verifies the combined result.
