# Mobile performance: LCP & CLS (Real Experience Score)

## Problem

Vercel Speed Insights reported a mobile Real Experience Score of 56. Only two
Core Web Vitals were failing — everything else (FCP 1.51s, INP 96ms, FID 31ms,
TTFB 0.85s) was green:

- **LCP 4.63s** (target < 2.5s) — ~3s gap after FCP spent on serial *client-side*
  gates: auth → an account-status DB check that blocked all content → each
  page's own serial auth+data fetches. Nothing was server-rendered.
- **CLS 0.63** (target < 0.1) — a full-screen "Loading…" → app-shell swap plus
  centred page spinners replaced by top-anchored content.

Worst route was `/dashboard/records` (RES 39), which hit all of these at once.

## Changes

### Phase 1 — LCP quick wins (sequencing)

- **`records/page.tsx`** — `hasActiveSubscription()` now runs in a `Promise.all`
  with `fetchAllData()` instead of serially before it.
- **`batches/page.tsx`** — the five data loads now fire before the subscription
  check, so it resolves alongside them.
- **`useDashboardStats.ts`** — both dashboard RPCs (`get_dashboard_overview`,
  `get_recent_activity`) are triggered together. **Note:** Supabase query
  builders are lazy (the request only fires on `await`/`.then()`), so they are
  kicked off with `.then()` up front; the overview is still awaited first to
  unblock render. Recent activity now arrives sooner (also reduces its
  late-pop-in CLS).
- **`login/page.tsx`** — `priority` added to both above-the-fold logos (the LCP
  element on `/login`).

### Phase 3 — render the dashboard immediately (biggest LCP lever)

- **`dashboard/layout.tsx`** — rendering is now gated only on `authLoading`
  (fast, local `getSession`), **not** on `getAccountStatus()`. The deactivation
  / lockout check runs in the background (immediately once a user is known, then
  every 30s) and redirects only on a **server-confirmed** non-active status.
  This removes the `profiles` round-trip from the LCP critical path.
- The previously-duplicated initial and periodic account checks were unified
  into a single effect.

**Security note:** deactivation/lockout is still enforced, and the
offline-tolerant `'unreachable'` handling (see
[auth-transient-logout-fix.md](auth-transient-logout-fix.md)) is preserved.
Trade-off (explicitly accepted): a deactivated user now briefly sees the shell
before the background check redirects them — data remains protected by RLS.

### Phase 2 — CLS (stable shell + matching skeletons)

- **New `src/components/DashboardShellSkeleton.tsx`** — a structural placeholder
  that mirrors the real chrome (Navbar wrapper classes + height, the
  `max-w-7xl` content container, the desktop sidebar column). Used for the
  `authLoading`/grace state and the layout's Suspense fallback, replacing the
  centred "Loading…". Because the Navbar position and content top match the real
  layout, the swap no longer shifts the page.
- **`records/page.tsx`** and **`batches/page.tsx`** — centred spinners replaced
  with top-aligned skeletons (header + filter bar + rows) built from the
  existing `Skeleton`/`SkeletonRow` primitives, so content lands where the
  placeholder was.
- Dashboard already had a structured skeleton (unchanged).
- Banners left as-is: `OfflineIndicator`/`UpdateNotification` are
  `fixed`-position (no content push); `ImpersonationBanner` only affects admins
  mid-impersonation.

## Out of scope (flagged for later)

SSR / middleware-based auth and RSC streaming would push LCP lower still, but
that is a large, riskier architectural change and was deliberately not attempted
in this pass.

## Manual testing checklist

- [ ] `/dashboard`, `/dashboard/records`, `/dashboard/batches` paint the shell
      instantly, then content — no full-page "Loading…" flash, no large jump.
- [ ] `/login` logo appears promptly (priority).
- [ ] Deactivate a test account server-side → still redirected to /login within
      ~30s (background check).
- [ ] Offline past access-token expiry → still no spurious logout.
- [ ] After some real traffic, confirm LCP and CLS improve on Speed Insights
      (field metrics lag).
