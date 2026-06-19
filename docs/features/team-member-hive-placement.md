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

## Known limitation / follow-up

The `hives` table RLS policies are fully permissive (`USING (true)`), so data
scoping relies on application logic. Tightening this (e.g. scope by
`user_id = auth.uid() OR can_access_apiary(apiary_id, auth.uid())`) is tracked as a
separate task because of its wider regression surface.
