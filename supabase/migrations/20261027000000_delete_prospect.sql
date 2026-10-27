-- Issue #41: mistaken records may be permanently removed by their owner.
-- No table DELETE grants, cascade changes, or opportunity-link changes.
begin;
create function public.delete_prospect(prospect_id uuid, expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  saved_revision timestamptz;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if prospect_id is null or expected_updated_at is null then
    raise exception 'Prospect ID and exact revision are required' using errcode = '22023';
  end if;
  -- Match the board-order writer's lock order, then block edits/new FK links.
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  select p.updated_at into saved_revision from public.prospects p
    where p.id = prospect_id and p.owner_id = caller for update;
  if not found or saved_revision is distinct from expected_updated_at then
    raise exception 'Prospect changed, is unavailable, or is no longer accessible. Reload before deleting.' using errcode = '40001';
  end if;
  -- Feed links are immutable by design; do not silently undo a Tracker handoff.
  if exists (select 1 from public.radar_opportunities o where o.prospect_id = delete_prospect.prospect_id) then
    raise exception 'This prospect is linked to a Career Radar opportunity and cannot be deleted.' using errcode = '23503';
  end if;
  delete from public.prospect_status_events e where e.prospect_id = delete_prospect.prospect_id;
  delete from public.prospects p where p.id = prospect_id and p.owner_id = caller;
  return prospect_id;
end;
$$;
revoke all on function public.delete_prospect(uuid, timestamptz) from public, anon;
grant execute on function public.delete_prospect(uuid, timestamptz) to authenticated;
commit;
