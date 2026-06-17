/*
  Modulo operacional de Limpeza da V2.

  As tarefas ficam isoladas por tenant/propriedade e podem nascer manualmente
  ou a partir do check-out. Checklist, fotos e automacoes ficam preparados para
  etapas futuras sem misturar responsabilidades neste modulo inicial.
*/

create table if not exists public.cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  reservation_id uuid references public.reservations(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  source text not null default 'manual'
    check (source in ('manual', 'checkout')),
  status text not null default 'awaiting_cleaning'
    check (status in ('awaiting_cleaning', 'in_cleaning', 'completed', 'cancelled')),
  title text not null,
  notes text,
  scheduled_for date,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cleaning_tasks is
  'Tarefas de limpeza por tenant. Criadas manualmente ou apos check-out para manter a unidade operacionalmente controlada.';
comment on column public.cleaning_tasks.assigned_to is
  'Responsavel opcional; limpeza deve funcionar mesmo sem funcionario cadastrado.';
comment on column public.cleaning_tasks.source is
  'Origem manual ou checkout. Preparado para automacoes futuras sem expor regra no frontend.';

create index if not exists cleaning_tasks_tenant_status_idx
  on public.cleaning_tasks (tenant_id, status, scheduled_for);
create index if not exists cleaning_tasks_property_unit_idx
  on public.cleaning_tasks (tenant_id, property_id, unit_id);
create index if not exists cleaning_tasks_reservation_idx
  on public.cleaning_tasks (reservation_id)
  where reservation_id is not null;

drop trigger if exists set_cleaning_tasks_updated_at on public.cleaning_tasks;
create trigger set_cleaning_tasks_updated_at
before update on public.cleaning_tasks
for each row execute function app_private.set_updated_at();

alter table public.cleaning_tasks enable row level security;

drop policy if exists "cleaning_tasks_select" on public.cleaning_tasks;
drop policy if exists "cleaning_tasks_manage" on public.cleaning_tasks;

create policy "cleaning_tasks_select"
on public.cleaning_tasks
for select to authenticated
using (
  app_private.can_access_property(tenant_id, property_id, 'cleaning.read')
);

create policy "cleaning_tasks_manage"
on public.cleaning_tasks
for all to authenticated
using (
  app_private.can_access_property(tenant_id, property_id, 'cleaning.manage')
)
with check (
  app_private.can_access_property(tenant_id, property_id, 'cleaning.manage')
);

grant select, insert, update, delete on public.cleaning_tasks to authenticated;
grant all on public.cleaning_tasks to service_role;
