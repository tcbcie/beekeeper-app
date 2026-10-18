# Full Application Audit: Findings Register

**Plan:** `docs/features/full-app-audit-plan.md`
**Checklist:** `tasks/full-app-audit-todo.html`
**Status:** Phase 1 audit complete (17/10/2026). **Batch 4 (sharing rules, coordinate privacy, storage clean-up) applied 17/10/2026.** **Batch 3 (API key and JWT secret migration) completed 17/10/2026; SEC-H5 and SEC-H9 are closed.** **Hotfix batches 1 and 2 applied 15–16/10/2026** (batch 2: `docs/features/security-hotfix-batch2-plan.md`). **Hotfix batch 1 applied 15/10/2026** (`docs/features/security-hotfix-batch1-plan.md`), fixing SEC-C1, C2, H1 (pending dashboard deletion), H2 and H4. SEC-H3, H5, M1 and L1 are open for batch 2. The rest of the audit resumes once batch 1 is deployed and tested.

| ID | Status |
|---|---|
| SEC-C1 | Fixed (DB guard trigger) |
| SEC-C2 | Fixed (caller checks) |
| SEC-H1 | **Fixed.** Repo source removed (batch 1); deployed function deleted 17/10/2026 (endpoint returns 404). Nothing called it: team auto-accept is done by a DB trigger, and rearing-group invitations are accepted through the email link |
| SEC-H2 | Fixed (owner/invitee policy + link RPCs) |
| SEC-H3 | Fixed, batch 2 (column-level grants; `PROFILE_COLUMNS`) |
| SEC-H4 | Fixed (admin-only + lookup RPC) |
| SEC-H5 | **Fixed 17/10/2026.** Batch 2 switched the trigger to a webhook secret. Batch 3 deactivated the legacy API keys and revoked the legacy JWT secret, so the leaked service-role JWT is refused everywhere (verified: REST 401 PGRST301, Storage "signature verification failed", Auth `bad_jwt`) |
| SEC-M1 | Fixed, batch 2 (feedback caller checks); remaining lookups accepted (B4) |
| SEC-M2 | Fixed, batch 2 (`decline_*_invitation` RPCs) |
| SEC-M3 | **Closed.** Every admin-type function checks `role = 'Admin'` or `is_current_user_admin()` internally; `transfer_apiary_ownership` requires the owner or an admin |
| SEC-L1 | Fixed, batch 2 (`is_deleted_account`; anon policy dropped) |
| SEC-H6 | Fixed, batch 2 (verified 401 for anon). `send-team-invitation` and `send-rearing-group-invitation` take the recipient, team name and inviter name from the request body, check no ownership and escape no text. Anyone with the public key can send arbitrary email from `info@hivecraic.com` (open phishing relay) |
| SEC-H7 | Fixed, batch 2 (3+ characters, name or full email, masked). `search_users_for_distribution` returns the full name and email of any profile matching a 2+ character fragment, 20 per call, so every email can be harvested |
| SEC-M4 | Fixed, batch 2 (webhook secret, verify_jwt off). `notify-admin-new-user` accepts any valid JWT, including the public anon key, and checks no secret; forged "new user" emails to admins with unescaped text |
| SEC-M5 | Fixed, batch 2. `/api/crm/invoice-email` inserts `sellerName` and `order_number` into the HTML unescaped |
| Accepted (Low) | `lookup_user_by_email` (exact-match existence check, needed by invites); `get_recipient_apiaries/hives` (distribution by design; names and numbers only); `get_user_role`, `has_valid_invitation`, `get_rearing_group_member_user_ids` (IDs, booleans or role, used in RLS); `check_queen_assignment` (needs an unguessable UUID). Confirmed by owner (B4) |
| SEC-H8 | **Fixed 16/10/2026.** Both functions now require the internal webhook secret (`verify_jwt` off); the cron jobs send it from Vault (`internal_webhook_secret`); responses carry counts only. Verified: the public key gets 401, and the 14:00 cron run returned 200 in the new format. Original finding: `weekly-email-digest` and `task-event-reminders` check no caller (`verify_jwt` accepts the public anon key) and **return the list of recipient email addresses** in the response. Anyone can trigger mass emails to users and harvest addresses. The digest cron job sends the anon JWT; the reminder job reads a key from Vault |
| SEC-H9 | **Fixed 16–17/10/2026 (batch 3, `docs/features/supabase-api-key-migration-plan.md`).** The app, edge functions and embed widget use `sb_publishable_`/`sb_secret_` keys; the legacy keys are deactivated. User sessions are signed with an ES256 signing key and the legacy JWT secret is revoked. Lesson: deactivating the legacy keys alone left them valid as `Authorization: Bearer` tokens, and only revoking the legacy JWT secret retired them. Original finding: the legacy `anon`/`service_role` keys cannot be rotated and stop working at the end of 2026 |

| DB-01 | **Fixed 17/10/2026 (batch 4).** Team and rearing-group owners could add any user as a member without consent, which exposed the member's profile and whole queen-rearing record. Membership now needs an accepted invitation. |
| DB-02 | **Fixed 17/10/2026 (batch 4).** A batch's unchecked mating apiary granted group members read and write access to someone else's apiary and hives. |
| DB-03 | **Fixed 17/10/2026 (batch 4).** Unchecked distribution recipient columns exposed recipients' apiaries and profiles. |
| DB-05 | **Fixed 17/10/2026 (batch 4).** Support-ticket and treatment-product admin rights trusted a user-writable legacy table. |
| DB-06 | **Fixed 17/10/2026 (batch 4).** Shared GDD records exposed exact apiary coordinates without login, and map obfuscation was reversible. |
| DB-09 | **Fixed 17/10/2026 (batch 4).** Members could move their membership row to another group. |
| API-01 | **Fixed 17/10/2026 (batch 4).** The storage clean-up could be tricked into deleting another user's photo with a variant URL. |
| SUP-01 | **Fixed 17/10/2026.** A Supabase personal access token in git history (Feb 2026) was revoked by the owner. |
| SUP-02 | **Fixed 17/10/2026.** Production database exports in git history were removed by a history rewrite and force-push. GitHub's cached copies of the old commits still need a purge request to GitHub Support. |
| SUP-12 | **Fixed 17/10/2026 (batch 5).** Next.js 15.5.7 had known advisories (SSRF, denial of service, cache poisoning). Upgraded to 15.5.28, the latest 15.5 security patch. |
| SUP-11 | **Fixed 17/10/2026 (batch 5).** Unused and deprecated packages (`ai`, `@supabase/auth-helpers-nextjs`) were removed and `npm audit fix` applied: runtime audit 20 findings (1 critical) down to 5 (0 critical); the rest need Next.js 16 or a breaking `exceljs` downgrade and aren't reachable. |
| CLI-01 | **Fixed 17/10/2026 (batch 5).** The service worker cached `/api/*` responses and kept them after logout. It no longer caches them, deletes old copies when it updates, and clears cached user data on sign-out. |
| CLI-02 | **Fixed 17/10/2026 (batch 5).** The admin's stored session from an impersonation stayed on the device unless the banner's Exit was used. Every sign-out now removes it. |
| DB-04 | **Fixed 17/10/2026 (batch 6).** The public trace pages received exact apiary coordinates even with location sharing off, and anyone could list public batches. Coordinates are now only the community map's approximate point, and only when sharing is on; the batch table is no longer listable. |
| DB-07 | **Fixed 17/10/2026 (batch 6).** Users could move their own records (inspections, feedings, harvests, varroa checks and treatments, benches, hives, GDD records) into someone else's hive or apiary, and link other users' harvests or containers into their honey batches. Edits and links now require access. |
| DB-08 | **Fixed 17/10/2026 (batch 6).** The anonymous reactivation request revealed whether an email belonged to a deleted account. It now always returns the same message and no user ID. |
| DB-10 | **Fixed 17/10/2026 (batch 6).** Any user could change terminology and add hive history rows for any hive. Terminology is now power users and admins only; history rows need access to the hive. |
| DB-11 | **Fixed 17/10/2026 (batch 6).** All QR tags were readable without a login. Now only your own, team-shared and accessible-hive tags, when logged in. |
| DB-15 | **Fixed 17/10/2026 (batch 6).** Any user could publish a changelog entry. Admins only now. |
| API-02 | **Fixed 17/10/2026 (batch 7).** The scale data routes used the hive owner's BEEP/Wolf token with any device ID sent. The device must now match the hive, and only the owner can change a hive's scale. |
| API-03 | **Fixed 17/10/2026 (batch 7).** Invoice emails could go to any address and the hourly limit could be raced. Now only the customer's saved email or the seller, with an atomic limit. |
| API-04 | **Fixed 17/10/2026 (batch 7).** Every user could list all users. The list is admin-only; owners transfer apiaries by exact email. |
| API-05 | **Fixed 17/10/2026 (batch 7).** Registration codes could be guessed without limit. Code attempts are limited per user across checkout and the database functions, and checkout no longer reveals which codes exist. |
| API-06 | **Fixed 17/10/2026 (batch 7).** The admin export included password hashes and tokens with one click. Secrets are now left out unless ticked, and a full export needs the admin's password. |
| API-07 | **Fixed 17/10/2026 (batch 7).** Paid AI, transcription, news search and geocoding routes had no limits. Per-user hourly and daily limits now apply. |
| API-08 | **Fixed 17/10/2026 (batch 7).** Admin actions were only in console logs. There is now an append-only admin audit log, impersonation start and exit are recorded, and the user is emailed. |
| AI-01 | **Fixed 17/10/2026 (batch 8).** Mel's data tools used the secret key, so only hand-written filters protected users' data, and two colony tools leaked other users' colony numbers. The tools now query as the signed-in user, so the database rules apply; only the caller's own scale tokens use the secret key. |
| CLI-03 | **In progress (batch 9, 17/10/2026).** A Content Security Policy was added in report-only mode, with reports going to `/api/csp-report` (Vercel logs). It will switch to enforcing once the reports are clean. |
| CLI-04 | **Fixed 17/10/2026 (batch 9).** Added a `Permissions-Policy` header and removed `X-Powered-By`. Apex HSTS is a Vercel domain setting (optional, owner). |
| CLI-05 | **Fixed 17/10/2026 (batch 9).** The login `?redirect=` could send a just-signed-in user to another site. It is now parsed as a URL and only same-site paths are kept. |
| CLI-06 | **Fixed 17/10/2026 (batch 6, DB-04).** The public trace functions no longer return exact coordinates. |
| CLI-07 | **Fixed 17/10/2026 (batch 9).** The tag code is now escaped in the QR print window. |
| CLI-08 | **Fixed 17/10/2026 (batch 9).** The TCBC widget loads Chart.js with a Subresource Integrity hash. |
| DB-12 | **Fixed 17/10/2026 (batch 6).** Batch and container links now require your own containers and harvests you can access. |
| DB-13 | **Fixed 17/10/2026 (batch 10).** A task's owner can no longer be changed to a third user (trigger). |
| DB-14 | **Fixed 17/10/2026 (batch 6).** Public batches are only readable through the trace functions. |
| DB-16 | **Fixed 17/10/2026 (batch 10).** Diagnosis photo comments are readable only by people who can see the photo. |
| DB-17 | **Fixed 17/10/2026 (batch 10).** Photo buckets can no longer be listed, uploads are limited to the app's folders and to images up to 10 MB. |
| DB-18 | **Fixed 17/10/2026 (batch 10).** Anonymous write grants and user-ID oracles were revoked, subscription codes are locked during redemption, honey feedback is capped and rate-limited, and old backup tables were dropped. |
| API-09 | **Fixed 18/10/2026 (batch 11).** Role changes no longer return the profile row, and a database trigger keeps at least one active admin, even under concurrent changes. |
| API-10 | **Fixed 18/10/2026 (batch 11).** Association-code uses are counted atomically; a payment past the limit is honoured and recorded in the admin audit log (owner decision). |
| API-11 | **Fixed 18/10/2026 (batch 11).** The admin URL fetcher re-checks every redirect, resolves DNS and refuses private, loopback, link-local, CGNAT and IPv6-private addresses. |
| API-12 | **Fixed 18/10/2026 (batch 11, partly batch 7).** API routes return plain messages; internal and vendor error text stays in the server log. |
| API-13 | **Fixed 18/10/2026 (batch 11).** `/auth/verify` accepts only known link types and same-site redirects. Owner to confirm the Supabase redirect allow-list has no wildcards. |
| API-14 | **Fixed 18/10/2026 (batch 11).** BEEP and Wolf connect are limited to 5 attempts per hour with a generic failure message. |
| API-15 | **Fixed 18/10/2026 (batch 11).** The Stripe webhook only activates paid sessions. |
| API-16 | **Fixed 18/10/2026 (batch 11).** Deactivated accounts are refused by the remaining routes. |
| API-17 | **Fixed 18/10/2026 (batch 11).** The sign-in callback no longer logs email addresses. |
| AI-02 / AI-03 / AI-04 | **Fixed 17/10/2026 (batch 8).** Mel's tools run as the signed-in user, so the database rules decide what they can see (AI-03 now matches the app's own task list). The shadowed queen-rearing tool was renamed. |
| AI-05 | **Fixed 18/10/2026 (batch 12).** The honey-batch look-up accepts only code characters; name look-ups escape LIKE wildcards and cap length. |
| AI-06 | **Fixed 18/10/2026 (batch 12).** Looked-up records and knowledge-base text go inside a marked block that Mel is told to treat as information only, never as instructions. Mel's tools are read-only. |
| AI-07 | **Fixed 17/10/2026 (batch 7).** Per-user chat limits. |
| AI-08 | **Fixed 18/10/2026 (batch 12).** Database error text no longer reaches the model; it goes to the server log. |
| AI-09 | **Fixed 18/10/2026 (batch 11, API-11).** Hardened URL fetcher. |
| SUP-07 | **Fixed 18/10/2026 (batch 12).** The association email list is no longer tracked; copies remain in old git history. |
| SUP-08 | **Fixed 18/10/2026 (batch 12).** `supabase/.temp` untracked; dumps, keys and backup files ignored; `.env.example` (placeholders) committed. |
| SUP-09 | **Fixed 18/10/2026 (batch 12).** The secret scanner knows the leaked key types and many more, blocks new data files and files over 1 MB, and also runs in GitHub Actions on every push. |
| SUP-10 | **Fixed 18/10/2026 (batch 12).** Workflow permissions limited; actions pinned to commit SHAs. |
| npm audit (dev) | **Accepted for now (18/10/2026).** Production: 4 findings, 0 critical. The 4 critical findings are dev-only (Vitest 2); upgrading to Vitest 5 is a separate task. |
| C7a-02 (Phase 2) | **Fixed 18/10/2026 (batch 13).** The apiary map picker inserted apiary names, including team members', into popups as HTML (stored XSS). The name is now set as text. |
| C9a-01 (Phase 2) | **Fixed 18/10/2026 (batch 13).** Change Password didn't check the current password. It is now verified first. |
| C2-31 (Phase 2) | **Fixed 18/10/2026 (batch 13).** The reminder and digest emails now escape user-written text. |
| Other Phase 1 findings | The remaining Medium and Low findings from the Phase 1 database, API, client, AI and supply-chain audits are kept in a local register until they are fixed, because this repository is public. |

All checks so far were read-only: SQL catalogue queries over the Supabase MCP connection, reading the deployed edge-function source, and searching the codebase. No data, schema or code was changed. No exploit was attempted against production.

## Severity key

| Severity | Meaning |
|---|---|
| Critical | Exploitable today by any logged-in user, causing cross-account data exposure or financial loss |
| High | Serious exposure, or exploitable as soon as a common precondition occurs |
| Medium | Limited exposure, or needs unusual access |
| Low | Hygiene or defence in depth |

## Phase 1 fast-track (verified 15/10/2026)

### SEC-C1 · Critical · Users can edit their own subscription and account-status fields

- **Where:** RLS policy `profiles` "Users can update own profile" (`USING/WITH CHECK auth.uid() = id`). `authenticated` and `anon` have table-wide UPDATE.
- **Fact:** the only guard on the row is the `prevent_role_self_change` trigger, which protects `role` alone.
- **What a user can change on their own row, from the browser console using their own session:**
  - `subscription_expires_at`, `subscription_type` and `subscription_price`.
  - `is_active`, which undoes an admin deactivation.
  - `used_registration_code_id`. The `trigger_initialize_subscription_on_code_update` trigger then grants that code's subscription, lifetime if the code's duration is 0.
  - `current_subscription_code_id`, `stripe_customer_id`, `deleted_at` and `email`.
  - The `enable_*` preferences are deliberately user-editable on the profile page, so they are not part of the finding.
- **Related hole:** `handle_new_user` takes `registration_code_id` from client-supplied sign-up metadata. `initialize_new_user_subscription` then grants that code's subscription without checking `is_active` or `max_uses`. The app never sends this field; a crafted sign-up could.
- **Impact:** a complete paywall bypass, and an admin deactivation can be undone.
- **Paywall readers:** `src/lib/auth.ts`, the `chat`, `voice-notes-transcribe` and `crm/invoice-email` routes.

### SEC-C2 · Critical · Cross-account reads through SECURITY DEFINER functions that trust a caller-supplied user ID

None of these functions call `auth.uid()` or check for an admin. All are executable by `authenticated`.

| Function | Returns for any user ID passed in |
|---|---|
| `get_dashboard_overview(p_user_id)` | Apiaries, hive counts, queenless state, scale device IDs, tasks |
| `get_recent_activity(p_user_id, p_limit)` | Recent inspections, treatments, varroa checks, feeds and harvests, with hive and apiary names |
| `get_user_email(search_user_id)` | That user's email from `auth.users` |

`GET /api/users/list` gives any logged-in user every user's ID. Combined with the functions above, any logged-in user can harvest every user's email and read every user's dashboard data.

### SEC-H1 · High · `auto-accept-invitations` edge function accepts forged requests

- **Deployed v3:** `verify_jwt=false`, with no shared-secret check. It trusts `record.id` and `record.email` from the request body and uses the service role to add that user ID to every team or rearing group with a pending, unexpired invitation for that email.
- **Who calls it:** nothing. No database trigger, webhook or app code invokes it. Team auto-accept is already handled safely by the `on_profile_created_auto_accept_invitations` DB trigger, which reads the email from `auth.users`.
- **Exposure today:** none, because there are 0 unexpired pending invitations. Every future invitation is open to takeover while it is valid. SEC-H2 provides the emails an attacker would need.

### SEC-H2 · High · Invitation tables readable by anyone

- `team_invitations` "Anyone can view invitations" and `rearing_group_invitations` "Anyone can view invitations by UUID" are both `SELECT USING (true)` for role `public`, which includes anon.
- The policy name says "by UUID", but nothing restricts the query to one UUID.
- **Impact:** anyone holding the public anon key can list all 38 invitations: invitee emails, inviter IDs, team and group IDs, and status.

### SEC-H3 · High · "Related" users can read each other's full profile row

- **Where:** `profiles` "Users can view own and related profiles". It covers teammates, rearing-group co-members, and graft-distribution senders reading their recipients.
- **Exposure:** these users get every column, including `beep_api_token`, `wolf_api_token`, `mobile_number`, `stripe_customer_id`, `producer_address` and the subscription fields.

### SEC-H4 · High · All registration codes readable by every logged-in user

- **Where:** `registration_codes` "Allow authenticated users to read all codes" (`USING true`).
- **Exposure:** all 55 active codes, each granting a subscription at sign-up.

Also, Low: three admin policies compare against `'admin'` in lowercase. The real role value is `'Admin'`, so those policies never match. They have no effect because the "Admins can manage registration codes" ALL policy uses `'Admin'`. They are dead and should be dropped.

### SEC-H5 · High · Service-role key hard-coded in a database trigger

- **Where:** the `notify_admin_new_user` trigger on `profiles` passes a long-lived **service-role JWT** as the Authorization header argument to `supabase_functions.http_request`.
- **Who can see it:** anyone with catalogue access, any schema dump or backup, and the admin data export if it includes trigger definitions.
- **Remediation:** move it to a dedicated webhook secret, then rotate the service-role key.
- The value is intentionally not reproduced here.

### SEC-M1 · Medium · Other information-disclosure functions

- `lookup_user_by_email(search_email)`: tells any logged-in user whether an email has an account (account enumeration). It is used legitimately by the team invite flow.
- `get_recipient_apiaries(recipient_uuid)` and `get_recipient_hives(recipient_uuid, apiary_uuid)`: return any user's apiary names and hive numbers. They are used by the graft distribution flows.
- `get_batch_feedback_summary(p_user_id)` and `get_batch_feedback_details(p_batch_id, p_user_id)`: the ownership check uses the caller-supplied user ID, so any user can read the feedback comments on another user's batch.

### SEC-L1 · Low · Anon can read deleted profiles

- Policy "Allow anon to check deleted accounts" (`deleted_at IS NOT NULL`), currently matching 0 rows.
- Keep the intent (reactivation check) but expose only a boolean through an RPC, not the row.

## Proposed hotfix batch (needs owner approval before anything is applied)

These are the smallest root-cause fixes, applied via MCP migration:

1. **SEC-C1**
   - Revoke table-wide UPDATE on `profiles` from `authenticated` and `anon`.
   - Grant UPDATE only on the user-editable columns: names, mobile, reminder preferences, producer address, breeder code and similar.
   - Subscription, status, code, Stripe and feature-flag columns become writable only by the service role or admin RPCs.
   - Check every client `profiles` update in `src/` against the allowed column list first.
2. **SEC-C2**
   - Make the three functions ignore `p_user_id` from other users: require `p_user_id = auth.uid()`, or the caller passes the shared-access check.
   - Keep the signatures so the client code does not change.
3. **SEC-H1:** delete the unused `auto-accept-invitations` edge function and its repo folder. First confirm that rearing-group auto-accept on sign-up is either still needed (move it into the DB trigger) or already covered.
4. **SEC-H2:** replace `USING (true)` with "invitee (email matches the caller) or the team or group owner". The public accept and decline pages need checking: they may need a token-scoped RPC.
5. **SEC-H3:** move the BEEP and Wolf tokens out of readable reach (a column-level SELECT revoke, or a separate owner-only table), and narrow what related users can see.
6. **SEC-H4:** restrict SELECT on `registration_codes` to admins. Code redemption already happens server-side in `stripe/checkout`; verify the sign-up path. Drop the dead lowercase policies.
7. **SEC-H5:** switch the trigger to a webhook secret, then rotate the service-role key. The key rotation needs the owner, because it affects Vercel env vars and the edge functions.

Each fix is followed by a `get_advisors` run, a `qa-engineer` audit, a docs update, and a user test of the affected flows.
