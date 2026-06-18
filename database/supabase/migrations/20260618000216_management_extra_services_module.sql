-- Catalogo de servicos extras do Gerenciamento.
-- Mantemos este catalogo separado de reservation_extra_services, que registra
-- apenas os extras efetivamente aplicados em uma reserva.

create table if not exists public.extra_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  description text,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  charge_type text not null default 'fixed'
    check (charge_type in ('fixed', 'per_night', 'per_guest', 'per_reservation')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  is_required boolean not null default false,
  applies_to_all_properties boolean not null default true,
  internal_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.extra_services is
  'Catalogo multi-tenant de servicos extras do gerenciamento. Itens inativos ou excluidos nao entram em novas reservas.';
comment on column public.extra_services.tenant_id is
  'Tenant dono do servico. Este campo garante isolamento entre proprietarios.';
comment on column public.extra_services.applies_to_all_properties is
  'Quando verdadeiro, o servico vale para todas as casas atuais e futuras do tenant.';

create table if not exists public.extra_service_properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  extra_service_id uuid not null references public.extra_services(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (extra_service_id, property_id)
);

comment on table public.extra_service_properties is
  'Vinculo opcional entre servicos extras e casas especificas do tenant.';

create index if not exists extra_services_tenant_status_idx
  on public.extra_services (tenant_id, status, deleted_at);
create index if not exists extra_services_owner_idx
  on public.extra_services (owner_id);
create unique index if not exists extra_services_tenant_name_active_idx
  on public.extra_services (tenant_id, lower(name))
  where deleted_at is null;
create index if not exists extra_service_properties_tenant_idx
  on public.extra_service_properties (tenant_id);
create index if not exists extra_service_properties_property_idx
  on public.extra_service_properties (property_id);

drop trigger if exists set_extra_services_updated_at on public.extra_services;
create trigger set_extra_services_updated_at
before update on public.extra_services
for each row execute function app_private.set_updated_at();

alter table public.extra_services enable row level security;
alter table public.extra_service_properties enable row level security;

drop policy if exists "extra_services_select_member" on public.extra_services;
drop policy if exists "extra_services_insert_reservations" on public.extra_services;
drop policy if exists "extra_services_update_reservations" on public.extra_services;
drop policy if exists "extra_services_delete_reservations" on public.extra_services;
drop policy if exists "extra_service_properties_select_member" on public.extra_service_properties;
drop policy if exists "extra_service_properties_insert_reservations" on public.extra_service_properties;
drop policy if exists "extra_service_properties_update_reservations" on public.extra_service_properties;
drop policy if exists "extra_service_properties_delete_reservations" on public.extra_service_properties;

create policy "extra_services_select_member"
on public.extra_services
for select to authenticated
using (
  deleted_at is null
  and app_private.is_tenant_member(tenant_id)
);

create policy "extra_services_insert_reservations"
on public.extra_services
for insert to authenticated
with check (
  app_private.has_tenant_permission(tenant_id, 'reservations.manage')
  or app_private.has_tenant_permission(tenant_id, 'settings.manage')
);

create policy "extra_services_update_reservations"
on public.extra_services
for update to authenticated
using (
  deleted_at is null
  and (
    app_private.has_tenant_permission(tenant_id, 'reservations.manage')
    or app_private.has_tenant_permission(tenant_id, 'settings.manage')
  )
)
with check (
  app_private.has_tenant_permission(tenant_id, 'reservations.manage')
  or app_private.has_tenant_permission(tenant_id, 'settings.manage')
);

create policy "extra_services_delete_reservations"
on public.extra_services
for delete to authenticated
using (
  app_private.has_tenant_permission(tenant_id, 'reservations.manage')
  or app_private.has_tenant_permission(tenant_id, 'settings.manage')
);

create policy "extra_service_properties_select_member"
on public.extra_service_properties
for select to authenticated
using (
  app_private.is_tenant_member(tenant_id)
  and exists (
    select 1 from public.extra_services es
    where es.id = extra_service_id
      and es.tenant_id = tenant_id
      and es.deleted_at is null
  )
);

create policy "extra_service_properties_insert_reservations"
on public.extra_service_properties
for insert to authenticated
with check (
  app_private.has_tenant_permission(tenant_id, 'reservations.manage')
  or app_private.has_tenant_permission(tenant_id, 'settings.manage')
);

create policy "extra_service_properties_update_reservations"
on public.extra_service_properties
for update to authenticated
using (
  app_private.has_tenant_permission(tenant_id, 'reservations.manage')
  or app_private.has_tenant_permission(tenant_id, 'settings.manage')
)
with check (
  app_private.has_tenant_permission(tenant_id, 'reservations.manage')
  or app_private.has_tenant_permission(tenant_id, 'settings.manage')
);

create policy "extra_service_properties_delete_reservations"
on public.extra_service_properties
for delete to authenticated
using (
  app_private.has_tenant_permission(tenant_id, 'reservations.manage')
  or app_private.has_tenant_permission(tenant_id, 'settings.manage')
);

-- Grants explicitos mantem novas tabelas acessiveis via Data API sem abrir
-- dados anonimos; RLS continua definindo quais linhas cada usuario ve.
grant select, insert, update, delete on public.extra_services to authenticated;
grant select, insert, update, delete on public.extra_service_properties to authenticated;
grant all on public.extra_services to service_role;
grant all on public.extra_service_properties to service_role;

with exemplos (name, description, amount, charge_type) as (
  values
    ('Cafe da manha', 'Servico opcional para diaria com cafe da manha.', 0, 'per_guest'),
    ('Pet', 'Taxa para hospedagem com animal de estimacao.', 0, 'per_reservation'),
    ('Limpeza extra', 'Limpeza adicional durante a estadia.', 0, 'fixed'),
    ('Churrasqueira', 'Uso de churrasqueira conforme regra da casa.', 0, 'per_reservation'),
    ('Check-in antecipado', 'Entrada antes do horario padrao.', 0, 'fixed'),
    ('Check-out tardio', 'Saida depois do horario padrao.', 0, 'fixed'),
    ('Decoracao romantica', 'Preparacao especial para datas comemorativas.', 0, 'fixed')
)
insert into public.extra_services (
  tenant_id,
  owner_id,
  name,
  description,
  amount,
  charge_type,
  status,
  is_required,
  applies_to_all_properties,
  created_by
)
select
  tenants.id,
  tenants.owner_id,
  exemplos.name,
  exemplos.description,
  exemplos.amount,
  exemplos.charge_type,
  'inactive',
  false,
  true,
  tenants.owner_id
from public.tenants
cross join exemplos
where tenants.deleted_at is null
  and not exists (
    select 1
    from public.extra_services existente
    where existente.tenant_id = tenants.id
      and lower(existente.name) = lower(exemplos.name)
      and existente.deleted_at is null
  );
