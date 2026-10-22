# Batch 20: Shared API Sign-in Check

**Status:** Done 22/10/2026. The owner tested it; committed and pushed.
**Checklist:** `tasks/security-batch20-todo.html`
**Finding:** Chunk 2 cross-cutting ("the auth block is copied in 22 routes"). This is Phase 2 fix batch 8.

## The helper: `src/lib/server/api-auth.ts`

```ts
const auth = await requireUser(request, { requireActive: true })   // or requireAdmin(request)
if ('response' in auth) return auth.response
const { user, supabaseAdmin, token } = auth
```

- **`getServiceSupabase()`:** the one secret-key client, created on first use. Mel's tools re-export it from `src/lib/ai/tools/utils.ts`, so the app has a single instance.
- **`requireUser(request, { requireActive })`:** only accepts `Authorization: Bearer <token>` (scheme case-insensitive). It verifies the token with `auth.getUser`. With `requireActive`, it refuses a deactivated account (403). It returns `{ user, supabaseAdmin, token }`; `token` is for routes that act as the user (Mel's RLS-scoped tools).
- **`requireAdmin(request)`:** `requireUser` plus `role = 'Admin'` and `is_active !== false`, otherwise 403. A profile read error also gives 403 (fail closed).
- **Responses:** 401 `{ error: 'Unauthorised' }`; 403 `Account is not active` or `Admin access required`. No client code reads these strings.

## Routes (21 files)

| Uses | Routes |
|---|---|
| `requireAdmin` | admin/export-all-data, admin/impersonate (POST and DELETE), admin/knowledge-base and admin/news-articles (their `verifyAdmin` is now a three-line shim), admin/update-user-role, admin/user-apiaries, users/list |
| `requireUser({ requireActive: true })` | beep connect/data/disconnect, wolf-waagen connect/data/disconnect, geocode, news/search |
| `requireUser()` plus the route's own profile query (which already reads `is_active`) | chat, voice-notes-transcribe, crm/invoice-email, stripe/checkout, beep/devices, wolf-waagen/scales |
| **Not used, by design** | cron/storage-cleanup (timing-safe cron secret), stripe/webhook (Stripe signature), csp-report (public) |

- Everything after the sign-in check is unchanged: rate limits, the audit log, impersonation's target checks, Resend, Stripe pricing.
- Impersonation keeps its `[AUDIT]` warning for refused attempts (401 or 403).
- About 650 lines removed in total.

## Tests

- `tests/lib/api-auth.test.ts` (10 tests):
  - no header, non-Bearer header, invalid token;
  - a deactivated account with `requireActive`;
  - success returns user, client and token;
  - `requireAdmin` refuses a non-admin, a deactivated admin, and an unreadable profile;
  - it passes through the 401 and allows an active admin.
- `tests/api/admin/update-user-role.test.ts` now expects the single 401 wording.

**Rule for new routes:** call `requireUser`/`requireAdmin` from `@/lib/server/api-auth`. Never build another secret-key client or parse the `Authorization` header by hand.

## Verification

- `tsc --noEmit` shows 0 errors, `eslint src` is clean, and the test suite gives 818 passed and 23 skipped.
- qa-engineer found no issues. One improvement was made: the Bearer scheme is matched case-insensitively.
