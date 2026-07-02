/*
  Logs de entrega de e-mail.

  Esta tabela registra tentativas de envio feitas pelo módulo de Comunicação,
  sem armazenar segredos do provedor. O isolamento é por tenant_id e a RLS
  permite que o proprietário acompanhe apenas os logs do próprio tenant.
*/

create table if not exists public.email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  audience text not null check (audience in ('guest', 'owner')),
  template_key text,
  event_type text not null,
  reference_id uuid,
  recipient_email text not null,
  subject text not null,
  status text not null check (
    status in ('test', 'pending', 'sent', 'failed', 'skipped', 'not_configured')
  ),
  provider text not null default 'resend' check (provider in ('resend')),
  provider_message_id text,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  failed_at timestamptz
);

create index if not exists email_delivery_logs_tenant_created_idx
  on public.email_delivery_logs (tenant_id, created_at desc);

create index if not exists email_delivery_logs_tenant_status_idx
  on public.email_delivery_logs (tenant_id, status, created_at desc);

alter table public.email_delivery_logs enable row level security;

drop policy if exists "email_delivery_logs_select" on public.email_delivery_logs;
drop policy if exists "email_delivery_logs_insert" on public.email_delivery_logs;

create policy "email_delivery_logs_select" on public.email_delivery_logs
for select to authenticated
using (
  app_private.is_tenant_owner(tenant_id)
  or app_private.has_tenant_permission(tenant_id, 'integrations.read')
  or app_private.has_tenant_permission(tenant_id, 'integrations.manage')
);

create policy "email_delivery_logs_insert" on public.email_delivery_logs
for insert to authenticated
with check (
  app_private.is_tenant_owner(tenant_id)
  or app_private.has_tenant_permission(tenant_id, 'integrations.manage')
);

grant select, insert on public.email_delivery_logs to authenticated;
grant all on public.email_delivery_logs to service_role;

comment on table public.email_delivery_logs is
  'Logs de envio de e-mails por tenant, incluindo testes via Resend.';
comment on column public.email_delivery_logs.tenant_id is
  'Tenant dono do log; garante isolamento multi-tenant da comunicacao.';
comment on column public.email_delivery_logs.payload is
  'Metadados nao sensiveis do envio. Nunca armazenar RESEND_API_KEY ou segredo.';
comment on policy "email_delivery_logs_select" on public.email_delivery_logs is
  'Proprietarios e usuarios com permissao de integracoes podem visualizar logs do proprio tenant.';

notify pgrst, 'reload schema';
