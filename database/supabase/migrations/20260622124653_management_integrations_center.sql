/*
  Central de Integracoes do Gerenciamento.

  Esta base armazena somente estado operacional e preferencias nao sensiveis.
  Tokens, chaves e credenciais permanecem fora do banco exposto e devem ser
  fornecidos futuramente pelo backend por variaveis de ambiente seguras.
*/

insert into public.permissions (code, name, module, description) values
  (
    'integrations.read',
    'Ver integracoes',
    'integrations',
    'Permite consultar o estado das integracoes do tenant.'
  ),
  (
    'integrations.manage',
    'Gerenciar integracoes',
    'integrations',
    'Permite alterar estado e preferencias nao sensiveis das integracoes.'
  )
on conflict (code) do update set
  name = excluded.name,
  module = excluded.module,
  description = excluded.description;

insert into public.feature_flags (
  key,
  module,
  description,
  default_enabled,
  owner_configurable
) values (
  'integrations',
  'integrations',
  'Central de integracoes do Gerenciamento.',
  true,
  false
)
on conflict (key) do update set
  module = excluded.module,
  description = excluded.description,
  owner_configurable = excluded.owner_configurable,
  updated_at = now();

create table if not exists public.tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (
    provider in (
      'whatsapp',
      'google_maps',
      'weather',
      'payments',
      'email',
      'ical',
      'airbnb',
      'booking'
    )
  ),
  enabled boolean not null default false,
  status text not null default 'disabled' check (
    status in ('disabled', 'not_configured', 'pending_backend', 'connected', 'error')
  ),
  public_settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(public_settings) = 'object'),
  configured_at timestamptz,
  configured_by uuid references public.profiles(id) on delete set null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);

create index if not exists tenant_integrations_status_idx
  on public.tenant_integrations (tenant_id, enabled, status);

drop trigger if exists set_tenant_integrations_updated_at
  on public.tenant_integrations;
create trigger set_tenant_integrations_updated_at
before update on public.tenant_integrations
for each row execute function app_private.set_updated_at();

alter table public.tenant_integrations enable row level security;

drop policy if exists "tenant_integrations_select" on public.tenant_integrations;
drop policy if exists "tenant_integrations_insert" on public.tenant_integrations;
drop policy if exists "tenant_integrations_update" on public.tenant_integrations;
drop policy if exists "tenant_integrations_delete" on public.tenant_integrations;

create policy "tenant_integrations_select" on public.tenant_integrations
for select to authenticated
using (
  app_private.has_tenant_permission(tenant_integrations.tenant_id, 'integrations.read')
  or app_private.has_tenant_permission(tenant_integrations.tenant_id, 'integrations.manage')
);

create policy "tenant_integrations_insert" on public.tenant_integrations
for insert to authenticated
with check (
  app_private.has_tenant_permission(tenant_integrations.tenant_id, 'integrations.manage')
);

create policy "tenant_integrations_update" on public.tenant_integrations
for update to authenticated
using (
  app_private.has_tenant_permission(tenant_integrations.tenant_id, 'integrations.manage')
)
with check (
  app_private.has_tenant_permission(tenant_integrations.tenant_id, 'integrations.manage')
);

create policy "tenant_integrations_delete" on public.tenant_integrations
for delete to authenticated
using (
  app_private.has_tenant_permission(tenant_integrations.tenant_id, 'integrations.manage')
);

grant select, insert, update, delete on public.tenant_integrations to authenticated;
grant all on public.tenant_integrations to service_role;

comment on table public.tenant_integrations is
  'Estado e preferencias nao sensiveis das integracoes por tenant. Secrets ficam exclusivamente no backend/env.';
comment on column public.tenant_integrations.public_settings is
  'Preferencias publicas como nome interno, frequencia e observacoes. Nunca armazenar tokens ou chaves.';
comment on policy "tenant_integrations_select" on public.tenant_integrations is
  'Leitura restrita ao tenant e as permissoes integrations.read ou integrations.manage.';
comment on policy "tenant_integrations_update" on public.tenant_integrations is
  'Alteracao restrita a usuarios com integrations.manage no mesmo tenant.';

insert into public.tenant_integrations (tenant_id, provider)
select tenant.id, provider.code
from public.tenants tenant
cross join (
  values
    ('whatsapp'),
    ('google_maps'),
    ('weather'),
    ('payments'),
    ('email'),
    ('ical'),
    ('airbnb'),
    ('booking')
) as provider(code)
where tenant.deleted_at is null
on conflict (tenant_id, provider) do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.tenant_id is not null
  and role.code = 'administrador'
  and permission.code in ('integrations.read', 'integrations.manage')
on conflict (role_id, permission_id) do nothing;

notify pgrst, 'reload schema';
