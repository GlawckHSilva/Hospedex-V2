/*
  Base de cobranca da assinatura Hospedex.

  Estas tabelas pertencem a plataforma, nao ao fluxo de reservas. Elas nao
  reutilizam reservation_charges, reservation_payments nem transactions porque a
  mensalidade do proprietario deve ser cobrada com credenciais globais do
  Hospedex, separadas do Mercado Pago configurado por cada tenant.
*/

create table public.platform_subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  license_id uuid references public.licenses(id) on delete set null,
  plan_id uuid not null references public.plans(id) on delete restrict,
  billing_cycle text not null
    check (billing_cycle in ('monthly', 'annual')),
  amount numeric(12, 2) not null
    check (amount > 0),
  currency char(3) not null default 'BRL',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'canceled', 'expired', 'refunded')),
  due_date date not null,
  period_start date not null,
  period_end date not null,
  external_reference text not null unique,
  provider text
    check (provider is null or provider in ('mercado_pago')),
  provider_preference_id text,
  provider_payment_id text,
  checkout_url text,
  paid_at timestamptz,
  canceled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end > period_start),
  check (paid_at is null or status in ('paid', 'refunded')),
  check (canceled_at is null or status in ('canceled', 'expired'))
);

create table public.platform_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.platform_subscription_invoices(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12, 2) not null
    check (amount > 0),
  currency char(3) not null default 'BRL',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'canceled', 'refunded')),
  provider text not null
    check (provider in ('mercado_pago')),
  provider_payment_id text,
  provider_preference_id text,
  payment_method text,
  paid_at timestamptz,
  raw_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id),
  check (paid_at is null or status in ('approved', 'refunded'))
);

create table public.platform_payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null
    check (provider in ('mercado_pago')),
  event_id text not null,
  event_type text,
  action text,
  resource_id text,
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'failed')),
  invoice_id uuid references public.platform_subscription_invoices(id) on delete set null,
  payment_id uuid references public.platform_subscription_payments(id) on delete set null,
  processed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

comment on table public.platform_subscription_invoices is
  'Cobrancas da assinatura Hospedex emitidas pela plataforma para tenants/proprietarios. Nao usar para reservas.';
comment on table public.platform_subscription_payments is
  'Pagamentos recebidos da assinatura Hospedex. Separado de reservation_payments para nao misturar dinheiro da plataforma com dinheiro do proprietario.';
comment on table public.platform_payment_events is
  'Eventos de provedor da cobranca da plataforma usados para idempotencia e auditoria futura do webhook.';
comment on column public.platform_subscription_invoices.external_reference is
  'Referencia unica da cobranca da plataforma enviada ao provedor. Nao contem segredo.';
comment on column public.platform_payment_events.metadata is
  'Metadados sanitizados do evento. Nao armazenar tokens, headers sensiveis ou payload completo sem filtro.';

create index platform_subscription_invoices_tenant_status_idx
  on public.platform_subscription_invoices (tenant_id, status, due_date desc);
create index platform_subscription_invoices_subscription_idx
  on public.platform_subscription_invoices (subscription_id, period_start desc);
create index platform_subscription_payments_invoice_idx
  on public.platform_subscription_payments (invoice_id, status);
create index platform_subscription_payments_tenant_idx
  on public.platform_subscription_payments (tenant_id, created_at desc);
create index platform_payment_events_invoice_idx
  on public.platform_payment_events (invoice_id, created_at desc);
create index platform_payment_events_status_idx
  on public.platform_payment_events (provider, status, created_at desc);

drop trigger if exists set_platform_subscription_invoices_updated_at
on public.platform_subscription_invoices;
create trigger set_platform_subscription_invoices_updated_at
before update on public.platform_subscription_invoices
for each row execute function app_private.set_updated_at();

drop trigger if exists set_platform_subscription_payments_updated_at
on public.platform_subscription_payments;
create trigger set_platform_subscription_payments_updated_at
before update on public.platform_subscription_payments
for each row execute function app_private.set_updated_at();

alter table public.platform_subscription_invoices enable row level security;
alter table public.platform_subscription_payments enable row level security;
alter table public.platform_payment_events enable row level security;

create policy "platform_subscription_invoices_select_admin_or_owner"
on public.platform_subscription_invoices
for select to authenticated
using (
  app_private.is_super_admin()
  or app_private.is_tenant_owner(tenant_id)
);

create policy "platform_subscription_payments_select_admin_or_owner"
on public.platform_subscription_payments
for select to authenticated
using (
  app_private.is_super_admin()
  or app_private.is_tenant_owner(tenant_id)
);

create policy "platform_payment_events_select_super"
on public.platform_payment_events
for select to authenticated
using (app_private.is_super_admin());

revoke all on
  public.platform_subscription_invoices,
  public.platform_subscription_payments,
  public.platform_payment_events
from anon;

grant select on
  public.platform_subscription_invoices,
  public.platform_subscription_payments,
  public.platform_payment_events
to authenticated;

grant all on
  public.platform_subscription_invoices,
  public.platform_subscription_payments,
  public.platform_payment_events
to service_role;

notify pgrst, 'reload schema';
