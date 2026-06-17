create table if not exists public.management_notification_states (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_key text not null,
  read_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id, notification_key)
);

create index if not exists management_notification_states_user_idx
  on public.management_notification_states (tenant_id, user_id, deleted_at, read_at);

drop trigger if exists set_management_notification_states_updated_at
  on public.management_notification_states;

create trigger set_management_notification_states_updated_at
before update on public.management_notification_states
for each row execute function app_private.set_updated_at();

alter table public.management_notification_states enable row level security;

drop policy if exists "management_notification_states_select_own"
  on public.management_notification_states;
drop policy if exists "management_notification_states_insert_own"
  on public.management_notification_states;
drop policy if exists "management_notification_states_update_own"
  on public.management_notification_states;
drop policy if exists "management_notification_states_delete_own"
  on public.management_notification_states;

create policy "management_notification_states_select_own"
on public.management_notification_states
for select to authenticated
using (
  user_id = auth.uid()
  and (
    exists (
      select 1 from public.tenants t
      where t.id = tenant_id
        and t.owner_id = auth.uid()
        and t.deleted_at is null
    )
    or exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_id
        and tm.user_id = auth.uid()
        and tm.status = 'active'
    )
  )
);

create policy "management_notification_states_insert_own"
on public.management_notification_states
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1 from public.tenants t
      where t.id = tenant_id
        and t.owner_id = auth.uid()
        and t.deleted_at is null
    )
    or exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_id
        and tm.user_id = auth.uid()
        and tm.status = 'active'
    )
  )
);

create policy "management_notification_states_update_own"
on public.management_notification_states
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "management_notification_states_delete_own"
on public.management_notification_states
for delete to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.management_notification_states to authenticated;
grant all on public.management_notification_states to service_role;
