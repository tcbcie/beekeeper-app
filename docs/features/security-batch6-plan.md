# Security Batch 6: Database Rules

**Status:** Done 17/10/2026. Database applied via MCP; the owner tested the app; committed and pushed.
**Checklist:** `tasks/security-batch6-todo.html`
**Migration (repo copy):** `supabase/migrations/20261017120000_security_batch6.sql`
**Findings:** DB-04, DB-07, DB-08, DB-10, DB-11, DB-15 (all Medium)

## Owner decisions (17/10/2026)

- Terminology can be edited by power users and admins (the same people who can open Settings).
- The public trace map shows the same approximate area as the community map, and only when the apiary shares its location.

## DB-07: records stay within hives and apiaries you can access

The edit rules only checked "the record is mine", while the create rules also checked access to the hive. So the author of a record could move it into anyone's hive or apiary, and the hive's owner would then see it.

| Table | Edit rule now also requires |
|---|---|
| `inspections`, `feedings`, `harvests`, `varroa_checks`, `varroa_treatments` | `can_access_hive(hive_id)` |
| `yard_benches` | `can_access_apiary(apiary_id)` |
| `hives` | the new apiary (if any) is one you can access; owners and team members keep their edit rights |
| `gdd_records` (create and edit) | the apiary (if any) is one you can access |
| `container_harvests` | the harvest is visible to you (the harvests rules decide) |
| `batch_containers` | the container is your own |

Two definer functions skipped those table rules, so they now check the links themselves:
- `replace_container_harvests` refuses harvests on hives you can't access.
- `replace_batch_links` refuses containers that aren't yours.

Without that, a user could add someone else's harvest to their own public batch, and the trace page would show the victim's apiary name and photo.

The record edit forms keep working: you can still move a record between your own hives and team-shared hives.

## DB-04: public trace pages

- `get_public_batch_info` (also used by the `/j/` jar pages) returns coordinates only when the apiary's `share_location` is on. Even then, it returns the community map's approximate point: the same secret per-apiary seed, a 5 km radius, rounded to 2 decimals. Sharing one point everywhere means nobody can combine two blurred points to work out the real spot. The page code is unchanged.
- The "Public can view public batches" table rule was removed, so nobody can list batches or trace codes from the table any more.
- New `next_batch_code(date)` (authenticated only) returns the next free `L-YYYY-MM-NNN` across all users. `src/lib/batch-code.ts` calls it in place of reading other users' batches. This also fixes a clash that was already possible when another user's batch for the month was private.

## DB-08: account reactivation

`request_account_reactivation` always returns the same success message and no user ID. It matches the email case-insensitively, and it still allows only one pending request per account.

## DB-10, DB-11, DB-15

- **`terminology`:** readable by logged-in users. Only power users and admins can add, edit or delete entries.
- **`hive_configuration_history`:** a client insert needs `changed_by` to be the caller and a hive the caller can access. The update trigger runs as definer and is unaffected.
- **`qr_tags`:** readable only when logged in, and only for your own tags, team-shared tags, and tags on hives you can access.
- **`changelog`:** the "any user can create or edit" rules are gone. The admin rule and the CLI script (secret key) remain.

## Verification

Rolled-back tests were run as real users:
- Moving a record into a foreign hive, or a hive into a foreign apiary, is blocked. Moves to your own hive and to a team-shared hive still work.
- A foreign tag is invisible, and your own tags are visible.
- History rows for a foreign hive are blocked; for your own hive they are allowed.
- Terminology is blocked for a normal user and allowed for a power user.
- Changelog writes are blocked.
- Foreign harvests and containers are refused, directly and through both functions.
- Anonymous users see 0 tags and 0 batches.
- A trace call returns the community map's point (4.6 km from the apiary) when sharing is on, and no coordinates when it is off.
- The reactivation request gives the generic reply.
- `next_batch_code` is refused for anonymous users.

The data check found no existing record that breaks the new rules. The only exceptions are four inspections by team members on hives that were later archived, which those members can't see anyway.

The security advisors show no new warnings.
