# Security Hotfix Batch 1

**Status:** Implemented 15/10/2026. The migration is live in production. The app code is waiting to be deployed.
**Source:** `docs/features/full-app-audit-report.md` (SEC-C1, C2, H1, H2, H4 + sign-up metadata hole)
**Checklist:** `tasks/security-hotfix-batch1-todo.html`
**Migration:** `supabase/migrations/20261015120000_security_hotfix_batch1.sql` (applied via MCP as `security_hotfix_batch1`)

## What changed

### Database (live)

| Finding | Change |
|---|---|
| SEC-C1 | New `BEFORE UPDATE` trigger `trigger_protect_profile_privileged_columns` → `protect_profile_privileged_columns()` (SECURITY INVOKER) |
| SEC-C1 | Dropped the unused policy "Users can insert own profile" |
| Sign-up hole | `handle_new_user` no longer reads `registration_code_id` from client sign-up metadata |
| SEC-C2 | `get_dashboard_overview` raises 42501 unless `p_user_id = auth.uid()` |
| SEC-C2 | `get_recent_activity` returns no rows unless `p_user_id = auth.uid()` |
| SEC-C2 | `get_user_email` reveals an email only to: yourself, an admin, or someone you share a team or rearing group with (owner or member). Everyone else gets `'Unknown'` |
| SEC-H2 | `team_invitations` and `rearing_group_invitations` SELECT is now the owner or the invitee (JWT email), authenticated only |
| SEC-H2 | New `get_team_invitation(uuid)` and `get_rearing_group_invitation(uuid)` for the pre-login link pages (anon + authenticated) |
| SEC-H4 | `registration_codes` is admin-only. The "read all codes" policy and three dead lowercase-`'admin'` policies are dropped |
| SEC-H4 | New `lookup_registration_code(text)` (authenticated only) |

**Profile guard detail.** The trigger fires when the caller's role is `authenticated` or `anon` and they are not an admin. For those callers it rejects changes to:

- `is_active`
- `subscription_expires_at`, `subscription_type`, `subscription_price`
- `used_registration_code_id`, `current_subscription_code_id`
- `is_association_member`
- `stripe_customer_id`
- `deleted_at`, `original_email`, `email`
- `last_subscription_reminder_sent`

These callers pass through the guard:

- **Admins**, via `is_admin()`.
- **The service role.**
- **SECURITY DEFINER functions** such as `activate_subscription`, Stripe and the sign-up triggers. These run as their owner, so `current_user` is no longer `authenticated`.

### App code

- `src/app/accept-invitation/page.tsx` and `src/app/decline-invitation/page.tsx`: read the invitation via `rpc('get_team_invitation')`.
- `src/app/accept-rearing-group-invitation/page.tsx` and `src/app/decline-rearing-group-invitation/page.tsx`: read it via `rpc('get_rearing_group_invitation')`.
- `src/components/RenewSubscriptionModal.tsx`: both code lookups go through `rpc('lookup_registration_code')`.
- `supabase/functions/auto-accept-invitations/` removed. Nothing called it; team auto-accept is done by the `on_profile_created_auto_accept_invitations` DB trigger.

The RPC results keep the same shape as the old queries (row plus `teams`/`rearing_groups` name), so the page logic is unchanged.

## Verification

- **Function bodies.** md5 fingerprints of `get_dashboard_overview` and `get_recent_activity` (whitespace-stripped, guard lines removed) match the pre-change bodies exactly.
- **Behaviour.** Checked in transactions that were then rolled back, impersonating real users. Results:
  - A user's own changes to subscription expiry, `is_active` and the registration code are blocked.
  - Normal profile edits and `enable_*` preferences still save.
  - Profile insert is blocked.
  - Overview and activity for another user are blocked or return nothing. Overview for yourself works.
  - An unrelated user's email returns `Unknown`; your own email is returned.
  - Codes are invisible to users. The code lookup works for users and is blocked for anon.
  - Invitations are invisible to unrelated users and anon. Link lookups work for anon.
  - An admin can edit a user's expiry and fully manage codes.
  - A team owner sees their team's invitations, and an invitee sees their own.
  - `activate_subscription` still succeeds.
- **Advisors.** `get_advisors` (security) shows no new ERRORs. The only new WARN entries are the three intentionally callable lookup functions.
- **Static checks.** ESLint is clean on the changed files; there are 0 type errors in `src/`.

## Owner actions

1. **Deploy the app code now.** The migration is already live, and until the new code ships these flows are broken in production:
   - invitation accept and decline links (they show "invitation not found");
   - code-based subscription renewal (it shows "code not found").
2. **Delete the edge function** `auto-accept-invitations` in the Supabase dashboard (Edge Functions → auto-accept-invitations → Delete).

## Rollback (if ever needed)

1. Drop the trigger and function: `DROP TRIGGER trigger_protect_profile_privileged_columns ON public.profiles; DROP FUNCTION public.protect_profile_privileged_columns();`
2. Restore the earlier `handle_new_user`, `get_dashboard_overview`, `get_recent_activity` and `get_user_email` bodies. They are recorded in this conversation's audit and match the repo's `src/sql/create_dashboard_rpc_functions.sql` for the dashboard pair.
3. Recreate the dropped policies only as a last resort: they were the vulnerabilities.

## Deferred to batch 2

- SEC-H3: scale tokens readable by related users.
- SEC-H5: service-role key hard-coded in the `notify_admin_new_user` trigger; needs key rotation.
- SEC-M1 and SEC-L1.
- Logged-out decline silently failing.
- Review of the admin-type SECURITY DEFINER functions that authenticated users can call:
  - `delete_user`, `hard_delete_user`, `soft_delete_user`, `restore_deleted_user`
  - `toggle_user_account`, `reactivate_user_account`, `reject_reactivation_request`
  - `get_users_with_email`, `search_users_for_distribution`, `transfer_apiary_ownership`
