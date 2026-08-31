# Feature: Mobile-First Phase 2 — Mobile Shell and Overlay Coordination
**Date:** 31/08/2026
**Status:** Implemented — pending build verification by the owner

## 1. Overview

Phase 2 of the mobile-first remediation programme defined in `mobile-first-over-50-ux-remediation-plan.md`, following the completed Phase 1 recorded in `mobile-first-phase1-accessibility-foundations-plan.md`.

Phase 2 makes the mobile shell trustworthy. Today a primary navigation destination is hidden behind a horizontal scroll with no visible affordance; five floating surfaces share one stacking bucket and three of them occupy the same vertical band, so any two shown together overlap; the installed app's Inspections shortcut leads to a page that does not exist; and a service-worker update can reload a tab that is holding unsaved work and never displayed the prompt.

It does not touch the inspection workflow (Phase 3), the Hives and Records screens (Phase 4), or the dashboard (Phase 5).

A three-agent read-only audit was completed before writing this plan. It corrected several assumptions in the parent document; those corrections are in section 7.

## 2. Scope & Simplicity

* **In Scope:**
  - Replace the horizontally scrolling bottom navigation with four fixed destinations plus More, sized fluidly so nothing scrolls at 320px, 360px, 390px or 430px.
  - Raise bottom-navigation labels from 11px to 14px, which Phase 1 deliberately deferred to here.
  - Introduce one shared bottom-inset token and have every bottom-fixed surface derive its offset from it.
  - Introduce a single coordination rule so only one interruptive banner occupies the bottom region at a time.
  - Hide or dock Mel while a long form is active.
  - Correct the manifest Inspections shortcut.
  - Prevent a service-worker update from discarding unsaved work, including in a tab that never showed the prompt.
  - Give update dismissal a cooldown, as the install prompt already has.
* **Out of Scope:**
  - The inspection workflow redesign, step navigation and draft persistence. Phase 3.
  - Hives and Records search, filters, destructive actions and the bulk-action bar's own design. Phase 4. Its positioning is corrected here only because it shares the bottom region.
  - Dashboard changes. Phase 5.
  - The remaining `text-xs` occurrences outside the bottom navigation.
  - Rewriting the caching strategy, or the security and performance findings recorded in the earlier QA audit reports.
  - Correcting the stale `1.4.2` fallback in the update manager. Version handling is a manually triggered task by repository rule; it is reported in section 7 instead.
  - New runtime dependencies. None are required.
  - Database, authentication, subscription and RLS changes. None are required.
* **Existing Code Impact:**
  - `src/lib/navigation.ts` — an optional short label for the bar only.
  - `src/components/BottomNavBar.tsx` — fluid layout, four destinations, 14px labels, feature filtering.
  - `src/app/globals.css` — the shared bottom-inset token.
  - `src/app/dashboard/layout.tsx` — content padding derived from the token.
  - `src/components/ui/Toast.tsx`, `InstallPrompt.tsx`, `UpdateNotification.tsx`, `NotificationPermissionBanner.tsx` — offsets and coordination.
  - `src/components/chat/ChatButton.tsx`, `ChatDialog.tsx` — offset and suppression while a form is active.
  - `src/app/dashboard/hives/page.tsx` — bulk-action bar offset only.
  - `src/lib/update-manager.ts` — reload guarding and dismissal cooldown.
  - `public/manifest.json` — the shortcut URL.
  - New: a small bottom-surface coordination context, and a form-activity signal.

### Simplicity rules applied

1. One shared offset token, rather than re-tuning nine hardcoded values that will drift again.
2. Reuse the dirty-state signal Phase 1 already built, rather than inventing a second notion of "busy".
3. Change no destination's route, icon or desktop label.
4. Correct the bulk-action bar's offset only; its redesign belongs to Phase 4.

## 3. Technical Design

### A. Bottom navigation

The bar currently renders five destinations at `min-w-[76px]` inside an `overflow-x-auto` container, plus a pinned More button. That is a 456px minimum against a 390px viewport, so a destination sits off-screen behind a hidden scrollbar. Labels are 11px.

The fix is to stop reserving a fixed width per item and let the row divide the viewport. Each destination and the More button become equal flex children, so five slots share the full width at every size. There is no sub-`sm` breakpoint in this project and no container queries, so the sizing must be intrinsic rather than breakpoint-driven.

Measured label widths at 14px in the app's system font stack:

| Label | Width |
|---|---|
| Tasks & Events | 99px |
| Overview | 61px |
| Apiaries | 53px |
| Records | 52px |
| Queens | 47px |
| Tasks | 39px |
| Home | 37px |
| Hives | 36px |
| More | 32px |

Slot budget with four destinations plus More:

| Viewport | Slot | Usable at `px-1` |
|---|---|---|
| 320px | 64px | 56px |
| 360px | 72px | 64px |
| 390px | 78px | 70px |
| 430px | 86px | 78px |

At 360px and above, every candidate label except `Tasks & Events` fits. At 320px, `Overview` at 61px also exceeds the 56px budget. Horizontal padding therefore reduces from `px-2` to `px-1`, and two labels need a shorter form in the bar.

Rather than rename the shared labels, which `Sidebar` and `MobileDrawer` read from the same source, `NavItem` gains an optional `shortLabel`. The bar renders `shortLabel ?? label`; every other surface keeps the full name. `Tasks & Events` becomes `Tasks`, and `Overview` becomes `Home`.

`BottomNavBar` also starts calling `filterByFeatures`, which `Sidebar` and `MobileDrawer` already do. No bottom-navigation item is feature-gated today, so this changes nothing now; it closes a gap where adding a gated item later would render it regardless of the toggle. The fluid layout absorbs a reduced item count without further work.

The `scrollbar-hide` utility is removed from this component once the scroll container goes. It remains defined for other consumers.

### B. One shared bottom inset

Nine bottom-fixed surfaces currently use hardcoded offsets (`bottom-0`, `bottom-4`, `bottom-16`, `bottom-20`, `bottom-22`) tuned by eye to clear the navigation bar. Only `BottomNavBar` accounts for `env(safe-area-inset-bottom)`. On a device with a large inset, every other surface sits too low.

`globals.css` gains a single token describing the height of the mobile navigation bar plus the safe-area inset, and a matching utility. The navigation bar defines the height; everything that must clear it derives its offset from the token, and the dashboard content padding replaces its fixed `pb-20` with the same value. One definition, so the next device that changes the inset needs one edit.

### C. One interruptive banner at a time

`UpdateNotification`, `InstallPrompt`, `NotificationPermissionBanner`, `Toast` and `ChatDialog` all sit at `z-50`, so their relative order is decided by where they happen to appear in the DOM rather than by intent. Three of them occupy the same `bottom-20` band and will overlap whenever two are shown.

A small context tracks which interruptive surface currently holds the bottom region and admits one at a time, in a fixed precedence: an available update outranks an install offer, which outranks a notification-permission request. Toasts are not interruptive and are not part of that competition; they are transient and must simply sit clear of whatever is showing.

Mel is not a banner but is the surface most often reported as being in the way. While a long form is active it docks out of the way rather than floating over the field the user is filling in.

The "form is active" signal reuses what Phase 1 already built. `InspectionForm` reports its dirty state to the records page through `onDirtyChange`; that same signal, lifted into the coordination context, tells the shell that the bottom region is spoken for. No second notion of "busy" is introduced.

### D. PWA correctness and update safety

The manifest's Inspections shortcut points at `/dashboard/inspections`, which is not a route; the shortcut 404s from the home screen. Records are created through a single screen driven by URL parameters. The audited, working target is `/dashboard/records?create=inspection`, which Phase 1's `openNewRecord` path already handles. The shortcut is corrected to that URL.

The update path needs more care. `activate` calls `clients.claim()` unconditionally, and every client listens for `controllerchange` and calls `window.location.reload()`. So when any tab applies an update, every open tab reloads — including one holding a part-finished inspection that never displayed the prompt. Clicking "Update Now" in the tab you are working in does the same thing, with no check on unsaved work.

Phase 1's `beforeunload` guard does fire on a programmatic reload, so a browser-native prompt currently stands between the user and the loss. That is a backstop, not a design. Phase 2 makes the reload conditional on there being no unsaved work in that client, and defers it until the work is saved or explicitly discarded.

`dismissUpdate()` also stores nothing, so a dismissed update reappears on the next page load with no cooldown, while the install prompt waits seven days. Dismissal gains a short, persisted cooldown so "Later" means later.

### Database Connections (MCP Server)

None. Phase 2 changes presentation, client-side coordination and a static manifest file. No schema, RLS policy, RPC or data contract is touched, and no MCP database access is required.

## 4. Edge Cases & Risks

* **Muscle memory.** Dropping a destination from the bar moves it into More. Every destination remains reachable, and the drawer already lists them all, but the change is visible and should be confirmed before implementation rather than assumed.
* **Shortened labels.** `Home` and `Tasks` appear only in the bar; `Overview` and `Tasks & Events` remain everywhere else. Two names for one destination is a small cost, weighed against truncation or an 11px label.
* **Label width is estimated, not measured in a browser.** The figures above come from per-character advance ratios for the app's font stack. They should be verified at 320px on a real device before the phase is considered complete; a system font substitution could shift them.
* **Existing update tests encode the unconditional reload.** `update-manager.test.ts` and `pwa-update-flow.test.ts` assert that `controllerchange` triggers `window.location.reload()`. Making that conditional means those assertions must be updated deliberately, with the change stated. Both files are also currently failing for an unrelated reason — the module-level singleton is never reset between tests — so a failure there must be diffed against the existing message rather than assumed to be new.
* **Suppressing an update prompt must not suppress it forever.** A user who never finishes a form must still be able to update. The prompt is deferred and re-offered, not cancelled.
* **A cooldown on update dismissal must not hide a critical update indefinitely.** The cooldown should be short, and shorter than the install prompt's seven days.
* **Toast stacking is uncapped.** Several simultaneous toasts can grow past the region reserved for them. Worth bounding while the offsets are being touched.
* **The bulk-action bar's own padding compensation** on the Hives page (`pb-40 sm:pb-24`) is tuned to the current offsets and must be revisited when the offset changes, or content will be over- or under-padded.
* **`clients.claim()` affects other tabs.** Any guard implemented only in the tab that clicks Update will not protect a second tab. The guard belongs where `controllerchange` is handled, which every client runs.
* **Mel docking must not make it unreachable.** It should move or shrink, not disappear without a way back.

## 5. Implementation Phases

1. Phase 2A: **Bottom navigation** — fluid four-destination layout plus More, 14px labels, short labels for the bar, feature filtering, scroll container removed.
2. Phase 2B: **Shared bottom inset** — one token in `globals.css`, adopted by every bottom-fixed surface and by the dashboard content padding.
3. Phase 2C: **Banner coordination** — one interruptive surface at a time with a fixed precedence, and Mel docked while a form is active.
4. Phase 2D: **PWA correctness** — the manifest shortcut, guarded reload, and a persisted update-dismissal cooldown.
5. Phase 2E: **Tests and documentation** — render tests for item count, labels and active state; coordination tests; a manifest test asserting shortcut URLs resolve to real routes; updates to the two reload assertions.

## 6. Decision Confirmed Before Implementation

The bar becomes **Home, Hives, Records, Tasks, More**, confirmed on 31/08/2026. Apiaries moves into More.

This ratifies the parent plan's suggestion, which it had explicitly recorded as requiring confirmation. The audit found **no usage data anywhere in the repository** — no page-view analytics, no destination tracking — so this was a product judgement, not a derived answer. The reasoning accepted: a hive is what a beekeeper acts on daily, an apiary is a container visited occasionally, and hives are reachable without passing through it.

Bar labels use `shortLabel`: `Overview` renders as `Home`, `Tasks & Events` as `Tasks`. Both keep their full names in the drawer and desktop sidebar. At 320px the five slots are 64px each, and every label fits the 56px budget at `px-1`.

## 7. Audit Corrections to the Parent Plan

* **The four-destination target is achievable**, contrary to the reading that its own acceptance criteria were contradictory. Four destinations plus More at 14px fits every target viewport once the fixed `min-w-[76px]` is replaced by fluid distribution and `Tasks & Events` is shortened for the bar. Only 320px additionally requires shortening `Overview`.
* **`NotificationPermissionBanner` is not global.** It mounts only on the Batches page, so it can only collide there.
* **The overlay problem is a stacking problem, not only a positioning one.** Five surfaces share `z-50` and are ordered by DOM position rather than intent.
* **The service worker can reload a tab that never showed the prompt.** `clients.claim()` plus an unconditional `controllerchange` reload means one tab applying an update reloads them all. This is a data-loss path the parent plan does not mention, and it is the most serious finding in this audit.
* **Update dismissal does not persist**, so a dismissed update returns on the next page load. The parent plan assumes prompts are "recoverable after dismissal"; the real defect is the opposite.
* **The bottom navigation's safe-area handling is already correct** and needs no rework; it is the only such usage in the repository, which is the actual problem.
* **`BottomNavBar` never applies feature gating**, unlike `Sidebar` and `MobileDrawer`.
* **Reported, not fixed:** `getAppVersion()` in the update manager falls back to a hardcoded `1.4.2` while the application is at `1.11.3`. Version handling is a manually triggered task by repository rule, so this is raised rather than changed.
* **Reported, not fixed:** `MD/PWA-UPDATE-SYSTEM.md` describes the cache strategy as network-first, while the service worker is cache-first for static assets and map tiles.
