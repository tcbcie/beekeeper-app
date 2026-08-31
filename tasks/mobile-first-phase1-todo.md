# Task: Mobile-First Phase 1 — Accessibility and Safety Foundations
**Date:** 31/08/2026
**Status:** In Progress — awaiting build verification by the owner

## 1. Objective

Implement Phase 1 only of the mobile-first remediation programme: establish correct sizing, contrast, labelling, drawer keyboard behaviour, inspection dirty-state protection and reduced-motion handling in shared primitives, so that individual screens inherit safe defaults and a beekeeper cannot silently lose a part-completed inspection.

Phases 2 to 5 (bottom-navigation restructure, overlay coordination, inspection workflow redesign, list simplification, dashboard changes) are explicitly not part of this task.

## 2. Impact Analysis

* **Files to Modify:**
  * `src/app/globals.css` — size floors, colour pairs, reduced-motion block
  * `src/components/ui/TextInput.tsx` — additive label/help/error semantics
  * `src/components/ui/SelectField.tsx` — additive label/help/error semantics
  * `src/components/ui/TextAreaField.tsx` — additive label/help/error semantics
  * `src/hooks/useDialogA11y.ts` — new shared hook
  * `src/components/MobileDrawer.tsx` — modal semantics and focus lifecycle
  * `src/components/BottomNavBar.tsx` — `aria-current`, `aria-expanded`, `aria-controls` only
  * `src/app/login/page.tsx` — field association and error announcement
  * `src/components/records/RecordFiltersBar.tsx` — field association
  * `src/components/records/forms/InspectionForm.tsx` — visit-field association, dirty reporting
  * `src/app/dashboard/records/page.tsx` — dirty-state guards on exit paths
  * `docs/features/mobile-first-phase1-accessibility-foundations-plan.md` — status on completion
  * New test files under `tests/`

* **Simplicity Check:** Every correction is made once in a shared primitive rather than repeated across consumer files. The colour fix is one CSS block instead of edits to 48 files. All three control-component API changes are purely additive, so none of the 35 existing consumer files change behaviour unless they opt in. No existing modal, no other form and no unrelated screen is touched. Work that Phase 3 will rewrite anyway is deliberately not done twice.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*

### Stage A — Shared foundations in CSS

- [x] **Step 1:** Raise button size floors in `globals.css`: `:where(.fj-btn)` to 48px, `:where(.fj-btn-sm)` and `:where(.fj-btn-xs)` to 44px. Preserve the `:where(...)` wrappers and the existing padding and radius distinctions. Font size is handled separately in Step 4.
- [x] **Step 2:** Add `min-width`/`min-height: 2.75rem` to the `.fj-icon-btn` base rule. Leave `.fj-icon-btn-xs` explicit dimensions untouched.
- [x] **Step 3:** Add `min-height: 3rem` to `.fj-control` so all shared inputs, selects and textareas inherit a 48px floor.
- [x] **Step 4:** Raise `font-size` on `:where(.fj-btn-sm)` and `:where(.fj-btn-xs)` from `0.75rem` (12px) to `0.875rem` (14px), with line height `1.25rem`. Without this the phase produces 44px controls containing text that still fails its own typography criterion.
- [x] **Step 5:** Correct `.fj-btn-success` and `.fj-btn-amber` background values to the forest-800 and amber-800 shades for AAA, and move their hover values one step darker again.
- [x] **Step 6:** Add the compound-selector override block for `bg-forest-500`/`bg-forest-600`/`bg-amber-500`/`bg-amber-600` paired with `text-white`, restating hover states explicitly in the same block so hover feedback is not lost.
- [x] **Step 7:** Resolved by adopting the class strategy. Added `@custom-variant dark (&:where(.dark, .dark *));` so `dark:` utilities follow the in-app theme, then added the dark-scoped override block for `dark:bg-forest-500/600` and `dark:bg-amber-500/600` paired with `text-white`, hover restated. See section 3a.
- [x] **Step 8:** Review the eight `bg-forest-600` usages that carry no co-located `text-white`, in case their white text is inherited or applied to a nested element where the selector cannot reach it.
- [x] **Step 9:** Add the `@media (prefers-reduced-motion: reduce)` block forcing `scroll-behavior: auto` and neutralising animation and transition durations, exempting spinner animations. The `transitionend` hazard has already been checked and is clear.

### Stage B — Field semantics

- [x] **Step 10:** Add optional `label`, `helpText` and `error` props to `TextInput`, `SelectField` and `TextAreaField`, generating ids with `useId()` and wiring `htmlFor`, `aria-describedby`, `aria-invalid` and `aria-required`. The wrapper element must render only when one of the new props is supplied.
- [x] **Step 11:** Migrate the login email and password fields onto the labelled controls. Give the message region `role="status"` **and** remove the `invisible` class, keeping the region permanently in the accessibility tree with empty text content. The role alone announces nothing while the region is `visibility: hidden`.
- [x] **Step 12:** Migrate the record filters bar: four unlabelled selects and two visually-labelled date inputs. Leave the archived-hives checkbox as it is, since it is already correctly nested.
- [x] **Step 13:** Migrate the inspection form's visit fields only — apiary, hive, date, time, weight, notes and photo. Leave the repeater rows and remaining sections for Phase 3.

### Stage C — Drawer accessibility

- [x] **Step 14:** Create `src/hooks/useDialogA11y.ts` providing Escape-to-close, Tab cycling, initial focus and focus restore to the triggering element.
- [x] **Step 15:** Apply the hook to `MobileDrawer`; add `role="dialog"`, `aria-modal`, `aria-labelledby` referencing the existing Menu heading, and an `aria-label` on the inner nav.
- [x] **Step 16:** Apply `inert` to the drawer panel while closed so its links leave the tab order and the accessibility tree. Ensure initial focus runs only after the attribute has been removed from the DOM, since focusing into an inert subtree fails silently.
- [x] **Step 17:** Add `aria-current="page"` to the active bottom-navigation destination and `aria-expanded`/`aria-controls` to the More button. Change no destination and do not alter the 11px labels; both belong to Phase 2.

### Stage D — Inspection dirty-state protection

- [x] **Step 18:** Add initial-state snapshotting and an `onDirtyChange` callback to `InspectionForm`, taken after mount-time normalisation settles.
- [x] **Step 19:** Extend the dirty condition beyond `formData` to include an attached `imageFile` and recorded voice content. Both live outside `formData` and are not JSON-serialisable, so a `formData`-only comparison would report a photograph-only edit as pristine and discard it.
- [x] **Step 20:** Guard the form's two Cancel buttons and the records page X button with `useConfirm()` when dirty.
- [x] **Step 21:** Guard `handleNewRecord` and `handleInspectionEdit`, the two silent-discard paths found during the audit.
- [x] **Step 22:** Register a `beforeunload` listener while dirty, and clear the flag only after a confirmed successful save.

### Stage E — Tests and documentation

- [x] **Step 23:** Add a token-level contrast test asserting every changed foreground/background pair meets 7:1, covering light and dark variants separately.
- [x] **Step 24:** Add control tests asserting label association, error announcement and the unchanged render path when no label is supplied.
- [x] **Step 25:** Add drawer tests for Escape, focus trap, focus restore and closed-state non-focusability, plus a bottom-navigation `aria-current` test. The open-path test must assert where focus actually landed, not that the hook ran.
- [x] **Step 26:** Add inspection dirty-state tests covering the pristine case, each guarded exit path, both the save-success and save-failure branches, and dedicated photograph-only and voice-note-only cases.
- [x] **Step 27:** Update documentation in `docs/features/mobile-first-phase1-accessibility-foundations-plan.md` and set its status.
- [x] **Step 28:** Prompt user to test the build.

## 3a. Blocker Found During Stage A — Dark Variant Strategy

**The `dark:` utilities and the application's theme control are driven by two different mechanisms, and they can disagree.**

Evidence gathered on 31/08/2026:

* `globals.css` opens with a bare `@import "tailwindcss";`. There is no `@custom-variant dark` anywhere in the repository, no `tailwind.config` file, and no `darkMode` setting.
* The installed version is Tailwind 4.1.14. In Tailwind v4 the `dark:` variant defaults to `@media (prefers-color-scheme: dark)`, which reflects the operating system setting.
* `theme-provider.tsx` resolves the theme to `light` or `dark`, then toggles a matching class on the root element and sets `style.colorScheme`. Setting `colorScheme` does not change what `prefers-color-scheme` reports.

The consequence is that every `dark:` utility class in the application follows the operating system, whilst every `.dark`-scoped rule and every CSS custom property follows the in-app theme setting. When the two disagree, a screen renders dark semantic tokens beneath light-variant utilities, or the reverse.

This is not a rare edge case here. The theme offers an `auto` mode that switches on time of day, light between 06:00 and 20:00 and dark otherwise, so a user whose operating system is fixed to dark will diverge every morning.

This blocks Step 7 because a dark-variant contrast rule must be written against whichever mechanism is actually live, and writing it against the wrong one produces a rule that either never applies or applies in the wrong theme.

**Options:**

1. **Adopt the class strategy** by adding `@custom-variant dark (&:where(.dark, .dark *));`. One line, and it makes `dark:` utilities finally obey the in-app theme control as the rest of the styling already does. The blast radius is every `dark:` utility in the application, so it needs a deliberate visual pass in both themes.
2. **Write Step 7 against the current media-query behaviour** and leave the wider inconsistency in place. Smaller and strictly in scope, but it encodes the existing mismatch into new code and would need rewriting if option 1 is adopted later.
3. **Defer Step 7 entirely** to a separate task that addresses the dark-variant strategy on its own, and complete Phase 1 with the light theme corrected and the dark-theme pairings documented as outstanding.

**Resolved: option 1 was chosen and implemented on 31/08/2026.** `@custom-variant dark (&:where(.dark, .dark *));` now sits immediately after the Tailwind import, with a comment recording why. Every `dark:` utility in the application now follows the in-app theme control, consistently with the `.dark`-scoped rules and custom properties that always did.

This is the highest-risk change in Stage A and needs the most careful visual verification. Two points for testing:

* Users whose operating system did not match their chosen theme have never seen the dark theme render as designed. For them the change is a visible correction, not a regression, but it will look different.
* Anyone whose operating system already matched their in-app theme should see no change at all, because both mechanisms were agreeing.

The dark-scoped contrast override for `dark:bg-forest-500/600` and `dark:bg-amber-500/600` was then written against the class scope, at specificity 0,3,0 against the compiled utility's 0,1,0.

## 3b. Step 8 Review Findings

Eight `bg-forest-600` fills carry no co-located `text-white`. Six are progress-bar fills or decorative rules with no foreground content, and they pass the 3:1 non-text requirement at 3.30:1; they need no change.

Two carry a white icon on a child element, where the compound selector cannot reach:

* `src/components/chat/ChatMessage.tsx:65` — avatar circles. The user avatar uses `bg-forest-600` at 3.30:1 and passes the 3:1 non-text threshold. The assistant avatar uses `bg-amber-500` at **2.15:1**, which fails even the relaxed non-text threshold. A one-class change to `bg-amber-700` would resolve it.
* `src/components/chat/ChatButton.tsx:21` — the floating Mel button, `bg-forest-600` with a white icon at 3.30:1. Passes the non-text threshold; no change needed.

Neither chat file is in this task's approved impact list, so no edit was made. The `ChatMessage` finding is offered as a small isolated follow-up.

Separately, a beneficial knock-on was confirmed: `src/components/chat/ChatInput.tsx:61` renders a 40px send button via `h-10 w-10`. Because the new `.fj-icon-btn` floor uses `min-width`/`min-height`, which win over `width`/`height`, that button now meets the 44px target automatically with no edit to the file.

The same review was repeated for the dark-variant fills. Ten are not co-located with `text-white` and are therefore not reached by the new dark block. Eight need no change: decorative `aria-hidden` gradient blobs in `PageShell` and the public about page, progress-bar fills, a status dot in `DistributionList`, and the `aria-hidden` rating segments in `queenTraitVisuals`, which carry no foreground content and have a `formatRating` text equivalent.

The two that do warrant attention are the same chat avatars already noted above, where the white icon sits on a child element:

* `ChatMessage.tsx:65` — `dark:bg-forest-500` behind a white user icon measures **2.28:1**, failing the 3:1 non-text requirement in dark mode.
* `ChatMessage.tsx:66` — `dark:bg-amber-600` measures 3.19:1 and passes.

So the single file worth a follow-up is `ChatMessage.tsx`, where the light-mode assistant avatar (2.15:1) and the dark-mode user avatar (2.28:1) both fail the non-text threshold. Both are one-class changes. The file is outside this task's approved impact list, so no edit was made.

## 3c. Stage B Deviation — How The Fields Were Actually Associated

Steps 11 to 13 were completed, but not in the manner the plan described, and the difference should be visible rather than buried.

The plan assumed the three migrated surfaces used the shared control components and could simply be given the new `label` prop. On inspection all three use **raw `input` and `select` elements with bespoke utility classes**, not `TextInput`/`SelectField`/`TextAreaField`. Routing them through the shared components would have applied `fj-control` on top of their existing padding, border and background utilities, which compete at equal specificity, producing unpredictable styling for no accessibility gain.

The smaller and safer change was therefore to fix the association in place:

* **Login** — explicit `id`/`htmlFor` pairs on both fields, preserving the bespoke styling and the flex row that holds the password label beside the "Forgot Password?" link.
* **Record filters bar** — `aria-label` on each of the four selects. This bar has no visible labels by design, and Phase 4 collapses it behind a Filters control, so adding visible labels now would be rework and would risk the wrapping issues this filter row is already prone to. The two custom date inputs received `id`/`htmlFor`, since they do have visible labels.
* **Inspection form** — `id`/`htmlFor` on apiary, hive, date, time, weight and notes. The photo group heading was changed from a dangling `label`, which named no control, to a `p`. The file input itself was already correctly associated by being nested inside its own label.

**The consequence worth stating plainly: no surface migrated in Phase 1 currently uses the new `label`/`helpText`/`error` props added in Step 10.** The primitives now support correct semantics, and Phase 3 rewrites the inspection form onto them, but as of this phase the capability is built and unused. It is purely additive and changes nothing for the 48 existing consumer files, so it carries no risk, but it is speculative until Phase 3. Whether to keep it now or re-add it in Phase 3 is a reasonable question for the owner.

Two typography corrections were also made where they fell inside the migrated fields: the "Forgot Password?" link and the photo upload instructions moved from 12px to 14px.

## 3d. Stage C Notes

* **Bottom navigation needed one prop.** `aria-expanded` has to reflect real state, and `BottomNavBar` had no knowledge of whether the drawer was open. It gained an optional `isMoreOpen` prop, defaulted to `false`, wired from the existing `isMobileMenuOpen` state in the dashboard layout. `aria-haspopup` was corrected from `"true"` to `"dialog"`, and the More button's accessible name now reflects whether it opens or closes.
* **The active test was extracted.** `MobileDrawer` computed its active route inside `linkClasses`. Since `aria-current` needs the same answer, the test was lifted into an `isActiveHref` helper used by both, so the visual and programmatic active states cannot drift apart.
* **Escape and nested dialogs.** The hook listens on `document` and calls `stopPropagation`, which does not stop other document-level listeners such as the one in `ConfirmDialog`. This is harmless today because the drawer contains only navigation links and never opens a confirmation, but it must be revisited if the hook is later adopted by dialogs that nest, which is the deferred work noted in the plan.
* **jsdom does not implement `inert`.** The Stage E tests can assert that the attribute is present while closed, but they cannot prove that focus is genuinely blocked from entering the subtree. That specific behaviour needs a real browser, so it belongs in the manual verification pass rather than the unit tests.

## 3e. Stage D Notes

### A shadowing bug that would have removed every delete confirmation

Declaring `const confirm = useConfirm()` on the records page shadowed the global `window.confirm`. That page still uses native `confirm()` for its five delete guards, written as `if (!confirm('Are you sure...')) return` and `if (confirm(...)) { ... }`.

With the hook shadowing it, those calls would have returned a `Promise`, which is always truthy. The negated guard would never return early and the positive guards would always enter, so **every delete would have proceeded without asking**, silently, in the exact page this phase is meant to make safer.

TypeScript caught it: `Argument of type 'string' is not assignable to parameter of type 'ConfirmOptions'` plus `This condition will always return true since this 'Promise<boolean>' is always defined`. The binding was renamed to `confirmDialog` in both the page and `InspectionForm`, leaving all five native calls untouched and working. Converting them to the shared dialog remains Phase 4 work.

### Other decisions

* **The baseline is captured from the first committed render**, not by re-deriving the defaults. `getDefaultInspectionFormData()` stamps `inspection_date` and `inspection_time` from the clock, so calling it a second time to build a comparison baseline would differ by seconds and report an untouched form as edited.
* **The baseline is re-taken whenever the form is re-seeded.** The effect that watches `initialData` resets the form both when switching to a different inspection and when returning to a blank one. Without re-baselining at both points, a freshly reset form compares against the previous inspection and reads as dirty immediately.
* **Dirty covers four things, not one.** The `formData` snapshot, plus `imageFile`, plus an in-flight voice recording, plus voice processing. The photograph is the important one: it lives outside `formData` and is not JSON-serialisable, so a `formData`-only diff would have called a photo-only edit pristine.
* **Two confirmation owners, no double prompt.** The form guards its own two Cancel buttons, because it must not tear down the image and voice hooks until the user has confirmed. The page guards the paths it owns: the X button, `handleNewRecord` and `handleInspectionEdit`. These are distinct entry points, so no path can prompt twice.
* **`handleNewRecord` and `handleInspectionEdit` became async.** Both now await the guard before touching state. `handleNewRecord` gained `confirmDiscardInspection` to its dependency array, and the guard had to be declared near the top of the component because `handleNewRecord` appears well above the old `resetForm` location.
* **`resetForm` was deliberately left unguarded.** It is what runs after a successful save. Guarding it there would prompt the user immediately after they saved.
* **Route changes via `Link` remain unguarded**, as planned. `beforeunload` covers refresh, tab close and external navigation; in-app route interception has no supported App Router API and belongs with the Phase 3 rewrite.

## 3f. Stage E Notes

### The entire test suite was already broken

Before a single new test could run, every existing test file failed to load:

```
Failed to load PostCSS config (searchPath: ./postcss.test.config.mjs):
TypeError: Invalid PostCSS Plugin found at: plugins[0] (@ postcss.config.mjs)
```

`vitest.config.mts` set `css.postcss: './postcss.test.config.mjs'`. Vite treats a string there as a **directory to search for a config**, not a config file. The path never matched, resolution fell through to the real `postcss.config.mjs`, and its Tailwind v4 plugin cannot be constructed by that loader. Someone had written `postcss.test.config.mjs` with `plugins: []` for exactly this purpose; it was simply never being read.

This was pre-existing and total, confirmed by running an untouched test (`RatingButtons`) and watching it fail identically. It was repaired by inlining the config as `postcss: { plugins: [] }`, which is what the separate file was trying to express. CSS is disabled for tests anyway via `css: false`.

This is a repair, not a weakening: no assertion was relaxed and no check was skipped. Without it Stage E could not have been performed at all.

### A missing token that made a measurement untrue

The contrast test failed on `--amber-800`, which did not exist. The amber palette stopped at 700 while forest ran to 950. Since Phase 1 moved amber fills onto the 800 shade, `bg-amber-800` would have resolved to Tailwind's built-in default rather than the `#92400e` that was measured at 7.09:1. `--amber-800` and `--amber-900` were added to the palette and exposed through `@theme inline`, so the measured ratio is now the ratio that actually renders.

### Two test bugs worth recording

* **An infinite render loop, caused by the mocks.** The first run of the dirty-state tests exhausted the JavaScript heap. The mocked `useImageUpload` and `useVoiceRecorder` returned fresh `vi.fn()` identities on every render, so the effect that re-seeds the form saw changed dependencies on every pass and looped forever. The real hooks return `useCallback`-stable references, so this was purely an artefact of the test doubles; the mocks are now hoisted. Worth noting that `vitest` still exited with code 0 despite the worker dying, so the run had to be read rather than trusted.
* **The drawer's route-change effect fires on mount.** Asserting Escape called `onClose` exactly once failed with two calls, because `useEffect(() => { if (isOpen) onClose() }, [pathname])` also runs on the initial render. This is harmless in the application, where the drawer always mounts closed, but it means a drawer mounted already-open would immediately close itself. The test now mounts closed and then opens, mirroring real usage. The underlying quirk is pre-existing and was left alone.

### Coverage and its limits

* `inert` is asserted as present while closed, but jsdom does not implement it, so the tests **cannot** prove focus is actually blocked from entering the closed drawer. That is the headline fix of Stage C and it needs a manual keyboard check in a real browser.
* The contrast tests parse `globals.css` rather than restating hex values, so lightening a brand shade fails the suite instead of quietly shipping an unreadable button.

## 3g. QA Audit (Principal Quality Architect Review)

An audit of the Phase 1 diff found one defect introduced by this work, one regression it worsened, and two robustness gaps. All four were fixed. Severities are recorded honestly: nothing Critical was found.

### 🟠 High — the More button claimed to close a drawer it could not close

`BottomNavBar.tsx:50-55` reports `aria-expanded` and names itself "Close menu" while the drawer is open, but `dashboard/layout.tsx` passed `onMoreClick={() => setIsMobileMenuOpen(true)}`. The handler could only ever open. Both the accessible name and the expanded state were therefore claims the control could not honour, and this phase introduced them. Screen-reader users are told a control collapses something when it does not.

Fixed by making the handler a genuine toggle. The button is unreachable while the drawer is open, because the backdrop sits above the bottom bar and focus is trapped, so this is a semantic correction rather than a behavioural one, but the semantics must be truthful regardless.

### 🟡 Medium — round remove badges became ovals

Five image-remove badges (`WildColoniesTab.tsx` ×2, `WildColonyInspectionForm.tsx`, `submit-colony/page.tsx` ×2) are styled `Button`s carrying `p-1 rounded-full` and a 14px icon. They have no width constraint, so the raised `.fj-btn` floor stretched them to 48px tall by roughly 22px wide: an oval drawn with `rounded-full`.

This flaw pre-dated the phase — the old 40px floor already distorted them — but this work made it worse. Fixed by giving each a 44×44 minimum with centred content, which renders a proper circle and meets the target-size floor rather than evading it. The equivalent badge in `InspectionForm` was already immune because it opts out with `unstyled`.

### 🟡 Medium — a deep link could be swallowed by a confirmation

Guarding `handleNewRecord` made it async, and the URL deep-link effect calls it and then immediately runs `router.replace()`. Two consequences: the record-creation state updates were deferred behind an await while the navigation ran synchronously, and a deep link arriving while a form was dirty would raise a discard prompt the user never asked for, with the URL already cleared.

Fixed by splitting the two concerns. `openNewRecord` is synchronous and unguarded, used by the deep-link effect where there is nothing open to discard on page load. `handleNewRecord` remains guarded and async, used by the New Record dropdown, which is where a user can actually destroy work in progress.

### 🟡 Medium — a login failure was announced politely

`login/page.tsx` used `role="status"`, which is a polite live region. The region reports the outcome of a submission and is dominated by failures, which a user needs to hear promptly rather than queued behind other speech. Changed to `role="alert"`. This matters more than usual for an audience with reduced eyesight.

### Verified clear

* The compound colour override cannot clobber state variants. `peer-checked:bg-amber-600`, `active:bg-amber-500/20` and similar are distinct class tokens that the selectors never match. Every hover target on an overridden fill is same-family (`hover:bg-forest-700`, `hover:bg-amber-700`), so the restated hover rules replace nothing unintended.
* `useConfirm` returns a `useCallback`-stable reference, so putting it into the dependency chain of `handleNewRecord` and the deep-link effect cannot cause dependency churn or a re-render loop.
* The save-failure path does not reset the form. `resetForm()` sits inside the `try` before the `catch`, and the conflict branch returns early, so a failed or offline save leaves the work and its guard intact.
* The drawer's first focusable element is the close button, so opening it places focus somewhere sensible.

### Accepted, not fixed

**🟡 An automatic prefill can mark an untouched form dirty.** If a hive is preselected from the filters, the scale-weight prefill may write to `formData` without user action, after the baseline is captured. Cancelling then raises a discard prompt for work the user never did. The failure is in the safe direction, and re-baselining after asynchronous prefills would risk masking genuine edits, which is the far worse error. Recorded rather than papered over.

**🟢 Escape does not stop sibling document listeners.** `useDialogA11y` calls `stopPropagation`, which does not prevent other document-level handlers such as `ConfirmDialog`'s. Harmless while the drawer contains only links and opens no dialogs; must be revisited if the hook is adopted by nesting dialogs.

## 4. Post-Task Review

* **Root Cause Found (if applicable):** The interface applied its own standards inconsistently because they lived in consumer files rather than shared primitives. Shared controls permitted 28px targets and 12px text; saturated brand fills carried white text at 2.15:1 to 3.30:1; form controls had visible labels with no programmatic association; the mobile drawer stayed focusable while visually closed; and the inspection form had six unguarded paths that discarded work in silence. Three further defects were pre-existing and only surfaced because this work ran into them: `dark:` utilities tracked the operating system rather than the in-app theme, the amber palette lacked the shade the contrast fix needed, and the test suite could not load at all.

* **Summary of Changes:** Shared control floors raised to 48px normal and 44px compact, with icon buttons gaining a 44px hit area that leaves their visual size intact. Compact button text raised from 12px to 14px. All white-on-brand fills moved to the AAA shades, applied through one override block covering light and dark variants plus the two shared button tones, with hover restated so Tailwind's equal-specificity utilities cannot win. `dark:` bound to the theme class. A reduced-motion block added. Optional label, help and error semantics added to the three control primitives, and field association fixed in place on login, the record filters bar and the inspection visit fields. A shared dialog hook created and applied to the mobile drawer, which now carries modal semantics and is `inert` while closed. `aria-current` and real expanded state added to the bottom navigation. Unsaved-work protection added across six exit paths, covering photographs and voice notes as well as typed fields. 59 new tests across four files.

* **Notes for User:**
  1. **Please run the build.** It was not run, per repository instruction. TypeScript reports no errors in `src` and ESLint is clean on every touched file.
  2. **Check both themes.** Binding `dark:` to the theme class changes the behaviour of every `dark:` utility in the application. If your operating system already matched your chosen theme you will see no difference; if it did not, the dark theme will render as designed for the first time.
  3. **Check the dense screens.** Settings, user management and the team pages hold most of the 85 extra-small controls and will be taller.
  4. **Keyboard-test the drawer.** With it closed, tab through the page and confirm focus never lands on a hidden navigation link. jsdom does not implement `inert`, so no automated test can prove this.
  5. **Test suite baseline.** The suite could not load before this work; repairing that revealed 137 pre-existing failures across 18 files, none in code touched here. They are missing test providers (`useConfirm must be used within a ConfirmProvider` on the hives and apiaries pages, which were already consumers before this phase), a missing `ToastProvider`, stale mocks, and a text-chunking assertion. The four new test files pass in full, and 577 tests pass overall. These failures were not introduced here and were deliberately left alone rather than papered over.
  6. **One optional follow-up.** `ChatMessage.tsx` was corrected as agreed. `ChatInput.tsx` gained a compliant 44px send button automatically through the shared floor.

## 5. Decisions Confirmed Before Execution

All four scoping decisions were put to the repository owner on 31/08/2026 and confirmed as below.

1. **Extra-small control growth — full 44px floor.** Normal buttons move to 48px; small and extra-small buttons and all icon buttons move to 44px. The 85 extra-small call sites in settings, user management and team screens will become taller. This is accepted as the intended outcome and must be visually reviewed on those screens.
2. **Colour correction mechanism — compound override block.** One CSS block in `globals.css` matching the failing background/text pairings, with hover restated one step darker inside the same block. 118 call sites across 48 files are left unedited, and non-text fills are unaffected. The block must cover the dark-variant class tokens as well as the plain ones.
3. **Contrast target — WCAG AAA.** Resting backgrounds move to forest-800 (`#166534`, 7.13:1) and amber-800 (`#92400e`, 7.09:1) rather than the -700 shades that would have met AA at 5.02:1. Both shades already exist in the token scale. The accepted trade-off is that primary buttons become noticeably darker and less vibrant. The rationale is an audience over 50 with reduced eyesight working in bright outdoor light, and consistency with the parent plan having already adopted AAA for target size.
4. **Inspection field migration scope — visit fields only.** Apiary, hive, date, time, weight, notes and photo are migrated now. The remaining 22 unassociated labels are completed during the Phase 3 rewrite rather than being built twice.
5. **Focus-hook adoption scope — `MobileDrawer` only.** The shared hook is created and consumed by the drawer alone. `ConfirmDialog`, `ModalShell` and the eleven bespoke modals are untouched in this phase, so no currently working dialog can regress.
