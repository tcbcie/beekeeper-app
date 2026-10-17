# Security Batch 7: API Routes

**Status:** Done 17/10/2026. Database applied via MCP; the owner tested the app; committed and pushed.
**Checklist:** `tasks/security-batch7-todo.html`
**Migration (repo copy):** `supabase/migrations/20261017140000_security_batch7.sql`
**Findings:** API-02 to API-08 (all Medium)

## Owner decisions (17/10/2026)

- Invoice emails go only to the customer's saved email or the seller themselves.
- Per-user limits:
  - chat: 30 an hour and 150 a day
  - voice: 20 an hour and 60 a day
  - news search and geocoding: 60 an hour each
  - code attempts: 10 an hour (20 calls)
  - invoices: 25 an hour
- Users are emailed when an admin impersonates them.
- Admin export: sign-in secrets are left out unless ticked, and the complete export needs a password re-check.

## A. Shared rate limiter

- **Table:** `api_rate_events` (user, bucket, time). RLS is on and there is no client access. A daily cron purges rows older than 2 days.
- **Function:** `consume_rate_limit(user, bucket, limit, window_seconds)`, which only the secret key can execute. It takes an advisory lock per user and bucket, counts, and records in one transaction, so parallel requests can't slip past. It returns false when over the limit.
- **Helper:** `src/lib/rate-limit.ts` (`consumeRateLimits`, `RATE_LIMITS`). It **fails closed**: if the check errors, the request is refused.

## B. API-07: paid routes

| Route | Limit | Over the limit |
|---|---|---|
| `/api/chat` | 30/hour and 150/day | 429 with a message; the chat shows it |
| `/api/voice-notes-transcribe` | 20/hour and 60/day | 429; the voice-note error line shows it |
| `/api/news/search` | 60/hour | 429 |
| `/api/geocode` | 60/hour | 429 `not-found`; the page falls back to its free city lookup |

The limit is consumed only after validation, just before the paid call.

## C. API-03: invoice email

- The recipient must be the customer's saved email or the seller's own email (`profiles.email` / auth email); otherwise the server returns 400. The invoice page offers those two choices instead of a free text box.
- The 25-an-hour limit uses the shared limiter and is reserved before the PDF render and send. The seller name is capped at 100 characters.

## D. API-02: scale data

- With a `hiveId`, the `beep/data` and `wolf-waagen/data` routes use the owner's token, so they now require the requested device or scale ID to match the hive's column (403 otherwise). Without a `hiveId`, they use the caller's own token, unchanged.
- The trigger `guard_hive_scale_columns` means only the hive's owner can change `beep_device_*` / `wolf_scale_*`.
- Errors from the vendor are no longer passed to the browser.

## E. API-04 and API-05

- `/api/users/list` is admin-only. An apiary owner's transfer now uses "enter the new owner's email" with `lookup_user_by_email`.
- Registration codes:
  - `lookup_registration_code`, `activate_subscription` and the checkout route share the `code_attempt` bucket (20 calls an hour).
  - The lookup raises `P0429` with a plain message, and the subscription modal shows it.
  - Checkout returns a single "Invalid association code" for "no such code", "wrong type" and "not linked".

## F. API-06 and API-08: export and audit trail

- `admin_audit_log` is append-only (a trigger refuses updates and deletes) and admin-read-only.
- Routes record:
  - `impersonation_started`. This is required: no record means no session.
  - `impersonation_ended`, through `DELETE /api/admin/impersonate` from the banner.
  - `role_changed`, `database_export` (required) and `user_apiaries_viewed`.
- Triggers record:
  - `profile_changed`: an admin changing another user's `is_active`, `deleted_at`, `role`, `subscription_expires_at` or `subscription_type`.
  - `profile_deleted`.
  - `apiary_transferred`.
- The impersonated user gets a notification email. It is sent from `info@hivecraic.com`, and replies go there.
- Export:
  - The complete export requires the admin's password, checked by a throwaway public-key sign-in.
  - Without "Include sign-in secrets", the export blanks `auth.users` password hashes and tokens and `profiles` BEEP/Wolf tokens.
  - The error response no longer includes internal details.

## Verification

Rolled-back database tests:
- The limiter allowed 3 calls and refused the 4th.
- A team member's scale change was blocked (42501), but other hive edits worked.
- The 21st code lookup in an hour was refused (P0429), and activation gave the same message.
- An admin's subscription edit wrote one audit row, while the admin's own profile edit wrote none.
- A non-admin saw 0 rows and a forged insert was blocked.
- Deleting from the log was refused even for the table owner.
- A user calling the limiter directly was denied.

Other checks:
- No type errors in `src/`, and ESLint is clean on all changed files.
- The security advisors show only the expected "no policies" note on `api_rate_events`.
