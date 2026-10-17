# Security Batch 10: Database Low Findings

**Status:** Done 17/10/2026. Database applied via MCP; the owner tested it; committed and pushed. Database only, no app code changes.
**Checklist:** `tasks/security-batch10-todo.html`
**Migration (repo copy):** `supabase/migrations/20261017160000_security_batch10.sql`
**Findings:** DB-13, DB-16, DB-17, DB-18. DB-12 and DB-14 were closed in batch 6.

## DB-13: task owner

`guard_task_owner_change` (BEFORE UPDATE OF `user_id` on `tasks_events`): with a user session, `user_id` can only stay the same or become `auth.uid()`. The task form sends `user_id: userId` (the editor) on update, so team edits keep working.

## DB-16: diagnosis comments

The SELECT policy is now `EXISTS (SELECT 1 FROM diagnosis_images di WHERE di.id = diagnosis_image_id)`, so the photo's own rules (owner, power user, admin) decide.

## DB-17: storage

- The public list policies were dropped, and "Users can see their own uploads" (`owner = auth.uid()`) was added.
- Upload folders are restricted:
  - `apiary-images`: `<uid>/`
  - `inspection-images`: `inspections/`, `varroa-checks/`, `diagnoses/`, `wild-colonies/`, `wild-colony-inspections/`
- Both buckets accept only JPEG, PNG, GIF and WebP, up to 10 MB.

Details and the "new folder" warning are in `storage-cleanup-plan.md` §6.

## DB-18: hygiene

- **Anonymous writes:** `anon` lost INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER and REFERENCES on all public tables, including future tables through default privileges for `postgres`, and the column-level INSERT and UPDATE grants on `profiles`. Read grants stay for the public pages. No write rule worked without a sign-in, so nothing changed in practice.
- **Oracles:** these functions take a user ID and answer yes or no about another user's data. They were revoked from `PUBLIC` and `anon`, and explicitly granted to `authenticated` and `service_role`, because RLS policies call them:
  - `can_access_apiary`, `can_access_hive`, `can_access_hive_by_user_id`, `can_access_queen`
  - `check_user_owns_apiary`
  - `is_team_member`, `is_team_owner`, `is_rearing_group_member`, `is_rearing_group_owner`
  - `get_rearing_group_member_user_ids`, `has_valid_invitation`, `get_user_role`, `is_admin(uuid)`

  Logged-out pages only call public functions.
- **`activate_subscription`:** locks the code row with `FOR UPDATE`, so concurrent redemptions can't exceed `max_uses`.
- **`submit_batch_feedback`:** comments are trimmed and capped at 1,000 characters, a batch takes at most 30 entries an hour (serialised per batch), and feedback is refused when `show_feedback` is off.
- **Backup tables:** `changelog_dupe_backup_20260829` and `queen_assignments_nuc_fix_backup_20260829` were dropped, with the owner's approval.

## Verification

All rolled-back tests passed; the results are in the todo review. In the security advisors, the number of definer functions callable without a sign-in fell from 27 to 14. The rest are intended.
