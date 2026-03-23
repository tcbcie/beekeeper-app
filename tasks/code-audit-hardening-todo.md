# Code Audit Remediation Plan

## Scope
Fix the most impactful issues found during the Principal QA audit. Prioritised by blast radius and likelihood of user-facing breakage. Each fix is minimal and surgical.

---

## Phase 1: Critical Fixes

- [x] **1. Fix AuthContext race condition** — Await `refreshUser()` before setting up `onAuthStateChange` listener to prevent premature state transitions
- [x] **2. Fix account active fail-open policy** — Change `auth.ts:178` to return `false` on error (fail closed)
- [x] **3. Fix PostgREST array access in dashboard recent activity** — Change `record.hives?.hive_number` to `record.hives?.[0]?.hive_number` (and nested apiaries)
- [x] **4. Fix useDashboardStats inconsistent isCurrentRequest checks** — Batched all state updates after single checkpoint
- [x] **5. Fix BEEP API error swallowing** — Validate response structure with explicit array checks, throw on unexpected format
- [x] **6. Fix OpenAI embedding bounds check** — Add `response.data?.[0]?.embedding` validation before indexing

## Phase 2: High Severity Fixes

- [x] **7. Fix dashboard layout account check error handling** — Added clarifying comment; fail-closed policy in auth.ts now handles the security concern
- [x] **8. Fix useReportsData missing error handling** — Check for errors in all three query results and log them
- [x] **9. Fix Wolf Waagen backoff jitter** — Add ±30% random jitter to exponential backoff
- [x] **10. Fix login pendingRedirect validation** — Restrict redirects to `/dashboard` paths only
- [x] **11. Fix PostgREST type definitions** — Update `dashboard.ts` types to use arrays for joined relations
- [x] **12. Fix UpcomingEvents stuck loading** — Add error state so component renders null on failure instead of hanging

## Phase 3: Medium Severity Fixes

- [x] **13. Fix useQueenDetail null check** — Add null guard after `.single()` call
- [x] **14. Fix OpenAI classification fallback** — Log failed JSON parse with response content for debugging
- [x] **15. Fix export-utils unsafe cast** — Replace `as any` with `Record<string, unknown>`, remove eslint-disable

---

## Review

### Summary of Changes

**10 files modified** across hooks, contexts, lib, types, and pages:

| File | Change | Impact |
|------|--------|--------|
| `AuthContext.tsx` | Await initial session check; add `cancelled` flag and cleanup ref | Eliminates auth state race condition |
| `auth.ts` | Fail closed on DB error in `isAccountActive()` | Disabled users can no longer access app during DB outages |
| `dashboard/page.tsx` | Fix `record.hives?.hive_number` → `record.hives?.[0]?.hive_number` (5 locations + 1 apiaries) | Fixes silent data access bug in recent activity |
| `useDashboardStats.ts` | Defer `setApiaries`/`setStats` to same checkpoint as `setAlerts` | Prevents stale data from superseded requests |
| `beep-api.ts` | Replace `data.devices \|\| data \|\| []` with explicit validation | API errors now surface instead of being swallowed |
| `openai.ts` | Bounds check on embedding, log classification parse failures | Prevents cryptic downstream crashes |
| `useReportsData.ts` | Add error checking to all three queries | Query failures now logged instead of silently ignored |
| `wolf-waagen-api.ts` | Add ±30% jitter to retry backoff | Prevents thundering herd on rate limits |
| `login/page.tsx` | Restrict redirect to `/dashboard` paths | Blocks open redirect via localStorage |
| `dashboard.ts` | Update `hives` join types to arrays | Types now match actual PostgREST return shape |
| `UpcomingEvents.tsx` | Add error state, render null on failure | Component no longer stuck at "Loading..." on error |
| `useQueenDetail.ts` | Add `if (!queenData)` guard | Prevents null access crash on missing queen |
| `export-utils.ts` | Replace `as any` with `Record<string, unknown>` | Type-safe CSV export |

### Design Decisions
- **Fail-closed for account checks**: Prioritises security over availability. The 5s cache means transient network blips won't immediately lock users out — only sustained DB unreachability will.
- **Redirect restriction**: Changed from blocklist (`//`) to allowlist (`/dashboard`) — stronger security posture.
- **Dashboard stats batching**: Moved state updates to after all data is fetched, guarded by a single `isCurrentRequest()` check. Slight delay in initial render but eliminates partial stale state.
