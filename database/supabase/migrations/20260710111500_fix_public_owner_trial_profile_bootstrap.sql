/*
  O trigger de auth cria profiles antes do provisionamento. Este wrapper remove
  somente esse profile inicial e o recria dentro da mesma transacao da RPC,
  evitando conflito de chave sem deixar cadastro parcial.
*/

alter function public.provision_public_owner_trial(
  uuid, text, text, text, text, text, text, text, text, text, text, integer, text
) rename to provision_public_owner_trial_internal;

create function public.provision_public_owner_trial(
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
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'Provisionamento publico indisponivel para esta sessao.';
  end if;

  -- Somente o profile bootstrap do proprio Auth e removido. Se ja houver tenant,
  -- as FKs impedem a exclusao e preservam a conta existente.
  delete from public.profiles
  where id = p_auth_user_id
    and lower(email) = lower(trim(p_email))
    and deleted_at is null;

  return public.provision_public_owner_trial_internal(
    p_auth_user_id,
    p_email,
    p_nome,
    p_telefone,
    p_tenant_nome,
    p_tenant_slug,
    p_cidade,
    p_estado,
    p_plano_codigo,
    p_ciclo_cobranca,
    p_forma_pagamento,
    p_quantidade_estimada,
    p_license_key
  );
end;
$$;

comment on function public.provision_public_owner_trial(
  uuid, text, text, text, text, text, text, text, text, text, text, integer, text
) is
  'Compatibiliza o profile criado pelo trigger de Auth com o provisionamento transacional do trial.';

revoke all on function public.provision_public_owner_trial(
  uuid, text, text, text, text, text, text, text, text, text, text, integer, text
) from public, anon, authenticated;

grant execute on function public.provision_public_owner_trial(
  uuid, text, text, text, text, text, text, text, text, text, text, integer, text
) to service_role;

revoke all on function public.provision_public_owner_trial_internal(
  uuid, text, text, text, text, text, text, text, text, text, text, integer, text
) from public, anon, authenticated;

grant execute on function public.provision_public_owner_trial_internal(
  uuid, text, text, text, text, text, text, text, text, text, text, integer, text
) to service_role;
