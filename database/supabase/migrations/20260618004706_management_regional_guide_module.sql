-- Guia da Regiao do Gerenciamento.
-- Esta tabela cadastra recomendacoes internas do tenant. A exibicao publica
-- para hospedes fica preparada para etapa futura e nao e ativada aqui.

create table if not exists public.regional_guide_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  category text not null check (
    category in (
      'restaurants',
      'snack_bars',
      'coffee_shops',
      'markets',
      'pharmacies',
      'hospitals',
      'tours',
      'beaches',
      'waterfalls',
      'tourist_spots',
      'nightlife',
      'others'
    )
  ),
  name text not null,
  description text,
  address text,
  phone text,
  whatsapp text,
  website_url text,
  opening_hours text,
  cover_image_url text,
  display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.regional_guide_locations is
  'Recomendacoes do Guia da Regiao no Gerenciamento. Dados ficam isolados por tenant e nao aparecem publicamente nesta etapa.';
comment on column public.regional_guide_locations.tenant_id is
  'Tenant dono da recomendacao. Garante isolamento entre proprietarios.';
comment on column public.regional_guide_locations.display_order is
  'Ordem preparada para exibicao futura no marketplace sem alterar a regra de cadastro atual.';

create index if not exists regional_guide_locations_tenant_status_idx
  on public.regional_guide_locations (tenant_id, status, deleted_at, display_order);
create index if not exists regional_guide_locations_owner_idx
  on public.regional_guide_locations (owner_id);
create index if not exists regional_guide_locations_category_idx
  on public.regional_guide_locations (tenant_id, category);

drop trigger if exists set_regional_guide_locations_updated_at
  on public.regional_guide_locations;
create trigger set_regional_guide_locations_updated_at
before update on public.regional_guide_locations
for each row execute function app_private.set_updated_at();

alter table public.regional_guide_locations enable row level security;

drop policy if exists "regional_guide_locations_select_member"
  on public.regional_guide_locations;
drop policy if exists "regional_guide_locations_insert_manager"
  on public.regional_guide_locations;
drop policy if exists "regional_guide_locations_update_manager"
  on public.regional_guide_locations;
drop policy if exists "regional_guide_locations_delete_manager"
  on public.regional_guide_locations;

create policy "regional_guide_locations_select_member"
on public.regional_guide_locations
for select to authenticated
using (
  deleted_at is null
  and (
    app_private.has_tenant_permission(tenant_id, 'properties.read')
    or app_private.has_tenant_permission(tenant_id, 'properties.manage')
    or app_private.has_tenant_permission(tenant_id, 'settings.manage')
  )
);

create policy "regional_guide_locations_insert_manager"
on public.regional_guide_locations
for insert to authenticated
with check (
  app_private.has_tenant_permission(tenant_id, 'properties.manage')
  or app_private.has_tenant_permission(tenant_id, 'settings.manage')
);

create policy "regional_guide_locations_update_manager"
on public.regional_guide_locations
for update to authenticated
using (
  deleted_at is null
  and (
    app_private.has_tenant_permission(tenant_id, 'properties.manage')
    or app_private.has_tenant_permission(tenant_id, 'settings.manage')
  )
)
with check (
  app_private.has_tenant_permission(tenant_id, 'properties.manage')
  or app_private.has_tenant_permission(tenant_id, 'settings.manage')
);

create policy "regional_guide_locations_delete_manager"
on public.regional_guide_locations
for delete to authenticated
using (
  app_private.has_tenant_permission(tenant_id, 'properties.manage')
  or app_private.has_tenant_permission(tenant_id, 'settings.manage')
);

-- Grants explicitos sao necessarios para novos projetos Supabase onde tabelas
-- publicas nao entram automaticamente na Data API.
grant select, insert, update, delete on public.regional_guide_locations to authenticated;
grant all on public.regional_guide_locations to service_role;
