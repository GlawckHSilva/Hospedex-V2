/*
  Base Mercado Pago para cobrancas de reserva.

  A credencial sensivel do Mercado Pago nao e salva no frontend nem exposta em
  tabelas de leitura do proprietario. O tenant guarda apenas o nome da variavel
  de ambiente; o access token real fica no servidor/Vercel.
*/

alter table public.tenant_settings
  add column if not exists payment_collection_method text not null default 'manual'
    check (payment_collection_method in ('manual', 'mercado_pago')),
  add column if not exists manual_payment_deadline_hours integer not null default 24
    check (manual_payment_deadline_hours between 1 and 720),
  add column if not exists mercado_pago_enabled boolean not null default false,
  add column if not exists mercado_pago_environment text not null default 'sandbox'
    check (mercado_pago_environment in ('sandbox', 'production')),
  add column if not exists mercado_pago_public_key text,
  add column if not exists mercado_pago_access_token_secret_name text,
  add column if not exists mercado_pago_default_charge_strategy text not null default 'full'
    check (
      mercado_pago_default_charge_strategy in (
        'full',
        'deposit_percent',
        'deposit_fixed',
        'manual_amount'
      )
    ),
  add column if not exists mercado_pago_default_deposit_percent numeric(5, 2)
    check (
      mercado_pago_default_deposit_percent is null
      or mercado_pago_default_deposit_percent between 1 and 100
    ),
  add column if not exists mercado_pago_default_deposit_fixed numeric(12, 2)
    check (
      mercado_pago_default_deposit_fixed is null
      or mercado_pago_default_deposit_fixed >= 0
    ),
  add column if not exists mercado_pago_default_deadline_hours integer not null default 24
    check (mercado_pago_default_deadline_hours between 1 and 720);

comment on column public.tenant_settings.mercado_pago_access_token_secret_name is
  'Nome da variavel de ambiente server-side que guarda o access token Mercado Pago do proprietario. O token real nao deve ser salvo aqui.';

alter table public.reservation_charges
  add column if not exists provider_name text
    check (provider_name is null or provider_name in ('manual', 'mercado_pago')),
  add column if not exists provider_charge_id text,
  add column if not exists provider_preference_id text,
  add column if not exists provider_external_reference text,
  add column if not exists payment_link_sent_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists gross_amount numeric(12, 2)
    check (gross_amount is null or gross_amount >= 0),
  add column if not exists provider_fee_amount numeric(12, 2)
    check (provider_fee_amount is null or provider_fee_amount >= 0),
  add column if not exists net_amount numeric(12, 2)
    check (net_amount is null or net_amount >= 0),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.reservation_payments
  add column if not exists provider_name text
    check (provider_name is null or provider_name in ('manual', 'mercado_pago')),
  add column if not exists provider_payment_id text,
  add column if not exists provider_preference_id text,
  add column if not exists gross_amount numeric(12, 2)
    check (gross_amount is null or gross_amount >= 0),
  add column if not exists provider_fee_amount numeric(12, 2)
    check (provider_fee_amount is null or provider_fee_amount >= 0),
  add column if not exists net_amount numeric(12, 2)
    check (net_amount is null or net_amount >= 0),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists reservation_charges_provider_external_reference_uidx
  on public.reservation_charges (provider_external_reference)
  where provider_external_reference is not null;

create index if not exists reservation_charges_provider_reference_idx
  on public.reservation_charges (tenant_id, provider_name, provider_preference_id)
  where provider_name is not null;

create unique index if not exists reservation_payments_provider_payment_uidx
  on public.reservation_payments (tenant_id, provider_name, provider_payment_id)
  where provider_name is not null and provider_payment_id is not null;

comment on column public.reservation_charges.provider_external_reference is
  'Referencia enviada ao gateway para localizar a reserva/cobranca no webhook sem depender de texto livre.';
comment on column public.reservation_payments.provider_fee_amount is
  'Taxa do gateway quando disponivel. Fica nula quando o provedor ainda nao retornou conciliacao.';

create or replace function public.confirm_gateway_reservation_payment(
  p_provider_name text,
  p_provider_payment_id text,
  p_external_reference text,
  p_tenant_id uuid,
  p_amount numeric,
  p_payment_method text default null,
  p_provider_preference_id text default null,
  p_gross_amount numeric default null,
  p_provider_fee_amount numeric default null,
  p_net_amount numeric default null,
  p_paid_at timestamptz default now(),
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_amount numeric(12, 2);
  v_charge public.reservation_charges%rowtype;
  v_existing_payment public.reservation_payments%rowtype;
  v_fee numeric(12, 2);
  v_method text;
  v_net numeric(12, 2);
  v_payment_id uuid;
  v_payment_state jsonb;
  v_reservation public.reservations%rowtype;
begin
  /*
    Webhooks podem chegar duplicados. A combinacao provider/payment_id e unica,
    entao o mesmo pagamento nunca cria dois recebimentos nem duplica financeiro.
  */
  if p_provider_name <> 'mercado_pago' then
    raise exception 'Provider de pagamento invalido.';
  end if;

  if nullif(btrim(p_provider_payment_id), '') is null then
    raise exception 'Pagamento do provider sem identificador.';
  end if;

  select *
    into v_existing_payment
  from public.reservation_payments p
  where p.provider_name = p_provider_name
    and p.provider_payment_id = p_provider_payment_id
  limit 1;

  if v_existing_payment.id is not null then
    return jsonb_build_object(
      'duplicated',
      true,
      'paymentId',
      v_existing_payment.id,
      'reservationId',
      v_existing_payment.reservation_id
    );
  end if;

  select *
    into v_charge
  from public.reservation_charges c
  where c.provider_external_reference = p_external_reference
    and c.provider_name = p_provider_name
    and c.tenant_id = p_tenant_id
  for update;

  if v_charge.id is null then
    raise exception 'Cobranca Mercado Pago nao encontrada.';
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = v_charge.reservation_id
    and r.tenant_id = v_charge.tenant_id
    and r.property_id = v_charge.property_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva da cobranca nao encontrada.';
  end if;

  if v_reservation.status in ('cancelled', 'completed') then
    raise exception 'Reserva encerrada nao permite baixa automatica.';
  end if;

  v_amount := coalesce(p_amount, p_gross_amount, v_charge.amount);
  if v_amount <= 0 then
    raise exception 'Valor do pagamento invalido.';
  end if;

  if v_charge.amount_paid + v_amount > v_charge.amount then
    raise exception 'Valor do pagamento supera o saldo da cobranca.';
  end if;

  v_method := case
    when p_payment_method in ('pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer')
      then p_payment_method
    else coalesce(v_charge.payment_method, v_reservation.payment_method, 'credit_card')
  end;

  v_fee := coalesce(p_provider_fee_amount, greatest(coalesce(p_gross_amount, v_amount) - coalesce(p_net_amount, coalesce(p_gross_amount, v_amount)), 0));
  v_net := coalesce(p_net_amount, coalesce(p_gross_amount, v_amount) - v_fee);

  insert into public.reservation_payments (
    tenant_id,
    property_id,
    reservation_id,
    charge_id,
    amount,
    currency,
    payment_method,
    status,
    gateway_transaction_id,
    notes,
    confirmed_by,
    confirmed_at,
    provider_name,
    provider_payment_id,
    provider_preference_id,
    gross_amount,
    provider_fee_amount,
    net_amount,
    metadata
  ) values (
    v_reservation.tenant_id,
    v_reservation.property_id,
    v_reservation.id,
    v_charge.id,
    v_amount,
    v_reservation.currency,
    v_method,
    'confirmed',
    p_provider_payment_id,
    'Pagamento Mercado Pago confirmado por webhook.',
    null,
    coalesce(p_paid_at, now()),
    p_provider_name,
    p_provider_payment_id,
    coalesce(p_provider_preference_id, v_charge.provider_preference_id),
    coalesce(p_gross_amount, v_amount),
    v_fee,
    v_net,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_payment_id;

  update public.reservation_charges
     set provider_charge_id = p_provider_payment_id,
         provider_fee_amount = v_fee,
         gross_amount = coalesce(p_gross_amount, v_amount),
         net_amount = v_net,
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'ultimoWebhookMercadoPago',
           coalesce(p_metadata, '{}'::jsonb)
         ),
         updated_at = now()
   where id = v_charge.id;

  perform app_private.sync_reservation_charge_state(v_charge.id);
  v_payment_state := app_private.sync_reservation_payment_state(v_reservation.id);
  perform app_private.upsert_reservation_income_transaction(
    v_reservation.id,
    null,
    v_payment_id,
    v_charge.id
  );

  if v_reservation.status in ('pending', 'awaiting_payment') then
    update public.reservations
       set status = 'confirmed',
           updated_at = now()
     where id = v_reservation.id;

    insert into public.reservation_status_history (
      tenant_id,
      reservation_id,
      from_status,
      to_status,
      changed_by,
      reason,
      metadata
    ) values (
      v_reservation.tenant_id,
      v_reservation.id,
      v_reservation.status,
      'confirmed',
      null,
      'Reserva confirmada apos pagamento Mercado Pago.',
      jsonb_build_object(
        'origem',
        'mercado_pago',
        'evento',
        'reserva_confirmada_por_gateway',
        'payment_id',
        v_payment_id
      )
    );
  end if;

  insert into public.reservation_status_history (
    tenant_id,
    reservation_id,
    from_status,
    to_status,
    changed_by,
    reason,
    metadata
  ) values (
    v_reservation.tenant_id,
    v_reservation.id,
    coalesce((v_payment_state ->> 'paymentStatus'), v_reservation.payment_status),
    coalesce((v_payment_state ->> 'paymentStatus'), v_reservation.payment_status),
    null,
    'Pagamento Mercado Pago confirmado por webhook.',
    jsonb_build_object(
      'origem',
      'mercado_pago',
      'evento',
      'pagamento_gateway_confirmado',
      'charge_id',
      v_charge.id,
      'payment_id',
      v_payment_id,
      'provider_payment_id',
      p_provider_payment_id,
      'amount',
      v_amount,
      'gross_amount',
      coalesce(p_gross_amount, v_amount),
      'provider_fee_amount',
      v_fee,
      'net_amount',
      v_net
    )
  );

  insert into public.reservation_notes (
    tenant_id,
    reservation_id,
    note_type,
    content,
    created_by
  ) values (
    v_reservation.tenant_id,
    v_reservation.id,
    'system',
    'Pagamento Mercado Pago confirmado automaticamente pelo webhook.',
    null
  );

  return jsonb_build_object(
    'duplicated',
    false,
    'reservationId',
    v_reservation.id,
    'chargeId',
    v_charge.id,
    'paymentId',
    v_payment_id,
    'paymentStatus',
    v_payment_state ->> 'paymentStatus'
  );
end;
$$;

comment on function public.confirm_gateway_reservation_payment(
  text,
  text,
  text,
  uuid,
  numeric,
  text,
  text,
  numeric,
  numeric,
  numeric,
  timestamptz,
  jsonb
) is
  'Confirma pagamento de gateway por webhook usando service_role e idempotencia por provider_payment_id.';

revoke all on function public.confirm_gateway_reservation_payment(
  text,
  text,
  text,
  uuid,
  numeric,
  text,
  text,
  numeric,
  numeric,
  numeric,
  timestamptz,
  jsonb
) from public;
revoke all on function public.confirm_gateway_reservation_payment(
  text,
  text,
  text,
  uuid,
  numeric,
  text,
  text,
  numeric,
  numeric,
  numeric,
  timestamptz,
  jsonb
) from anon;
revoke all on function public.confirm_gateway_reservation_payment(
  text,
  text,
  text,
  uuid,
  numeric,
  text,
  text,
  numeric,
  numeric,
  numeric,
  timestamptz,
  jsonb
) from authenticated;
grant execute on function public.confirm_gateway_reservation_payment(
  text,
  text,
  text,
  uuid,
  numeric,
  text,
  text,
  numeric,
  numeric,
  numeric,
  timestamptz,
  jsonb
) to service_role;

notify pgrst, 'reload schema';
