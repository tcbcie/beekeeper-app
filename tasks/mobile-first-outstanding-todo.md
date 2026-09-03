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

### A. Verify Phases 2 and 3 and the typography stage in a browser — do this first

**Partly done, 31/08/2026**, against production (www.hivecraic.com, v1.11.3) in an
emulated 360x740 Android viewport with the OS set to light and the app set to dark.
Measured programmatically rather than by eye, so the figures are exact.

| Check | Result |
|---|---|
| 1 — bottom navigation | **Pass.** Five labels at 14px, none clipped. Widest ("Records") measures 50.3px; with padding a slot needs 58.3px, so five need 292px — fits at 320px with 28px spare. Font resolved to Segoe UI, a substitution, and still fits. |
| 2 — both themes | **Pass, in the exact divergence case.** OS prefers light, app set to dark, app renders dark. 660 rules bound to the `.dark` class, **0** to `prefers-color-scheme`. Body `#0a0f1a` on `#f5f5f5`, about 17:1. |
| 3 — drawer focus | **Pass.** Closed drawer carries `inert` and holds 17 links; zero off-screen focusable elements in the document. |
| 7 — dense screens | **Pass.** Settings: no text under 14px, no target under 44px, no horizontal overflow. |
| 7a — `.above-bottom-nav` | **Pass.** The rule is present in the CSSOM and both floating surfaces compute `bottom: 72px` (64px bar + 8px gutter). They were `bottom: auto` before. |
| 7b — forecast strip | **Pass.** Seven columns at 47.7px; temperatures stacked at 14px occupying 20.9px. Would still fit at 320px. |
| 7c — hive-stack diagram | **Pass.** `h-8`/`h-10` rows hold 14px with no clipping. |
| 4 — five inspection steps | **Pass.** Walked all five at 360px. No text under 14px, no horizontal clipping, no page overflow, no control under 44px on any step. Step 1's five fields are all 16px and 48px tall with labels associated by `for`/`id`. The two 20x20 checkboxes on step 2 sit inside labels giving a 46x237px effective target. The review step lists only recorded values and is the only place a Save button exists. |
| 6 — deferred update reload | **Pass, proved as an A/B.** Tested without deploying, by dispatching `controllerchange` at the live handler. Clean page: immediate reload. Dirty inspection: no reload, form open, hive still selected, still on step 1. Discarding then flushed the pending reload and the page reloaded. All three legs of the Phase 2 design confirmed in production. |
| 5 — Enter on step 1 | **Pass.** With the form valid, Enter in the weight field advanced to "Step 2 of 5" and saved nothing. The High finding from the Phase 3 audit is fixed in production. |

**Nuance found on check 5, worth knowing.** With step 1 *incomplete*, Enter never
reaches `handleSubmit` at all: native constraint validation intercepts first, because
hive, date and time carry `required`. The browser moves focus to the hive select and
shows its own bubble ("Please select an item in the list"), so the guard added in
Phase 3 never runs and the app's own styled, announced error never appears. The
outcome is safe and arguably helpful, but it is the browser's behaviour rather than
the designed one — the Phase 3 plan intended JavaScript validation throughout.
Consider whether the native bubble or the app's own error is wanted here.

Also confirmed in passing: **Phase 1's dirty-state guard works in production.**
Cancelling a part-filled inspection raised the "Keep editing / Discard" dialogue
rather than discarding silently.

**How check 6 was run without a deploy.** The mechanism under test is
`controllerchange` -> reload, deferred while unsaved work exists. Dispatching that
event synthetically at `navigator.serviceWorker` exercises the real production
handler with no deploy and no write. The control leg matters as much as the test
leg: without it, "no reload" would be indistinguishable from a listener that was
never wired up.

*(Verification was read-only: both test inspections were discarded, and the record
count was 89 before and after every step.)*

Also measured: **no visible text below 14px on Dashboard, Records or Settings**, and
no horizontal overflow on any page visited. On Hives the only sub-14px text is `═══`
and `███` — the two ornaments deliberately exempted.

**Found, pre-existing and not caused by this programme:** the `h-3` queen-excluder
box in `HiveListCard` is 9px inside its borders and holds a 12px glyph, so it
overflows by 3px. It did so before the typography stage too. Cosmetic; fix by giving
the row more height or dropping the glyph for a plain rule.

Still outstanding below: steps 4, 5, 6 and 7d.

- [x] **Step 1:** Bottom navigation at 320px — every label on one line, no ellipsis.
  The widths were computed from font metrics, not measured, so a substituted font
  could be wider than calculated.
- [x] **Step 2:** Both themes throughout. Phase 2 rebound every `dark:` utility from
  the operating system to the in-app theme control; anyone whose OS did not match
  their chosen theme has never seen the dark theme render as designed.
- [x] **Step 3:** Tab past the closed mobile drawer — focus must never land on a
  hidden navigation link. jsdom does not implement `inert`, so no test proves this.
- [x] **Step 4:** All five inspection steps at 320px, checking the rating rows,
  drone grids and cell toggles that were each fixed once for narrow screens.
- [x] **Step 5:** Press Enter in the weight field on step one — it must advance, not
  save. This was a High finding in the Phase 3 audit.
- [x] **Step 6:** Start an inspection, deploy an update, and confirm the tab does not
  reload until the work is saved or discarded.
- [x] **Step 7:** Dense screens — settings, user management, team pages — which hold
  most of the 85 extra-small controls that grew in Phase 1.

Added by the typography stage (commits `0fd633c`, `0c655b4`):

- [x] **Step 7a:** **The seven surfaces that use `.above-bottom-nav`** — update
  prompt, install prompt, chat button and dialog, toasts, notification banner and the
  hives bulk-action bar. The rule positioning them was being discarded by the CSS
  parser for the whole of Phase 2, so they have never sat where they were designed
  to. **They will visibly move; that is the fix, not a regression.** Highest priority
  of any check here.
- [x] **Step 7b:** The 7-day forecast strip at 320px, where the max/min temperatures
  now stack rather than sit side by side.
- [x] **Step 7c:** `HiveListCard`'s hive-stack diagram — the `h-8` and `h-10` rows now
  hold 14px text, and the super row also carries a 14px gauge numeral in 32px.
- [ ] **Step 7d:** *(needs a real device — cannot be emulated)* The graft tracker's inputs on a real iPhone. Thirteen controls
  moved to 16px specifically to stop Safari zooming on focus; that only shows on the
  device.
- [ ] **Step 7e:** *(dashboard strip verified; sensor tiles need a hive with a scale connected)* The sensor tiles and the dashboard apiary strip, where the QA pass
  moved readings to 16px to restore the label/value hierarchy.

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

### C. Image enlargement — done

Plan: `docs/features/image-enlargement-affordance-plan.md`.

- [x] **Step 11:** Single tap or click opens the image, with a labelled, visible
  affordance.

**The finding understated the problem.** The four thumbnails were `<div>`s carrying
`onDoubleClick` and `cursor-pointer` but no `role`, `tabIndex` or accessible name, so
they were not in the tab order and had no keyboard activation path: **a keyboard or
screen-reader user could not open a photograph at all.** That is a WCAG 2.1.1 failure
rather than a P2 convenience issue, and it was the more serious half.

Each is now a `<button type="button">` with `onClick`, an `aria-label` naming the
record type, and `title="View larger"` in place of copy that instructed a gesture. The
hover-only Camera overlay became an **always-visible magnifier badge** — hover does
not exist on touch, so a hover-only affordance was invisible to exactly the users this
programme serves. `type="button"` is load-bearing: two of the four sit inside a
`<form>`, where a bare `<button>` defaults to submit, so opening a photograph would
have filed the record.

The viewer's zoom-in, zoom-out and close controls were ~36px against the 44px floor
Phase 1 set, and had no `aria-label`. Both fixed.

**`ImageZoomModal.tsx:146` was deliberately left as a double-click.** It toggles zoom
inside the already-open viewer rather than opening it. Its parent binds
`onMouseDown`/`onMouseMove`/`onMouseUp` for drag-to-pan, so a single click would fire
on release and toggle zoom every time a pan finished; and `handleContentClick`
distinguishes a backdrop click (close) from a content click. The affordance argument
does not apply either — explicit zoom buttons are already on screen, so double-click
is a shortcut, not the only route.

- [ ] **Step 11a:** Verify in a browser: single tap opens each of the four; the badge
  is visible on a dark photograph; Tab reaches each thumbnail and Enter opens it; and
  opening a photo from inside either form does not submit the form.

### D. Phase 4 — Hives and Records simplification

Scoped in the parent plan, not started. Search by hive identifier, filters collapsed
behind a control showing an active count, fewer persistent card actions, Archive
preferred to Delete, and the five remaining native `confirm()` calls on the records
page moved onto the shared dialog.

- [x] **Step 12:** Write the Phase 4 plan and obtain approval.
- [x] **Step 12a:** 4A safety, 4B card actions, 4C search, 4D filters. See
  `tasks/mobile-first-phase4-todo.md`.
- [ ] **Step 12b:** Browser-verify Phase 4. Above all: opening a photo or a menu item
  from inside either record form must not submit it.
- [ ] **Step 12c:** The compact list view, deferred by decision 1. Re-measure whether
  density still matters now that search and filters have landed.

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
4. ~~**D**, Phase 4~~ — 4A to 4D done; browser verification and the compact view remain.
5. **E**, Phase 5, once the moderated sessions have happened.

F and G can be picked up at any point; none of them blocks anything else.
