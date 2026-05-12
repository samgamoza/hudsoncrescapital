-- Global portal flags (single row). Service role / server API updates; investors read via API.
create table if not exists public.portal_settings (
  id smallint primary key default 1 check (id = 1),
  investor_dashboard text not null default 'v1' check (investor_dashboard in ('v1', 'v2')),
  updated_at timestamptz not null default now()
);

insert into public.portal_settings (id, investor_dashboard)
values (1, 'v1')
on conflict (id) do nothing;

alter table public.portal_settings enable row level security;

-- No direct client access; API uses service role.
create policy "portal_settings_no_select"
  on public.portal_settings
  for select
  using (false);

create policy "portal_settings_no_write"
  on public.portal_settings
  for all
  using (false);
