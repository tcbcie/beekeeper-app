# Supabase API Key and JWT Secret Migration (Security Batch 3)

**Status:** Completed 17/10/2026
**Findings closed:** SEC-H9 (legacy keys can't be rotated) and SEC-H5 (a service-role JWT leaked through an old database trigger)
**Checklist:** `tasks/security-batch3-api-key-migration-todo.html`

## Why

The legacy `anon` and `service_role` keys are long-lived JWTs signed with the project's legacy JWT secret. Supabase no longer lets them be rotated and retires them at the end of 2026. One service-role JWT had been exposed in an old trigger, and it gave full database access, bypassing RLS.

## How the project is set up now

| Purpose | Key | Where it lives |
|---|---|---|
| Browser / public | `sb_publishable_…` | Vercel `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the variable name is kept, so no code changed); hard-coded in `public/embed/tcbc-research-widget.js` (public by design) |
| Server (Next.js API routes) | `sb_secret_…` | Vercel `SUPABASE_SERVICE_ROLE_KEY` (the name is kept) |
| Edge functions | `sb_secret_…` "default" | `SUPABASE_SECRET_KEYS` (JSON, injected by Supabase); every function runs with `verify_jwt = false` and authorises in code |
| Scheduled jobs (pg_cron → edge functions) | No Supabase key | `x-webhook-secret` from Vault `internal_webhook_secret` |
| User sessions | ES256 JWT signing key | Supabase Auth; public key at `/auth/v1/.well-known/jwks.json` |

The legacy API keys are **deactivated** and the legacy JWT secret is **revoked**.

## Steps taken

1. **Prepare** (`7e8a61f`):
   - The 5 edge functions read `SUPABASE_SECRET_KEYS`, with a legacy fallback during the switch-over.
   - The invitation functions moved to `verify_jwt = false`.
   - The embed widget switched to the publishable key.
   - `scripts/check-secrets.mjs` blocks `sb_secret_`.
2. **Switch the app:** the owner changed the two Vercel values and redeployed (twice, because of a build cache).
3. **Clean up** (`d21dbde`): the cron jobs dropped the anon header, and Vault `anon_key` was deleted.
4. **Deactivate legacy API keys:** Settings → API Keys.
5. **JWT signing keys:** Project Settings → JWT Keys.
   - **Migrate JWT secret**, then **Rotate keys** to ES256.
   - Then **Revoke** the legacy JWT secret.

## Important lesson

Step 4 alone does **not** retire a leaked legacy key. Deactivation only blocks the legacy keys in the `apikey` header. Because they are JWTs signed with the legacy secret, they were still accepted as `Authorization: Bearer` tokens:
- on REST with the publishable key as `apikey`;
- on Storage with no `apikey` at all.

Only step 5 (revoking the legacy JWT secret) made them invalid everywhere.

## Verification (17/10/2026)

- The legacy JWT is refused:
  - as Bearer on REST (401 PGRST301);
  - on Storage (403 "signature verification failed");
  - on Auth (403 `bad_jwt`);
  - as an `apikey` (401 "Legacy API keys are disabled").
- Logs from 16/10 18:30 to 17/10 09:00:
  - secret-key requests: 6,823, all 200;
  - user requests with ES256 tokens: 839, all 200;
  - reminder job runs: 50, all 200.

## Notes for future work

- Supabase has no extractable JWT secret any more. Nothing in the app may verify JWTs locally with a shared secret. Use `supabase.auth.getUser()` or `getClaims()`.
- New edge functions must use `verify_jwt = false` and check the caller in code (a user JWT via `getUser`, or a webhook secret for internal calls). The platform's `verify_jwt` only understands legacy keys.
- `pg_net` calls must never embed a key in SQL. Read it from Vault.
- Local scripts read the new values from `.env` and `.env.local`.
- Optional tidy-up: remove the dead legacy-key fallback (`SUPABASE_SERVICE_ROLE_KEY`) from the 5 edge functions.
