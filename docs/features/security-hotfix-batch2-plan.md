# Security Hotfix Batch 2

**Status:** Implemented 15–16/10/2026. Everything is live except the key migration, which is planned as batch 3.
**Source:** `docs/features/full-app-audit-report.md` (SEC-H3, H5, H6, H7, M1, M2, M4, M5, L1)
**Checklist:** `tasks/security-hotfix-batch2-todo.html`

## Owner decisions

| # | Topic | Decision |
|---|---|---|
| B1 | Hiding the scale tokens | Column-level grants on `profiles`. Use `PROFILE_COLUMNS` for app reads |
| B2 | Recipient search | 3+ characters; matches a name fragment or a **complete** email (no email fragments, so addresses can't be rebuilt letter by letter); emails returned masked (`j•••@domain`) |
| B3 | Key rotation | Researched: legacy keys can no longer be rotated and stop working at the end of 2026, so this becomes the batch 3 key migration |
| B4 | Low-risk lookups | Accepted unchanged: `lookup_user_by_email`, `get_recipient_apiaries/hives`, `get_user_role`, `has_valid_invitation`, `get_rearing_group_member_user_ids`, `check_queen_assignment` |

## What changed

### Edge functions (deployed; source in the repo)

- **`send-team-invitation` (v10) and `send-rearing-group-invitation` (v4)**
  - Require the signed-in inviter.
  - Load the invitation by ID and check that the caller sent it and that it is pending.
  - Take the recipient, team or group name and inviter name from the database, never from the request body.
  - Escape all HTML.
  - Verified live: a call with only the public key gets 401.
- **`notify-admin-new-user` (v5)**
  - Runs with `verify_jwt=false` and accepts only a matching `x-webhook-secret` (the `NOTIFY_WEBHOOK_SECRET` edge secret, compared in constant time).
  - Escapes the name and email.
  - Verified live: no secret or a wrong secret gets 401; the right secret is accepted.

### Database (live)

| Migration | Contents |
|---|---|
| `security_hotfix_batch2` (`20261015130000_…`) | Masked, restricted `search_users_for_distribution`<br>Caller checks on `get_batch_feedback_summary/details`<br>New `decline_team_invitation`, `decline_rearing_group_invitation`, `is_deleted_account` |
| `security_hotfix_batch2_lockdown` (`20261015140000_…`) | Table-wide SELECT on `profiles` revoked from app roles, re-granted on every column except `beep_api_token`/`wolf_api_token`<br>The anon "deleted accounts" policy dropped |
| `security_hotfix_batch2_notify_trigger` (`20261016090000_…`) | `notify_admin_new_user` trigger sends the webhook secret instead of the service-role JWT. The repo copy holds a placeholder |

### App code (commit `0cef3d0`)

- `src/lib/auth.ts`: `PROFILE_COLUMNS` added. The `profile` page and `getUserProfile` use it.
- `hives/[id]` and `scales`: connection status read from `*_connected_at`.
- `DistributeGraftModal` and `useGraftDistributions`: 3-character minimum, matching hint, new placeholder text.
- Both decline pages call the decline RPCs.
- The login page calls `is_deleted_account`.
- `/api/crm/invoice-email`: escapes the seller name and order number.
- Removed the non-existent `updated_at` field from both `UserProfile` types.

### Ordering

The additive migration went first. The app code was deployed next, then the lockdown was applied. That way the version live in production never asked for columns it could no longer read.

## Verification

- **Rolled-back database tests, as real users and as anon:**
  - Token reads are blocked; `PROFILE_COLUMNS` reads, profile saves and the security-invoker views still work; `select *` is refused.
  - Name search returns masked results; email fragments and 2-character searches return nothing; a full email is found.
  - Feedback for another user returns nothing.
  - Decline works when logged out for pending invitations and is refused otherwise.
  - The deleted-account check returns yes and no correctly.
- **Live permissions after the lockdown:** app roles cannot read the tokens; the service role can.
- **Advisors:** no new findings beyond the intended anon-callable decline and deleted-account functions.
- **Static checks:** ESLint is clean and there are 0 type errors in `src/`. The QA audit found no Critical or High issues.

## Follow-ups

- **Batch 3, key migration:** move to `sb_publishable_`/`sb_secret_` keys, then deactivate the legacy keys. That kills the service-role JWT that sat in the trigger.
- **New finding SEC-H8:** `weekly-email-digest` and `task-event-reminders` accept the public key and return the list of email addresses they sent to. See the findings register.
- **Phase 2 DRY item:** five local `escapeHtml` copies.
