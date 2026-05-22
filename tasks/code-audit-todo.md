# Code Audit - Critical & High Severity Fixes
**Date:** 01/03/2026
**Status:** Complete

## Critical

- [x] **C1: Remove test-activation endpoint** — Deleted entirely in commit `fab2592`. The route POST'd directly into `activate_credit_card_subscription` with zero auth.

- [x] **C2: Fix fail-open account status check** — On verification this is already closed. `getAccountStatus()` returns `'error'` on DB failure (auth.ts:181), not `'active'`. Both callers in `dashboard/layout.tsx` (lines 52, 106) gate on `status === 'active'` and sign the user out for any other value — fail-closed by construction. Added a doc comment on the function spelling this out for future contributors.

- [x] **C3: Add role check to /users/list endpoint** — Partial: in commit `402699d` we stopped returning `email` from the response (closes the harvesting attack) and added an `is_active` gate on the caller. Full enumeration of `id + first_name + last_name` is still possible because the only legitimate caller is the apiary-transfer picker which needs to browse users; restricting to admin-only would break that UX. The right next step is scope-by-team-membership, which is a product decision rather than a security patch.

## High

- [x] **H1: Harden redirect validation on login** — Reworked the `rawRedirect` check. Previously `rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')` accepted `/\evil.com` because the literal string starts with `/`, not `//`. Browsers normalize `\` to `/`, so `/\evil.com` becomes `//evil.com` at navigation time, leaking to an external host. Now the second character must not be `/` or `\`.

- [x] **H2: Add expiry check to offline session fallback** — `AuthContext.tsx`: `tryOfflineFallback` now reads `parsed.currentSession.expires_at` (Unix seconds) and refuses to restore a cached session if `now >= expires_at`. Sessions with no `expires_at` field at all (older cache format) are also refused — fail-closed.

## Review

All five items addressed. The three latent issues (C2, H1, H2) are now closed in code; C1 and C3 closed earlier in the broader audit series. Files touched: `src/lib/auth.ts`, `src/app/login/page.tsx`, `src/contexts/AuthContext.tsx`.
