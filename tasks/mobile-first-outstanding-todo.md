# Task: Mobile-First Programme — Outstanding Work
**Date:** 31/08/2026
**Status:** Backlog. Section B is largely complete; everything else is unstarted.

## 1. Objective

Hold the work that remains in the mobile-first remediation programme after Phases 1
to 3, so none of it is lost between sessions. Nothing in this file has been begun.

Read `docs/features/mobile-first-over-50-ux-remediation-plan.md` section 12 first.
It carries the current state of the whole programme, the corrections found during
implementation, and the reasoning behind everything deferred.

## 2. Impact Analysis

* **Files to Modify:** none yet. Each item below needs its own plan and its own
  approval before any code changes, per the repository workflow.
* **Simplicity Check:** these are separate pieces of work with separate risk
  profiles. They are listed together only so they are not forgotten, and should not
  be implemented as one change set.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*

### A. Verify Phases 2 and 3 in a browser — do this first

Both are pushed but have never been exercised in a real browser. Nothing else
should be built on top of them until this is done.

- [ ] **Step 1:** Bottom navigation at 320px — every label on one line, no ellipsis.
  The widths were computed from font metrics, not measured, so a substituted font
  could be wider than calculated.
- [ ] **Step 2:** Both themes throughout. Phase 2 rebound every `dark:` utility from
  the operating system to the in-app theme control; anyone whose OS did not match
  their chosen theme has never seen the dark theme render as designed.
- [ ] **Step 3:** Tab past the closed mobile drawer — focus must never land on a
  hidden navigation link. jsdom does not implement `inert`, so no test proves this.
- [ ] **Step 4:** All five inspection steps at 320px, checking the rating rows,
  drone grids and cell toggles that were each fixed once for narrow screens.
- [ ] **Step 5:** Press Enter in the weight field on step one — it must advance, not
  save. This was a High finding in the Phase 3 audit.
- [ ] **Step 6:** Start an inspection, deploy an update, and confirm the tab does not
  reload until the work is saved or discarded.
- [ ] **Step 7:** Dense screens — settings, user management, team pages — which hold
  most of the 85 extra-small controls that grew in Phase 1.

### B. The typography floor — largely done

**Stages T1 to T5 are complete.** See `docs/features/mobile-first-typography-floor-plan.md`
and `tasks/mobile-first-typography-todo.md`. Both floors were applied: 16px for body
copy and form values, 14px for labels, badges, headers, helper text and metadata.

| Measure | Before | Now |
|---|---|---|
| `text-xs` | 971 | 393 |
| Arbitrary sizes below 14px | 68 | 4 |
| Form controls below 16px | 13 | 0 |

- [x] **Step 8:** The rule was written — text reaches the floor if a user could need
  to read it to act; it stays smaller only if deleting it would cost nothing.
- [x] **Step 9:** Highest-traffic screens done first, then the safe long tail.
- [x] **Step 10:** A ratchet in `tests/styles/typography-floor.test.ts` holds both
  counts as ceilings. An ESLint rule was written and rejected: 393 remaining
  occurrences make it either a failing lint run or 449 warnings burying three real
  ones.

What is left of it:

- [ ] **Step 8a:** The deferred long tail — 393 `text-xs` in settings, admin,
  research, tools, CRM, reports and traceability. Lower traffic; the ratchet holds
  the line meanwhile. Re-measure and decide whether it is worth a further pass.
- [ ] **Step 8b:** `CellFrame`'s cell grid — a 64px-wide native date input and a
  `w-16` select cannot render at 14px. Needs a layout answer, not a class change.
- [ ] **Step 8c:** `WildColoniesTab` (23 columns) and `QueenCompareTable`'s sticky
  `w-[160px]` column, both genuinely constrained. Best addressed by the mobile card
  views Phase 4 will introduce.
- [ ] **Step 8d:** Consider wrapping the `fj-badge`, `fj-chip`, `fj-icon-btn`,
  `fj-control` and `fj-panel-*` families in `:where()`, as `fj-btn` already is.
  Without it a `text-*` passed through `className` is silently ignored.

### C. P2 — image enlargement relies on double-click

Five call sites still use `onDoubleClick` to open an image: `InspectionCard.tsx:107`,
`VarroaCheckCard.tsx:50`, `InspectionForm.tsx:2105`, `VarroaCheckForm.tsx:477` and
`ImageZoomModal.tsx:146`. Double-click is awkward with reduced dexterity and
unreliable on touch.

- [ ] **Step 11:** Make a single tap or click open the image, and add a labelled
  "View larger" control so the affordance is visible rather than discovered.

### D. Phase 4 — Hives and Records simplification

Scoped in the parent plan, not started. Search by hive identifier, filters collapsed
behind a control showing an active count, fewer persistent card actions, Archive
preferred to Delete, and the five remaining native `confirm()` calls on the records
page moved onto the shared dialog.

- [ ] **Step 12:** Write the Phase 4 plan and obtain approval.

### E. Phase 5 — dashboard, gated on user testing

The parent plan requires moderated validation with six to eight beekeepers aged
50–75 **before** the dashboard is changed. This is not a coding task yet.

- [ ] **Step 13:** Run the moderated sessions described in parent plan section 9.
- [ ] **Step 14:** Write the Phase 5 plan from what those sessions actually show.

### F. Deferred features, each needing its own design

- [ ] **Step 15:** **Local inspection drafts.** Deferred deliberately. The
  photograph is a `File` that cannot be stored, images run to 10MB against a ~5MB
  quota, there is no draft precedent in the codebase, and impersonation switches the
  live Supabase session *before* the page reloads — leaving a window in which one
  user's in-progress inspection could be written under another user's key. Phase 1
  already prevents the loss this was meant to prevent, across six exit paths.
- [ ] **Step 16:** **Browser back and forward guarding.** Knowingly open. Closing it
  means manipulating the history stack and risks trapping a user trying to leave,
  which the parent plan's own risk list warns against.
- [ ] **Step 17:** **A full-screen inspection panel on mobile.** Now a presentation
  choice rather than a safety one: the stepped flow cut the form from roughly three
  screens to one short step, and the click guard already closes the protection gap.
- [ ] **Step 18:** **Migrating the eleven bespoke modals onto `useDialogA11y`.** No
  acceptance criterion requires it, and it would put a lot of working UI at risk.

### G. Pre-existing issues, outside this programme

Recorded because they were found during it, not because it caused them.

- [ ] **Step 19:** **137 test failures across 18 files.** Invisible until the suite
  was repaired, because it could not load at all. Missing `ConfirmProvider` and
  `ToastProvider` wrappers, stale mocks, and one text-chunking assertion. None are
  in code this programme touched.
- [ ] **Step 20:** **`getAppVersion()` falls back to a hardcoded `1.4.2`** while the
  application is at 1.11.3. Version handling is a manually triggered task by
  repository rule, so this is reported rather than changed.
- [ ] **Step 21:** **`MD/PWA-UPDATE-SYSTEM.md` documents a network-first cache
  strategy** that the service worker does not implement; it is cache-first for
  static assets and map tiles.
- [ ] **Step 22:** **The deferred update reload widens a version-skew window.** Once
  `controllerchange` has fired, the new worker controls the page while old
  JavaScript runs and caches have been purged, so a lazily-loaded chunk requested in
  that window can fail. Accepted deliberately — the alternative is discarding a
  beekeeper's in-progress inspection — but it could be bounded with a warning if it
  proves to bite.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*

* **Root Cause Found (if applicable):** [To be completed]
* **Summary of Changes:** [To be completed]
* **Notes for User:** [To be completed]

## 5. Recommended Order

1. **A**, the browser verification, because three phases of work rest on it and none
   of it has been seen running.
2. ~~**B**, the typography floor~~ — T1 to T5 done. Only the deferred items above remain.
3. **C**, the double-click fix, which is small and self-contained.
4. **D**, Phase 4.
5. **E**, Phase 5, once the moderated sessions have happened.

F and G can be picked up at any point; none of them blocks anything else.
