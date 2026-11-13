-- Landmarks on the apiary map (shed, tree, water, gate, or a text label), so a
-- layout is recognisable on site. Positions are percentages of the map, like benches.
-- Only the apiary owner adds, moves or deletes them; anyone who can see the apiary sees them.
-- Applied to the live database on 13/11/2026.
create table public.yard_landmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  apiary_id uuid not null references public.apiaries(id) on delete cascade,
  kind text not null,
  label text,
  map_x numeric not null,
  map_y numeric not null,
  created_at timestamptz not null default now(),
  constraint yard_landmarks_kind_check check (kind in ('shed', 'tree', 'water', 'gate', 'label')),
  constraint yard_landmarks_label_length check (label is null or char_length(label) <= 40),
  constraint yard_landmarks_map_x_range check (map_x >= 0 and map_x <= 100),
  constraint yard_landmarks_map_y_range check (map_y >= 0 and map_y <= 100)
);

create index idx_yard_landmarks_apiary_id on public.yard_landmarks (apiary_id);
create index idx_yard_landmarks_user_id on public.yard_landmarks (user_id);

alter table public.yard_landmarks enable row level security;

revoke all on public.yard_landmarks from anon, public;
grant select, insert, update, delete on public.yard_landmarks to authenticated;

create policy yard_landmarks_select_policy on public.yard_landmarks
  for select to authenticated
  using (user_id = (select auth.uid()) or can_access_apiary(apiary_id, (select auth.uid())));

create policy yard_landmarks_insert_policy on public.yard_landmarks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.apiaries a where a.id = apiary_id and a.user_id = (select auth.uid()))
  );

create policy yard_landmarks_update_policy on public.yard_landmarks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.apiaries a where a.id = apiary_id and a.user_id = (select auth.uid()))
  );

create policy yard_landmarks_delete_policy on public.yard_landmarks
  for delete to authenticated
  using (user_id = (select auth.uid()));
