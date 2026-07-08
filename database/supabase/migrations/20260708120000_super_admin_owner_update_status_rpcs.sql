/*
  Complementa a estabilizacao do Super Admin para proprietarios.

  A migration anterior tornou a criacao transacional. Esta etapa aplica a
  mesma regra para edicao, bloqueio/reativacao e liberacao de modulos por
  tenant, evitando que tenant, licenca, assinatura e feature flags fiquem em
  estados diferentes.
*/

create or replace function public.super_admin_update_owner_tenant(
  p_actor_id uuid,
  p_owner_id uuid,
  p_tenant_id uuid,
  p_email text,
  p_nome text,
  p_telefone text,
  p_tenant_nome text,
  p_status text,
  p_plano_id uuid,
  p_expira_em date,
  p_limite_propriedades integer,
  p_feature_flag_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  v_subscription_id uuid;
  v_license_id uuid;
  v_role_id uuid;
  v_flags_solicitadas integer := coalesce(cardinality(p_feature_flag_ids), 0);
  v_flags_validas integer;
  v_email_atual text;
  v_subscription_status text;
  v_license_status text;
  v_member_status text;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and platform_role = 'super_admin'
      and deleted_at is null
  ) then
    raise exception 'Somente Super Admin pode atualizar proprietarios.';
  end if;

  if p_status not in ('trial', 'active', 'past_due', 'suspended', 'cancelled') then
    raise exception 'Status do proprietario invalido.';
  end if;

  if p_limite_propriedades < 1 then
    raise exception 'Informe um limite de casas valido.';
  end if;

  if not exists (
    select 1
    from public.tenants
    where id = p_tenant_id
      and owner_id = p_owner_id
      and deleted_at is null
  ) then
    raise exception 'Tenant do proprietario nao encontrado.';
  end if;

  select lower(email)
    into v_email_atual
  from public.profiles
  where id = p_owner_id
    and deleted_at is null;

  if v_email_atual is null then
    raise exception 'Profile do proprietario nao encontrado.';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = p_owner_id
      and platform_role = 'super_admin'
  ) then
    raise exception 'Super Admin nao pode ser vinculado como proprietario.';
  end if;

  /*
    O e-mail de login pertence ao Supabase Auth. Alterar apenas profiles.email
    criaria divergencia entre login e cadastro, entao esta RPC bloqueia troca
    silenciosa ate existir fluxo especifico para atualizar Auth com seguranca.
  */
  if v_email_atual <> lower(trim(p_email)) then
    raise exception 'Nao altere o e-mail do proprietario por esta tela.';
  end if;

  if not exists (
    select 1
    from public.plans
    where id = p_plano_id
      and status <> 'archived'
  ) then
    raise exception 'Plano selecionado nao encontrado.';
  end if;

  select count(*)
    into v_flags_validas
  from public.feature_flags
  where id = any(coalesce(p_feature_flag_ids, array[]::uuid[]));

  if v_flags_validas <> v_flags_solicitadas then
    raise exception 'Feature flag invalida para este tenant.';
  end if;

  v_subscription_status := case
    when p_status = 'trial' then 'trialing'
    when p_status = 'active' then 'active'
    when p_status = 'past_due' then 'past_due'
    when p_status = 'suspended' then 'paused'
    else 'cancelled'
  end;

  v_license_status := case
    when p_status = 'trial' then 'trial'
    when p_status in ('active', 'past_due') then 'active'
    when p_status = 'suspended' then 'suspended'
    else 'cancelled'
  end;

  v_member_status := case
    when p_status in ('trial', 'active', 'past_due') then 'active'
    else 'disabled'
  end;

  update public.profiles
     set full_name = nullif(trim(p_nome), ''),
         phone = nullif(trim(coalesce(p_telefone, '')), ''),
         platform_role = 'user',
         updated_at = now()
   where id = p_owner_id;

  update public.tenants
     set name = nullif(trim(p_tenant_nome), ''),
         status = p_status,
         updated_at = now()
   where id = p_tenant_id
     and owner_id = p_owner_id;

  select id
    into v_role_id
  from public.roles
  where tenant_id = p_tenant_id
    and code = 'owner'
  limit 1;

  if v_role_id is null then
    insert into public.roles (
      tenant_id,
      code,
      name,
      description,
      is_system
    )
    values (
      p_tenant_id,
      'owner',
      'Proprietario',
      'Dono do tenant com acesso administrativo.',
      true
    )
    returning id into v_role_id;
  end if;

  insert into public.tenant_members (
    tenant_id,
    user_id,
    role_id,
    member_role,
    status,
    invited_by
  )
  values (
    p_tenant_id,
    p_owner_id,
    v_role_id,
    'owner',
    v_member_status,
    p_actor_id
  )
  on conflict (tenant_id, user_id) do update set
    role_id = excluded.role_id,
    member_role = 'owner',
    status = excluded.status,
    invited_by = excluded.invited_by,
    updated_at = now();

  select id
    into v_subscription_id
  from public.subscriptions
  where tenant_id = p_tenant_id
  order by created_at desc
  limit 1;

  if v_subscription_id is null then
    insert into public.subscriptions (
      tenant_id,
      owner_id,
      plan_id,
      status,
      current_period_start,
      current_period_end
    )
    values (
      p_tenant_id,
      p_owner_id,
      p_plano_id,
      v_subscription_status,
      now(),
      case when p_expira_em is null then null else (p_expira_em + time '23:59:59')::timestamptz end
    )
    returning id into v_subscription_id;
  else
    update public.subscriptions
       set owner_id = p_owner_id,
           plan_id = p_plano_id,
           status = v_subscription_status,
           current_period_start = coalesce(current_period_start, now()),
           current_period_end = case when p_expira_em is null then null else (p_expira_em + time '23:59:59')::timestamptz end,
           updated_at = now()
     where id = v_subscription_id;
  end if;

  select id
    into v_license_id
  from public.licenses
  where tenant_id = p_tenant_id
  order by created_at desc
  limit 1;

  if v_license_id is null then
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
      p_tenant_id,
      p_owner_id,
      v_subscription_id,
      'HSPX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      v_license_status,
      p_expira_em,
      jsonb_build_object('max_properties', p_limite_propriedades)
    );
  else
    update public.licenses
       set owner_id = p_owner_id,
           subscription_id = v_subscription_id,
           status = v_license_status,
           expires_at = p_expira_em,
           limits = jsonb_build_object('max_properties', p_limite_propriedades),
           updated_at = now()
     where id = v_license_id;
  end if;

  insert into public.tenant_features (
    tenant_id,
    feature_flag_id,
    enabled,
    configured_by
  )
  select
    p_tenant_id,
    feature_flags.id,
    feature_flags.id = any(coalesce(p_feature_flag_ids, array[]::uuid[])),
    p_actor_id
  from public.feature_flags
  on conflict (tenant_id, feature_flag_id) do update set
    enabled = excluded.enabled,
    configured_by = excluded.configured_by,
    updated_at = now();

  insert into public.audit_logs (
    tenant_id,
    actor_id,
    action,
    entity_table,
    entity_id,
    metadata
  )
  values (
    p_tenant_id,
    p_actor_id,
    'super_admin.owner.updated',
    'tenants',
    p_tenant_id,
    jsonb_build_object(
      'owner_id', p_owner_id,
      'plan_id', p_plano_id,
      'status', p_status,
      'max_properties', p_limite_propriedades,
      'feature_flags', coalesce(p_feature_flag_ids, array[]::uuid[])
    )
  );
end;
$$;

create or replace function public.super_admin_set_owner_status(
  p_actor_id uuid,
  p_owner_id uuid,
  p_tenant_id uuid,
  p_acao text
)
returns void
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  v_status_anterior text;
  v_status_destino text;
  v_member_status text;
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
    raise exception 'Somente Super Admin pode alterar status de proprietarios.';
  end if;

  if p_acao not in ('ativar', 'bloquear') then
    raise exception 'Acao administrativa invalida.';
  end if;

  select status
    into v_status_anterior
  from public.tenants
  where id = p_tenant_id
    and owner_id = p_owner_id
    and deleted_at is null;

  if v_status_anterior is null then
    raise exception 'Tenant do proprietario nao encontrado.';
  end if;

  v_status_destino := case when p_acao = 'ativar' then 'active' else 'suspended' end;
  v_member_status := case when v_status_destino = 'active' then 'active' else 'disabled' end;
  v_subscription_status := case when v_status_destino = 'active' then 'active' else 'paused' end;
  v_license_status := case when v_status_destino = 'active' then 'active' else 'suspended' end;

  update public.tenants
     set status = v_status_destino,
         updated_at = now()
   where id = p_tenant_id
     and owner_id = p_owner_id;

  update public.tenant_members
     set status = v_member_status,
         updated_at = now()
   where tenant_id = p_tenant_id
     and user_id = p_owner_id
     and member_role = 'owner';

  update public.subscriptions
     set status = v_subscription_status,
         updated_at = now()
   where id = (
     select id
     from public.subscriptions
     where tenant_id = p_tenant_id
     order by created_at desc
     limit 1
   );

  update public.licenses
     set status = v_license_status,
         updated_at = now()
   where id = (
     select id
     from public.licenses
     where tenant_id = p_tenant_id
     order by created_at desc
     limit 1
   );

  insert into public.audit_logs (
    tenant_id,
    actor_id,
    action,
    entity_table,
    entity_id,
    metadata
  )
  values (
    p_tenant_id,
    p_actor_id,
    'super_admin.owner.' || p_acao,
    'tenants',
    p_tenant_id,
    jsonb_build_object(
      'owner_id', p_owner_id,
      'status_anterior', v_status_anterior,
      'status_destino', v_status_destino
    )
  );
end;
$$;

create or replace function public.super_admin_set_tenant_feature(
  p_actor_id uuid,
  p_owner_id uuid,
  p_tenant_id uuid,
  p_feature_flag_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security invoker
set search_path = public, app_private
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and platform_role = 'super_admin'
      and deleted_at is null
  ) then
    raise exception 'Somente Super Admin pode liberar modulos por tenant.';
  end if;

  if not exists (
    select 1
    from public.tenants
    where id = p_tenant_id
      and owner_id = p_owner_id
      and deleted_at is null
  ) then
    raise exception 'Tenant do proprietario nao encontrado.';
  end if;

  if not exists (
    select 1
    from public.feature_flags
    where id = p_feature_flag_id
  ) then
    raise exception 'Feature flag invalida para este tenant.';
  end if;

  /*
    tenant_features representa a liberacao administrativa do modulo para o
    tenant. Por isso a escrita fica centralizada nesta RPC de Super Admin.
  */
  insert into public.tenant_features (
    tenant_id,
    feature_flag_id,
    enabled,
    configured_by
  )
  values (
    p_tenant_id,
    p_feature_flag_id,
    p_enabled,
    p_actor_id
  )
  on conflict (tenant_id, feature_flag_id) do update set
    enabled = excluded.enabled,
    configured_by = excluded.configured_by,
    updated_at = now();

  insert into public.audit_logs (
    tenant_id,
    actor_id,
    action,
    entity_table,
    entity_id,
    metadata
  )
  values (
    p_tenant_id,
    p_actor_id,
    case when p_enabled then 'super_admin.module.enabled' else 'super_admin.module.disabled' end,
    'tenants',
    p_tenant_id,
    jsonb_build_object(
      'owner_id', p_owner_id,
      'feature_flag_id', p_feature_flag_id,
      'enabled', p_enabled
    )
  );
end;
$$;

revoke all on function public.super_admin_update_owner_tenant(
  uuid, uuid, uuid, text, text, text, text, text, uuid, date, integer, uuid[]
) from public, anon, authenticated;

revoke all on function public.super_admin_set_owner_status(
  uuid, uuid, uuid, text
) from public, anon, authenticated;

revoke all on function public.super_admin_set_tenant_feature(
  uuid, uuid, uuid, uuid, boolean
) from public, anon, authenticated;

grant execute on function public.super_admin_update_owner_tenant(
  uuid, uuid, uuid, text, text, text, text, text, uuid, date, integer, uuid[]
) to service_role;

grant execute on function public.super_admin_set_owner_status(
  uuid, uuid, uuid, text
) to service_role;

grant execute on function public.super_admin_set_tenant_feature(
  uuid, uuid, uuid, uuid, boolean
) to service_role;
