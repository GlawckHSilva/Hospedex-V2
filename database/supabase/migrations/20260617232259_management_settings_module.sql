-- Configuracoes globais do gerenciamento.
-- Esta tabela fica no nivel do tenant para evitar misturar preferencias do
-- empreendimento com configuracoes especificas de uma propriedade.

create table if not exists public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  logo_url text,
  primary_color text not null default '#06b6d4',
  phone text,
  whatsapp text,
  email text,
  city text,
  state text,
  short_description text,
  default_check_in_time time not null default '14:00',
  default_check_out_time time not null default '11:00',
  cleaning_policy text not null default 'after_checkout',
  allow_manual_reservations boolean not null default true,
  require_payment_confirmation boolean not null default true,
  require_checkin_confirmation boolean not null default true,
  require_checkout_confirmation boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id),
  constraint tenant_settings_primary_color_hex
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint tenant_settings_cleaning_policy_check
    check (cleaning_policy in ('after_checkout', 'daily', 'on_request', 'none'))
);

comment on table public.tenant_settings is
  'Preferencias globais do gerenciamento por tenant. Mantem isolamento multi-tenant e evita gravar configuracoes sensiveis no frontend.';
comment on column public.tenant_settings.tenant_id is
  'Tenant dono da configuracao. Todas as policies usam este campo para isolar clientes.';
comment on column public.tenant_settings.owner_id is
  'Proprietario responsavel pelo tenant. Facilita auditoria e filtros operacionais sem depender do cliente.';
comment on column public.tenant_settings.metadata is
  'Espaco reservado para preferencias futuras nao criticas. Regras de negocio importantes devem virar colunas explicitas.';

create index if not exists tenant_settings_owner_idx
  on public.tenant_settings (owner_id);

drop trigger if exists set_tenant_settings_updated_at on public.tenant_settings;
create trigger set_tenant_settings_updated_at
before update on public.tenant_settings
for each row execute function app_private.set_updated_at();

alter table public.tenant_settings enable row level security;

drop policy if exists "tenant_settings_select_member" on public.tenant_settings;
drop policy if exists "tenant_settings_manage_owner_or_permission" on public.tenant_settings;

create policy "tenant_settings_select_member"
on public.tenant_settings
for select to authenticated
using (app_private.is_tenant_member(tenant_id));

create policy "tenant_settings_manage_owner_or_permission"
on public.tenant_settings
for all to authenticated
using (
  app_private.is_tenant_owner(tenant_id)
  or app_private.has_tenant_permission(tenant_id, 'settings.manage')
  or app_private.has_tenant_permission(tenant_id, 'tenants.manage')
)
with check (
  app_private.is_tenant_owner(tenant_id)
  or app_private.has_tenant_permission(tenant_id, 'settings.manage')
  or app_private.has_tenant_permission(tenant_id, 'tenants.manage')
);

-- Grants explicitos mantem o acesso via Data API compativel com projetos novos
-- da Supabase, sem expor dados anonimos.
grant select, insert, update, delete on public.tenant_settings to authenticated;
grant all on public.tenant_settings to service_role;

insert into public.tenant_settings (tenant_id, owner_id)
select id, owner_id
from public.tenants
where deleted_at is null
on conflict (tenant_id) do nothing;

-- Flags operacionais exibidas nas Configuracoes do Gerenciamento.
-- O proprietario so altera chaves marcadas como owner_configurable.
insert into public.feature_flags (
  key,
  module,
  description,
  default_enabled,
  owner_configurable
) values
  (
    'notifications',
    'notifications',
    'Notificacoes internas do gerenciamento.',
    true,
    true
  ),
  (
    'confirmations',
    'confirmations',
    'Central de confirmacoes operacionais.',
    true,
    true
  )
on conflict (key) do update set
  module = excluded.module,
  description = excluded.description,
  owner_configurable = excluded.owner_configurable,
  updated_at = now();
