/*
  Repara e expoe convites de funcionarios na Data API.

  A auditoria encontrou drift: a migration original constava no historico,
  mas a tabela nao existia no schema remoto. Toda a criacao abaixo e
  idempotente e preserva dados caso a tabela ja exista em outro ambiente.
*/

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  role_id uuid references public.roles(id) on delete set null,
  invited_user_id uuid references public.profiles(id) on delete set null,
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  token_hash text not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  last_sent_at timestamptz not null default now(),
  sent_count integer not null default 1,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_invites_tenant_id_idx
  on public.staff_invites (tenant_id);
create index if not exists staff_invites_email_idx
  on public.staff_invites (lower(email));
create unique index if not exists staff_invites_pending_email_idx
  on public.staff_invites (tenant_id, lower(email))
  where status = 'pending';

drop trigger if exists set_staff_invites_updated_at on public.staff_invites;
create trigger set_staff_invites_updated_at
before update on public.staff_invites
for each row execute function app_private.set_updated_at();

alter table public.staff_invites enable row level security;

drop policy if exists "staff_invites_select_member" on public.staff_invites;
create policy "staff_invites_select_member" on public.staff_invites
for select to authenticated
using (
  app_private.is_tenant_owner(staff_invites.tenant_id)
  or app_private.has_tenant_permission(staff_invites.tenant_id, 'members.manage')
);

drop policy if exists "staff_invites_manage_owner" on public.staff_invites;
create policy "staff_invites_manage_owner" on public.staff_invites
for all to authenticated
using (
  app_private.is_tenant_owner(staff_invites.tenant_id)
  or app_private.has_tenant_permission(staff_invites.tenant_id, 'members.manage')
)
with check (
  app_private.is_tenant_owner(staff_invites.tenant_id)
  or app_private.has_tenant_permission(staff_invites.tenant_id, 'members.manage')
);

grant select, insert, update, delete on public.staff_invites to authenticated;
grant all on public.staff_invites to service_role;

comment on table public.staff_invites is
  'Convites de funcionarios isolados por tenant e acessiveis somente pelas policies de membros.';

comment on policy "staff_invites_select_member" on public.staff_invites is
  'Permite consultar convites somente ao proprietario ou gestor de membros do tenant.';
comment on policy "staff_invites_manage_owner" on public.staff_invites is
  'Protege inclusao e alteracao de convites pela permissao members.manage do tenant.';

notify pgrst, 'reload schema';
