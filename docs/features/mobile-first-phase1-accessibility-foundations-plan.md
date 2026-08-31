# Feature: Mobile-First Phase 1 — Accessibility and Safety Foundations
**Date:** 31/08/2026
**Status:** Implemented and deployed (verified by the owner, 31/08/2026)

## 1. Overview

This is the Phase 1 implementation plan for the mobile-first remediation programme defined in `mobile-first-over-50-ux-remediation-plan.md`. It covers only Layer A (shared accessibility foundations) plus the drawer keyboard/focus work and inspection dirty-state protection that the parent plan assigns to Phase 1.

The purpose of Phase 1 is to establish safe defaults in shared primitives so that individual screens inherit correct sizing, contrast and labelling, and so that a beekeeper cannot silently lose a part-completed inspection. It deliberately does not redesign the inspection workflow, does not restructure the bottom navigation and does not touch the dashboard.

A five-agent read-only audit of the current implementation was completed before writing this plan. Several findings differ from the parent document and are recorded in section 6, because they change what the work actually is.

Five scoping decisions were confirmed with the repository owner on 31/08/2026: a full 44px target-size floor, a compound-selector override block for the failing colour pairs, WCAG AAA rather than AA as the contrast target, migration of the inspection form's visit fields only, and adoption of the new focus hook by the mobile drawer alone. The design below reflects those choices. They are recorded in full in `tasks/mobile-first-phase1-todo.md`.

A verification pass was then run against this plan's own recommendations, because the parent document was produced by a separate agent and several of its claims proved to need arithmetic rather than acceptance. That pass corrected four defects in this plan before any code was written; they are recorded in section 7.

## 2. Scope & Simplicity

* **In Scope:**
  - Raise shared control size floors in `globals.css` for buttons, icon buttons and form controls.
  - Correct the white-on-saturated-fill colour pairs that fail WCAG AA.
  - Add optional label, help-text and error semantics to the three shared control components, and migrate the login page, the record filters bar and the inspection form's visit fields onto them.
  - Give the mobile drawer correct modal-navigation semantics, keyboard operation and focus lifecycle.
  - Add dirty-state protection to the inspection form's in-page exit paths.
  - Add a reduced-motion media query.
  - Add focused unit tests for each of the above.
* **Out of Scope:**
  - Bottom-navigation restructuring, overlay coordination and the manifest shortcut. These are Phase 2.
  - The inspection workflow redesign, step navigation and draft persistence. These are Phase 3.
  - Hives and Records search, filters and destructive-action changes. These are Phase 4.
  - Dashboard changes of any kind. These are Phase 5.
  - Migrating the eleven existing bespoke modals onto the new focus-management hook.
  - Replacing the seventy-two remaining native `confirm()` call sites.
  - Any reduction of the 973 `text-xs` occurrences outside the five Phase 1 surfaces.
  - Database, authentication, subscription, RLS and API changes. None are required.
  - New runtime dependencies. None are required.
* **Existing Code Impact:**
  - `src/app/globals.css` — size floors, colour pairs, reduced-motion block.
  - `src/components/ui/TextInput.tsx`, `SelectField.tsx`, `TextAreaField.tsx` — additive label/error/help semantics.
  - `src/hooks/useDialogA11y.ts` — new shared hook.
  - `src/components/MobileDrawer.tsx` — modal semantics and focus lifecycle.
  - `src/components/BottomNavBar.tsx` — `aria-current` and `aria-expanded`/`aria-controls` only.
  - `src/app/login/page.tsx` — field association and error announcement.
  - `src/components/records/RecordFiltersBar.tsx` — field association.
  - `src/components/records/forms/InspectionForm.tsx` — visit-field association plus dirty-state reporting.
  - `src/app/dashboard/records/page.tsx` — dirty-state guards on exit paths.

### Simplicity rules applied

1. Every change is made once in a shared primitive rather than repeated across consumer files.
2. All component API changes are purely additive; existing call sites keep working unchanged.
3. No existing modal is migrated in this phase, so no currently working dialog can regress.
4. Work that Phase 3 will rewrite anyway is not done twice.

## 3. Technical Design

### Architecture

The codebase uses Tailwind v4 with CSS-first configuration. There is no `tailwind.config` file; colour and font tokens are declared in `:root` and exposed through an `@theme inline` block in `globals.css`. There is no custom font-size or spacing scale, so all size utilities are Tailwind stock values.

Shared control styling lives in `fj-*` classes in `globals.css`. The base and size-variant button selectors are deliberately wrapped in `:where(...)` so that they carry zero specificity and per-instance utility classes always win. This was an intentional fix recorded in `global-button-style-conflict-fix-plan.md` and must be preserved.

#### A. Control size floors

Current floors, all in `globals.css`:

| Selector | Lines | Current | Target |
|---|---|---|---|
| `:where(.fj-btn)` | 531–546 | `min-height: 2.5rem` (40px) | `3rem` (48px) |
| `:where(.fj-btn-sm)` | 548–553 | `min-height: 2.25rem` (36px) | `2.75rem` (44px) |
| `:where(.fj-btn-xs)` | 555–561 | `min-height: 1.75rem` (28px) | `2.75rem` (44px) |
| `.fj-icon-btn` | 628–637 | no dimensions at all | `min-width`/`min-height: 2.75rem` (44px) |
| `.fj-icon-btn-xs` | 648–653 | `width`/`height: 1.75rem` (28px) | unchanged; base `min-*` raises the hit area |
| `.fj-control` | 955–966 | padding only, no height | `min-height: 3rem` (48px) |

Because `min-height` beats `height` in the box model, adding a `min-height` floor on `.fj-icon-btn` raises the extra-small icon button's hit area without editing its explicit 28px `width`/`height`, and without touching any consumer.

The `:where(...)` wrappers are retained. This means a component may still opt out with an explicit utility, which is the existing and intended behaviour.

Small and extra-small buttons converge on the same 44px height and continue to differ by horizontal padding and border radius. This is the parent plan's "compact 44px variant" and is the single largest visual change in Phase 1.

They no longer differ by font size. Both `:where(.fj-btn-sm)` and `:where(.fj-btn-xs)` currently hard-code `font-size: 0.75rem` (12px) with a 1rem line height, so the shared primitive itself breaches the 14px floor that this phase is meant to establish. Both move to `0.875rem` (14px) with a `1.25rem` line height.

This matters beyond tidiness: raising a control to a 44px target while leaving 12px text inside it is a half-measure that satisfies the target-size criterion whilst failing the typography criterion on the same element. The two changes belong together.

The bottom navigation's 11px labels are the other breach of this floor. They are deliberately left to Phase 2, because raising them to 14px widens the labels and worsens the overflow condition that Phase 2 exists to fix. Changing them now would make the bar demonstrably worse until Phase 2 lands. The coupling is recorded in section 7.

#### B. Semantic colour pairs

Measured ratios against white text, from the token values in `globals.css`:

| Token | Hex | Ratio | AA (4.5:1) | AAA (7:1) |
|---|---|---|---|---|
| forest-500 | `#22c55e` | 2.28:1 | Fails | Fails |
| forest-600 | `#16a34a` | 3.30:1 | Fails | Fails |
| forest-700 | `#15803d` | 5.02:1 | Passes | Fails |
| **forest-800** | `#166534` | **7.13:1** | Passes | **Passes** |
| amber-500 | `#f59e0b` | 2.15:1 | Fails | Fails |
| amber-600 | `#d97706` | 3.19:1 | Fails | Fails |
| amber-700 | `#b45309` | 5.02:1 | Passes | Fails |
| **amber-800** | `#92400e` | **7.09:1** | Passes | **Passes** |

The confirmed target is **AAA**, using forest-800 and amber-800. These shades already exist in the token scale, so the correction costs nothing structurally. The rationale is that this programme's audience is beekeepers over 50 with reduced eyesight working in bright outdoor light, and the parent plan had already adopted AAA for target size whilst settling for AA on contrast, which is the weaker choice for this audience. The trade-off accepted is that primary buttons become noticeably darker and less vibrant.

Three changes deliver this:

1. **Shared button tones.** `.fj-btn-success` and `.fj-btn-amber` (`globals.css:589–613`) hard-code `#16a34a` and `#d97706` with white text. Their background values move to `#166534` and `#92400e`, and their hover values move one step darker again.

2. **Raw utility pairings, light theme.** 93 occurrences combine `bg-forest-600` with `text-white`, within a total of 118 across 48 files that pair `bg-forest-500`, `bg-forest-600` or `bg-amber-600` with white text. Rather than edit 48 files, a compound-selector override block is added to `globals.css`, following the precedent already established by the light-mode text-colour override block at lines 1226–1262.

   The compound selectors carry specificity 0,2,0 and sit outside Tailwind's layers, so they win over the single-class utilities. Tailwind's `hover:bg-forest-700` compiles to a selector of the same 0,2,0 specificity, so hover states must be restated explicitly inside the same block or hover feedback is lost entirely. This is the single most important implementation detail in the colour work.

   The override targets only the failing pairing. A `bg-forest-600` fill that carries no white text is untouched, so decorative fills, chart series and indicator dots keep their current appearance. Eight `bg-forest-600` usages carry no co-located `text-white` and are therefore not matched; these must be checked individually in case their white text is inherited from a parent or applied to a nested span, since the selector cannot reach those.

3. **Raw utility pairings, dark theme.** This is the correction most easily missed. 37 usages apply these fills through the dark variant, and the worst contrast failure in the entire codebase is `dark:bg-forest-500` at **2.28:1**, used 25 times. Because the class token is literally `dark:bg-forest-500`, a selector written as `.bg-forest-500.text-white` never matches it. Without explicit dark-variant selectors in the override block, the dark theme retains its worst failures whilst the phase reports both themes as compliant.

   The block therefore also targets the escaped dark-variant class names within the `.dark` scope. The distribution is `dark:bg-forest-500` (25), `dark:bg-amber-500` (7), `dark:bg-forest-600` (2), `dark:bg-amber-600` (1), `dark:bg-forest-400` (1) and `dark:bg-amber-400` (1). The 400-level shades sit at 1.74:1 and 1.67:1 and need the largest correction.

This pattern was not addressed by any of the seven prior contrast fixes, all of which handled coloured text on light tints rather than white text on saturated fills. There is no overlap and nothing prior is undone.

#### C. Field semantics

There is no field wrapper component in the repository. `FieldLabel.tsx` renders a bare label and requires the caller to pass a matching `htmlFor` and `id`; most callers do not. `TextInput`, `SelectField` and `TextAreaField` are thin style wrappers that spread props onto the native element and wire no ARIA at all. Their `tone="danger"` prop is purely cosmetic and does not set `aria-invalid`.

Rather than introduce a fourth abstraction, the three existing control components gain optional `label`, `helpText` and `error` props. When `label` is supplied the component generates an id with `useId()`, renders the label with a matching `htmlFor`, renders help and error text with generated ids, and wires `aria-describedby`, `aria-invalid` and `aria-required`. When `label` is omitted the component renders exactly as it does today.

This keeps the change additive: all 20 `TextInput` and 15 `SelectField` consumer files are unaffected unless they opt in.

Migration in this phase:

- **Login** — two fields, both currently visual-association-only, plus an error region that is a plain `div` with no `role` or `aria-live` and is therefore never announced.

  Adding `role="status"` alone would be a placebo here. The region is hidden with Tailwind's `invisible` class, which is `visibility: hidden`, and that removes it from the accessibility tree entirely; a live region that is absent from the tree until the moment content arrives does not announce reliably. The region already reserves its own space with `min-h-[32px]` and a non-breaking space placeholder, so the fix is to keep it permanently in the accessibility tree, drop the `invisible` class, and let the text content change from empty to the message. Only then does the live region do anything.
- **Record filters bar** — four selects with no labelling of any kind, and two date inputs with visual-only labels. The archived-hives checkbox is already correctly nested inside its label and is left alone.
- **Inspection form visit fields** — the apiary, hive, date, time, weight, notes and photo controls only.

The inspection form contains 29 labels, of which only seven use `htmlFor`. The remaining 22 use an unassociated pattern. Phase 3 restructures this form into a stepped flow and will rewrite that markup regardless, so migrating all 22 now would be done twice. Phase 1 therefore migrates the visit fields, which are the ones a user meets first, and Phase 3 completes the rest as part of its own rewrite.

#### D. Drawer semantics and focus lifecycle

`MobileDrawer` is always mounted and merely translated off-screen with `-translate-x-full` (lines 86–89). No `inert`, `hidden` or `pointer-events-none` is applied to the panel, so all five navigation links plus the close button remain in the tab order while the drawer is visually closed. This is the most serious defect in the mobile shell.

Present and working today: body scroll lock (52–62), backdrop click-to-close (76–82), auto-close on route change (44–50), 48px touch targets, and a close-button `aria-label`.

Missing: `role="dialog"`, `aria-modal`, an accessible name, Escape handling, focus trap, initial focus and focus restore.

No focus-trap primitive exists anywhere in the repository. `ConfirmDialog` has Escape handling and initial focus but no Tab cycling and no restore; `ModalShell` is purely presentational; eleven further modals each implement Escape ad hoc.

A new `src/hooks/useDialogA11y.ts` provides Escape-to-close, Tab cycling within a container, initial focus and focus restore to the triggering element. In this phase it is consumed by `MobileDrawer` only. Migrating `ModalShell`, `ConfirmDialog` and the eleven bespoke modals is explicitly deferred: retrofitting stable dialogs satisfies no Phase 1 acceptance criterion and would put a large amount of working UI at risk in a phase whose purpose is safety.

The closed state uses React 19's `inert` attribute, which removes the subtree from both the tab order and the accessibility tree in one attribute and is supported by the React 19.1 already in use.

One ordering trap must be avoided. Focus cannot be moved into an inert subtree; the call fails silently. If `inert` is bound to the open state and initial focus is requested in the same commit, the focus attempt can run before the attribute is removed, leaving the drawer open with focus still on the page behind it and no error to indicate it. The hook must therefore place initial focus only after the attribute has been removed from the DOM, and the drawer's opening path needs a test that asserts focus actually landed inside the panel rather than merely that the hook was invoked.

`BottomNavBar` receives two minimal corrections that belong with the drawer's semantics: `aria-current="page"` on the active destination, matching what `Sidebar` already does, and `aria-expanded`/`aria-controls` on the More button. No destination is added, removed or reordered in this phase.

#### E. Inspection dirty-state protection

The inspection form holds state as a single `formData` object plus sibling state for given/taken drafts and follow-up drafts. `handleCancel` (688–694) resets only the image and voice sub-hooks and then calls the parent's `onCancel` unconditionally, with no dirty check.

Six exit paths currently discard work without warning:

1. The form's top Cancel button (972–977).
2. The form's bottom Cancel button (1813–1818).
3. The page's X close button (1279–1284).
4. `handleNewRecord` (342–427), which clobbers in-progress state when a different record type is started.
5. `handleInspectionEdit` (823–831), which overwrites state when a different inspection is opened.
6. Browser navigation, refresh and tab close, for which no `beforeunload` handler exists anywhere in the application.

Paths 4 and 5 are not identified in the parent plan and were found during this audit.

The form takes a snapshot of its initial state on mount, compares current state against it, and reports changes to the parent through an `onDirtyChange` callback. The parent holds the flag in a ref and consults it in each of the five in-page exit paths, using the existing `useConfirm()` hook with `variant: 'warning'`. A `beforeunload` listener registered while dirty covers path 6. The flag is cleared only after `handleInspectionSubmit` confirms a successful write, so a failed or offline save leaves the guard in place.

**The snapshot must not be limited to `formData`.** This is the defect most likely to ship unnoticed, because the guard would appear to work in every manual test that does not involve an attachment. `imageFile` is a `File` held in its own state outside `formData` and passed to `onSubmit` as a separate argument, and the voice-recorder state is likewise held in a sub-hook. A comparison over `formData` alone therefore reports a form as pristine when the user's only contribution was a photograph or a voice note — so attaching a photo and pressing Cancel would discard it silently, which is exactly the failure this phase exists to prevent.

`File` and `Blob` values are also not JSON-serialisable, so a `JSON.stringify` comparison would flatten them to empty objects and never register a change even if they were included in the object.

The dirty condition is therefore the union of three things: a change to `formData` against its mount snapshot, the presence of an `imageFile`, and the presence of recorded voice content. The photograph and voice-note cases each need their own test, since neither is covered by exercising the text fields.

The records page currently uses native `confirm()` for its five delete actions and is not yet a `ConfirmDialog` consumer. Only the new unsaved-changes prompt uses the shared dialog; converting the five existing delete confirmations is Phase 4 work and is not bundled here.

In-application route changes via `Link` are not guarded in this phase. The App Router provides no supported navigation-interception API, and Phase 3 moves the inspection into a focused route or modal where a guard becomes natural. Phase 1 covers the five in-page paths plus browser unload, and this limitation is stated rather than worked around with a fragile click interceptor.

#### F. Reduced motion

No `@media (prefers-reduced-motion: reduce)` block exists in `globals.css`. A single `matchMedia` check exists in `useListPositionMemory.ts` (38–39) for scroll restoration and continues to work independently.

`globals.css` sets `html { scroll-behavior: smooth }` unconditionally (275–277) and defines seven keyframe animations with matching utility classes (355–462, 394–420). Per-component `transition-*` utilities are used inline throughout and are not declared centrally, so they can only be reached by a broad rule.

One media block is added that forces `scroll-behavior: auto` and neutralises animation and transition durations across all elements. Spinner animations are exempted, because a loading spinner communicates state rather than decoration and removing it would reduce clarity for the same users this programme serves.

The usual hazard with a blanket transition override is that code listening for `transitionend` or `animationend` never fires once durations are collapsed, silently stalling whatever awaited the event. A search of the source tree returns zero such listeners, so this hazard does not apply here and the broad rule is safe to use. The check should be repeated if the rule is ever widened.

### Database Connections (MCP Server)

No database work is required. Phase 1 changes presentation, semantics and client-side state only. No schema, RLS policy, RPC, migration or data contract is touched, and no MCP database access is needed. Should any later phase require server-synchronised inspection drafts, the parent plan's stop-and-seek-approval procedure applies.

## 4. Edge Cases & Risks

* **Dense administrative screens grow taller.** Raising extra-small buttons from 28px to 44px affects 54 `Button` and 31 `IconButton` call sites, concentrated in user management, team pages and settings tables. This is intended, but it is the largest visual change in the phase and should be reviewed on those screens specifically.
* **Per-instance overrides still win.** Because the `fj-*` selectors are deliberately zero-specificity, a component that already hard-codes a smaller size keeps it. Several files already hand-patch `min-h-[44px]` for this reason. The floor raises the default, it does not enforce a guarantee.
* **Colour override hover states.** Tailwind's `hover:` utilities compile to the same specificity as the compound override. If hover is not restated inside the override block, buttons lose their hover feedback entirely. This must be verified visually in both themes.
* **Compound override reach.** The override matches any element combining those background and text utilities, including non-button fills carrying white icons. Darkening is visually minor and improves non-text contrast, but the affected surfaces should be reviewed.
* **Dark theme is separate.** The theme uses a `.light`/`.dark` class strategy with a time-based auto mode, not `prefers-color-scheme`. Dark overrides only shift the semantic aliases, not the raw scales, so every changed pair needs checking in both themes independently.
* **Additive props must stay additive.** If a control component begins rendering a wrapper element unconditionally, layouts across 35 consumer files could shift. The wrapper must render only when `label`, `helpText` or `error` is supplied.
* **Duplicate ids in repeaters.** The inspection form already builds index-keyed ids for its repeater rows. `useId()` output must not collide with those, and the repeater pattern is left as it is in this phase.
* **False dirty state.** A snapshot comparison can report dirty when the form merely normalises a value on mount, which would produce a confirmation prompt on an untouched form. The comparison must be taken after any mount-time normalisation settles, and the pristine case must be covered by a test.
* **Trapped after save.** The dirty flag must clear only on confirmed success, but it must genuinely clear, or a user is prompted after saving. Both the success and failure branches need tests.
* **Reduced-motion catch-all.** Cleared. The repository contains no `transitionend` or `animationend` listeners, so collapsing durations cannot stall any awaited event.
* **Inert and focus ordering.** Initial focus placed in the same commit that removes `inert` fails silently, leaving the drawer open with focus behind it. Tests must assert focus location, not hook invocation.
* **Photograph and voice dirty state.** A `formData`-only comparison reports a photograph-only or voice-only edit as pristine. Both cases need dedicated tests; neither is exercised by typing in text fields.
* **No accessibility assertion library.** Neither axe nor jest-axe is installed. Tests assert behaviour and semantics directly through Testing Library queries rather than through automated rule checks, and no dependency is added.
* **Baseline failures.** The repository has known unrelated test and lint failures. These are reported separately and are not masked or worked around.

## 5. Implementation Phases

1. Phase 1A: **Shared foundations in CSS** — control size floors, semantic colour pairs including hover restatement, reduced-motion block. Single file, immediately reviewable.
2. Phase 1B: **Field semantics** — additive label, help and error support in the three shared control components, then migration of login, the record filters bar and the inspection visit fields.
3. Phase 1C: **Drawer accessibility** — the shared dialog hook, applied to the mobile drawer, plus the two bottom-navigation ARIA corrections.
4. Phase 1D: **Inspection dirty-state protection** — dirty reporting in the form, guards on the five in-page exit paths, and the browser unload handler.
5. Phase 1E: **Tests and documentation** — focused unit tests for each area, a token-level contrast test, and completion of this document's status.

## 6. Audit Corrections to the Parent Plan

The following differ from `mobile-first-over-50-ux-remediation-plan.md` and were verified during this audit.

* **Small-text count.** The parent plan states 701 occurrences of `text-xs` or 11px text. The actual figures are 973 `text-xs`, 34 `text-[11px]` and 36 `text-[10px]`. The bottom navigation's 11px labels are confirmed.
* **Bottom navigation currently has five destinations plus More.** The current bar is Overview, Apiaries, Hives, Records and Tasks & Events, plus a pinned More button, matching `navigation-restructure.md`. The parent plan's proposed four-item set drops Apiaries. That is a Phase 2 product decision and needs explicit confirmation before implementation.
* **Two additional discard paths.** Starting a new record, or opening a different inspection, while a form is in progress silently discards work. Neither appears in the parent plan's findings register.
* **Icon buttons have no base size at all.** The parent plan describes 28px icon buttons. Only the extra-small variant has an explicit size; the medium and small variants derive their height implicitly from padding and have no floor.
* **Line-number drift.** The button block is now 531–561 rather than 531–560. The icon-button range 628–653 is unchanged. The inspection form citations at 688–694 and the records page citation at 1287 are accurate.
* **Safe-area handling already exists** on the bottom navigation and is the only such usage in the repository. The parent plan's Phase 2 item stands, but the bar itself is already correct.
* **A confirmation system already exists.** `ConfirmDialog` with `useConfirm()` is provider-mounted application-wide with seven consumers. The records page is not yet one of them and still uses native `confirm()` for deletes.

* **The parent plan's Phase 2 navigation target cannot be met as written.** This is a contradiction inside the parent document rather than a drift, and Phase 2 should not be planned on it. The recommendation is four destinations plus More. Each slot is `min-w-[76px]`, so five slots require 380px. The same document's acceptance criteria require all of them visible without horizontal scrolling at 320px and 360px, both of which are narrower than 380px. The criteria additionally require navigation labels of at least 14px, which widens the labels rather than narrowing them, and the widest is "Tasks & Events".

  Three requirements — four destinations plus More, no scrolling at 320px, and 14px labels — cannot hold simultaneously at the current slot width. Phase 2 must resolve this explicitly by reducing to three destinations plus More, shortening the labels, narrowing the slots with wrapped two-line text, or dropping labels at the smallest breakpoint. This is why the bottom navigation's 11px labels are deliberately not raised in Phase 1: doing so in isolation widens the labels and worsens the overflow before Phase 2 has decided the layout.

## 7. Verification Pass on This Plan

The parent document was produced by a separate agent, so this plan's own recommendations were re-checked against the source before approval rather than inherited. Four defects were found and corrected above. They are recorded here because each was plausible enough to have survived into implementation.

* **The typography floor was missing entirely.** The first draft raised target sizes but scheduled no typography work, despite the parent plan's Phase 1 naming both and its acceptance criteria requiring 14px. `.fj-btn-sm` and `.fj-btn-xs` set 12px in the shared primitive, so the omission would have produced 44px controls containing text that still failed the phase's own criterion.
* **The colour override missed the dark theme.** The compound selector cannot match dark-variant class tokens, which would have left `dark:bg-forest-500` at 2.28:1 — the worst pair in the codebase, used 25 times — untouched whilst the phase reported both themes compliant.
* **The dirty-state guard would have missed photographs and voice notes.** Both live outside `formData`, so the proposed comparison would have declared a photo-only edit pristine and discarded it on Cancel.
* **The login live region would not have announced.** The `invisible` class removes the region from the accessibility tree, so adding `role="status"` alone changes nothing observable.

One risk was cleared rather than corrected: the reduced-motion catch-all is safe, because no `transitionend` or `animationend` listeners exist.

The contrast target was also raised from AA to AAA during this pass, on the grounds that forest-800 and amber-800 already exist in the scale, clear 7:1, and better serve an audience with reduced eyesight working outdoors — a change the parent plan left on the table whilst adopting AAA for target size.


## 8. Implementation Record

Phase 1 was implemented in the five planned stages. What follows records where the implementation departed from this plan, and why, so the deviations are visible rather than buried in a diff.

### Changes to the plan, made during implementation

* **Contrast target raised to AAA.** forest-800 (7.13:1) and amber-800 (7.09:1) replaced the AA-level -700 shades. Both already existed in the forest scale; `--amber-800` and `--amber-900` had to be added, because the amber palette stopped at 700 and `bg-amber-800` would otherwise have resolved to Tailwind's built-in default rather than the value that was measured.
* **The `dark:` variant was rebound to the theme class.** Writing the dark-variant contrast rules exposed that `dark:` utilities were following the operating system while everything else followed the in-app theme control. See section 9.
* **Typography floors were added to the plan.** `.fj-btn-sm` and `.fj-btn-xs` set 12px in the shared primitive, so raising their target size alone would have produced 44px controls whose text still failed the phase's own criterion.
* **Field association was done in place rather than through the shared components.** All three migrated surfaces use raw elements with bespoke utility classes; routing them through `TextInput`/`SelectField` would have layered `fj-control` over competing equal-specificity utilities. The new `label`/`helpText`/`error` props are therefore built and tested but not yet consumed by any migrated surface; Phase 3 adopts them when it rewrites the inspection form.
* **Two discard paths were added to the guard.** Starting a different record and opening a different inspection both silently destroyed in-progress work and appear in no prior document.
* **The dirty comparison covers more than `formData`.** The photograph lives outside it and is not JSON-serialisable, so a `formData`-only diff would have declared a photo-only edit pristine and discarded it.

### Defects found and fixed during implementation

* **A shadowed `confirm` that would have removed every delete confirmation** on the records page. Binding `useConfirm()` to the name `confirm` rebound five native `confirm()` delete guards to a promise-returning function, making `if (!confirm(...))` always false. Caught by TypeScript; the binding was renamed.
* **The entire test suite was failing to load** because of a misconfigured PostCSS path in `vitest.config.mts`. Pre-existing, unrelated to this work, and repaired so Stage E could run at all. See section 9.

### Verified

TypeScript reports no errors in `src`. ESLint is clean on every file touched. The pre-existing type errors in `tests/` relating to Supabase mock typings are unrelated to this phase and were left alone.

### Not covered by automated tests

`inert` is asserted as present on the closed drawer, but jsdom does not implement it, so no test proves that focus is genuinely blocked from entering the closed subtree. That is the central fix of the drawer work and requires a manual keyboard check in a real browser.

## 9. Two Pre-Existing Defects Found Along The Way

Both were found because Phase 1 work ran into them, both are outside its original scope, and both are recorded here because they affect more than this phase.

### The dark theme was driven by two different mechanisms

`globals.css` imported Tailwind with no `@custom-variant dark`, so in Tailwind v4 the `dark:` variant defaulted to `@media (prefers-color-scheme: dark)` — the operating system setting. The application's own theme control toggles a `.dark` class and sets `color-scheme`, neither of which changes what that media query reports.

Every `dark:` utility therefore followed the operating system while every `.dark`-scoped rule and custom property followed the in-app theme. The two diverged whenever a user's operating system and chosen theme disagreed, which the time-based auto theme (light 06:00 to 20:00) makes a daily occurrence for anyone with a permanently dark operating system.

Resolved by adopting the class strategy. This is the highest-risk change in the phase: it alters the behaviour of every `dark:` utility in the application. Users whose operating system already matched their theme see nothing change; the rest see the dark theme render as designed for the first time.

### The test suite could not load

`vitest.config.mts` pointed `css.postcss` at a file path, but Vite treats that option as a directory to search. Resolution fell through to the production PostCSS config, whose Tailwind v4 plugin the loader cannot construct, and every test file failed before running. Repaired by inlining the minimal config that `postcss.test.config.mjs` had always been intended to supply.
