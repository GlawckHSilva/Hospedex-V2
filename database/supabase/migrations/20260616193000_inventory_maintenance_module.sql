/*
  Modulo de Inventario e Agenda de Manutencao da V2.

  Inventario e manutencoes pertencem sempre a um tenant/propriedade. As tabelas
  preparam garantia, fotos antes/depois, custos, relatorios, notificacoes e
  integracao financeira futura sem implementar essas automacoes agora.
*/

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  category text not null
    check (category in ('kitchen', 'bedrooms', 'bathrooms', 'outdoor_area', 'electronics', 'furniture', 'bed_linen', 'cleaning', 'other')),
  name text not null,
  quantity integer not null default 1 check (quantity >= 0),
  estimated_value numeric(12, 2) not null default 0 check (estimated_value >= 0),
  conservation_state text not null default 'good'
    check (conservation_state in ('new', 'good', 'used', 'damaged', 'missing')),
  image_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.inventory_items is
  'Itens de inventario por tenant/propriedade/unidade. Mantem foto por URL e metadata para evoluir Storage/fotos futuras.';
comment on column public.inventory_items.metadata is
  'Reservado para garantia, anexos futuros, auditoria de inventario e custos relacionados.';

create table if not exists public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  maintenance_type text not null default 'corrective'
    check (maintenance_type in ('preventive', 'corrective', 'inspection', 'replacement', 'technical_cleaning', 'other')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  title text not null,
  notes text,
  scheduled_for date,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.maintenance_tasks is
  'Agenda de manutencao por tenant. Custos, fotos antes/depois e notificacoes ficam preparados no metadata.';

create index if not exists inventory_items_tenant_property_idx
  on public.inventory_items (tenant_id, property_id, unit_id)
  where deleted_at is null;
create index if not exists inventory_items_category_idx
  on public.inventory_items (tenant_id, category, conservation_state)
  where deleted_at is null;
create index if not exists maintenance_tasks_tenant_status_idx
  on public.maintenance_tasks (tenant_id, status, scheduled_for);
create index if not exists maintenance_tasks_property_unit_idx
  on public.maintenance_tasks (tenant_id, property_id, unit_id);

drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at
before update on public.inventory_items
for each row execute function app_private.set_updated_at();

drop trigger if exists set_maintenance_tasks_updated_at on public.maintenance_tasks;
create trigger set_maintenance_tasks_updated_at
before update on public.maintenance_tasks
for each row execute function app_private.set_updated_at();

alter table public.inventory_items enable row level security;
alter table public.maintenance_tasks enable row level security;

drop policy if exists "inventory_items_select" on public.inventory_items;
drop policy if exists "inventory_items_manage" on public.inventory_items;
drop policy if exists "maintenance_tasks_select" on public.maintenance_tasks;
drop policy if exists "maintenance_tasks_manage" on public.maintenance_tasks;

create policy "inventory_items_select"
on public.inventory_items
for select to authenticated
using (
  app_private.can_access_property(tenant_id, property_id, 'inventory.read')
);

create policy "inventory_items_manage"
on public.inventory_items
for all to authenticated
using (
  app_private.can_access_property(tenant_id, property_id, 'inventory.manage')
)
with check (
  app_private.can_access_property(tenant_id, property_id, 'inventory.manage')
);

create policy "maintenance_tasks_select"
on public.maintenance_tasks
for select to authenticated
using (
  app_private.can_access_property(tenant_id, property_id, 'inventory.read')
);

create policy "maintenance_tasks_manage"
on public.maintenance_tasks
for all to authenticated
using (
  app_private.can_access_property(tenant_id, property_id, 'inventory.manage')
)
with check (
  app_private.can_access_property(tenant_id, property_id, 'inventory.manage')
);

grant select, insert, update, delete on public.inventory_items to authenticated;
grant select, insert, update, delete on public.maintenance_tasks to authenticated;
grant all on public.inventory_items, public.maintenance_tasks to service_role;
