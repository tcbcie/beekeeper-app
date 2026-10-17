# Security Hotfix Batch 4: Sharing-Rule Holes and Coordinate Privacy

**Status:** Complete on 17/10/2026. Database applied and verified; app deployed (build `TOzlc_0DH5vSBHyCdzbvW`); old map views dropped.
**Checklist:** `tasks/security-hotfix-batch4-todo.html`
**Migration (repo copy):** `supabase/migrations/20261017100000_security_batch4.sql`
**Decisions:** D9 (existing users must accept invitations) and D10 (outsider recipients see name and apiary name only). The owner approved both.

## Root cause

Several access rules checked that a row belonged to the person saving it, but not the other IDs on that row:
- the member being added;
- a batch's mating apiary;
- a distribution's recipient.

Those IDs then granted access elsewhere. Other users' IDs are easy to obtain from the app's own search and recipient lookups.

## Fixes

| ID | Severity | Fix |
|---|---|---|
| DB-01 | Critical | Membership needs consent. Owners can only insert their own row; everyone else joins through `accept_team_invitation` or `accept_rearing_group_invitation`, which check the invitation is pending, unexpired and addressed to the caller's email. The team and rearing-group pages always create a pending invitation. The new **Invitations for you** dashboard card (`get_my_pending_invitations`) lets existing users accept in-app. `guard_membership_columns` stops membership rows being moved to another user or group, and stops non-owners changing roles (DB-09). |
| DB-02 | Critical | `can_access_apiary` grants mating-apiary access to group members only when the batch owner can access the apiary directly (`can_access_apiary_direct`). `guard_rearing_batch_links` checks the mating apiary and group whenever they are set or changed. |
| DB-03 | Critical | `guard_distribution_recipient` requires the recipient apiary and hive to belong to the recipient. The `apiaries` and `profiles` distribution branches apply only when the recipient shares a team or group with the caller (`shares_group_or_team_with_me`). Others get name and apiary name through `get_distribution_recipient_labels`. `create_queen_for_distribution` places queens into hives only for yourself or a fellow member. |
| DB-05 | High | Support-ticket and treatment-product admin rules use `is_current_user_admin()`. All client privileges on the legacy `del_user_profiles` table are revoked. |
| DB-06 | High | The raw-coordinate view `shared_gdd_records_community` is internal only. Coordinates are obfuscated with a secret Vault seed (`coord_obfuscation_seed`) in `get_shared_gdd_records`, `get_all_apiaries_obfuscated` and the new `get_shared_apiaries_obfuscated` and `get_wild_colonies_obfuscated` RPCs, which the community map now uses. The old map views have no anonymous access and will be dropped after deploy. |
| API-01 | High | The storage clean-up deletes only when the queued URL is exactly the object's canonical public URL (`canonicalStoragePublicUrl`). |
| (bug) | High | Rearing-group ownership transfer never worked, because the update policy had no `WITH CHECK`, and a failed transfer left the roles half-swapped. The owner can now hand over only to an existing member. |

## Verification

Rolled-back SQL tests were run as real users.

**Attacks refused:**
- adding a stranger to a team or group;
- moving a membership row to another user;
- accepting someone else's invitation;
- a batch with someone else's mating apiary;
- a recipient apiary that doesn't belong to the recipient;
- reading the victim's apiary, hives or profile through a forged distribution;
- a fake admin row;
- reading the raw GDD view;
- calling the seed helper;
- a member promoting themselves or moving groups;
- transferring a group to a non-member.

**Normal paths working:**
- owners adding themselves;
- the victim seeing and accepting their own invitation;
- a batch using your own apiary;
- fellow members seeing full recipient details, and outsiders seeing labels only;
- members updating their own experience level;
- transfer to a member.

Anonymous REST requests to the coordinate views are refused, and the public Galway embed still works. The advisors show nothing new. ESLint is clean and there are no type errors in `src/`.

## After deploy

Done on 17/10/2026: once the live build used the new RPCs, `shared_apiaries_obfuscated` and `wild_colonies_obfuscated` were dropped (migration `security_batch4_drop_old_map_views`). Both now return 404, and the public Galway embed still returns 200.
