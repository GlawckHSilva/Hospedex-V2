create table if not exists public.user_tutorial_progress (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tutorial_key text not null,
  tutorial_version integer not null default 1,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed', 'dismissed')),
  current_step integer not null default 0,
  completed_steps text[] not null default '{}'::text[],
  started_at timestamptz,
  completed_at timestamptz,
  dismissed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id, tutorial_key, tutorial_version)
);

create index if not exists user_tutorial_progress_tenant_user_idx
  on public.user_tutorial_progress (tenant_id, user_id);

alter table public.user_tutorial_progress enable row level security;

drop policy if exists "user_tutorial_progress_select_own" on public.user_tutorial_progress;
drop policy if exists "user_tutorial_progress_insert_own" on public.user_tutorial_progress;
drop policy if exists "user_tutorial_progress_update_own" on public.user_tutorial_progress;

create policy "user_tutorial_progress_select_own"
on public.user_tutorial_progress
for select to authenticated
using (
  user_id = auth.uid()
  and app_private.is_tenant_member(tenant_id)
);

create policy "user_tutorial_progress_insert_own"
on public.user_tutorial_progress
for insert to authenticated
with check (
  user_id = auth.uid()
  and app_private.is_tenant_member(tenant_id)
);

create policy "user_tutorial_progress_update_own"
on public.user_tutorial_progress
for update to authenticated
using (
  user_id = auth.uid()
  and app_private.is_tenant_member(tenant_id)
)
with check (
  user_id = auth.uid()
  and app_private.is_tenant_member(tenant_id)
);

drop trigger if exists set_updated_at_user_tutorial_progress on public.user_tutorial_progress;
create trigger set_updated_at_user_tutorial_progress
before update on public.user_tutorial_progress
for each row execute function app_private.set_updated_at();
