# Feature: Mobile-First UX Remediation for Users Over 50
**Date:** 31/08/2026
**Status:** In Progress - Phases 1 to 3 implemented, Phases 4 and 5 outstanding. See section 12 for current state.

## 1. Overview

This document is the implementation hand-off for remediating the HiveCraic user experience for mobile-first use and an audience primarily aged over 50. It consolidates a live authenticated walkthrough and a multi-agent source review into a prioritised, testable programme of work for a Claude coding agent.

The review covered the authenticated dashboard, mobile bottom navigation, mobile drawer, Hives, Records, New Inspection, login and shared UI primitives. It also examined PWA installation and update surfaces, accessibility semantics, colour tokens, touch targets, overlay positioning and representative workflow complexity.

No application data was altered during the review. No review images or credentials are part of this hand-off.

### Product outcome

The intended outcome is a calmer, safer field workflow in which a beekeeper can:

1. Find a primary destination without hidden navigation.
2. Read labels and status information comfortably on a phone in outdoor conditions.
3. Operate controls reliably with reduced dexterity or gloves.
4. Complete and recover a hive inspection without accidental data loss.
5. Use browser zoom, keyboard navigation, screen readers and voice control without losing context.
6. Distinguish primary, secondary and destructive actions without relying on colour alone.
7. Install and update the PWA without banners obscuring core controls.

### Executive assessment

HiveCraic has strong mobile foundations: labelled navigation, a field-oriented light theme, responsive layouts, voice notes, browser scaling, PWA support, offline-aware behaviour and generally clear page headings. The principal weaknesses are inconsistent shared control sizing, pervasive small text, inaccessible foreground/background colour pairs, incomplete form labelling, a long and fragile inspection workflow, hidden bottom-navigation items, overlay collisions and dense record/hive screens.

### Review evidence

The following findings were directly observed or measured:

- The New Inspection form required approximately three screen-length scrolls at the mobile breakpoint and rendered inline above the existing records list.
- The floating Mel control obscured form and card content during the authenticated walkthrough.
- Escape did not close the open mobile drawer during the walkthrough.
- Shared style definitions allow 40px default buttons, 36px small buttons and 28px extra-small buttons/icon buttons.
- A repository search found 701 uses of `text-xs` or 11px text across the source tree.
- White text on forest-600 measures 3.30:1; white on amber-600 measures 3.19:1; white on forest-500 measures 2.28:1. These do not meet the 4.5:1 WCAG AA threshold for normal text.
- The mobile bottom navigation requires a minimum 456px for five 76px destinations plus More. At a 390px viewport, only four primary items fit fully beside the pinned More button, while the scrollbar is hidden.
- The manifest points its Inspections shortcut to `/dashboard/inspections`, but no matching App Router page exists.

## 2. Scope & Simplicity

* **In Scope:**
  - Correct shared typography, touch-target and semantic colour standards.
  - Correct form labels, descriptions, errors and required-state semantics.
  - Correct mobile drawer and bottom-navigation accessibility.
  - Prevent accidental loss of a partially completed inspection.
  - Prevent fixed overlays from hiding form fields and card actions.
  - Replace horizontally scrolling primary mobile navigation with four fixed destinations plus More.
  - Simplify mobile inspection entry through progressive disclosure or a step-based full-screen flow.
  - Improve Hives and Records discovery with search and less intrusive filter/action presentation.
  - Correct the PWA inspection shortcut and coordinate installation/update/notification surfaces.
  - Respect reduced-motion preferences and mobile safe-area insets.
  - Add focused automated accessibility and interaction tests where the existing test environment permits.
  - Define moderated usability checks for beekeepers aged approximately 50–75.
* **Out of Scope:**
  - A wholesale visual redesign or rebrand.
  - Replacing Tailwind CSS or the existing semantic colour architecture.
  - Rewriting unrelated dashboard, CRM, queen-rearing, reporting or administration domain logic.
  - Database schema changes unless a separately approved draft-persistence design demonstrates they are essential.
  - Changing authentication, subscription rules, RLS policies or API authorisation.
  - Replacing the existing PWA/service-worker architecture.
  - Implementing all recommendations in one unreviewable change set.
  - Reducing functionality available to expert users; optional detail should be progressively disclosed rather than removed.
* **Existing Code Impact:**
  - Shared styling and primitives: `src/app/globals.css`, `src/components/ui/Button.tsx`, `src/components/ui/IconButton.tsx`, `src/components/ui/TextInput.tsx`, `src/components/ui/SelectField.tsx`, modal/dialog and field components.
  - Mobile shell: `src/components/BottomNavBar.tsx`, `src/components/MobileDrawer.tsx`, `src/components/Navbar.tsx`, `src/components/chat/ChatButton.tsx`, `src/app/dashboard/layout.tsx`, `src/lib/navigation.ts`.
  - Inspection and records: `src/app/dashboard/records/page.tsx`, `src/components/records/RecordFiltersBar.tsx`, `src/components/records/forms/InspectionForm.tsx` and relevant record-card components.
  - Hives: `src/app/dashboard/hives/page.tsx` and the hive-card component resolved during implementation.
  - PWA/notifications: `public/manifest.json`, `src/components/InstallPrompt.tsx`, `src/components/UpdateNotification.tsx`, `src/components/NotificationPermissionBanner.tsx`, `src/components/ui/Toast.tsx`.
  - Login/authentication presentation: `src/app/login/page.tsx` and shared form primitives only; authentication behaviour is not in scope.

### Simplicity rules for implementation

1. Fix shared primitives before applying one-off page overrides.
2. Keep each implementation phase independently reviewable and releasable.
3. Preserve existing data contracts unless a phase explicitly requires and justifies a change.
4. Prefer CSS, semantic HTML and small state-management changes over new dependencies.
5. Do not combine UX remediation with unrelated refactors of large components.
6. Preserve existing British/Irish date formatting and domain terminology unless usability testing identifies a specific comprehension issue.

## 3. Technical Design

### Architecture

The remediation should be implemented as five bounded layers.

#### Layer A: shared accessibility foundations

Create or extend shared primitives so individual screens inherit safe defaults:

- Set normal buttons and form controls to a minimum 48px height.
- Permit a compact 44px variant only where density is essential.
- Set icon-button hit areas to at least 44×44px even when the icon remains 18–24px.
- Make normal body and form text 16px; make navigation/help/metadata text at least 14px unless demonstrably non-essential.
- Define semantic foreground/background pairs that meet WCAG AA in light and dark themes.
- Add a reusable Field wrapper that wires generated IDs, `htmlFor`, help text, errors, required state, `aria-describedby`, `aria-invalid` and `aria-errormessage`.
- Add a reduced-motion media query that disables non-essential transitions, smooth scrolling and decorative animation.

Do not repair dozens of screens with copied class strings where a shared primitive can establish the rule once.

#### Layer B: mobile shell and navigation

Replace the horizontally scrolling primary row with four fixed destinations and a pinned More button. The initial recommendation is:

1. Overview
2. Hives
3. Records
4. Tasks
5. More

Confirm the final set with the user before implementation. Apiaries can remain immediately available within More or replace Overview if usage data supports that choice.

The drawer must behave as modal navigation:

- `aria-expanded` and `aria-controls` on More.
- Accessible drawer title.
- `aria-current="page"` for the active destination.
- Closed drawer removed from interaction through conditional rendering or `inert` plus appropriate hidden semantics.
- Initial focus placed inside the drawer.
- Focus trapped while open.
- Escape closes the drawer.
- Focus returns to More after closing.
- Background interaction prevented while open.

Derive dashboard bottom padding from the actual navigation height plus `env(safe-area-inset-bottom)` instead of relying on a fixed `pb-20`.

#### Layer C: focused inspection workflow

On mobile, inspection entry should become a focused route, modal sheet or full-screen panel rather than a long inline block above the records list. The implementation choice must preserve URL/query-based preselection and browser navigation.

Recommended stages:

1. **Hive and visit** — apiary, hive, date, time, weather.
2. **Queen and colony** — queen status, brood frames, queen cells, population.
3. **Health and behaviour** — temperament, brood pattern, swarming, calmness, drones, disease and hygiene.
4. **Notes and follow-up** — notes, voice note, photograph, equipment changes and next-visit tasks.
5. **Review and save** — concise summary, validation and final submission.

Requirements:

- Show progress such as “Step 2 of 5”.
- Clearly mark optional sections.
- Keep advanced sections collapsed unless the user opens them.
- Preserve contextual apiary/hive preselection.
- Provide top-level Previous/Next controls with 48px targets.
- Save a local draft after meaningful changes where technically safe.
- At minimum, track dirty state and confirm before Cancel, close, route change or destructive reset.
- Announce validation errors and move focus to the first invalid field.
- Keep final Save explicit; draft persistence must never imply server submission.
- Retain the existing voice-note and photograph capabilities.

Start with client-local draft persistence using an existing persistence pattern if one is suitable. A database-backed draft must be a separate approved design because it affects schema, synchronisation, privacy and offline conflict handling.

#### Layer D: list discovery and action safety

For Hives and Records:

- Add a prominent text search supporting hive number/name and relevant record identifiers.
- Collapse secondary filters behind a Filters control that shows an active-filter count.
- Keep common presets visible, such as “Needs inspection” or a selected time period.
- Move Edit, Delete and secondary QR actions into a clearly labelled overflow menu where appropriate.
- Prefer Archive to Delete in primary UI.
- Replace native `confirm()` with the shared confirmation system.
- Give destructive actions distinct wording and sufficient separation from safe actions.
- Consider an optional compact list view while retaining the existing card view.
- Preserve filter state using existing persistence conventions.

#### Layer E: overlays and PWA surfaces

Introduce one shared positioning/coordination rule for bottom-fixed UI:

- Bottom navigation
- Mel
- Toasts
- Install prompt
- Update prompt
- Notification permission banner
- Bulk action bars

Only one interruptive banner should occupy the mobile bottom region at a time. Mel should be hidden, docked or moved into More while a long form is active. Toasts must not cover current inputs or action controls.

Correct the manifest shortcut from `/dashboard/inspections` to the approved Records creation URL. Verify the destination opens the intended inspection flow with appropriate preselection behaviour.

### Database Connections (MCP Server)

No database change is required for phases 1, 2, 4 or the PWA correction.

Inspection draft protection should initially use local dirty-state confirmation and, if approved, local draft persistence. If a later decision requires server-synchronised drafts:

1. Stop implementation.
2. Prepare a separate schema and data-lifecycle plan.
3. Inspect the live database through the configured MCP server.
4. Define ownership, RLS, retention, offline conflict and cleanup behaviour.
5. Obtain explicit approval before creating a migration or changing application data contracts.

Do not infer the deployed schema from saved SQL files.

### Accessibility target

The target is WCAG 2.2 AA for the affected interfaces, with special emphasis on:

- 1.3.1 Info and Relationships
- 1.4.3 Contrast (Minimum)
- 1.4.10 Reflow
- 1.4.11 Non-text Contrast
- 2.1.1 Keyboard
- 2.1.2 No Keyboard Trap
- 2.4.3 Focus Order
- 2.4.7 Focus Visible
- 2.5.5 Target Size (Enhanced) as the design preference
- 3.2.1 On Focus
- 3.3.1 Error Identification
- 3.3.2 Labels or Instructions
- 3.3.4 Error Prevention
- 4.1.2 Name, Role, Value

## 4. Edge Cases & Risks

* Increasing shared button and input sizes may expose wrapping or overflow on dense desktop/admin screens. Audit consumers before changing defaults and add temporary compatibility variants only where necessary.
* Replacing bottom navigation destinations may affect established muscle memory. Confirm the four primary items and retain all other destinations in More.
* A multi-step inspection can hide context or make backwards editing cumbersome. Preserve values between steps, provide a review screen and make Previous always available.
* Local draft persistence can restore stale data into the wrong user or hive. Namespace drafts by authenticated user and form context, reject expired/invalid drafts and clear them after a confirmed successful save or explicit discard.
* Route-change protection must not trap users after a successful save. Dirty state must reset only after confirmed persistence.
* Browser back-button handling can produce duplicate prompts. Use one central exit guard and test browser, link and close paths.
* Raising text size can make weather, badge and table content wrap. Prefer reflow and fewer simultaneous facts rather than shrinking text.
* Focus trapping must not interfere with assistive technology or nested confirmation dialogs. Use the existing modal architecture where possible and test nested cases.
* Dark and light themes require separate contrast verification. Do not assume a valid light-theme pair is valid in dark mode.
* Overlay coordination must account for iOS safe areas, Android browser chrome, installed PWA mode and the on-screen keyboard.
* Moving destructive actions into menus must not make legitimate maintenance tasks undiscoverable. Use labelled menus and clear confirmation copy.
* PWA update and install prompts must remain recoverable if dismissed; do not force installation or update during an active form.
* Offline behaviour must never imply that unsynchronised data has reached the server.
* Existing test/lint infrastructure has known unrelated failures. Do not weaken checks or modify unrelated generated/external files to make a phase appear green.

## 5. Implementation Phases

1. Phase 1: **Accessibility and safety foundations**
   - Correct semantic colour pairs.
   - Raise shared target sizes and typography floors.
   - Implement the Field primitive and migrate login, record filters and inspection fields first.
   - Correct mobile drawer semantics, keyboard operation and focus management.
   - Add inspection dirty-state confirmation.
   - Add reduced-motion handling.
2. Phase 2: **Mobile shell and overlay coordination**
   - Replace scrolling bottom navigation with four fixed destinations plus More.
   - Correct active-state semantics and safe-area padding.
   - Coordinate Mel, banners, toasts and update/install surfaces.
   - Correct the manifest inspection shortcut.
3. Phase 3: **Inspection workflow redesign**
   - Introduce the approved full-screen progressive flow.
   - Preserve preselection and existing domain logic.
   - Add step validation, review and local draft behaviour.
   - Keep optional expert fields accessible through progressive disclosure.
4. Phase 4: **Hives and Records simplification**
   - Add search and collapsible filters.
   - Reduce persistent card actions.
   - Improve destructive-action protection.
   - Consider a compact list preference.
5. Phase 5: **Dashboard simplification and user validation**
   - Propose a task-oriented Today hierarchy rather than changing every dashboard section at once.
   - Validate with representative users before removing or relocating information.
   - Apply only approved refinements from moderated findings.

### Phase gates

Each phase requires its own plan and explicit approval before code changes. Do not submit one large patch covering all phases. Finish, review and verify a phase before starting the next.

## 6. Prioritised Findings Register

| Priority | Finding | Evidence | Required outcome |
|---|---|---|---|
| P0 | Long inspection form can lose substantial work | `InspectionForm.tsx:688-694, 1801-1818`; `records/page.tsx:1287-1303` | Focused progressive flow plus dirty-state protection |
| P0 | Shared targets can be 28–40px | `globals.css:531-560, 628-653`; shared button components | Essential targets at least 44×44px; normal controls 48px |
| P0 | Pervasive small text | 701 `text-xs`/11px matches; bottom navigation at 11px | 16px body/form values and 14px navigation/helper floor |
| P0 | Green/amber foreground pairs fail AA | Measured ratios from theme tokens | Every normal-text pair at least 4.5:1 |
| P0 | Form controls lack associated labels | Login, record filters and inspection details | Programmatic name, help and error association |
| P0 | Bottom navigation hides a primary item | `BottomNavBar.tsx:12-55`; 456px minimum width | Four fixed destinations plus More; no horizontal scrolling |
| P1 | Drawer remains interactive while visually closed | `MobileDrawer.tsx:75-89, 103-166` | Proper modal navigation semantics and focus lifecycle |
| P1 | Floating Mel obscures form/card controls | `chat/ChatButton.tsx:14-29`; live walkthrough | No overlay may cover active content or actions |
| P1 | Hives/Records are difficult to scan | Dense filters and long card lists | Search, collapsible filters and safer secondary actions |
| P1 | Dashboard exposes too many simultaneous sections | Dashboard overview composition | Approved task-oriented Today hierarchy |
| P1 | PWA inspection shortcut is invalid | `manifest.json:54-64`; no matching page | Shortcut opens the actual inspection creation flow |
| P2 | Image enlargement relies on double-click | Inspection/varroa image components | Single-tap and labelled View larger action |
| P2 | Motion preferences are not respected | Global smooth scrolling and animation utilities | Reduced-motion override |
| P2 | Fixed content padding may not cover safe area | Dashboard `pb-20` versus bottom-bar safe inset | Shared calculated bottom inset |

## 7. Acceptance Criteria

### Shared foundations

- [ ] Every essential interactive control in the remediated surfaces has a hit area of at least 44×44px; normal form controls and primary buttons are at least 48px high.
- [ ] Mobile navigation labels are at least 14px and do not use `leading-none` where it impairs legibility.
- [ ] Body copy and form values are at least 16px; essential instructions and metadata are at least 14px.
- [ ] All normal-sized foreground/background pairs meet at least 4.5:1 in light and dark themes.
- [ ] Focus indicators remain clearly visible and meet non-text contrast requirements.
- [ ] Reduced-motion preference disables non-essential smooth scrolling and decorative movement.

### Forms and inspection

- [ ] Every visible field label is programmatically associated with its control.
- [ ] Help and error text are programmatically connected and errors are announced.
- [ ] Cancel, close, browser navigation and route navigation cannot silently discard a dirty inspection.
- [ ] A common inspection can be completed without opening advanced sections.
- [ ] Existing values survive Previous/Next navigation.
- [ ] The final review summarises the selected hive, visit date and all material observations.
- [ ] Successful save clears any draft only after server success is confirmed.
- [ ] Failed/offline save leaves the draft recoverable and does not claim success.

### Navigation and overlays

- [ ] All four primary destinations and More are visible at 320px, 360px, 390px and 430px without horizontal scrolling.
- [ ] The active destination exposes `aria-current="page"`.
- [ ] More exposes its expanded state and controlled drawer.
- [ ] The drawer closes on Escape, traps focus while open and restores focus when closed.
- [ ] Closed drawer links are not focusable or exposed as active interface.
- [ ] Content remains visible above the bottom navigation and safe-area inset.
- [ ] Mel, prompts, toasts and bulk bars do not cover active inputs or action controls.

### Hives, Records and PWA

- [ ] A user can find a known hive by typing its identifier.
- [ ] Applied filters are visible without keeping every filter control open.
- [ ] Destructive actions are not adjacent to the most common safe action without separation and confirmation.
- [ ] The installed Inspections shortcut resolves to a real page and opens the inspection creation flow.
- [ ] Install and update prompts do not interrupt an active form and are recoverable after dismissal.

## 8. Verification Matrix

| Area | Automated verification | Manual verification |
|---|---|---|
| Theme contrast | Token-level contrast tests for semantic pairs | Light/dark visual pass outdoors and indoors |
| Shared controls | Component tests asserting size classes and accessible names | Touch test on 360px and 390px devices |
| Drawer | Keyboard/focus tests for open, close, Escape and return | Screen-reader and keyboard walkthrough |
| Bottom navigation | Render tests for item count/labels/active state | Verify no horizontal scrolling at target widths |
| Inspection | Dirty-state, step persistence, validation and save-failure tests | Complete a real inspection one-handed and offline |
| Record filters | Accessible-name tests and state persistence | Find a known record with and without filters |
| Hives | Search and destructive-confirmation tests | Find/edit/archive a known hive |
| Overlays | State tests ensuring mutually exclusive banners | Test with keyboard open, PWA mode and safe-area devices |
| PWA shortcut | Manifest assertion against approved URL | Launch from an installed shortcut |
| Motion | CSS assertion for reduced-motion rules | Enable OS reduced motion and inspect transitions |

Do not run a production build unless the repository owner changes the instruction in `AGENTS.md`. Run only phase-relevant tests/lint checks that are permitted, report unrelated baseline failures honestly and ask the owner to perform the build verification.

## 9. Moderated Usability Validation

Recruit approximately six to eight beekeepers aged 50–75, including users with different levels of smartphone familiarity. Test:

1. Start an inspection from the dashboard.
2. Select the correct hive and record a common inspection.
3. Recover after accidentally pressing Back or Cancel.
4. Find and update a specified hive.
5. Filter records to the last three months.
6. Complete the same tasks at 200% zoom.
7. Repeat a save while offline or on weak connectivity.
8. Install or update the PWA without losing current work.

Test on 360px and 390px phones, in bright outdoor light, one-handed, and where safe with gloves or a reduced-dexterity simulation.

Target outcomes:

- Start an inspection within 15 seconds.
- Complete a common inspection without facilitator assistance.
- No accidental data loss.
- No participant misses a primary navigation destination.
- Participants correctly distinguish Save, Cancel, Archive and Delete.
- Every participant understands whether an offline action is saved locally, synchronised or failed.

## 10. Claude Coding-Agent Operating Instructions

Before implementing any phase, the Claude coding agent must:

1. Read `AGENTS.md` and follow it exactly.
2. Read this document and inspect the current implementation; do not assume line numbers remain unchanged.
3. Trace every component or symbol to its definition and usages before editing.
4. Prepare the required task plan and phase-specific feature plan from the repository templates.
5. Stop and obtain explicit owner approval before changing production code.
6. Use British English in documentation, code comments and communication.
7. Keep changes surgical and phase-scoped; do not perform drive-by refactors.
8. Preserve existing domain logic, authentication, subscription and data-access behaviour unless the phase explicitly requires a reviewed change.
9. Never read, print or commit secrets or test credentials.
10. Do not modify the pre-existing untracked external-reference file.
11. Do not add dependencies unless the approved phase demonstrates that the existing platform cannot provide the required behaviour.
12. Use direct database MCP access for any approved database work; do not infer the live schema from SQL files.
13. Add or update focused tests for changed behaviour.
14. Do not hide unrelated baseline lint/test failures; report them separately.
15. Do not run the production build. Ask the owner to perform build verification.
16. Update this document’s status and the relevant task Review section only after the approved phase is genuinely complete.

### Recommended first implementation request

The first Claude task should be limited to Phase 1 foundations. It should not redesign the full inspection workflow in the same change. A suitable instruction is:

> Read AGENTS.md and the mobile-first UX remediation plan. Inspect the current shared controls, colour tokens, login fields, record filters, inspection cancellation paths and mobile drawer. Prepare a surgical Phase 1 plan covering accessible semantic colour pairs, 44–48px shared target defaults, labelled Field semantics, inspection dirty-state protection, drawer keyboard/focus behaviour and reduced-motion handling. Identify all consumers that may regress, define focused tests, and stop for approval before making changes.

## 11. Review Status

- **Live surfaces reviewed:** authenticated dashboard, mobile drawer, Hives, Records and New Inspection at the mobile breakpoint.
- **Static surfaces reviewed:** login, shared primitives, PWA/install/update/notification components and representative form/card implementations.
- **Data modified:** none.
- **Repository production files modified by the UX review:** none.
- **Build run:** no, in accordance with repository instructions.
- **Images retained as evidence:** none.
- **Credentials retained:** none.

---

## 12. Programme Status

*Added 31/08/2026, after Phases 1 to 3. This section is the entry point for anyone picking the programme up. The sections above are the original review and remain as written, so the reasoning behind each decision stays legible.*

### Delivery so far

| Phase | State | Commit |
|---|---|---|
| Test infrastructure repair | Done | `8e83fdb` |
| Phase 1 — accessibility and safety foundations | Done, deployed and verified | `b036597` |
| Phase 2 — mobile shell and overlay coordination | Done, pushed, **build not yet verified** | `ccdeb78`, `6ffa68d`, `3adaba5` |
| Phase 3 — focused inspection workflow | Done, pushed, **build not yet verified** | `adea7bb` |
| Typography floor (own stage, not numbered) | T1–T5 done, pushed, **build not yet verified**; long tail deferred | see `mobile-first-typography-floor-plan.md` |
| Phase 4 — Hives and Records simplification | 4A–4D done, pushed, **build not yet verified** | see `mobile-first-phase4-list-simplification-plan.md` |
| Phase 5 — dashboard and user validation | Not started, gated on moderated testing | — |

Each phase has its own plan in `docs/features/mobile-first-phaseN-*.md` and its own task record in `tasks/mobile-first-phaseN-todo.md`. Those task records carry the implementation notes, the decisions taken and the defects found along the way, and are the place to look before changing any of this work.

### Findings register — current state

| Priority | Finding | State |
|---|---|---|
| P0 | Long inspection form can lose substantial work | Closed. Phase 1 added dirty-state protection across six exit paths; Phase 3 added the stepped flow and review. |
| P0 | Shared targets can be 28–40px | Closed in Phase 1. Buttons 48px, compact 44px, icon buttons 44px, form controls 48px. |
| P0 | Pervasive small text | Substantially closed by the typography stage: 971 `text-xs` → 393, 68 arbitrary sub-14px → 4, both floors applied. The remaining 393 are the deferred long tail, held by a ratchet test. |
| P0 | Green/amber foreground pairs fail AA | Closed in Phase 1, at AAA rather than AA. |
| P0 | Form controls lack associated labels | Closed. Phase 1 did the visit fields; Phase 3 did the remainder. |
| P0 | Bottom navigation hides a primary item | Closed in Phase 2. Four destinations plus More, fluid, no scrolling. |
| P1 | Drawer remains interactive while visually closed | Closed in Phase 1, using inert and a full focus lifecycle. |
| P1 | Floating Mel obscures form and card controls | Closed in Phase 2. Mel docks while a form is active. |
| P1 | Hives and Records are difficult to scan | Largely closed in Phase 4: search on both screens, secondary filters collapsed behind a counted Filters control, Delete demoted into an overflow menu and Archive promoted onto the card. The compact list view is deferred. |
| P1 | Dashboard exposes too many simultaneous sections | Open — Phase 5, gated on user testing. |
| P1 | PWA inspection shortcut is invalid | Closed in Phase 2. |
| P2 | Image enlargement relies on double-click | Closed. Four opening sites became real buttons opened by a single tap; the fifth is a zoom toggle inside the viewer and deliberately keeps its gesture. The finding understated it — the thumbnails were `<div>`s with no keyboard path at all. |
| P2 | Motion preferences are not respected | Closed in Phase 1. |
| P2 | Fixed content padding may not cover safe area | Closed in Phase 2, with one shared inset token. |

### The typography floor — what shipped

**It was never assigned to a phase**, which is why it outlived Phases 1 to 3. It has
now had its own stage and its own plan
(`docs/features/mobile-first-typography-floor-plan.md`,
`tasks/mobile-first-typography-todo.md`).

Both floors from section 7 were applied, after the owner confirmed that the 16px
tier still stands — it had quietly dropped out of this document's own summary, which
remembered only 14px. Body copy and form values are 16px; labels, badges, table
headers, helper text and metadata are 14px.

| Measure | Before | After |
|---|---|---|
| `text-xs` (12px) | 971 | 393 |
| Arbitrary sizes below 14px | 68 | 4 |
| Form controls below 16px | 13 | 0 |

The 393 that remain are the deliberately deferred long tail — settings, admin,
research, tools, CRM, reports and traceability. A ratchet in
`tests/styles/typography-floor.test.ts` records both counts as ceilings, so they can
fall but never rise; new 12px text fails the suite rather than accumulating unnoticed,
which is how the count reached 971 in the first place.

The four arbitrary sizes left are deliberate: three in `CellFrame`, where a 64px-wide
native date input cannot render at 14px and needs a layout answer rather than a class
change, and the version string, which is decorative.

**The rule used, since the backlog asked for one and none existed.** Text must reach
the floor if a user could need to read it to act. It may stay smaller only if
deleting it entirely would cost the user nothing — which came to about 25 sites out
of 971, in practice two ASCII-art rows in the hive-stack diagram and the version
badge. A badge is meaningful: "badge" is a shape, not a licence to be unreadable.

### Corrections to this document found during implementation

Recorded so they are not rediscovered.

* **The four-destination navigation target was achievable.** The apparent conflict between four destinations, no scrolling at 320px and 14px labels dissolved once the fixed 76px slot width was replaced by fluid distribution and two labels were shortened for the bar only.
* **Two additional inspection discard paths existed** beyond those listed: starting another record, and opening a different inspection, both of which destroyed in-progress work silently.
* **The small-text count was understated** at 701; it was 973, plus 70 arbitrary sub-14px sizes.
* **Icon buttons had no base size at all**, not 28px. Only the extra-small variant had an explicit floor.
* **NotificationPermissionBanner is not global**; it mounts only on the Batches page.
* **The service worker could reload a tab that never showed the update prompt**, because clients.claim() plus an unconditional controllerchange reload affects every open client. This was a data-loss path the review did not mention.
* **Update dismissal did not persist**, so a dismissed update returned on the very next page load.
* **The five stages for the inspection flow did not cover every block.** Honey Super Fullness was unassigned, and two blocks straddled a boundary.
* **A rewrite of the inspection form was not necessary**, and would have been actively harmful: roughly twenty-five committed behaviours and eight already-fixed defects live in that markup.
* **`:where(.above-bottom-nav)` never worked in production.** A comment in
  `globals.css` closed early, so the prose after it plus a second `*/` were parsed as
  part of a selector and CSS error recovery discarded the whole rule. Seven fixed
  surfaces use that class and none declares a mobile `bottom` of its own, so the
  update prompt, install prompt, chat button and dialog, toasts, the notification
  banner and the hives bulk bar all fell back to `bottom: auto` on every phone. This
  was Phase 2 work. Fixed, with a test that now fails on a stray delimiter.
* **The shared `fj-*` families other than `fj-btn` are not wrapped in `:where()`.**
  They sit in `@layer utilities` after the Tailwind import, so at equal specificity
  they beat any `text-*` passed through `className` — a per-instance size override
  silently does nothing. Two victims found. Migrating them is a sound follow-up.
* **The 16px tier had dropped out of section 12's summary**, which remembered only
  14px. A stage planned from the summary alone would have closed the P0 without
  meeting the acceptance criteria written for it.
* **The small-text estimate was low again.** The unconstrained-flow category was
  put at ~170 sites; it was 271.
* **Widening table headers does not break the wide tables.** Both the batch table
  and the 16-column leaderboard are `overflow-x-auto` with `min-w-full`, so they
  already scroll and simply scroll a little more.
* **`leading-none` scales with font size** rather than collapsing, so the dense
  weather strip tolerated the rise. What could not tolerate it was the 7-day
  forecast: seven `flex-1` columns give ~41px each at 320px against ~48px needed, so
  the max/min pair was reflowed to stack.

### Deliberately deferred, with reasons

* **Local inspection drafts.** Phase 1 already prevents the loss they were meant to prevent. The feasibility audit found the photograph cannot be stored, and that impersonation switches the live Supabase session *before* the page reloads, leaving a window in which one user's work could be written under another user's key. This needs a designed feature, not a rider on another phase.
* **Browser back and forward guarding.** Closing it means manipulating the history stack and risks trapping a user trying to leave, which section 4 of this document warns against. In-app link clicks are guarded; this vector is knowingly open.
* **A full-screen inspection panel on mobile.** The stepped flow already reduced the form from roughly three screens to one short step at a time, and the click guard closes the protection gap completely. This is now a presentation choice rather than a safety one.
* **Migrating the eleven bespoke modals onto the shared dialog hook.** No acceptance criterion requires it, and it would put a large amount of working UI at risk.
* **Converting the remaining native confirm() calls.** Five sit on the records page and belong with Phase 4.

### Known issues outside this programme's scope

* **137 test failures across 18 files.** Pre-existing, and invisible until the test suite was repaired, because it could not load at all. They are missing ConfirmProvider and ToastProvider wrappers, stale mocks, and one text-chunking assertion. None are in code this programme touched.
* **getAppVersion() falls back to a hardcoded 1.4.2** while the application is at 1.11.3. Version handling is a manually triggered task by repository rule.
* **MD/PWA-UPDATE-SYSTEM.md describes a network-first cache strategy** that the service worker does not implement; it is cache-first for static assets and map tiles.
* **Deferring the update reload widens a version-skew window.** Once controllerchange has fired, the new worker controls the page while old JavaScript runs and caches have been purged, so a lazily-loaded chunk requested in that window can fail. Accepted deliberately: the alternative is discarding a beekeeper's in-progress inspection.

### Outstanding verification

Phases 2 and 3 are pushed but have not been exercised in a browser. The checks that matter, none of which a test can perform:

1. The bottom navigation at 320px — labels on one line, no ellipsis. The widths were computed from font metrics, not measured.
2. Both themes throughout. Phase 2 rebound every dark: utility from the operating system to the in-app theme control.
3. Tabbing past the closed mobile drawer — focus must never reach a hidden link. jsdom does not implement inert, so no test proves this.
4. All five inspection steps at 320px.
5. Pressing Enter in the weight field on step one — it must advance, not save.
6. Starting an inspection, deploying, and confirming the tab does not reload until the work is saved or discarded.
7. The seven floating surfaces that use `.above-bottom-nav` — update prompt, install prompt, chat button and dialog, toasts, notification banner and the hives bulk bar — now that the rule positioning them actually applies. None of them has ever been seen sitting where it was designed to sit.
8. The 7-day forecast strip at 320px, where the temperatures now stack.
9. `HiveListCard`'s hive-stack diagram, whose `h-8` and `h-10` rows now hold 14px text and a 14px gauge numeral.
10. The graft tracker's inputs on a real iPhone: thirteen controls moved to 16px specifically to stop Safari zooming on focus.
