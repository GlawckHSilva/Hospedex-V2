/*
  Alinha a validacao operacional de licenca usada pela RLS com o Gerenciamento.

  O card "Casas X/Y" ja considera uma licenca ativa/trial valida para calcular
  limites. A RLS nao pode bloquear o cadastro apenas porque existe um registro
  de licenca mais recente inativo quando ainda ha licenca operacional vigente.
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
            or license_scope.expires_at >= current_date
          )
      )
  );
$$;

comment on function app_private.tenant_has_operational_license(uuid) is
  'Valida tenant e qualquer licenca operacional vigente, alinhando RLS, limite de casas e Super Admin.';

revoke all on function app_private.tenant_has_operational_license(uuid) from public, anon;
grant execute on function app_private.tenant_has_operational_license(uuid)
  to authenticated, service_role;
