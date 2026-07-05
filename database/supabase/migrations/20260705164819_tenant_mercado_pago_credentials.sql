/*
  Credenciais Mercado Pago por tenant.

  O access token do proprietario e informado no Hospedex, mas nunca fica em
  tabela publica nem e enviado ao navegador. O app criptografa o segredo no
  servidor e grava somente no schema privado para gerar cobrancas do tenant.
*/

create table if not exists app_private.tenant_payment_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null,
  environment text not null default 'sandbox',
  public_key text,
  access_token_encrypted text not null,
  access_token_last4 text,
  connected_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_payment_provider_credentials_provider_check
    check (provider in ('mercado_pago')),
  constraint tenant_payment_provider_credentials_environment_check
    check (environment in ('sandbox', 'production')),
  unique (tenant_id, provider)
);

comment on table app_private.tenant_payment_provider_credentials is
  'Credenciais criptografadas de provedores de pagamento por tenant. Nao expor via Data API.';
comment on column app_private.tenant_payment_provider_credentials.access_token_encrypted is
  'Access token criptografado pelo servidor com HOSPEDEX_CREDENTIALS_SECRET.';
comment on column app_private.tenant_payment_provider_credentials.access_token_last4 is
  'Sufixo nao sensivel usado somente para o proprietario reconhecer qual token esta conectado.';

drop trigger if exists set_tenant_payment_provider_credentials_updated_at
on app_private.tenant_payment_provider_credentials;
create trigger set_tenant_payment_provider_credentials_updated_at
before update on app_private.tenant_payment_provider_credentials
for each row execute function app_private.set_updated_at();

revoke all on app_private.tenant_payment_provider_credentials from public;
revoke all on app_private.tenant_payment_provider_credentials from anon;
revoke all on app_private.tenant_payment_provider_credentials from authenticated;
grant usage on schema app_private to service_role;
grant all on app_private.tenant_payment_provider_credentials to service_role;
