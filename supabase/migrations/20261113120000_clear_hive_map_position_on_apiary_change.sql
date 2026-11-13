-- A hive's apiary map position (map_x/map_y and bench link) belongs to one apiary.
-- When the hive moves to another apiary (or to none), clear it so the hive returns
-- to the "unplaced" tray instead of appearing at a phantom spot on the new map.
-- Applied to the live database on 13/11/2026.
create or replace function public.clear_hive_map_position_on_apiary_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.apiary_id is distinct from old.apiary_id then
    new.map_x := null;
    new.map_y := null;
    new.bench_id := null;
    new.bench_slot := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.clear_hive_map_position_on_apiary_change() from public, anon, authenticated;

drop trigger if exists trg_clear_hive_map_position_on_apiary_change on public.hives;
create trigger trg_clear_hive_map_position_on_apiary_change
  before update of apiary_id on public.hives
  for each row
  execute function public.clear_hive_map_position_on_apiary_change();
