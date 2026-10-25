-- Optional employer branding; existing owner RLS, guarded updates and history
-- triggers continue to apply. An explicit clear is an override too.
alter table public.prospects
  add column company_logo_url text,
  add column company_logo_override boolean not null default false,
  add constraint prospects_company_logo_url_check check (
    company_logo_url is null or (
      length(company_logo_url) <= 2048 and
      company_logo_url ~ '^https://([a-zA-Z0-9-]+\.)+[a-zA-Z][a-zA-Z0-9-]*/[^?#[:space:]]*$' and
      company_logo_url !~* '^https://[^/]*\.(localhost|local|internal|test|invalid|example)/'
    )
  );

-- Automatic refresh callers supply override=false; a saved manual replacement
-- (including null) remains authoritative while other refreshed facts can save.
create function public.preserve_manual_company_logo() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.company_logo_override and not new.company_logo_override then
    new.company_logo_url := old.company_logo_url;
    new.company_logo_override := true;
  end if;
  return new;
end;
$$;
create trigger prospects_preserve_manual_company_logo
before update on public.prospects for each row
execute function public.preserve_manual_company_logo();

grant insert (company_logo_url, company_logo_override),
  update (company_logo_url, company_logo_override)
  on public.prospects to authenticated;
