-- Manual potential contact, additive and nullable for all existing prospects.
begin;
create function career_radar_private.valid_hiring_manager(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare k text; limit_length integer; profile text;
begin
  if value is null then return true; end if;
  if jsonb_typeof(value) <> 'object' or value - array['name','title','company','profile_url','status'] <> '{}'::jsonb then return false; end if;
  if jsonb_typeof(value->'name') is distinct from 'string' or length(btrim(value->>'name')) not between 1 and 120 then return false; end if;
  if jsonb_typeof(value->'status') is distinct from 'string' or value->>'status' not in ('manual','suggested','user_selected','user_verified') then return false; end if;
  foreach k in array array['title','company','profile_url'] loop
    limit_length := case when k = 'profile_url' then 2048 else 160 end;
    if value ? k and (jsonb_typeof(value->k) is distinct from 'string' or length(btrim(value->>k)) not between 1 and limit_length) then return false; end if;
  end loop;
  profile := value->>'profile_url';
  if profile is not null and (profile !~* '^https?://[^/?#[:space:]@]+([/?#][^[:space:]]*)?$' or profile ~ '[[:cntrl:]]' or position(chr(92) in profile) > 0) then return false; end if;
  return true;
end;
$$;
revoke all on function career_radar_private.valid_hiring_manager(jsonb) from public, anon, authenticated;
-- CHECK evaluation needs function execution; schema remains inaccessible to API clients.
grant execute on function career_radar_private.valid_hiring_manager(jsonb) to authenticated;
alter table public.prospects add column hiring_manager jsonb check (career_radar_private.valid_hiring_manager(hiring_manager));
grant insert(hiring_manager), update(hiring_manager) on public.prospects to authenticated;
commit;
