-- The apiary map is on by default for every account (owner decision E, 13/11/2026).
-- The Profile switch stays, so anyone can turn it off again. The map still needs an
-- active subscription, checked in the app.
-- Applied to the live database on 13/11/2026 (125 accounts switched on; 4 already were).
alter table public.profiles alter column enable_yard_map set default true;
update public.profiles set enable_yard_map = true where enable_yard_map is distinct from true;
