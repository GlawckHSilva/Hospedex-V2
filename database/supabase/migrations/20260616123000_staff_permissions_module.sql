-- Modulo de Funcionarios e Permissoes da V2.
-- Complementa roles, permissoes e convites sem depender da arquitetura V1.

insert into public.permissions (code, name, module, description) values
  ('dashboard.read', 'Ver dashboard', 'dashboard', 'Permite visualizar o dashboard do tenant.'),
  ('calendar.read', 'Ver calendario', 'calendar', 'Permite visualizar calendario e disponibilidade.'),
  ('calendar.manage', 'Gerenciar calendario', 'calendar', 'Permite bloquear, liberar e alterar disponibilidade.'),
  ('cleaning.read', 'Ver limpeza', 'cleaning', 'Permite visualizar rotinas de limpeza.'),
  ('cleaning.manage', 'Gerenciar limpeza', 'cleaning', 'Permite criar e alterar rotinas de limpeza.'),
  ('inventory.read', 'Ver inventario', 'inventory', 'Permite visualizar inventario.'),
  ('inventory.manage', 'Gerenciar inventario', 'inventory', 'Permite criar e alterar inventario.'),
  ('reports.read', 'Ver relatorios', 'reports', 'Permite visualizar relatorios do tenant.'),
  ('settings.manage', 'Gerenciar configuracoes', 'settings', 'Permite alterar configuracoes administrativas do tenant.')
on conflict (code) do update set
  name = excluded.name,
  module = excluded.module,
  description = excluded.description;

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  role_id uuid references public.roles(id) on delete set null,
  invited_user_id uuid references public.profiles(id) on delete set null,
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  token_hash text not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  last_sent_at timestamptz not null default now(),
  sent_count integer not null default 1,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_invites_tenant_id_idx on public.staff_invites (tenant_id);
create index if not exists staff_invites_email_idx on public.staff_invites (lower(email));
create unique index if not exists staff_invites_pending_email_idx
  on public.staff_invites (tenant_id, lower(email))
  where status = 'pending';

alter table public.staff_invites enable row level security;

drop policy if exists "staff_invites_select_member" on public.staff_invites;
create policy "staff_invites_select_member" on public.staff_invites
for select to authenticated
using (
  app_private.is_tenant_owner(tenant_id)
  or app_private.has_tenant_permission(tenant_id, 'members.manage')
);

drop policy if exists "staff_invites_manage_owner" on public.staff_invites;
create policy "staff_invites_manage_owner" on public.staff_invites
for all to authenticated
using (
  app_private.is_tenant_owner(tenant_id)
  or app_private.has_tenant_permission(tenant_id, 'members.manage')
)
with check (
  app_private.is_tenant_owner(tenant_id)
  or app_private.has_tenant_permission(tenant_id, 'members.manage')
);

drop policy if exists "profiles_select_staff_management" on public.profiles;
create policy "profiles_select_staff_management" on public.profiles
for select to authenticated
using (
  exists (
    select 1 from public.tenant_members tm
    where tm.user_id = profiles.id
      and (
        app_private.is_tenant_owner(tm.tenant_id)
        or app_private.has_tenant_permission(tm.tenant_id, 'members.manage')
      )
  )
);

drop policy if exists "profiles_update_staff_management" on public.profiles;
create policy "profiles_update_staff_management" on public.profiles
for update to authenticated
using (
  platform_role = 'user'
  and exists (
    select 1 from public.tenant_members tm
    where tm.user_id = profiles.id
      and tm.member_role = 'staff'
      and (
        app_private.is_tenant_owner(tm.tenant_id)
        or app_private.has_tenant_permission(tm.tenant_id, 'members.manage')
      )
  )
)
with check (platform_role = 'user');

-- Cargos iniciais para tenants existentes. Novos tenants tambem sao cobertos
-- pela tela de Funcionarios, que cria cargos ausentes ao carregar o modulo.
with cargos(code, name, description, is_system) as (
  values
    ('administrador', 'Administrador', 'Acesso amplo aos modulos do tenant.', true),
    ('recepcao', 'Recepcao', 'Atendimento, reservas e calendario.', true),
    ('limpeza', 'Limpeza', 'Rotinas de limpeza e calendario.', true),
    ('financeiro', 'Financeiro', 'Financeiro e relatorios.', true),
    ('manutencao', 'Manutencao', 'Propriedades, inventario e calendario.', true)
)
insert into public.roles (tenant_id, code, name, description, is_system)
select tenants.id, cargos.code, cargos.name, cargos.description, cargos.is_system
from public.tenants
cross join cargos
where tenants.deleted_at is null
on conflict (tenant_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  updated_at = now();

with mapa(role_code, permission_code) as (
  values
    ('administrador', 'dashboard.read'),
    ('administrador', 'tenants.manage'),
    ('administrador', 'members.manage'),
    ('administrador', 'roles.manage'),
    ('administrador', 'properties.read'),
    ('administrador', 'properties.manage'),
    ('administrador', 'reservations.read'),
    ('administrador', 'reservations.manage'),
    ('administrador', 'calendar.read'),
    ('administrador', 'calendar.manage'),
    ('administrador', 'finance.read'),
    ('administrador', 'finance.manage'),
    ('administrador', 'cleaning.read'),
    ('administrador', 'cleaning.manage'),
    ('administrador', 'inventory.read'),
    ('administrador', 'inventory.manage'),
    ('administrador', 'reports.read'),
    ('administrador', 'settings.manage'),
    ('recepcao', 'dashboard.read'),
    ('recepcao', 'properties.read'),
    ('recepcao', 'reservations.read'),
    ('recepcao', 'reservations.manage'),
    ('recepcao', 'calendar.read'),
    ('recepcao', 'calendar.manage'),
    ('limpeza', 'dashboard.read'),
    ('limpeza', 'calendar.read'),
    ('limpeza', 'cleaning.read'),
    ('limpeza', 'cleaning.manage'),
    ('financeiro', 'dashboard.read'),
    ('financeiro', 'finance.read'),
    ('financeiro', 'finance.manage'),
    ('financeiro', 'reports.read'),
    ('manutencao', 'dashboard.read'),
    ('manutencao', 'properties.read'),
    ('manutencao', 'properties.manage'),
    ('manutencao', 'calendar.read'),
    ('manutencao', 'inventory.read'),
    ('manutencao', 'inventory.manage')
)
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join mapa on mapa.role_code = roles.code
join public.permissions on permissions.code = mapa.permission_code
where roles.tenant_id is not null
on conflict (role_id, permission_id) do nothing;
