# Task: Mobile-First Phase 2 — Mobile Shell and Overlay Coordination
**Date:** 31/08/2026
**Status:** In Progress — awaiting build verification by the owner

## 1. Objective

Make the mobile shell trustworthy: show every primary destination without horizontal scrolling, stop floating surfaces from covering each other and the controls beneath them, fix the installed app's broken Inspections shortcut, and stop a service-worker update discarding unsaved work.

Phases 3 to 5 (inspection workflow, Hives and Records, dashboard) are not part of this task.

## 2. Impact Analysis

* **Files to Modify:**
  * `src/lib/navigation.ts` — optional `shortLabel` for the bar only
  * `src/components/BottomNavBar.tsx` — fluid layout, four destinations, 14px labels, feature filtering
  * `src/app/globals.css` — shared bottom-inset token
  * `src/app/dashboard/layout.tsx` — content padding from the token
  * `src/components/ui/Toast.tsx` — offset, stack cap
  * `src/components/InstallPrompt.tsx` — offset, coordination
  * `src/components/UpdateNotification.tsx` — offset, coordination
  * `src/components/NotificationPermissionBanner.tsx` — offset, coordination
  * `src/components/chat/ChatButton.tsx`, `src/components/chat/ChatDialog.tsx` — offset, docking while a form is active
  * `src/app/dashboard/hives/page.tsx` — bulk-bar offset and its padding compensation only
  * `src/lib/update-manager.ts` — guarded reload, dismissal cooldown
  * `public/manifest.json` — Inspections shortcut URL
  * New: bottom-surface coordination context; form-activity signal
  * `tests/pwa/manifest-validation.test.ts`, `tests/lib/update-manager.test.ts`, `tests/integration/pwa-update-flow.test.ts` — updated and new assertions
  * `docs/features/mobile-first-phase2-shell-and-overlays-plan.md` — status on completion

* **Simplicity Check:** One shared offset token replaces nine hand-tuned values, so the next device inset change is a single edit rather than nine. The "form is active" signal reuses the dirty state Phase 1 already reports, rather than inventing a second notion of busy. No destination changes route, icon or desktop label; only the bar gets a shorter name. The bulk-action bar is repositioned but not redesigned, since that belongs to Phase 4.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*

### Stage 2A — Bottom navigation

- [x] **Step 1:** Add an optional `shortLabel` to `NavItem` in `navigation.ts`, and set it for the two destinations whose full names do not fit the bar. Leave every existing `label` untouched, since `Sidebar` and `MobileDrawer` read the same strings.
- [x] **Step 2:** Reduce the bottom-navigation set to the four approved destinations by adjusting `bottomNav` flags. Change no route, icon or ordering beyond the removal.
- [x] **Step 3:** Replace the `overflow-x-auto` scroll container and per-item `min-w-[76px]` with equal fluid distribution across destinations plus More, so five slots divide the viewport at any width. Remove `scrollbar-hide` from this component only.
- [x] **Step 4:** Raise labels from `text-[11px]` to 14px and reduce horizontal padding from `px-2` to `px-1` so the widest label clears 320px. Keep the 48px minimum height.
- [x] **Step 5:** Apply `filterByFeatures` in `BottomNavBar`, matching `Sidebar` and `MobileDrawer`. A no-op today; it closes the gap where a gated item added later would render regardless.

### Stage 2B — Shared bottom inset

- [x] **Step 6:** Define one token in `globals.css` for the mobile navigation height plus `env(safe-area-inset-bottom)`, with a utility for surfaces that must clear it.
- [x] **Step 7:** Replace the fixed `pb-20` in the dashboard layout with the token, so content padding tracks the real bar height.
- [x] **Step 8:** Move every bottom-fixed surface onto the token: toasts, install prompt, update notification, notification-permission banner, Mel's button and dialog, and the Hives bulk-action bar. Adjust the bulk bar's `pb-40 sm:pb-24` compensation to match its new offset.

### Stage 2C — Banner coordination

- [x] **Step 9:** Add a small context that admits one interruptive bottom surface at a time, with precedence: update, then install, then notification permission. Toasts are transient and sit outside the competition, but must clear whatever is showing.
- [x] **Step 10:** Register the three banners with the context so a lower-precedence banner stays hidden while a higher one is showing, and appears afterwards rather than being cancelled.
- [x] **Step 11:** Surface Phase 1's inspection dirty state to the shell, and dock Mel while a form is active. It must remain reachable, not vanish.
- [x] **Step 12:** Cap the number of simultaneously visible toasts so a burst cannot grow past the region reserved for it.

### Stage 2D — PWA correctness and update safety

- [x] **Step 13:** Correct the manifest Inspections shortcut to `/dashboard/records?create=inspection`, the audited working target.
- [x] **Step 14:** Guard the `controllerchange` reload on unsaved work. The guard must live where every client handles that event, not only in the tab that clicked Update, because `clients.claim()` reloads them all.
- [x] **Step 15:** Defer rather than cancel: once the work is saved or discarded, the pending update is applied or re-offered.
- [x] **Step 16:** Persist update dismissal with a short cooldown, shorter than the install prompt's seven days, so "Later" is honoured across a page load.

### Stage 2E — Tests and documentation

- [x] **Step 17:** Render tests for the bar: item count, labels used, active state, and that no scroll container remains.
- [x] **Step 18:** Coordination tests: two banners competing yield one visible; the deferred one appears afterwards; Mel docks while a form is dirty.
- [x] **Step 19:** Extend the manifest test to assert every shortcut URL resolves to a real route, which it does not check today and which is why the broken shortcut shipped.
- [x] **Step 20:** Update the two reload assertions in `update-manager.test.ts` and `pwa-update-flow.test.ts` deliberately, and state the change. Diff any failure against the existing pre-existing failure message before assuming it is new.
- [x] **Step 21:** Update documentation and set the plan's status.
- [x] **Step 22:** Prompt user to test the build, including a 320px check on a real device.

## 3a. Stages 2A and 2B — Notes

### Two mistakes made and caught during implementation

* **The `:root` block was briefly broken.** Inserting the desktop collapse rule closed `:root` early, leaving the forest, sage, amber and slate scales stranded as bare declarations inside a media query. That would have stripped the entire colour palette. Caught immediately on reading the resulting file, repaired, and verified by brace balance, a token-presence check on the parsed `:root` body, and the contrast suite.
* **A JSX comment broke the Hives page.** Placing `{/* ... */}` between `return (` and the root element created two adjacent root nodes; TypeScript reported six parse errors. The note was moved to the existing comment block above `bulkBarVisible`, where it is valid.

Both were found and fixed before moving on. Neither reached a commit.

### Design decisions

* **The utilities are wrapped in `:where()`**, so they carry no specificity and each surface keeps its own `md:` override. This follows the `.fj-btn` convention already established here, and it is what lets the install prompt stay flush at the foot of a desktop window while every mobile offset comes from one token.
* **`--bottom-nav-height` collapses to `0rem` at `md`**, because the bar is `md:hidden` there. Surfaces then need only their existing desktop offset, and no component carries a mobile-versus-desktop calculation of its own.
* **A real regression was introduced and then corrected**: the Hives bulk-action bar reserved `pb-40 sm:pb-24`. Moving the bar upward to clear the navigation made the 96px reserve at `sm` too small, because the navigation is visible until `md`, not `sm`. Between 640px and 768px the bar would have covered the last row. The breakpoint moved to `md`.
* **The bar guarantees it can never overflow.** Flex items default to `min-width: auto`, so a label wider than its share would refuse to shrink and push the row into the horizontal scrolling this stage removes. `min-w-0` plus `truncate` makes a font substitution degrade to a clipped word instead.

## 3b. Stages 2C to 2E — Notes

### The two reload assertions did not need rewriting after all

The plan expected `update-manager.test.ts` and `pwa-update-flow.test.ts` to need deliberate changes, because both encode `controllerchange` triggering an unconditional `window.location.reload()`.

They did not. The guard is a veto: with no guard registered `hasUnsavedWork()` is false and the reload behaves exactly as before, so the existing contract still holds and no assertion was touched. New tests cover the guarded path instead. This is the better outcome — an existing behavioural assertion was preserved rather than edited to match new code.

Those two files still fail, with the same pre-existing count of 14 and the same message (`expected undefined to be defined` on the listener lookup, from the module-level singleton never re-arming). That is the documented baseline, not a regression: the failure occurs before the reload behaviour is reached at all.

### Coordination design

* **The coordinator is a veto, not a renderer.** Each banner still owns its own visibility logic and markup; it simply asks whether it may occupy the region. That keeps the change small and leaves each component independently testable.
* **A losing surface is deferred, not cancelled.** Its claim is retained, so it appears once the surface above it goes away. The same applies to a form in progress: banners are held back, then released.
* **No provider means no change.** `useBottomSurfaceSlot` returns its `wants` argument unchanged when no coordinator is mounted, which is why all 22 existing `UpdateNotification` tests still pass untouched.
* **Mel docks rather than disappears.** While a form is active it shrinks to 44px and fades, still a valid touch target and still reachable, instead of vanishing with no way back.
* **Dirty state is mirrored into state as well as the ref.** The ref keeps the exit guards free of re-renders; the shell needs a rendered value. It flips at most twice per form.

### Corrections made along the way

* **A hydration hazard was removed.** `NotificationPermissionBanner` read `localStorage` during render to decide whether it had been permanently dismissed. That is unavailable on the server and risks a mismatch, so it moved into an effect.
* **The dismissal cooldown is applied only where the defect was.** A stored dismissal suppresses the prompt on the `registration.waiting` path in `initialize()`, which is what made "Later" meaningless across a reload. A genuinely new update arriving through `updatefound` is not suppressed, and the waiting worker reference is still kept so an explicit check can apply it.
* **A throwing guard counts as unsaved work.** A guard that raises must never be read as permission to discard the user's work.

### Test-authoring mistakes, caught locally

* An arbitrary-value Tailwind class is not a valid CSS selector; `container.querySelector('.text-\[11px\]')` threw in jsdom. Replaced with a string check on the markup.
* The reload-guard tests drive `flushPendingReload` directly rather than going through `initialize()`, because the singleton's `initialized` flag is never reset between tests. Routing through it would have reproduced the existing suite's failure mode rather than testing anything.

## 4. Post-Task Review

* **Root Cause Found (if applicable):** The mobile shell had no shared notion of the space at the bottom of the screen. Each floating surface picked its own offset by eye and its own visibility in isolation, so five of them shared one stacking bucket, three sat in the same band, and only the navigation bar accounted for the device safe area. The navigation bar itself reserved a fixed width per destination, needing 456px on a 390px screen, which pushed a destination off-screen behind a hidden scrollbar. Separately, the installed app's Inspections shortcut pointed at a route that does not exist, and because the service worker calls `clients.claim()` while every client reloads unconditionally on `controllerchange`, one tab applying an update reloaded them all — including a tab holding a part-finished inspection that never saw the prompt.

* **Summary of Changes:** The bottom bar now shows four destinations plus More as equal fluid slots, with 14px labels and short bar-only names, and can no longer overflow because each slot may shrink and truncate. Apiaries moved into More. One `--bottom-nav-inset` token describes the space the bar occupies, collapsing to zero above `md`, and all eight bottom-fixed surfaces derive from it instead of hand-tuned offsets. A coordinator admits one interruptive banner at a time by precedence and defers the rest, holds all of them back while a form is in progress, and docks Mel rather than letting it float over the fields being filled in. Toasts are capped. The manifest shortcut now opens the real inspection flow. A reload arriving while work is unsaved is deferred until the work is saved or discarded, guarded in the handler every client runs. Update dismissal now persists for an hour. 37 new tests.

* **Notes for User:**
  1. **Please run the build.** It was not run, per repository instruction. TypeScript reports no errors in `src`, ESLint is clean on every touched file, and the full suite is unchanged against its baseline: the same 18 files and 137 tests fail for the same pre-existing reasons, while passing tests rose from 577 to 614.
  2. **Check the bar at 320px.** The label widths were computed from font metrics, not measured in a browser. Every label should sit on one line with no ellipsis; truncation appearing would mean a font substitution is wider than calculated.
  3. **Apiaries has moved into More.** This is the visible change to muscle memory, and Overview now reads "Home" and Tasks & Events reads "Tasks" in the bar only.
  4. **Check the bottom band on a notched device.** Toasts, Mel, the install and update prompts and the Hives bulk bar all moved onto the shared inset and should now clear the bar consistently.
  5. **The reload guard cannot be exercised by unit tests end to end.** Worth confirming by hand: begin an inspection, deploy an update, and check the tab does not reload until the inspection is saved or discarded.
  6. **Reported, not fixed:** `getAppVersion()` still falls back to a hardcoded `1.4.2` while the app is at `1.11.3`, and `MD/PWA-UPDATE-SYSTEM.md` describes a network-first cache strategy that the service worker does not implement. Version handling is a manually triggered task by repository rule.

## 5. Decision Confirmed Before Execution

**Bottom-bar destinations — confirmed on 31/08/2026.** The bar becomes **Home, Hives, Records, Tasks, More**. Apiaries moves into More, alongside Queens, Queen Rearing, Reports, Research and Tools.

This ratifies the parent plan's suggestion, which it had explicitly recorded as unconfirmed. There is no usage data anywhere in the repository, so this was a product judgement rather than a derived answer. The reasoning accepted: a hive is the thing a beekeeper acts on daily, whereas an apiary is a container visited occasionally, and hives are reachable without passing through it.

Bar labels use `shortLabel`: `Overview` renders as `Home` (37px) and `Tasks & Events` as `Tasks` (39px). Both keep their full names in the drawer and the desktop sidebar. At 320px the five slots are 64px each and every label fits within the 56px budget at `px-1`.
