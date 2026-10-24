# Batch 39: App Shell

**Status:** Implemented 24/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch39-todo.html`
**Database:** no change.
**Findings:** C1-04 to C1-09, C1-11, C1-13, C1-14, C1-16, C1-18, C1-19, C1-26, C1-27 and C1-30 are fixed. C1-12 was mostly not real and got a small fix. C1-23 was not real. This is Phase 2 fix batch 26.

## A. Prompts and reminders

- **C1-04:** "Later" on the update banner now holds for its hour on every path.
  - **The bug:** `update-manager.checkForUpdates` showed a waiting worker regardless of the "Later" cooldown. The 30-minute timer and the return-to-app check both call it, so the banner came back seconds after "Later".
  - **The fix:** it now takes `explicit = false`. A waiting worker only shows while the cooldown is active if `explicit` is true. Only `UpdateCheckButton` passes `true`. A genuinely new update still shows through `updatefound`.
- **C1-05:** `NotificationPermissionBanner` reads `notification-banner-dismissed-until` before starting its 2-second timer. Before, a separate effect hid a banner that wasn't yet showing.
- **C1-06:** Batches no longer calls `initializeNotifications()` on load. That call raised the browser's permission prompt without a tap, and a "Block" there is permanent. The banner's Enable button is the only place that asks.
- **C1-07:** `src/lib/notifications.ts` keeps one timer per tag in `scheduledTimers`, replacing an existing one.
  - **Clearing:** `clearScheduledNotifications()` clears them all. The Batches effect returns it, so timers go when the batches change or the page closes.
  - **Past reminders:** a reminder whose time has passed shows once per session (`shownTags`).

## B. Service worker (`public/service-worker.js`)

- **C1-08:**
  - **Page data:** requests with `RSC: 1` or `?_rsc=` pass straight to the network. Offline, Next falls back to a full page load, which is served from the cached page or `/offline.html`.
  - **Page cap:** the general cache keeps the 100 most recent user-data entries (`isUserData`). Build assets and offline pages are never trimmed.
- **C1-09:** the Mapbox cache keeps 1,500 entries. `docs/features/mapbox-tile-caching.md` is updated.
- **How trimming works:** `maybeTrimCache(cacheName, max, filter)` runs every 25 writes and deletes the oldest entries first (`cache.keys()` is in write order). It is best-effort.
- **Unchanged:** the cache name, the version, `skipWaiting` and the activate order. Any change to the file makes phones install the new worker through the update banner.

## C. Sign-in and loading

- **C1-11:** `ErrorBoundary` takes a `resetKey` and clears a shown error when it changes. The dashboard layout passes the pathname.
  - **Why not a React key:** a key would remount the nested CRM, logbook and apiary map layouts on every navigation (QA fix).
- **C1-12:** pages don't read `user`. The layout's account check now keys on `userId`, so a token refresh no longer re-runs it.
- **C1-13:** the root page and the login page's already-signed-in redirect use `router.replace`. Before, a `/` history entry trapped Back in the installed app (`start_url: "/"`). There is still no middleware.
- **C1-14:** the login form's `onKeyDown` turns Enter in an input into `requestSubmit()`. That submits without "clicking" the first button (Log in), so the current mode is kept.
- **C1-16:** the reset-password inputs use the login class string (48px, `bg-surface`, forest focus), and the page uses `bg-background` instead of the yellow gradient.
- **C1-18:**
  - **Role:** `getUserRole` shares its in-flight request, so callers mounting together make one query. Only the promise is shared, not the result.
  - **Subscription:** `useHasActiveSubscription.ts` caches the full status and exports `resolveSubscriptionStatus()`, which Navbar uses. `resolveActiveSubscription` is built on it.

## D. Screens

- **C1-19:** the Navbar's subscription and profile-incomplete icons are 48px links to `/dashboard/profile`, with the message as the `aria-label`. The hover tooltip remains.
- **C1-26:** `ImageZoomModal` changes:
  - **Touch:** pointer events with `setPointerCapture`, plus `touch-none` while zoomed.
  - **Dialog:** `useDialogA11y` gives Escape, the focus trap and focus return, and the container has `role="dialog"`, `aria-modal` and `aria-label`.
  - **Controls:** 48px.
  - **Hint:** "Double-tap or use + to zoom".
- **C1-27:** `en-US` is now `en-IE`, and "expiration" is now "expiry". This covers the renewal modal, the subscription history and status card, and the admin user and code screens.
- **C1-30:** `OfflineIndicator` sits at `top-24`, below the sticky navbar, instead of over Logout.

## E. Not real

- **C1-23:** the theme bootstrap script sets the class before paint, `<html suppressHydrationWarning>` covers it, and `ThemeSwitcher` is never server-rendered.

## Rules

- Timer or visibility update checks are passive and respect "Later". Only the explicit button overrides it.
- Ask for notification permission only from a tap.
- Keep a handle on every timer you set, and clear it on change or unmount.
- Service worker caches are capped. Don't cache RSC requests. Don't change the cache name without the owner.
- Reset an error boundary with a reset key, not a React key, when nested layouts sit inside it.
