/*
  Estabiliza o controle operacional da V2 sem alterar dados existentes.

  A licenca precisa ser validada dentro dos helpers usados pelas policies RLS.
  Fazer essa verificacao somente na interface permitiria acesso direto pela
  Data API depois do vencimento ou bloqueio administrativo.
*/

create or replace function app_private.tenant_has_operational_license(
  target_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select exists (
    select 1
    from public.tenants tenant_scope
    join lateral (
      select license_scope.status, license_scope.starts_at, license_scope.expires_at
      from public.licenses license_scope
      where license_scope.tenant_id = tenant_scope.id
      order by license_scope.created_at desc, license_scope.id desc
      limit 1
    ) current_license on true
    where tenant_scope.id = target_tenant_id
      and tenant_scope.deleted_at is null
      and tenant_scope.status in ('trial', 'active', 'past_due')
      and current_license.status in ('trial', 'active')
      and current_license.starts_at <= current_date
      and (
        current_license.expires_at is null
        or current_license.expires_at >= current_date
      )
  );
$$;

comment on function app_private.tenant_has_operational_license(uuid) is
  'Valida o tenant e sua licenca mais recente antes de liberar operacoes pela RLS.';

create or replace function app_private.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select app_private.is_super_admin()
    or (
      app_private.tenant_has_operational_license(target_tenant_id)
      and (
        exists (
          select 1
          from public.tenant_members member_scope
          where member_scope.tenant_id = target_tenant_id
            and member_scope.user_id = auth.uid()
            and member_scope.status = 'active'
        )
        or exists (
          select 1
          from public.tenants tenant_scope
          where tenant_scope.id = target_tenant_id
            and tenant_scope.owner_id = auth.uid()
            and tenant_scope.deleted_at is null
        )
      )
    );
$$;

create or replace function app_private.is_tenant_owner(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select app_private.is_super_admin()
    or (
      app_private.tenant_has_operational_license(target_tenant_id)
      and (
        exists (
          select 1
          from public.tenants tenant_scope
          where tenant_scope.id = target_tenant_id
            and tenant_scope.owner_id = auth.uid()
            and tenant_scope.deleted_at is null
        )
        or exists (
          select 1
          from public.tenant_members member_scope
          where member_scope.tenant_id = target_tenant_id
            and member_scope.user_id = auth.uid()
            and member_scope.member_role = 'owner'
            and member_scope.status = 'active'
        )
      )
    );
$$;

create or replace function app_private.has_tenant_permission(
  target_tenant_id uuid,
  permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select app_private.is_tenant_owner(target_tenant_id)
    or (
      app_private.tenant_has_operational_license(target_tenant_id)
      and exists (
        select 1
        from public.tenant_members member_scope
        join public.role_permissions role_permission
          on role_permission.role_id = member_scope.role_id
        join public.permissions permission_scope
          on permission_scope.id = role_permission.permission_id
        where member_scope.tenant_id = target_tenant_id
          and member_scope.user_id = auth.uid()
          and member_scope.status = 'active'
          and permission_scope.code = permission_code
      )
    );
$$;

create or replace function app_private.can_access_property(
  target_tenant_id uuid,
  target_property_id uuid,
  permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select exists (
    select 1
    from public.properties property_scope
    where property_scope.id = target_property_id
      and property_scope.tenant_id = target_tenant_id
  )
  and (
    app_private.is_tenant_owner(target_tenant_id)
    or (
      app_private.tenant_has_operational_license(target_tenant_id)
      and exists (
        select 1
        from public.tenant_members member_scope
        join public.role_permissions role_permission
          on role_permission.role_id = member_scope.role_id
        join public.permissions permission_scope
          on permission_scope.id = role_permission.permission_id
        where member_scope.tenant_id = target_tenant_id
          and member_scope.user_id = auth.uid()
          and member_scope.status = 'active'
          and permission_scope.code = permission_code
          and (
            member_scope.property_scope is null
            or cardinality(member_scope.property_scope) = 0
            or target_property_id = any(member_scope.property_scope)
          )
      )
    )
  );
$$;

-- Estes helpers sustentam policies autenticadas; acesso anonimo direto nao e necessario.
revoke all on function app_private.tenant_has_operational_license(uuid) from public, anon;
revoke all on function app_private.is_tenant_member(uuid) from public, anon;
revoke all on function app_private.is_tenant_owner(uuid) from public, anon;
revoke all on function app_private.has_tenant_permission(uuid, text) from public, anon;
revoke all on function app_private.can_access_property(uuid, uuid, text) from public, anon;

grant execute on function app_private.tenant_has_operational_license(uuid)
  to authenticated, service_role;
grant execute on function app_private.is_tenant_member(uuid)
  to authenticated, service_role;
grant execute on function app_private.is_tenant_owner(uuid)
  to authenticated, service_role;
grant execute on function app_private.has_tenant_permission(uuid, text)
  to authenticated, service_role;
grant execute on function app_private.can_access_property(uuid, uuid, text)
  to authenticated, service_role;

-- Search paths fixos evitam que objetos homonimos sejam resolvidos em schemas controlados.
alter function app_private.is_service_role()
  set search_path = pg_catalog;
alter function app_private.set_updated_at()
  set search_path = pg_catalog;
alter function app_private.calendar_block_is_active(text)
  set search_path = pg_catalog;

-- O bucket continua publico para URLs diretas, mas nao permite enumerar os arquivos.
drop policy if exists "property_media_select_public" on storage.objects;
