-- Batch 15 (Phase 2 finding C5a-03): bulk mating nuc creation in one transaction.
--
-- The client used to make four separate writes (bulk-run row, nucs, graft statuses,
-- created_count). A failure part-way left orphan rows and blocked a retry. This function
-- does all of them atomically. It runs as the caller (SECURITY INVOKER), so the existing
-- owner-only RLS policies still apply, and it re-checks what the client checked:
-- active nuc numbers must be unique, and each cell must still be available (sealed, caged
-- or emerged, in the source batch, owned by the caller and not already in an active nuc).

create or replace function public.create_mating_nuc_bulk(
  p_batch_id uuid,
  p_source_batch_id uuid,
  p_mode text,
  p_notes text,
  p_nucs jsonb
)
returns uuid[]
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
  v_dupes text;
  v_nuc_ids uuid[];
  v_graft_ids uuid[];
  v_updated int;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_nucs is null or jsonb_typeof(p_nucs) <> 'array' or jsonb_array_length(p_nucs) = 0 then
    raise exception 'No nucs to create' using errcode = '22023';
  end if;
  v_count := jsonb_array_length(p_nucs);

  -- One bulk create per user at a time, so two requests can't both pass the checks below.
  perform pg_advisory_xact_lock(hashtext('create_mating_nuc_bulk:' || v_uid::text));

  select string_agg(distinct m.nuc_number, ', ')
    into v_dupes
    from mating_nucs m
    join jsonb_to_recordset(p_nucs) as n(nuc_number text) on n.nuc_number = m.nuc_number
   where m.user_id = v_uid
     and m.retired_at is null;
  if v_dupes is not null then
    raise exception 'These nuc numbers are already active: %', v_dupes using errcode = '23505';
  end if;

  if exists (
    select 1
      from mating_nucs m
      join jsonb_to_recordset(p_nucs) as n(graft_id uuid) on n.graft_id = m.graft_id
     where m.user_id = v_uid
       and m.retired_at is null
  ) then
    raise exception 'Some selected cells are already in a nuc. Refresh and try again.' using errcode = '23505';
  end if;

  insert into mating_nuc_batches (id, user_id, source_rearing_batch_id, mode, requested_count, created_count, notes)
  values (p_batch_id, v_uid, p_source_batch_id, p_mode, v_count, v_count, p_notes);

  with inserted as (
    insert into mating_nucs (
      user_id, nuc_number, reference_code, creation_batch_id, batch_id,
      graft_id, queen_id, mating_location, status, notes
    )
    select v_uid, n.nuc_number, n.reference_code, p_batch_id, p_source_batch_id,
           n.graft_id, n.queen_id, n.mating_location, n.status, n.notes
      from jsonb_to_recordset(p_nucs) as n(
        nuc_number text, reference_code text, graft_id uuid, queen_id uuid,
        mating_location text, status text, notes text
      )
    returning id, graft_id
  )
  select array_agg(id), array_agg(graft_id) filter (where graft_id is not null)
    into v_nuc_ids, v_graft_ids
    from inserted;

  if coalesce(array_length(v_graft_ids, 1), 0) > 0 then
    update batch_grafts
       set status = 'in_nuc',
           status_date = current_date
     where id = any (v_graft_ids)
       and user_id = v_uid
       and batch_id = p_source_batch_id
       and status in ('sealed', 'caged', 'emerged');
    get diagnostics v_updated = row_count;
    if v_updated <> array_length(v_graft_ids, 1) then
      raise exception 'Some selected cells are no longer available. Refresh and try again.' using errcode = 'P0001';
    end if;
  end if;

  return v_nuc_ids;
end;
$$;

revoke all on function public.create_mating_nuc_bulk(uuid, uuid, text, text, jsonb) from public, anon;
grant execute on function public.create_mating_nuc_bulk(uuid, uuid, text, text, jsonb) to authenticated;
