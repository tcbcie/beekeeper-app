# Code Audit - Critical & High Severity Fixes
**Date:** 01/03/2026
**Status:** In Progress

## Critical

- [ ] **C1: Remove test-activation endpoint** — `/api/stripe/test-activation/route.ts` allows ANY user to activate subscriptions without payment. No auth check, no environment gate. Must be deleted.

- [ ] **C2: Fix fail-open account status check** — `src/lib/auth.ts:174-178` returns `true` on database error, meaning disabled accounts remain active if DB is unreachable. Change to fail-closed.

- [ ] **C3: Add role check to /users/list endpoint** — `src/app/api/users/list/route.ts` lets any authenticated user enumerate all users. Must restrict to admin/owner roles.

## High

- [ ] **H1: Harden redirect validation on login** — `src/app/login/page.tsx:22-23` only checks for `//` prefix but misses backslash-based open redirects (`/\evil.com`). Use stricter validation.

- [ ] **H2: Add expiry check to offline session fallback** — `AuthContext.tsx:30-46` restores cached sessions without checking token expiration. Could keep expired sessions alive indefinitely offline.

## Review
_To be filled after fixes are applied._
