# Team Member Hive Placement

## Summary

Team **members** (not just the team owner) can place hives into an apiary that the
owner has shared with the team. This brings the create-hive flow in line with the
existing edit/move flow and with the apiary dropdown, which already lists shared
apiaries.

## Background

- Apiaries are owned by an individual (`apiaries.user_id`). They are *shared* into a
  team through the `team_apiaries` join table; only the team owner can share an
  apiary they personally own.
- Members gain read access to shared apiaries (and their hives) via the
  `can_access_apiary()` SQL function. The `hives` table itself currently has fully
  permissive RLS, so access is enforced in application code.

## Behaviour

- On the Hives page, the **Apiary** dropdown lists the user's own apiaries plus any
  apiary shared with a team they belong to (labelled `(Shared)`).
- A member can now select a shared apiary and **create** a hive in it.
- A member can also **move** an existing hive into a shared apiary by editing the
  hive and changing its Apiary.
- The hive record keeps `user_id = ` the member who placed it. The team sees the
  hive through apiary sharing (`team_apiaries`), not through hive ownership.

## Implementation

`src/app/dashboard/hives/page.tsx` &mdash; create branch of the submit handler.
The previous check rejected any apiary not owned by the current user. It now
validates the selected apiary against the in-memory `apiaries` list (own +
team-shared), which is exactly the set offered in the dropdown:

```ts
if (dataToSubmit.apiary_id && !apiaries.some(a => a.id === dataToSubmit.apiary_id)) {
  throw new Error('Cannot create hive: you do not have access to the selected apiary.')
}
```

No schema or RLS changes were required.

## Row Level Security

The `hives` table RLS was tightened (migration
`tighten_hives_rls_owner_and_team_scope`) so access is no longer scoped by
application logic alone:

- **SELECT** — own hives, plus hives in any apiary the user can access
  (`can_access_apiary`, i.e. own or team-shared).
- **INSERT** — the row must record the user as owner
  (`user_id = auth.uid()`) and target an apiary the user can access (or none).
  This enforces the placement rule above at the database level.
- **UPDATE** — the hive **owner**, or **any team member** with access to the hive's
  apiary (`can_access_apiary`). This lets team members edit the setup of a shared
  hive (super count, brood boxes, queen assignment, etc.), and is what allows the
  inspection honey-super auto-sync to work when a team member records the inspection.
  A member can only edit a hive while it stays in an apiary they can access
  (`WITH CHECK`), so they cannot orphan a hive out of the shared apiary; only the
  owner may move it to no apiary. Migration `hives_update_policy_team_edit`.
- **DELETE** — **hive owner only** (`user_id = auth.uid()`). Team members can view
  and edit each other's shared hives, but only the owner can delete.

Policies are scoped to the `authenticated` role; service-role server routes
(admin, beep, wolf-waagen, AI tools) bypass RLS and scope in code.
