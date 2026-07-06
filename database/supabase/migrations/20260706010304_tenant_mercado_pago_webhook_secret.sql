/*
  Webhook Secret Mercado Pago por tenant.

  Cada proprietario pode usar uma aplicacao Mercado Pago diferente. Por isso,
  a assinatura do webhook tambem precisa ficar isolada por tenant e protegida
  com a mesma criptografia usada no Access Token.
*/

alter table app_private.tenant_payment_provider_credentials
  add column if not exists webhook_secret_encrypted text,
  add column if not exists webhook_secret_last4 text;

comment on column app_private.tenant_payment_provider_credentials.webhook_secret_encrypted is
  'Webhook Secret Mercado Pago criptografado pelo servidor com HOSPEDEX_CREDENTIALS_SECRET.';

comment on column app_private.tenant_payment_provider_credentials.webhook_secret_last4 is
  'Sufixo nao sensivel usado apenas para indicar ao proprietario qual webhook secret esta conectado.';
