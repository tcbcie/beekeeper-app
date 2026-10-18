# Security Batch 11: API Low Findings

**Status:** Done 18/10/2026. The database part was applied through MCP; the code was committed and pushed at the owner's request.
**Checklist:** `tasks/security-batch11-todo.html`
**Migration (repo copy):** `supabase/migrations/20261018100000_security_batch11.sql`
**Findings:** API-09 to API-17 (Low)

## Database

- **`guard_last_active_admin`** (BEFORE UPDATE OF role, is_active, deleted_at OR DELETE on `profiles`, under an advisory lock) refuses any change that would leave no active, undeleted admin. This applies to every path: the admin route, the account functions and direct SQL with a user session.
- **`increment_code_uses(p_code, p_user_id DEFAULT NULL)`** (secret key only) increments under the row lock taken by `UPDATE … RETURNING`. When the payment takes the code past `max_uses`, the subscription is still honoured (the customer has paid €12; owner decision) and `association_code_over_limit` (code ID, uses, max, payer) is written to `admin_audit_log`.

## App

| Finding | Change |
|---|---|
| API-09 | `update-user-role` returns `{ success }` only (`.select('id')`), counts only active admins for the friendly 409, maps the trigger's 42501 to 409, and sends no `details`. |
| API-10 | The webhook calls `increment_code_uses` with the payer's user ID. |
| API-11 | `src/lib/admin-url-fetch.ts`: `isPrivateAddress()` (IPv4 private, loopback, link-local, CGNAT, multicast and reserved; IPv6 loopback, ULA, link-local, multicast, and IPv4-mapped in both dotted and hex form). `assertSafePublicUrl` checks IP literals with it; the URL parser already turns decimal and hex IPv4 into dotted form. `fetchHtmlWithBounds` follows up to 5 redirects manually and checks every hop, including a DNS lookup that refuses any private result. **Remaining limit:** DNS rebinding between our lookup and the connection. That's acceptable for admin-only routes. |
| API-12 | Generic client messages, with detail in `console.error`, in: BEEP connect and devices; Wolf connect, scales and disconnect; admin knowledge-base (and the 403 no longer includes the role); admin news-articles; update-user-role; cron storage-cleanup; and geocode (Google's `error_message` goes to the log only; the toast says "details are in the server log"). |
| API-13 | `/auth/verify` keeps `type` to an allow-list (`signup`, `recovery`, `magiclink`, `email_change`, `invite`). `redirect_to` is kept only if it is on the same origin or on hivecraic.com. See `docs/supabase-email-templates.md`. |
| API-14 | BEEP and Wolf connect: `RATE_LIMITS.scaleConnect`, 5 attempts per user per hour, and a generic failure message. |
| API-15 | The Stripe webhook activates only when `session.payment_status === 'paid'`; otherwise it logs and acknowledges. |
| API-16 | `is_active` is now checked in `beep/disconnect`, `wolf-waagen/disconnect`, `geocode` and `news/search`. |
| API-17 | `auth/callback` no longer logs the profile (email and original email); only a profile-lookup error is logged. |

## Owner action

Check that Supabase → Auth → URL Configuration → Redirect URLs contains no wildcards, such as `https://*.vercel.app/**`.

## Verification

- **Rolled-back tests:**
  - last-admin guard: demoting or deactivating the last admin is refused, and other edits work;
  - code overrun: one audit row is written.
- **SSRF checks:** decimal and hex 127, `[::1]`, IPv4-mapped loopback and metadata addresses are blocked, and a public URL redirecting to `169.254.169.254` is refused.
- **Type-check and lint:** no type errors, and ESLint is clean on all 17 changed files.
