-- Local validation only. Apply to hosted Supabase separately before releasing the UI.
begin;
alter table public.prospects drop constraint prospects_status_check;
alter table public.prospects add constraint prospects_status_check check (status in ('prospect', 'interested', 'applying', 'applied', 'recruiter', 'interviewing', 'final', 'offer', 'hired', 'passed', 'rejected', 'withdrawn', 'closed'));
alter table public.prospect_status_events drop constraint prospect_status_events_from_status_check;
alter table public.prospect_status_events add constraint prospect_status_events_from_status_check check (from_status in ('prospect', 'interested', 'applying', 'applied', 'recruiter', 'interviewing', 'final', 'offer', 'hired', 'passed', 'rejected', 'withdrawn', 'closed'));
alter table public.prospect_status_events drop constraint prospect_status_events_to_status_check;
alter table public.prospect_status_events add constraint prospect_status_events_to_status_check check (to_status in ('prospect', 'interested', 'applying', 'applied', 'recruiter', 'interviewing', 'final', 'offer', 'hired', 'passed', 'rejected', 'withdrawn', 'closed'));

create or replace function career_radar_private.board_column(status text)
returns text language sql immutable set search_path = '' as $$
  select case
    when status in ('prospect','interested','applying') then 'prospects'
    when status = 'applied' then 'applied'
    when status in ('recruiter','interviewing','final','offer') then 'in-process'
    when status = 'hired' then 'hired'
    when status in ('passed','rejected','withdrawn','closed') then 'done'
  end;
$$;

create or replace function public.reorder_prospect_column(column_id text, expected_ids uuid[], ordered_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  actual_ids uuid[];
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if column_id not in ('prospects','applied','in-process','hired','done') or column_id is null then
    raise exception 'Invalid board column' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  perform id from public.prospects where owner_id = caller
    and career_radar_private.board_column(status) = column_id order by id for update;
  select coalesce(array_agg(id order by board_position, created_at desc, id), '{}'::uuid[])
    into actual_ids from public.prospects where owner_id = caller
    and career_radar_private.board_column(status) = column_id;
  if expected_ids is distinct from actual_ids then
    raise exception 'Board order changed. Reload before reordering.' using errcode = '40001';
  end if;
  if ordered_ids is null or cardinality(ordered_ids) <> cardinality(actual_ids)
    or exists(select 1 from unnest(ordered_ids) x where x is null)
    or (select array_agg(x order by x) from unnest(ordered_ids) x)
      is distinct from (select array_agg(x order by x) from unnest(actual_ids) x) then
    raise exception 'Order must contain every card in this column exactly once' using errcode = '22023';
  end if;
  if ordered_ids = actual_ids then return; end if;
  update public.prospects p set board_position = o.position
    from unnest(ordered_ids) with ordinality o(id, position)
    where p.id = o.id and p.owner_id = caller and p.board_position is distinct from o.position;
end;
$$;
commit;
