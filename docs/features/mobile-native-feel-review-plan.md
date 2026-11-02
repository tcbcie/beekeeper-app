# Feature: Mobile Native Feel - Review and Plan
**Date:** 02/11/2026
**Status:** Approved 02/11/2026 for full implementation. Owner decisions: no app store route for now; drafts, offline saving, full-screen inspection and compact Hives rows reopened; start with Phases 0 and A.
**Correction during Phase A:** the plan said to load a real font. Device fonts were an owner decision (batch 47), so that stands. The stack was corrected to use each device's true system font, and nothing is downloaded.
**Checklist and mock-ups:** `tasks/mobile-native-feel-todo.html`
**Builds on:** `docs/features/mobile-first-over-50-ux-remediation-plan.md` (read section 12)

## 1. Overview

The owner's view is that HiveCraic feels like a website squeezed onto a phone, well short of apps such as Revolut or The Economist. The review agrees.

The earlier mobile-first programme made the app **safe and legible**: 48px controls, a 14px and 16px type floor, AAA colour pairs, labelled fields and dirty-form guards. It did not change the app's **structure or behaviour**, and that is where the gap now lies.

**The PWA framework is not the main constraint.** It accounts for a small part of the gap (section 4). Most of the gap comes from choices within our control.

### Evidence and its limits

* Counts come from reading the code at commit `b5e9d7fd`.
* Layout figures were measured on production on 02/11/2026, in the owner's account, using browser device emulation at 400x620 (385px usable width). The owner also supplied one emulated screenshot. Page heights depend on this account's data and saved filters.
* **Nothing was tested on a real phone,** so safe areas, the keyboard, touch and speed on a phone were not observed. Screenshots failed in the session, so the screens themselves were not visually reviewed beyond the owner's screenshot.
* Effort figures are judgement and low confidence.
* Claims about Revolut and The Economist come from job adverts, agency write-ups and store listings, not their own engineering accounts.

## 2. Findings

### Five structural causes

| # | Cause | Evidence |
|---|---|---|
| 1 | **Every navigation is a page reload in spirit.** Tabs have no stack or kept state; each visit unmounts the page and refetches from empty. | One `{children}` slot (`src/app/dashboard/layout.tsx:144`). All 38 dashboard pages are client components. No client data cache. `src/hooks/useHivesList.ts:37-40` |
| 2 | **Nothing responds instantly or moves.** | 0 `loading.tsx`, 0 View Transitions, 0 motion library. Spinners in 34 of 38 pages. `.fj-btn` has hover styles and no `:active`. 1,017 `hover:` against 73 `active:` in TSX |
| 3 | **Screens are stacked desktop sections.** | See the measurements below. The inspection form renders inline in Records (`src/app/dashboard/records/page.tsx:1751`) |
| 4 | **Web overlays and web navigation shapes.** | 44 centred dialogs against 2 bottom-anchored. `ModalShell` is always centred (`src/components/ui/ModalShell.tsx:78`). 18 dialogs are hand-rolled with no focus trap. No sticky save. 22 tables always scroll sideways. The same logo and Log out bar on every screen, and no shared title or back control (13 hand-rolled back arrows) |
| 5 | **The shell ignores the device, and the app is online-only.** | No `viewport-fit` (`src/app/layout.tsx:35-44`), so the app is letterboxed inside the safe areas. 0 `dvh`, 0 `overscroll-behavior`, no keyboard handling. Manifest background `#ffffff` and theme `#f59e0b` clash with the app's `#faf8f5`. No splash screens. No drafts or offline queue |

### Measured on production

The screen in use was 400x620, with a 73px top bar and a 62px bottom bar always on screen. That leaves 485px for content.

| Screen | Measured | What it means |
|---|---|---|
| Hives | Controls end at 432px. Each hive card is about 614px tall | **One hive does not fit on screen.** The page ran to 3,710px with the filters saved on this account |
| Hive detail | Page is 15,364px tall. Title at 218px, first section at 742px. Content is 313px wide of 385px | About 25 screens of scrolling, and 19% of the width lost to padding |
| Apiary detail | First hive at 1,296px, in a page 2,298px tall | Over two screens before the first hive |
| Records | First record at about 906px, with 19 controls above it (filters were open on this account). Page is 13,254px tall | Filters fill the first screen and a half |
| Inspection | Form starts 1,189px down the page and is 295px wide. Next at 1,715px, Save at 1,777px, Cancel at 1,838px | Opens inside a long page. On step 1, the page scrolls to the form but Next and Save stay below the fold |
| Tasks | 10 controls before content, ending at about 457px | Same stacking pattern |
| Dashboard | 3,305px tall with 9 headings | Long, as already recorded for Phase 5 |

The hive card is the largest single problem on the most used list. The owner's screenshot also shows the floating chat button covering the "1 job" badge on an apiary row.

The earlier programme's rise to 48px controls and larger text was right, but it grew these screens. The layouts need redesigning around those sizes, not further reduction.

### The most serious finding is not cosmetic

An inspection saved with no signal gets an error toast. The form stays open, but the contents exist only in React memory (`src/app/dashboard/records/page.tsx:175`). Closing or killing the app loses them. No save timeout was found, so weak signal may leave it hanging. Offline, the `OfflineIndicator.tsx:57` banner says "Changes won't be saved until you reconnect", which can read as if changes will be saved later.

For an app used in fields, this does more damage to trust than any animation could repair.

### What already works, and should be kept

* 48px primitives, type floor, contrast, reduced motion, focus handling.
* Sticky context: filters, selected apiary and hive, list position, work place until end of day.
* Bottom bar with four destinations plus More, opening a bottom sheet.
* Service worker with capped caches and an update flow that waits for unsaved work.
* 67 `dynamic()` calls keeping heavy libraries out of first load.

## 3. What "premium" should mean here

Revolut and The Economist are not templates to copy. Their small type and dense layouts would fail our audience. What transfers is behaviour:

1. **Instant response.** Press feedback at once, and cached data on return.
2. **Spatial continuity.** You can tell where a screen came from and how to get back.
3. **One job per screen.** Primary action always in thumb reach.
4. **Honest state.** Saved, waiting to send, or failed, and always clear which.
5. **Restraint.** Fewer borders and cards, better type, one change at a time.

### Mobile design contract (proposed)

* Each field screen has one title bar, one job and one primary action.
* Primary action is pinned above the bottom bar or keyboard. Primary actions are 56 to 64px (judgement, no glove standard was found; test in gloves). The 48px floor stays for everything else.
* Tall or task-based overlays on phones are bottom sheets or full screens, never centred dialogs. Short confirmations may stay centred.
* Lists use rows or compact cards. No cards inside cards. No sideways-scrolling table on a field screen.
* Every press gives visible feedback within 100ms. Motion lasts 150 to 250ms, explains position and respects reduced motion.
* Gestures are shortcuts only, with a visible alternative (existing programme rule, WCAG 2.5.1).
* Returning to a screen never shows a spinner if data is cached.
* Unchanged: 14px and 16px floors, pinch zoom enabled, AAA colour pairs, "apiary" not "yard", sentence case.

## 4. Platform constraints (late 2026)

**Correction:** the project `CLAUDE.md` says web push is not available on iOS. It has worked for Home Screen installs since iOS 16.4.

### Things a PWA cannot do

| Limit | Impact on HiveCraic | Response |
|---|---|---|
| No haptics on iOS | Moderate; premium feel, and useful in gloves | Strong visual press states; `navigator.vibrate` on Android only |
| No Background Sync on iOS | High for an offline queue | Flush the queue on open and on reconnect, and show the waiting count |
| iOS storage can be evicted | Moderate | Local data is a buffer, never the only long-term copy; request `persist()` |
| No install prompt on iOS, no store presence | Moderate; discovery and trust for older users | Guided install screen; TWA or Capacitor later (section 5) |
| No NFC or Bluetooth on iOS; no share target or shortcuts on iOS (share target and shortcuts are low confidence) | Low today | Avoid features that depend on these unless going native |
| No directional swipe-back animation | Low to moderate | Keep the transition neutral on Back |
| No notification actions on iOS | Low | Tapping opens the right screen |
| `interactive-widget` and VirtualKeyboard missing on iOS | Moderate | Use `visualViewport` for sticky bars and sheets |

### Things that are possible, and unused

View Transitions (iOS 18+), scroll-driven animations (iOS 26), `dvh` and safe areas, `overscroll-behavior`, popover, IndexedDB storage, web push, badging. Stable `<ViewTransition>` requires an upgrade from Next 15.5 and React 19.1.

## 5. Options compared

| Option | Effort | Feel | Stores | Verdict |
|---|---|---|---|---|
| Hardened PWA | Weeks to months | High, no iOS haptics | None | **Do this first.** All of it carries into Capacitor |
| TWA (Android) | Days | Same as PWA | Play | Optional later; check Play billing rules |
| Capacitor, bundled | 1 to 3 months after the PWA work | High, native haptics | Both | Decide after the PWA work and the payments question |
| Capacitor with `server.url` | Low | As PWA | Rejection risk | **Avoid.** Capacitor says it is not for production, and it fits the Guideline 4.2 rejection pattern |
| Expo or React Native | 6 to 12+ months | Very high | Both | **Not now.** Rewrites and then maintains a second UI alongside desktop |
| Flutter | Longest | Very high | Both | **No.** New language and a full rewrite |

**Hidden blocker for any store route:** the app sells via Stripe. Apple's Guideline 3.1.1 points subscriptions to in-app purchase, with limited exceptions. EU terms and Play billing rules were not checked. Settle this before committing to a store. A bundled Capacitor build also needs static export, which is awkward with 12 dynamic-parameter pages and 25 API routes.

## 6. Frameworks

| Need | Choice | Note |
|---|---|---|
| Client cache, instant return, offline reads | TanStack Query with persist | Top five screens first. Clear on sign-out and impersonation |
| Bottom sheets with drag | Base UI Drawer | Vaul's README says it is unmaintained |
| Route motion | Native View Transitions, after the Next upgrade | Only worthwhile once data is cached |
| Drafts and offline queue | Dexie | Only when that work starts |
| Occasional complex gesture or animation | Motion | Only where CSS falls short |
| Mobile screen checks | Playwright with device profiles | Not installed today. Vitest and jsdom cannot see layout |

**Not recommended:**

* **Ionic, Konsta, Framework7:** impose a second design system over 36 existing primitives.
* **Vaul, use-gesture:** unmaintained or dormant.
* **Serwist:** the hand-written service worker already does the job.
* **Virtualisation:** not needed yet. Records is paged at 50, and Hives should be measured on real accounts first.

## 7. Skills

**Claude skills**

* **Keep:** `web-design-guidelines` for reviews, `vercel-react-best-practices`, `qa-engineer`, and `design-taste-frontend` for visual direction on app screens.
* **Fix:** `ui`. It promises swipe-to-delete and pull-to-refresh, and names Tailwind 3 and Radix. None of this matches the app.
* **Add:** a project `mobile-screen` skill holding the design contract, primitives and a screen checklist, so new features stop reintroducing desktop patterns.

**People and equipment**

* One real iPhone and one real Android phone, used for every phase.
* The six to eight moderated beekeeper sessions already prepared in `mobile-first-phase5-validation-pack.md`, still outstanding.
* Optional: a few days of an interaction designer's time to set type, motion and row patterns. This is the single place where outside skill would help most.

## 8. Scope & Simplicity

* **In scope:** the shell plus the field path: Hives, Hive detail, Inspection, Records and Tasks.
* **Out of scope:** admin, CRM, research and reports stay responsive only. Desktop layouts stay as they are.
* **Existing code impact:** changes land in shared primitives first (`globals.css`, `Button`, `ModalShell`, `Navbar`, new `AppBar`, `StickyActionBar`, `SegmentedControl`, `ListRow`), so screens inherit them. Each phase ships alone.

## 9. Earlier decisions this touches

| Decision | Treatment |
|---|---|
| Four destinations plus More (31/08/2026) | **Kept.** |
| Gestures are shortcuts only | **Kept.** |
| Dashboard gated on moderated sessions | **Kept.** Dashboard hierarchy waits for the sessions |
| Local drafts deferred (backlog Step 15) | **Proposed reopening.** IndexedDB removes the photo and quota objections. Keying by user id and clearing on impersonation must answer the cross-user risk |
| Back guarding left open (Step 16) | **Proposed narrow change.** Android Back closes the open overlay. Page-level guarding stays out, to avoid trapping users |
| Full-screen inspection (Step 17) | **Proposed reopening.** It is the core of the field path |
| Bespoke modal migration (Step 18) | **Proposed staged.** `ModalShell` first (25 uses in one change), then only the hand-rolled dialogs on field screens |
| Compact list view (Step 12c) | **Proposed reopening,** within the Hives redesign |

## 10. Edge Cases & Risks

* **Persisted cache across users:** cached data must be keyed per user and cleared on sign-out and impersonation (see the existing per-user cache rules). Do not persist failed queries.
* **Stale data shown as current:** show a clear "updated" time on field screens, and refresh on open.
* **Offline queue:** duplicate submits need client-generated ids and an idempotent insert. Photos and weather lookups must run after sync. RLS can block a queued write hours later, so failures need a visible retry or export, never a silent drop.
* **`viewport-fit=cover`:** every fixed element then needs insets, and the top of the screen too. Without that, content sits under the notch. Ship with device checks.
* **Bottom sheets and the keyboard:** behaviour differs on iOS and needs a real device.
* **Back handling:** extra history entries can trap users or break the existing sheet and dirty guards.
* **Next and React upgrade:** a separate, isolated change. CSP and middleware need rechecking.
* **Older users dislike change:** hive card content moves. Keep names, icons and colours, and use the sessions to catch problems.
* **Scope creep:** without the ratchet tests and skill, new features will bring desktop patterns back.

## 11. Implementation Phases

Rough effort, one developer with AI help. About 3 to 5 months in total, part-time. Low confidence.

1. **Phase 0 - Baseline (days):** real-device screenshots, contract, skills, doc corrections.
2. **Phase A - Feel (1 to 2 weeks):** press states, device CSS, manifest and splash, real font, skeletons.
3. **Phase B - Don't lose work (1 to 2 weeks):** drafts, timeouts, honest save messages.
4. **Phase C - Navigation (2 to 3 weeks):** title bar, back, scroll memory, tab re-tap, overlay Back.
5. **Phase D - Mobile primitives and field screens (4 to 6 weeks):** sheets, sticky actions, segmented control, rows; Hives, Hive detail, Inspection, Records, Tasks.
6. **Phase E - Instant data (3 to 4 weeks):** TanStack Query, persisted reads, optimistic saves, undo.
7. **Phase F - Motion (1 to 2 weeks):** Next upgrade, View Transitions.
8. **Phase G - Offline outbox (3 to 4 weeks):** queued inspections and sync states.
9. **Phase H - Validate:** moderated sessions, then the dashboard plan.
10. **Phase I - Stores decision:** payments first, then TWA or Capacitor if justified.

## 12. Acceptance Measures

Measured on a real iPhone and Android phone at 390px-class width, with today's emulated figures for comparison:

* Hives shows at least five hives on first view (today: less than one).
* Hive detail uses at least 92% of screen width (today 81%), with status and the next action on the first screen.
* Apiary detail shows its first hive on the first screen (today 1,296px down).
* Records shows its first record on the first screen with filters closed (today about 906px down with filters open).
* No centred dialogs for forms on field screens.
* Save is visible without scrolling on every inspection step.
* Returning to any bottom-bar tab shows content with no spinner, and at the same scroll position.
* Airplane-mode test: start an inspection, kill the app, reopen, and everything including photos is still there.
* After Phase G: an inspection saved offline syncs once and only once on reconnect.
* Beekeepers aged 50 to 75 complete the five core tasks in gloves, outdoors.

## 13. Sources

* WebKit storage policy: https://webkit.org/blog/14403/updates-to-storage-policy/
* View Transitions: https://caniuse.com/view-transitions and https://nextjs.org/docs/app/guides/view-transitions
* React 19.3: https://react.dev/blog/2026/09/09/react-19-3
* Background Sync: https://caniuse.com/background-sync
* iOS PWA summary (secondary, September 2026): https://progressivewebapps.com/platforms/ios-safari/
* Capacitor config (`server.url`): https://capacitorjs.com/docs/config
* App Review Guidelines (4.2, 3.1.1): https://developer.apple.com/app-store/review/guidelines/
* Vaul: https://github.com/emilkowalski/vaul
* Base UI Drawer: https://base-ui.com/react/components/drawer
* WCAG target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
* NN/g older users: https://www.nngroup.com/articles/usability-for-senior-citizens/

**Not confirmed:** the 2026 EU position on Home Screen web apps (no primary source read); Google Play billing rules; the current architecture of either reference app.
