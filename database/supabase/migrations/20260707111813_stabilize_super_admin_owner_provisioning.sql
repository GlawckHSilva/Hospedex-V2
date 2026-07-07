/*
  Estabiliza a criação de proprietários pelo Super Admin.

  Auth continua fora da transação do Postgres. Depois que o usuário Auth existe,
  esta RPC cria os dados relacionais em uma única transação: profile, tenant,
  vínculo owner, assinatura, licença, feature flags iniciais e auditoria.
*/

create or replace function public.super_admin_provision_owner_tenant(
  p_actor_id uuid,
  p_auth_user_id uuid,
  p_email text,
  p_nome text,
  p_telefone text,
  p_tenant_nome text,
  p_tenant_slug text,
  p_status text,
  p_plano_id uuid,
  p_expira_em date,
  p_limite_propriedades integer,
  p_feature_flag_ids uuid[],
  p_license_key text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  v_tenant_id uuid;
  v_role_id uuid;
  v_subscription_id uuid;
  v_flags_solicitadas integer := coalesce(cardinality(p_feature_flag_ids), 0);
  v_flags_validas integer;
  v_subscription_status text;
  v_license_status text;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and platform_role = 'super_admin'
      and deleted_at is null
  ) then
    raise exception 'Somente Super Admin pode criar proprietários.';
  end if;

  if p_auth_user_id is null then
    raise exception 'Usuário Auth não informado.';
  end if;

  if p_status not in ('trial', 'active', 'past_due', 'suspended', 'cancelled') then
    raise exception 'Status do proprietário inválido.';
  end if;

  if p_limite_propriedades < 1 then
    raise exception 'Informe um limite de casas válido.';
  end if;

  if not exists (
    select 1
    from public.plans
    where id = p_plano_id
      and status <> 'archived'
  ) then
    raise exception 'Plano selecionado não encontrado.';
  end if;

  if exists (
    select 1
    from public.profiles
    where lower(email) = lower(trim(p_email))
      and id <> p_auth_user_id
      and deleted_at is null
  ) then
    raise exception 'Já existe um proprietário com este e-mail.';
  end if;

  if exists (
    select 1
    from public.tenants
    where owner_id = p_auth_user_id
      and deleted_at is null
  ) then
    raise exception 'Este usuário já possui um tenant vinculado.';
  end if;

  select count(*)
    into v_flags_validas
  from public.feature_flags
  where id = any(coalesce(p_feature_flag_ids, array[]::uuid[]));

  if v_flags_validas <> v_flags_solicitadas then
    raise exception 'Feature flag inválida para este tenant.';
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    platform_role
  )
  values (
    p_auth_user_id,
    lower(trim(p_email)),
    nullif(trim(p_nome), ''),
    nullif(trim(coalesce(p_telefone, '')), ''),
    'user'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    platform_role = 'user',
    updated_at = now();

  insert into public.tenants (
    owner_id,
    name,
    slug,
    status
  )
  values (
    p_auth_user_id,
    nullif(trim(p_tenant_nome), ''),
    p_tenant_slug,
    p_status
  )
  returning id into v_tenant_id;

  insert into public.roles (
    tenant_id,
    code,
    name,
    description,
    is_system
  )
  values (
    v_tenant_id,
    'owner',
    'Proprietário',
    'Dono do tenant com acesso administrativo.',
    true
  )
  returning id into v_role_id;

  insert into public.tenant_members (
    tenant_id,
    user_id,
    role_id,
    member_role,
    status,
    invited_by
  )
  values (
    v_tenant_id,
    p_auth_user_id,
    v_role_id,
    'owner',
    case when p_status in ('trial', 'active', 'past_due') then 'active' else 'disabled' end,
    p_actor_id
  );

  v_subscription_status := case
    when p_status = 'trial' then 'trialing'
    when p_status = 'active' then 'active'
    when p_status = 'past_due' then 'past_due'
    when p_status = 'suspended' then 'paused'
    else 'cancelled'
  end;

  insert into public.subscriptions (
    tenant_id,
    owner_id,
    plan_id,
    status,
    current_period_start,
    current_period_end
  )
  values (
    v_tenant_id,
    p_auth_user_id,
    p_plano_id,
    v_subscription_status,
    now(),
    case when p_expira_em is null then null else (p_expira_em + time '23:59:59')::timestamptz end
  )
  returning id into v_subscription_id;

  v_license_status := case
    when p_status = 'trial' then 'trial'
    when p_status in ('active', 'past_due') then 'active'
    when p_status = 'suspended' then 'suspended'
    else 'cancelled'
  end;

  insert into public.licenses (
    tenant_id,
    owner_id,
    subscription_id,
    license_key,
    status,
    expires_at,
    limits
  )
  values (
    v_tenant_id,
    p_auth_user_id,
    v_subscription_id,
    p_license_key,
    v_license_status,
    p_expira_em,
    jsonb_build_object('max_properties', p_limite_propriedades)
  );

  insert into public.tenant_features (
    tenant_id,
    feature_flag_id,
    enabled,
    configured_by
  )
  select
    v_tenant_id,
    feature_flags.id,
    feature_flags.id = any(coalesce(p_feature_flag_ids, array[]::uuid[])),
    p_actor_id
  from public.feature_flags;

  insert into public.audit_logs (
    tenant_id,
    actor_id,
    action,
    entity_table,
    entity_id,
    metadata
  )
  values (
    v_tenant_id,
    p_actor_id,
    'super_admin.owner.created',
    'tenants',
    v_tenant_id,
    jsonb_build_object(
      'owner_id', p_auth_user_id,
      'plan_id', p_plano_id,
      'status', p_status,
      'max_properties', p_limite_propriedades,
      'feature_flags', coalesce(p_feature_flag_ids, array[]::uuid[])
    )
  );

  return jsonb_build_object('tenant_id', v_tenant_id);
end;
$$;

comment on function public.super_admin_provision_owner_tenant(
  uuid, uuid, text, text, text, text, text, text, uuid, date, integer, uuid[], text
) is
  'Cria dados relacionais de um proprietário em transação única após criação do usuário Auth pelo Super Admin.';

revoke all on function public.super_admin_provision_owner_tenant(
  uuid, uuid, text, text, text, text, text, text, uuid, date, integer, uuid[], text
) from public, anon, authenticated;

grant execute on function public.super_admin_provision_owner_tenant(
  uuid, uuid, text, text, text, text, text, text, uuid, date, integer, uuid[], text
) to service_role;

/*
  Módulos, licenças e assinaturas definem o que o tenant pode usar. O owner
  pode visualizar e configurar recursos liberados, mas não pode liberar módulos,
  aumentar limites ou reativar sua própria licença via Data API.
*/

drop policy if exists "tenant_features_manage" on public.tenant_features;
drop policy if exists "tenant_features_manage_super" on public.tenant_features;
create policy "tenant_features_manage_super" on public.tenant_features
for all to authenticated
using (app_private.is_super_admin())
with check (app_private.is_super_admin());

drop policy if exists "subscriptions_manage_owner" on public.subscriptions;
drop policy if exists "subscriptions_manage_super" on public.subscriptions;
create policy "subscriptions_manage_super" on public.subscriptions
for all to authenticated
using (app_private.is_super_admin())
with check (app_private.is_super_admin());

drop policy if exists "licenses_manage_owner" on public.licenses;
drop policy if exists "licenses_manage_super" on public.licenses;
create policy "licenses_manage_super" on public.licenses
for all to authenticated
using (app_private.is_super_admin())
with check (app_private.is_super_admin());

drop policy if exists "tenants_update_owner_or_permission" on public.tenants;
drop policy if exists "tenants_update_super" on public.tenants;
create policy "tenants_update_super" on public.tenants
for update to authenticated
using (app_private.is_super_admin())
with check (app_private.is_super_admin());
