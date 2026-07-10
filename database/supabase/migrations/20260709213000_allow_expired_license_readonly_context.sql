/*
  Corrige o acesso em modo somente leitura para licenca vencida.

  Regra de negocio:
  - profile/tenant/member reais continuam legiveis mesmo com licenca vencida;
  - licenca vencida apos tolerancia nao remove o contexto multi-tenant;
  - operacoes de escrita continuam dependentes de licenca operacional;
  - tenant suspenso, cancelado ou deletado continua sem acesso.
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
    where tenant_scope.id = target_tenant_id
      and tenant_scope.deleted_at is null
      and tenant_scope.status in ('trial', 'active', 'past_due')
      and exists (
        select 1
        from public.licenses license_scope
        where license_scope.tenant_id = tenant_scope.id
          and license_scope.status in ('trial', 'active')
          and license_scope.starts_at <= current_date
          and (
            license_scope.expires_at is null
            or license_scope.expires_at >= current_date - 5
          )
      )
  );
$$;

comment on function app_private.tenant_has_operational_license(uuid) is
  'Valida tenant e licenca vigente ou dentro da tolerancia de 5 dias para operacoes de escrita.';

create or replace function app_private.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select app_private.is_super_admin()
    or exists (
      select 1
      from public.tenants tenant_scope
      where tenant_scope.id = target_tenant_id
        and tenant_scope.deleted_at is null
        and tenant_scope.status in ('trial', 'active', 'past_due')
        and (
          tenant_scope.owner_id = auth.uid()
          or exists (
            select 1
            from public.tenant_members member_scope
            where member_scope.tenant_id = target_tenant_id
              and member_scope.user_id = auth.uid()
              and member_scope.status = 'active'
          )
        )
    );
$$;

comment on function app_private.is_tenant_member(uuid) is
  'Valida apenas vinculo real com tenant acessivel. A licenca vencida nao esconde leitura do proprio contexto.';

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
            and tenant_scope.status in ('trial', 'active', 'past_due')
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

comment on function app_private.is_tenant_owner(uuid) is
  'Valida owner para escrita. Depois da tolerancia da licenca, o owner continua lendo, mas nao escrevendo.';

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

comment on function app_private.has_tenant_permission(uuid, text) is
  'Permissoes de escrita exigem vinculo, permissao e licenca operacional ou dentro da tolerancia.';

revoke all on function app_private.tenant_has_operational_license(uuid) from public, anon;
revoke all on function app_private.is_tenant_member(uuid) from public, anon;
revoke all on function app_private.is_tenant_owner(uuid) from public, anon;
revoke all on function app_private.has_tenant_permission(uuid, text) from public, anon;

grant execute on function app_private.tenant_has_operational_license(uuid)
  to authenticated, service_role;
grant execute on function app_private.is_tenant_member(uuid)
  to authenticated, service_role;
grant execute on function app_private.is_tenant_owner(uuid)
  to authenticated, service_role;
grant execute on function app_private.has_tenant_permission(uuid, text)
  to authenticated, service_role;
