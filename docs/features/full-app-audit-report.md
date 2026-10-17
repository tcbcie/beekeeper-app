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
