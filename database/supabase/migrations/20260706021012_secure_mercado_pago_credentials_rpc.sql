/*
  RPCs administrativas para credenciais Mercado Pago.

  O schema app_private nao deve ser exposto na Data API. Estas funcoes ficam no
  schema public apenas para o backend server-side com service_role acessar a
  tabela privada sem abrir acesso para anon/authenticated.
*/

create or replace function public.admin_get_mercado_pago_credential(
  p_tenant_id uuid
)
returns table (
  access_token_encrypted text,
  access_token_last4 text,
  environment text,
  public_key text,
  webhook_secret_encrypted text,
  webhook_secret_last4 text
)
language sql
security definer
set search_path = pg_catalog, public, app_private
as $$
  select
    c.access_token_encrypted,
    c.access_token_last4,
    c.environment,
    c.public_key,
    c.webhook_secret_encrypted,
    c.webhook_secret_last4
  from app_private.tenant_payment_provider_credentials c
  where c.tenant_id = p_tenant_id
    and c.provider = 'mercado_pago'
  limit 1;
$$;

create or replace function public.admin_upsert_mercado_pago_credential(
  p_tenant_id uuid,
  p_owner_id uuid,
  p_environment text,
  p_public_key text,
  p_access_token_encrypted text,
  p_access_token_last4 text,
  p_webhook_secret_encrypted text,
  p_webhook_secret_last4 text,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
begin
  insert into app_private.tenant_payment_provider_credentials (
    tenant_id,
    owner_id,
    provider,
    environment,
    public_key,
    access_token_encrypted,
    access_token_last4,
    webhook_secret_encrypted,
    webhook_secret_last4,
    connected_at,
    created_by,
    updated_by
  ) values (
    p_tenant_id,
    p_owner_id,
    'mercado_pago',
    p_environment,
    p_public_key,
    p_access_token_encrypted,
    p_access_token_last4,
    p_webhook_secret_encrypted,
    p_webhook_secret_last4,
    now(),
    p_user_id,
    p_user_id
  )
  on conflict (tenant_id, provider)
  do update set
    owner_id = excluded.owner_id,
    environment = excluded.environment,
    public_key = excluded.public_key,
    access_token_encrypted = excluded.access_token_encrypted,
    access_token_last4 = excluded.access_token_last4,
    webhook_secret_encrypted = coalesce(
      excluded.webhook_secret_encrypted,
      app_private.tenant_payment_provider_credentials.webhook_secret_encrypted
    ),
    webhook_secret_last4 = coalesce(
      excluded.webhook_secret_last4,
      app_private.tenant_payment_provider_credentials.webhook_secret_last4
    ),
    connected_at = now(),
    updated_by = excluded.updated_by,
    updated_at = now();
end;
$$;

create or replace function public.admin_update_mercado_pago_webhook_secret(
  p_tenant_id uuid,
  p_webhook_secret_encrypted text,
  p_webhook_secret_last4 text,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
begin
  update app_private.tenant_payment_provider_credentials
     set webhook_secret_encrypted = p_webhook_secret_encrypted,
         webhook_secret_last4 = p_webhook_secret_last4,
         updated_by = p_user_id,
         updated_at = now()
   where tenant_id = p_tenant_id
     and provider = 'mercado_pago';

  if not found then
    raise exception 'Credencial Mercado Pago do tenant nao encontrada.';
  end if;
end;
$$;

create or replace function public.admin_clear_mercado_pago_webhook_secret(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
begin
  update app_private.tenant_payment_provider_credentials
     set webhook_secret_encrypted = null,
         webhook_secret_last4 = null,
         updated_at = now()
   where tenant_id = p_tenant_id
     and provider = 'mercado_pago';
end;
$$;

create or replace function public.admin_delete_mercado_pago_credential(
  p_tenant_id uuid
)
returns void
language sql
security definer
set search_path = pg_catalog, public, app_private
as $$
  delete from app_private.tenant_payment_provider_credentials
  where tenant_id = p_tenant_id
    and provider = 'mercado_pago';
$$;

comment on function public.admin_get_mercado_pago_credential(uuid) is
  'Le credenciais criptografadas Mercado Pago para uso exclusivo do backend com service_role.';
comment on function public.admin_upsert_mercado_pago_credential(uuid, uuid, text, text, text, text, text, text, uuid) is
  'Grava credenciais Mercado Pago criptografadas sem expor app_private na Data API.';
comment on function public.admin_update_mercado_pago_webhook_secret(uuid, text, text, uuid) is
  'Atualiza somente o Webhook Secret Mercado Pago criptografado do tenant.';
comment on function public.admin_clear_mercado_pago_webhook_secret(uuid) is
  'Remove somente o Webhook Secret Mercado Pago do tenant.';
comment on function public.admin_delete_mercado_pago_credential(uuid) is
  'Remove a credencial Mercado Pago completa do tenant.';

revoke all on function public.admin_get_mercado_pago_credential(uuid)
  from public, anon, authenticated;
revoke all on function public.admin_upsert_mercado_pago_credential(uuid, uuid, text, text, text, text, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.admin_update_mercado_pago_webhook_secret(uuid, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.admin_clear_mercado_pago_webhook_secret(uuid)
  from public, anon, authenticated;
revoke all on function public.admin_delete_mercado_pago_credential(uuid)
  from public, anon, authenticated;

grant execute on function public.admin_get_mercado_pago_credential(uuid)
  to service_role;
grant execute on function public.admin_upsert_mercado_pago_credential(uuid, uuid, text, text, text, text, text, text, uuid)
  to service_role;
grant execute on function public.admin_update_mercado_pago_webhook_secret(uuid, text, text, uuid)
  to service_role;
grant execute on function public.admin_clear_mercado_pago_webhook_secret(uuid)
  to service_role;
grant execute on function public.admin_delete_mercado_pago_credential(uuid)
  to service_role;
