/*
  Provisiona o trial publico de proprietarios em uma unica transacao.

  O usuario Auth e criado pela Server Action. Esta RPC, exclusiva da service
  role, cria os dados relacionais sem liberar escrita anonima nas tabelas.
*/

create or replace function public.provision_public_owner_trial(
  p_auth_user_id uuid,
  p_email text,
  p_nome text,
  p_telefone text,
  p_tenant_nome text,
  p_tenant_slug text,
  p_cidade text,
  p_estado text,
  p_plano_codigo text,
  p_ciclo_cobranca text,
  p_forma_pagamento text,
  p_quantidade_estimada integer,
  p_license_key text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  v_plan public.plans%rowtype;
  v_tenant_id uuid;
  v_role_id uuid;
  v_subscription_id uuid;
  v_license_id uuid;
  v_trial_fim timestamptz := now() + interval '30 days';
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'Provisionamento publico indisponivel para esta sessao.';
  end if;

  if p_auth_user_id is null then
    raise exception 'Usuario Auth nao informado.';
  end if;

  select *
    into v_plan
  from public.plans
  where code = lower(trim(p_plano_codigo))
    and status = 'active';

  if not found then
    raise exception 'Plano selecionado nao encontrado.';
  end if;

  if p_ciclo_cobranca not in ('monthly', 'annual') then
    raise exception 'Ciclo de cobranca invalido.';
  end if;

  if p_forma_pagamento not in ('pix', 'credit_card', 'debit_card') then
    raise exception 'Forma de pagamento invalida.';
  end if;

  if p_quantidade_estimada < 1 or p_quantidade_estimada > v_plan.max_properties then
    raise exception 'Quantidade de casas acima do limite do plano.';
  end if;

  if exists (
    select 1 from public.profiles
    where lower(email) = lower(trim(p_email))
      and deleted_at is null
  ) then
    raise exception 'Ja existe uma conta com este e-mail.';
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    city,
    state,
    platform_role
  ) values (
    p_auth_user_id,
    lower(trim(p_email)),
    trim(p_nome),
    trim(p_telefone),
    trim(p_cidade),
    upper(trim(p_estado)),
    'user'
  );

  insert into public.tenants (owner_id, name, slug, status)
  values (p_auth_user_id, trim(p_tenant_nome), p_tenant_slug, 'trial')
  returning id into v_tenant_id;

  insert into public.roles (tenant_id, code, name, description, is_system)
  values (
    v_tenant_id,
    'owner',
    'Proprietario',
    'Dono do tenant com acesso administrativo.',
    true
  )
  returning id into v_role_id;

  insert into public.tenant_members (
    tenant_id,
    user_id,
    role_id,
    member_role,
    status
  ) values (
    v_tenant_id,
    p_auth_user_id,
    v_role_id,
    'owner',
    'active'
  );

  insert into public.subscriptions (
    tenant_id,
    owner_id,
    plan_id,
    status,
    current_period_start,
    current_period_end
  ) values (
    v_tenant_id,
    p_auth_user_id,
    v_plan.id,
    'trialing',
    now(),
    v_trial_fim
  )
  returning id into v_subscription_id;

  insert into public.licenses (
    tenant_id,
    owner_id,
    subscription_id,
    license_key,
    status,
    starts_at,
    expires_at,
    limits
  ) values (
    v_tenant_id,
    p_auth_user_id,
    v_subscription_id,
    p_license_key,
    'trial',
    current_date,
    current_date + 30,
    jsonb_build_object('max_properties', v_plan.max_properties)
  )
  returning id into v_license_id;

  -- O plano define os modulos iniciais. O proprietario nao pode liberar
  -- recursos pagos para si mesmo depois do provisionamento.
  insert into public.tenant_features (
    tenant_id,
    feature_flag_id,
    enabled,
    configured_by
  )
  select
    v_tenant_id,
    feature_flags.id,
    coalesce(plan_features.enabled, false),
    p_auth_user_id
  from public.feature_flags
  left join public.plan_features
    on plan_features.feature_flag_id = feature_flags.id
   and plan_features.plan_id = v_plan.id;

  -- A preferencia nao contem credenciais nem dados de cartao. Ela apenas
  -- prepara a futura contratacao da assinatura da plataforma.
  insert into public.tenant_settings (
    tenant_id,
    owner_id,
    phone,
    whatsapp,
    email,
    city,
    state,
    metadata
  ) values (
    v_tenant_id,
    p_auth_user_id,
    trim(p_telefone),
    trim(p_telefone),
    lower(trim(p_email)),
    trim(p_cidade),
    upper(trim(p_estado)),
    jsonb_build_object(
      'platform_subscription', jsonb_build_object(
        'billing_cycle', p_ciclo_cobranca,
        'payment_method_preference', p_forma_pagamento,
        'estimated_properties', p_quantidade_estimada,
        'trial_started_at', now(),
        'trial_ends_at', v_trial_fim
      )
    )
  );

  insert into public.audit_logs (
    tenant_id,
    actor_id,
    action,
    entity_table,
    entity_id,
    metadata
  ) values (
    v_tenant_id,
    p_auth_user_id,
    'public.owner.trial.started',
    'subscriptions',
    v_subscription_id,
    jsonb_build_object(
      'plan_id', v_plan.id,
      'plan_code', v_plan.code,
      'billing_cycle', p_ciclo_cobranca,
      'max_properties', v_plan.max_properties,
      'trial_ends_at', v_trial_fim
    )
  );

  return jsonb_build_object(
    'tenant_id', v_tenant_id,
    'subscription_id', v_subscription_id,
    'license_id', v_license_id,
    'trial_ends_at', v_trial_fim
  );
end;
$$;

comment on function public.provision_public_owner_trial(
  uuid, text, text, text, text, text, text, text, text, text, text, integer, text
) is
  'Cria profile, tenant, owner, assinatura e licenca trial apos o Auth ser criado no servidor.';

revoke all on function public.provision_public_owner_trial(
  uuid, text, text, text, text, text, text, text, text, text, text, integer, text
) from public, anon, authenticated;

grant execute on function public.provision_public_owner_trial(
  uuid, text, text, text, text, text, text, text, text, text, text, integer, text
) to service_role;
