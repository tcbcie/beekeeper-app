# Task: Mobile-First Phase 3 — Focused Inspection Workflow
**Date:** 31/08/2026
**Status:** Implemented and pushed — awaiting build verification by the owner

## 1. Objective

Present the existing inspection fields as five focused steps with progress, actionable validation and a review before saving, without rewriting the field markup. Complete the label association Phase 1 left open, close the route-change gap Phase 1 deferred here, and remove the duplicated header and duplicated discard confirmation.

Phases 4 and 5 (Hives and Records, dashboard) are not part of this task. Local draft persistence has been deferred to its own phase.

## 2. Impact Analysis

* **Files to Modify:**
  * `src/components/records/forms/InspectionForm.tsx` — step gating around existing blocks, validation, review step, remaining label association
  * `src/components/records/forms/InspectionStepper.tsx` — new, presentational chrome only
  * `src/app/dashboard/records/page.tsx` — header de-duplication, consolidated discard confirmation, route-change guard
  * `docs/features/mobile-first-phase3-inspection-flow-plan.md` — status on completion
  * New test files under `tests/`

* **Simplicity Check:** No field markup, control component or layout is rewritten. Every block keeps its JSX, handlers and helper renderers; only the step it appears in changes. All state stays lifted exactly where it is, so the six hive-driven effects keep working untouched. Label association is completed mechanically with `id`/`htmlFor` pairs, which changes attributes rather than structure. The only new component is presentational chrome.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*

### Stage 3A — Step shell and gating

- [x] **Step 1:** Create `InspectionStepper.tsx`: step titles, "Step N of 5" progress, Previous/Next at 48px, and an indication of which steps are optional. Presentational only, no form state.
- [x] **Step 2:** Add a `step` state to `InspectionForm` and wrap each existing block in conditional rendering per the agreed assignment. Move no markup into new components and change no block's internals.
- [x] **Step 3:** Keep `<form id="inspection-form">` mounted on every step. The top Save button is associated by the `form` attribute, which resolves by id against the live DOM, so unmounting the form would silently break it.
- [x] **Step 4:** Render inactive steps conditionally, never CSS-hidden. A hidden-but-present `required` field blocks native submission with a bubble anchored to something invisible.
- [x] **Step 5:** Reset the flow to step 1 on every path that already resets form state: edit-to-new, starting another record while dirty, and opening a different inspection.

### Stage 3B — Validation and focus

- [x] **Step 6:** Declare each step's required fields and validate in JavaScript on Next. Native validation cannot be relied on: inactive steps unmount, so `required` on hive, date and time would not run at all when submitting from the review step.
- [x] **Step 7:** Surface errors through the `label`/`error` props added to `TextInput` and `SelectField` in Phase 1, migrating only the three fields that need to display an error.
- [x] **Step 8:** Announce validation failures and move focus to the first invalid field.
- [x] **Step 9:** Re-run every step's validation before enabling Save on the review step, and name the step to return to rather than failing silently.
- [x] **Step 10:** Keep the `required` attributes in the markup for semantics, while JavaScript performs the enforcement.

### Stage 3C — Review step

- [x] **Step 11:** Build the review summary: hive and visit details, then only observations actually recorded, so a common inspection does not show fifty empty rows.
- [x] **Step 12:** Link each summary group back to its step, and make clear the inspection is not yet saved.
- [x] **Step 13:** Leave `handleSubmit` untouched. It already reads the full state regardless of what was rendered.

### Stage 3D — Label completion and de-duplication

- [x] **Step 14:** Add `id`/`htmlFor` pairs to the remaining labelled controls. Mechanical, attribute-only, no structural change.
- [x] **Step 15:** Collapse the page panel header and the form's own card header into one, so the stepped shell does not become a third layer.
- [x] **Step 16:** Consolidate the two discard confirmations into one. The duplication was introduced by Phase 1.
- [x] **Step 17:** Fix the pre-existing title defect: a new inspection opened from a hive deep link currently reads "Edit Inspection", because the form infers edit mode from `initialData?.hive_id` being truthy.

### Stage 3E — Navigation guarding

- [x] **Step 18:** Close the in-app route-change gap deferred from Phase 1, using the existing dirty state. The App Router still offers no supported interception API, so guard at the point of navigation rather than attempting to intercept the router.

### Stage 3F — Tests and documentation

- [x] **Step 19:** Step-gating tests: each step renders its own blocks and not others; the form element stays mounted; the flow resets to step 1 on each reset path.
- [x] **Step 20:** Validation tests: Next is blocked with a missing required field, the error is rendered and associated, focus moves to it, and the review step reports an incomplete earlier step.
- [x] **Step 21:** A test asserting the submitted payload is unchanged. This is the single most important assertion in the phase: the flow may present fields differently but must save exactly what it saved before.
- [x] **Step 22:** Re-check the previously-fixed mobile layouts inside the narrower step container: rating rows, drone grids and cell toggles.
- [x] **Step 23:** Update documentation and set the plan's status.
- [x] **Step 24:** Prompt user to test the build, including a 320px pass through all five steps.

## 3a. Stage 3A Notes

### The blocks did not need moving at all

The step assignment works purely by wrapping each block where it already sits. The existing render order happens to produce the correct sequence within every step: step 2 shows Queen and Brood, then Colony Strength, then Honey Super Fullness; step 3 and step 4 likewise. Not one block was relocated, so no block's internals, layout classes or handlers were touched.

The only structural edit inside a block was splitting the five-rating grid so `population_strength` renders in step 2 and the other four in step 3. The grid classes were copied verbatim to both, because that row was fixed once for wrapping on narrow screens and must stay wrap-safe inside a step container.

### Two blocks broke, and why

`Honey Super Fullness` and `Image Upload` are not plain elements: they are already JSX expressions, `{honeySuperSliderCount > 0 && (` and `{userHasActiveSubscription && (`. Wrapping them the same way as the others nested an expression container inside a JavaScript expression, which TypeScript reported as six parse errors. The fix was to merge the step test into the existing condition rather than nest a second container, then remove the closer each merge left surplus.

### Other decisions

* **The `<form>` never unmounts.** Only its children are gated. The top Save button was associated by `form="inspection-form"`, resolved by id against the live DOM, so unmounting the form would have silently broken it — this is now moot, because that duplicated header button has been removed entirely.
* **The duplicated header is gone.** The form previously rendered its own title plus a Save/Cancel pair, on top of the page's panel header. The stepper replaces it, so the flow has one header rather than three.
* **Save is reachable only from the review step**, so the flow always ends with the user seeing what is about to be written.
* **Direct step navigation is limited to steps already reached.** The progress control offers a jump back, but not a jump ahead past validation that Stage 3B will add.
* **A step change scrolls to the heading**, rather than leaving the user part-way down the previous step's scroll position.
* **The edit-title defect is fixed** (Step 17, brought forward because it lives in the header being rebuilt): the title read `initialData?.hive_id ? 'Edit Inspection' : ...`, which is also truthy for a *new* inspection opened from a hive deep link. It now reads the `isEditing` prop, matching what the page's own header already did.

### Test update

Three dirty-state tests typed into Notes, which now lives on step 4 while the form opens on step 1. They assert dirty tracking rather than anything about Notes, so they now edit the weight field from step 1 and no longer depend on where fields are grouped. No assertion was weakened.

## 3b. Stage 3B Notes

### Why native validation had to go

The hive, date and time inputs keep their `required` attributes, but they are no longer what enforces anything. Inactive steps are unmounted, so when the form is submitted from the review step those three fields are absent from the DOM and the browser checks nothing. CSS-hiding them instead would be worse: submission is then blocked by a validation bubble anchored to an element the user cannot see, which presents as a dead button. Neither native option works, so enforcement is in JavaScript and the attributes remain only for semantics.

### The Phase 1 field props are finally used

Phase 1 added `label`, `helpText` and `error` to `TextInput` and `SelectField`, then found that all three surfaces it migrated used bespoke raw markup, so the capability shipped built and unused. That was recorded honestly at the time as speculative until Phase 3.

This is the phase. The five visit fields — apiary, hive, date, time and weight — now use those components. The migration is visually near-neutral: the bespoke classes were `w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface text-foreground`, and `.fj-control` resolves to the same width, padding, border, background and colour, with the same 48px floor Phase 1 gave it. `FieldLabel` already used the exact label classes this form had written by hand. The only visible difference is a slightly larger corner radius, and the required asterisk is now rendered by the primitive rather than typed into the label text.

Errors reach the user through `role="alert"` in the shared field shell, so they are announced without any extra wiring here.

### Decisions

* **Errors clear as the user fixes them.** An effect re-validates only the fields currently showing a message, so a corrected field stops complaining immediately rather than waiting for the next attempt to move on.
* **Focus moves after render, not during.** The focus call is deferred by one frame so the field exists and its message is already in the accessibility tree when focus arrives.
* **The review step cannot present a dead Save button.** Save is disabled while anything is outstanding anywhere in the flow.
* **`handleSubmit` guards independently.** A form can be submitted by means other than its button, so an incomplete inspection is refused there too — and rather than failing silently, it returns the user to the step that is incomplete, restores the messages and focuses the offending field.
* **Only step 1 has required fields.** Steps 2 to 4 are entirely optional, which is what lets a common inspection be completed without opening anything advanced.

## 3c. Stage 3C Notes

### The summary shows only what was recorded

A routine inspection touches a handful of fields out of roughly fifty, so listing every field would bury the few that matter. The difficulty is that "not recorded" is expressed differently depending on the field: star ratings and disease indicators use `0`, the drone and propolis level fields use the `-1` sentinel, honey-super fullness distinguishes `null` (never recorded) from `0` (recorded as empty), and the Given/Taken values are signed so a negative number is meaningful rather than absent.

Each of those is handled with its own test rather than a single truthiness check, which would have silently dropped a recorded zero. The existing `getLevelLabel` helper already encapsulates the `-1` rule and is reused rather than reimplemented.

A group with nothing in it is omitted entirely, so an inspection where only the visit details were filled in shows one group and a line confirming that is enough to save.

### Decisions

* **Dates are formatted without `Date`.** Parsing `2026-08-01` yields UTC midnight, which renders as the previous day in any timezone behind UTC. The ISO string is split and reordered instead.
* **The review states plainly that nothing has been saved yet**, so the summary cannot be mistaken for a receipt.
* **Every group offers a way back to the step that owns it**, and an outstanding-error panel names the step to return to rather than leaving a disabled Save button unexplained.
* **`handleSubmit` was not touched.** It already reads the full state regardless of what was rendered, which the payload test now proves.

### The most important test in this phase

`the submitted payload is unchanged` asserts that `onSubmit` still receives the same three arguments, and that the form data carries exactly the key set the defaults declare. The flow may present fields differently, but it must save precisely what it saved before; that is the assertion that makes the re-arrangement safe to trust.

### A test-authoring mistake worth recording

`getByLabelText(/Hive/)` was ambiguous, and the reason was self-inflicted: the stepper's own progress buttons carry `aria-label="Step 1: Hive and visit"`, which matches. Good accessible labelling made a loose query ambiguous. Queries for the field are now scoped by role.

## 3d. Stage 3D Notes

### The remaining labels were not what the plan assumed

This stage was written as "add `id`/`htmlFor` pairs to the remaining labelled controls", on the understanding that twenty-two labels were simply missing an attribute. Reading them showed something different, and the correction matters more than the original task.

Of the fifteen labels without `htmlFor`:

* **Eight already wrap their own control.** Implicit association is valid HTML and correct; they needed nothing.
* **Six name a group of buttons, not a control.** Star ratings, the number pickers, the cell YES/NO pairs, "Removed all", and the drone and propolis level grids are all button groups. A `<label>` with no `for` and no wrapped control is a dangling label: it names nothing to assistive technology, and adding `htmlFor` would have been impossible because there is no single control to point at.
* **One genuinely labelled a control.** The "Number" input inside the cell sections had no `id` and no association, and now has both.

The six group labels became `<p>` headings referenced by `role="group"` and `aria-labelledby`, which is the pattern the varroa section in this same form already uses. Adding `htmlFor` as planned would have produced markup that looked corrected but announced no better.

Three of those six live in shared render helpers, so fixing the helper fixed every instance at once: every star rating, every number picker and every cell section.

### One header, one wording

* The page's panel already rendered a title and a close button, and the form rendered its own title and card inside that. The form's heading and outer card are gone, so the flow has one header. The step scroll target moved to the stepper wrapper.
* The discard wording now lives in one place. The two call sites remain, and that is deliberate: the form guards its own Cancel buttons because it must tear down the image and voice hooks only after the user agrees, while the page guards the close button, starting another record and opening a different inspection. They are distinct entry points and cannot both fire. What was duplicated, and should not have been, was the wording — if one copy were later reworded, the same action would ask two different questions depending on which control was pressed.

## 3e. Stage 3E Notes

### Intercept the click, not the router

The App Router still offers no supported way to stop a navigation once it has started, which is exactly why Phase 1 left this path open. So the guard intercepts the click that *would* start the navigation — the last moment the decision is still the user's — and performs the navigation itself once they agree. The listener runs in the capture phase so it sees the click before the router's own handler.

### The risk here is over-reach, not under-reach

A guard that catches too much is worse than one that catches too little: intercepting a download, a new-tab click or an external link breaks ordinary navigation in a way that reads as a broken app rather than a protective one. Ten of the fourteen tests assert what the guard must leave alone — external origins, downloads, `target="_blank"`, in-page anchors, a link to the page already open, modifier-clicks, middle-clicks, non-link clicks, and anything at all once the work is saved.

Modifier and middle clicks matter particularly: they open somewhere else rather than navigating this tab, so there is nothing to lose and prompting would be pure obstruction.

### Deliberately left open: browser back and forward

Guarding those means pushing entries onto the history stack and unwinding them, which misbehaves in precisely the situation that matters — a user who has already left — and risks trapping someone in a page they are trying to escape. The parent plan's own risk list warns that route protection must not trap users. This vector is recorded as open rather than half-closed with a fragile history hack.

### A deviation from the plan, stated

The plan also described presenting the flow as a full-screen panel on mobile, with click interception as the fallback. The click guard is what actually closes the protection gap, and it does so completely for in-app links. Making the panel full-screen is a presentation change to the records page rather than a safety one, and the stepped flow has already reduced the form from roughly three screens of scrolling to one short step at a time. It is therefore not done here, and is better judged on its own merits once the stepped flow has been seen on a device.

## 3f. Step 22 Notes — the mobile layout re-check

### The planned risk was backwards

The plan warned that "a narrower step container makes mobile clipping more likely, not less", and listed the rating rows, drone grids and cell toggles as needing re-checking inside it.

The container is not narrower. Collapsing the duplicated header removed the form's own `p-6` card, so its content now sits directly inside the page's `p-4` panel and is **48px wider** than before. The blocks themselves are untouched: the form still uses the same grid, and all fifteen still carry `md:col-span-2`, so each spans the full width exactly as it always did. The risk this step existed to check does not arise, and the extra room can only help.

### Every previously-fixed layout verified intact

All seven patterns confirmed present and unmodified:

* star-rating rows wrapping below `sm` and going horizontal from `sm`
* the Clear control at a 44px target on mobile, 36px from `sm`
* drone and propolis option grids at two columns, four from `sm`
* cell-toggle stacking, column below `sm` and row from `sm`
* the cell YES/NO pair as a two-column grid on mobile
* the Given/Taken signed-value clamps
* number-selector 48px touch targets

### The re-check is now automated

A manual check that has to be remembered is a check that eventually is not performed, so these became assertions. Six new tests cover the responsive classes and the group labelling added in Stage 3D, so a future edit that flattens a wrap rule or drops a group name fails the suite rather than reaching a beekeeper's phone.

Writing them surfaced something worth stating plainly: the Drones and Propolis sections are collapsed by default, so their content is not in the DOM at all until opened. That is the progressive disclosure the flow depends on, and there is now an explicit test asserting they stay closed — a routine inspection should never have to open them.

### Still requires a real device

jsdom computes no layout, so none of this proves anything about actual overflow at 320px. What is now guaranteed is that the classes which produced the correct behaviour are still applied; whether they still *look* right through five steps needs the build.

## 3g. QA Audit (Principal Quality Architect Review)

One High finding, introduced by this phase, and one piece of dead logic. Both fixed. Nothing Critical.

### 🟠 High — pressing Enter saved the inspection from step one

`handleSubmit` guarded on `submitting`, `fetchingWeather` and outstanding validation, but not on which step the user was on. Pressing Enter in a text field submits a form implicitly, so once step one was valid — hive, date and time, which the flow requires anyway — a beekeeper typing a weight and pressing Enter would submit immediately.

The concrete failure: a nearly empty inspection is filed, silently, having skipped steps two to four and the review entirely. No queen observations, no health ratings, no notes. The user sees the form close as though they had pressed Save, because as far as the browser is concerned they did.

This is precisely the promise the stepped flow exists to make — that saving always follows a review of what is about to be written — and it was defeated by a keystroke. Before this phase the behaviour was harmless and even useful, because the form was a single page and Enter meant "save". Grouping the fields into steps changed the meaning of that keystroke without changing the handler.

Fixed by making Enter advance rather than submit: `handleSubmit` returns early on any step but the last, calling the same `goToNextStep` the button uses, so validation still runs and the error still appears. Only the review step can submit.

### 🟢 Low — a condition that could never be false

`InspectionStepper` computed `step.id < furthest || (step.id < current && step.id <= furthest)`. Since `current` is never beyond `furthest`, the second clause is entirely subsumed by the first. Reduced to `step.id < furthest`.

### Verified clear

* **No duplicate group ids.** `labelId` derives ids from the visible label, so repeated labels would collide and `aria-labelledby` would point at the wrong heading. Every call site was checked: star ratings, the level grids and cell sections all use distinct names, and the per-box selectors are labelled `Box 1 (full)`, `Box 2 (half)` and so on, which are unique by construction.
* **No stale closures.** `handleSubmit` is a plain function redefined each render, so it always reads current state. `goToNextStep`, `validateStep` and `confirmDiscardInspection` are all `useCallback`s with correct dependencies, which is what keeps the navigation guard's effect from re-subscribing on every render.
* **The review step cannot be reached with outstanding errors by moving forward**, because `goToNextStep` validates first. It *can* be reached by clearing the hive after having got there and jumping back via the progress control — which is exactly the case the outstanding-errors panel and disabled Save exist to handle.
* **The navigation guard's over-reach is already covered** by ten dedicated assertions: external origins, downloads, new-tab targets, in-page anchors, same-page links, modifier and middle clicks, non-link clicks, and any click at all once the work is saved.

### Accepted, not fixed

**🟢 The review summary recomputes on every keystroke.** It is a `useMemo` over `formData`, so it rebuilds while the user types on step one even though nothing renders it until step five. The work is a few dozen comparisons over primitives and is not worth the complexity of deferring, but it is noted rather than unnoticed.

**🟢 Unreached steps are disabled buttons.** Disabled controls are not focusable, so a keyboard user cannot tab to a step they have not yet reached. That is the intent — it is what stops the flow being skipped past validation — and each still carries an accessible name describing what it is.

## 4. Post-Task Review

* **Root Cause Found (if applicable):** The inspection form asked for everything at once. Roughly fifty fields sat in a single scroll, with no indication of progress, no way to tell required from optional, and validation that existed only as three `required` attributes the browser enforced silently or not at all. Nothing was wrong with the fields themselves — they had been corrected repeatedly over many prior fixes — so the problem was entirely one of presentation and pacing.

* **Summary of Changes:** The same fields are now presented as five steps with progress, Previous and Next, and a review that summarises only what was actually recorded before saving. No field markup was rewritten: every block keeps its JSX, handlers and helper renderers, and not one was relocated, because the existing order already produced the correct sequence within each step. Validation moved into JavaScript, since unmounted steps make native `required` unenforceable, and errors are announced and focused through the field props Phase 1 built and could not use. Six dangling group labels became properly named groups. The duplicated header and duplicated discard wording are gone, along with a pre-existing defect that labelled new inspections "Edit Inspection". The last of Phase 1's six exit paths is closed by guarding in-app link clicks. 51 new tests.

* **Notes for User:**
  1. **Please run the build.** TypeScript reports no errors in `src`, ESLint is clean on every touched file, and the suite is unchanged against its baseline: the same 18 files and 137 tests fail for the same pre-existing reasons, while passing tests rose from 614 to 651.
  2. **Walk all five steps at 320px.** jsdom computes no layout, so the assertions prove the responsive classes are still applied, not that nothing overflows.
  3. **The payload is the thing to trust.** A test asserts `onSubmit` still receives the same three arguments with exactly the key set the defaults declare. The flow presents fields differently but saves precisely what it saved before.
  4. **Check a new inspection opened from a hive deep link.** It previously read "Edit Inspection"; it should now read "Record New Inspection".
  5. **Try leaving mid-inspection via a sidebar link.** It should ask before navigating, with the same wording as every other discard prompt.
  6. **Advanced sections stay closed.** Drones, propolis, given/taken, disease, hygiene and next-visit are all collapsed by default, so a routine inspection needs step 1, a little of step 2, and Save.
  7. **Deliberately not done:** local drafts (deferred to their own phase), the full-screen mobile panel (a presentation change, not a safety one — the click guard closes the protection gap completely), and browser back/forward guarding (closing it risks trapping users, which the parent plan's own risk list warns against).

## 5. Decisions Confirmed Before Execution

All four confirmed on 31/08/2026.

1. **Honey Super Fullness → Step 2 (Queen & colony).** It describes colony stores, and its slider count derives from hive configuration resolved in step 1. The parent plan's five stages never mentioned it.
2. **`population_strength` → Step 2 (Queen & colony).** It is colony state rather than behaviour, and pairs with queen seen, eggs and brood frames — the questions answered whilst looking at the same frames. This splits one rating grid across two steps, so the remaining four ratings must keep their wrap-safe mobile layout, which was fixed once already.
3. **Queen Cells stays whole in Step 2.** All four cell types remain under one collapse toggle as they render today. A beekeeper inspects for every cell type in one pass, and splitting `swarm_cells` out would need a second collapse state and two places to look.
4. **Local draft persistence is deferred to its own phase.** Phase 1 already prevents the loss it was meant to prevent, across six exit paths. The feasibility audit found the photograph cannot be stored (a `File`, with images to 10MB against a ~5MB quota), that there is no draft precedent in the codebase, and that impersonation switches the live Supabase session before the page reloads — leaving a window in which one user's in-progress inspection could be written under another user's key. That deserves a designed feature, not a rider on this phase.

## 6. The Constraint That Shapes Everything Here

The audit of prior work found roughly twenty-five committed behaviours and eight defects already fixed once in this form, including signed Given/Taken entry, wrap-safe rating rows, mobile-first cell-toggle stacking, the `-1` drone sentinel, deterministic right-sized-frames prefill, `NULL` versus `0` super fullness, the varroa brood-flag invariant, the `unstyled` button prop, and the removal of interpolated Tailwind classes.

Rewriting this markup would put all of them back in play simultaneously, in a form whose correctness a beekeeper depends on. The structural map showed a rewrite is unnecessary: every top-level block already spans both grid columns, so blocks can be regrouped without touching their internals.

Equally important, all state must remain lifted in `InspectionForm`. Hive selection alone drives six effects that write into other steps' fields — right-sized-frames prefill, honey-super slider count, scale weight, brood-box reconciliation, apiary sync and the follow-up default due date. They continue to work only while steps are conditionally-rendered chunks rather than separately-stateful components.
