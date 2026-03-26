# Fix: can_access_apiary share_location Data Leak

## Problem

The `can_access_apiary()` PostgreSQL function has a clause that grants access to any apiary with `share_location = true`:

```sql
OR EXISTS (
  SELECT 1 FROM apiaries
  WHERE id = apiary_uuid AND share_location = true
)
```

`share_location` is a community map feature — it allows an apiary's approximate location to appear on a shared map. It was **never intended** to grant record-level access (tasks, inspections, hive data, etc.) to every authenticated user.

### Impact

- **19 apiaries** currently have `share_location = true`
- Any authenticated user can **view and update** tasks, hives, and inspections linked to those apiaries
- The `apiaries` SELECT policy also uses `can_access_apiary`, so those 19 apiaries appear in every user's apiary list
- `can_access_hive` does **not** have this bug — it only checks ownership and team membership

### How it was discovered

User (Rico) saw a "Shopping list" task on his dashboard created by Micheal Stanley for "Red Door Apiary". Rico and Micheal are **not** on the same team. The task was visible because Red Door Apiary has `share_location = true`.

## Solution

### Fix 1: Remove share_location clause from can_access_apiary (Critical)

Remove the fourth `OR EXISTS` clause from `can_access_apiary()`. The community map already uses its own dedicated view (`shared_apiaries_obfuscated`) — confirmed by searching the codebase.

### Fix 2: Resolve apiary name in UpcomingEvents (Minor)

The UpcomingEvents component on the dashboard fetches `apiary_id` but never resolves it to a name, causing "Apiary: Unknown" on task cards. The full tasks page resolves names correctly via a separate apiaries lookup.

Fix: join apiaries in the UpcomingEvents query to get the name directly.

## Files

- `can_access_apiary` function (database) — remove share_location clause
- `src/components/UpcomingEvents.tsx` — join apiary name in query
