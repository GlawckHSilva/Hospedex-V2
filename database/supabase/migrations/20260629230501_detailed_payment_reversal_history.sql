/*
  Implementa cancelamento e estorno detalhado de pagamentos.

  Regras principais:
  - pagamento nunca e deletado fisicamente;
  - cancelamento registra erro operacional sem contar como valor recebido;
  - estorno cria um registro financeiro de saida e preserva o pagamento original;
  - calendario nao e liberado por mudanca financeira, apenas por cancelamento da reserva.
*/

alter table public.reservation_payments
  add column if not exists parent_payment_id uuid,
  add column if not exists reversal_type text,
  add column if not exists reversal_reason text,
  add column if not exists refunded_amount numeric(12, 2) not null default 0,
  add column if not exists reversed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reversed_at timestamptz;

alter table public.reservation_payments
  drop constraint if exists reservation_payments_parent_payment_id_fkey,
  add constraint reservation_payments_parent_payment_id_fkey
    foreign key (parent_payment_id)
    references public.reservation_payments(id)
    on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservation_payments_reversal_type_check'
  ) then
    alter table public.reservation_payments
      add constraint reservation_payments_reversal_type_check
      check (reversal_type is null or reversal_type in ('cancel', 'refund'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservation_payments_refunded_amount_check'
  ) then
    alter table public.reservation_payments
      add constraint reservation_payments_refunded_amount_check
      check (refunded_amount >= 0 and refunded_amount <= amount);
  end if;
end;
$$;

create index if not exists reservation_payments_parent_idx
  on public.reservation_payments (tenant_id, parent_payment_id);

comment on column public.reservation_payments.parent_payment_id is
  'Vincula um registro de estorno ao pagamento original. Nao deve ser usado para expor detalhes administrativos ao hospede.';
comment on column public.reservation_payments.reversal_type is
  'Diferencia cancelamento operacional de pagamento registrado errado e estorno/devolucao real ao hospede.';
comment on column public.reservation_payments.refunded_amount is
  'Total ja estornado do pagamento original. Permite estorno parcial sem apagar o recebimento inicial.';

create or replace function app_private.get_reservation_payment_summary(
  p_reservation_id uuid
)
returns table (
  original_amount numeric,
  refunded_amount numeric,
  net_paid numeric
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with original_payments as (
    select coalesce(sum(amount), 0)::numeric(12, 2) as amount
    from public.reservation_payments
    where reservation_id = p_reservation_id
      and reversal_type is null
      and status in ('confirmed', 'refunded')
  ),
  refund_payments as (
    select coalesce(sum(amount), 0)::numeric(12, 2) as amount
    from public.reservation_payments
    where reservation_id = p_reservation_id
      and reversal_type = 'refund'
      and status = 'refunded'
  )
  select
    original_payments.amount,
    refund_payments.amount,
    greatest(original_payments.amount - refund_payments.amount, 0)::numeric(12, 2)
  from original_payments, refund_payments;
$$;

create or replace function app_private.ensure_reservation_refund_category(
  p_tenant_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_category_id uuid;
begin
  insert into public.expense_categories (
    tenant_id,
    name,
    kind,
    status
  ) values (
    p_tenant_id,
    'Estornos de reservas',
    'expense',
    'active'
  )
  on conflict (tenant_id, name, kind)
  do update set
    status = 'active',
    updated_at = now()
  returning id into v_category_id;

  return v_category_id;
end;
$$;

create or replace function app_private.sync_reservation_charge_state(
  p_charge_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_charge public.reservation_charges%rowtype;
  v_has_refund boolean;
  v_paid numeric(12, 2);
  v_refunded numeric(12, 2);
  v_status text;
begin
  /*
    Cobrancas usam valor liquido: pagamentos confirmados menos estornos
    vinculados a mesma cobranca. Cancelamentos operacionais nao entram na soma.
  */
  select *
    into v_charge
  from public.reservation_charges c
  where c.id = p_charge_id
  for update;

  if v_charge.id is null then
    raise exception 'Cobranca nao encontrada.';
  end if;

  select coalesce(sum(p.amount), 0)
    into v_paid
  from public.reservation_payments p
  where p.tenant_id = v_charge.tenant_id
    and p.charge_id = v_charge.id
    and p.reversal_type is null
    and p.status in ('confirmed', 'refunded');

  select coalesce(sum(p.amount), 0)
    into v_refunded
  from public.reservation_payments p
  where p.tenant_id = v_charge.tenant_id
    and p.charge_id = v_charge.id
    and p.reversal_type = 'refund'
    and p.status = 'refunded';

  v_paid := greatest(v_paid - v_refunded, 0);
  v_has_refund := v_refunded > 0;

  v_status := case
    when v_charge.status = 'cancelled' then 'cancelled'
    when v_paid <= 0 and v_has_refund then 'refunded'
    when v_paid <= 0 then 'pending'
    when v_paid < v_charge.amount then 'partial'
    else 'paid'
  end;

  update public.reservation_charges
     set amount_paid = least(v_paid, amount),
         status = v_status,
         updated_at = now()
   where id = v_charge.id;

  return jsonb_build_object(
    'chargeId',
    v_charge.id,
    'amountPaid',
    v_paid,
    'refundedAmount',
    v_refunded,
    'status',
    v_status
  );
end;
$$;

create or replace function app_private.sync_reservation_payment_state(
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_original numeric(12, 2);
  v_paid numeric(12, 2);
  v_payment_status text;
  v_refunded numeric(12, 2);
  v_reservation public.reservations%rowtype;
begin
  /*
    Status financeiro da reserva nasce do saldo liquido. Estorno parcial reduz
    o pago; estorno total vira refunded sem alterar status operacional.
  */
  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
  end if;

  select original_amount, refunded_amount, net_paid
    into v_original, v_refunded, v_paid
  from app_private.get_reservation_payment_summary(v_reservation.id);

  v_payment_status := case
    when v_reservation.status = 'cancelled' and v_refunded > 0 then 'refunded'
    when v_reservation.status = 'cancelled' then 'cancelled'
    when v_paid <= 0 and v_refunded > 0 then 'refunded'
    when v_paid <= 0 then 'pending'
    when v_paid < v_reservation.total_amount then 'partial'
    else 'paid'
  end;

  update public.reservations
     set payment_status = v_payment_status,
         payment_status_updated_at = now(),
         updated_at = now()
   where id = v_reservation.id;

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'amountPaid',
    v_paid,
    'originalAmount',
    v_original,
    'refundedAmount',
    v_refunded,
    'paymentStatus',
    v_payment_status
  );
end;
$$;

create or replace function app_private.upsert_reservation_income_transaction(
  p_reservation_id uuid,
  p_user_id uuid default null,
  p_payment_id uuid default null,
  p_charge_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_account_id uuid;
  v_category_id uuid;
  v_guest_name text;
  v_paid numeric(12, 2);
  v_property_name text;
  v_refunded numeric(12, 2);
  v_reservation public.reservations%rowtype;
  v_transaction_status text;
begin
  /*
    O lancamento agregado de receita representa valor liquido recebido.
    Estornos reais aparecem tambem como saidas separadas no financeiro.
  */
  perform p_user_id;

  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
  end if;

  select refunded_amount, net_paid
    into v_refunded, v_paid
  from app_private.get_reservation_payment_summary(v_reservation.id);

  v_account_id := app_private.ensure_reservation_financial_account(
    v_reservation.tenant_id,
    v_reservation.owner_id
  );
  v_category_id := app_private.ensure_reservation_income_category(v_reservation.tenant_id);
  v_guest_name := app_private.get_primary_reservation_guest_name(
    v_reservation.tenant_id,
    v_reservation.id
  );

  select p.name
    into v_property_name
  from public.properties p
  where p.id = v_reservation.property_id;

  v_transaction_status := case
    when v_paid > 0 then 'paid'
    when v_refunded > 0 then 'refunded'
    else 'pending'
  end;

  insert into public.transactions (
    tenant_id,
    financial_account_id,
    property_id,
    reservation_id,
    reservation_charge_id,
    reservation_payment_id,
    expense_category_id,
    guest_name,
    transaction_type,
    status,
    amount,
    currency,
    due_date,
    paid_at,
    description
  ) values (
    v_reservation.tenant_id,
    v_account_id,
    v_reservation.property_id,
    v_reservation.id,
    p_charge_id,
    p_payment_id,
    v_category_id,
    v_guest_name,
    'income',
    v_transaction_status,
    v_paid,
    v_reservation.currency,
    v_reservation.check_in,
    case when v_paid > 0 then now() else null end,
    'Recebimentos liquidos da reserva ' || v_reservation.code || ' - ' || coalesce(v_property_name, 'Casa')
  )
  on conflict (tenant_id, reservation_id) where transaction_type = 'income'
  do update set
    financial_account_id = excluded.financial_account_id,
    property_id = excluded.property_id,
    reservation_charge_id = excluded.reservation_charge_id,
    reservation_payment_id = excluded.reservation_payment_id,
    expense_category_id = excluded.expense_category_id,
    guest_name = excluded.guest_name,
    status = excluded.status,
    amount = excluded.amount,
    currency = excluded.currency,
    due_date = excluded.due_date,
    paid_at = excluded.paid_at,
    description = excluded.description,
    updated_at = now();

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'amountPaid',
    v_paid,
    'amountRefunded',
    v_refunded,
    'transactionStatus',
    v_transaction_status
  );
end;
$$;

create or replace function app_private.cancel_reservation_payment(
  p_payment_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_charge_state jsonb;
  v_net_paid numeric(12, 2);
  v_payment public.reservation_payments%rowtype;
  v_payment_state jsonb;
  v_reason text := nullif(btrim(p_reason), '');
  v_reservation public.reservations%rowtype;
begin
  /*
    Cancelamento e usado para pagamento lancado por engano. O registro continua
    visivel, mas deixa de contar como recebido e o financeiro e recalculado.
  */
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Voce nao tem permissao para cancelar este pagamento.';
  end if;

  if v_reason is null then
    raise exception 'Informe o motivo do cancelamento do pagamento.';
  end if;

  select *
    into v_payment
  from public.reservation_payments p
  where p.id = p_payment_id
    and p.tenant_id = p_tenant_id
    and p.status = 'confirmed'
    and p.reversal_type is null
  for update;

  if v_payment.id is null then
    raise exception 'Pagamento confirmado nao encontrado.';
  end if;

  if v_payment.refunded_amount > 0 then
    raise exception 'Pagamento com estorno parcial nao pode ser cancelado. Use estorno para manter o historico correto.';
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = v_payment.reservation_id
    and r.tenant_id = p_tenant_id
    and r.owner_id = p_owner_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
  end if;

  if not app_private.can_access_property(
    v_reservation.tenant_id,
    v_reservation.property_id,
    'reservations.manage'
  ) then
    raise exception 'Voce nao tem permissao para alterar esta reserva.';
  end if;

  if not app_private.has_tenant_permission(v_reservation.tenant_id, 'finance.manage') then
    raise exception 'Voce nao tem permissao para alterar o financeiro desta reserva.';
  end if;

  update public.reservation_payments
     set status = 'cancelled',
         reversal_type = 'cancel',
         reversal_reason = v_reason,
         refunded_amount = amount,
         reversed_by = p_user_id,
         reversed_at = now(),
         notes = concat_ws(E'\n', nullif(notes, ''), 'Cancelamento: ' || v_reason),
         updated_at = now()
   where id = v_payment.id;

  if v_payment.charge_id is not null then
    v_charge_state := app_private.sync_reservation_charge_state(v_payment.charge_id);
  end if;

  v_payment_state := app_private.sync_reservation_payment_state(v_reservation.id);
  perform app_private.upsert_reservation_income_transaction(
    v_reservation.id,
    p_user_id,
    null,
    v_payment.charge_id
  );

  v_net_paid := coalesce((v_payment_state ->> 'amountPaid')::numeric, 0);

  if v_net_paid <= 0 then
    update public.transactions
       set status = 'cancelled',
           paid_at = null,
           description = 'Cancelamento do pagamento da reserva ' || v_reservation.code,
           updated_at = now()
     where tenant_id = v_reservation.tenant_id
       and reservation_id = v_reservation.id
       and transaction_type = 'income';
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
    v_reservation.status,
    v_reservation.status,
    p_user_id,
    'Pagamento de ' || to_char(v_payment.amount, 'FM999G999G990D00') || ' foi cancelado: ' || v_reason,
    jsonb_build_object(
      'origem',
      'financeiro',
      'evento',
      'pagamento_cancelado',
      'payment_id',
      v_payment.id,
      'charge_id',
      v_payment.charge_id,
      'amount',
      v_payment.amount,
      'payment_status',
      v_payment_state ->> 'paymentStatus',
      'atomic',
      true
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
    'Pagamento cancelado. Motivo: ' || v_reason,
    p_user_id
  );

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'paymentId',
    v_payment.id,
    'paymentStatus',
    v_payment_state ->> 'paymentStatus',
    'chargeStatus',
    v_charge_state ->> 'status'
  );
end;
$$;

create or replace function app_private.refund_reservation_payment(
  p_payment_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_refund_amount numeric,
  p_reason text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_account_id uuid;
  v_available numeric(12, 2);
  v_category_id uuid;
  v_charge_state jsonb;
  v_guest_name text;
  v_note text := nullif(btrim(p_note), '');
  v_payment public.reservation_payments%rowtype;
  v_payment_state jsonb;
  v_reason text := nullif(btrim(p_reason), '');
  v_refund_amount numeric(12, 2);
  v_refund_id uuid;
  v_reservation public.reservations%rowtype;
begin
  /*
    Estorno registra devolucao real ao hospede. O pagamento original permanece
    rastreavel e um novo pagamento do tipo refund representa a saida.
  */
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Voce nao tem permissao para estornar este pagamento.';
  end if;

  if v_reason is null then
    raise exception 'Informe o motivo do estorno.';
  end if;

  if p_refund_amount is null or p_refund_amount <= 0 then
    raise exception 'Valor do estorno deve ser maior que zero.';
  end if;

  select *
    into v_payment
  from public.reservation_payments p
  where p.id = p_payment_id
    and p.tenant_id = p_tenant_id
    and p.reversal_type is null
    and p.status in ('confirmed', 'refunded')
  for update;

  if v_payment.id is null then
    raise exception 'Pagamento confirmado nao encontrado para estorno.';
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = v_payment.reservation_id
    and r.tenant_id = p_tenant_id
    and r.owner_id = p_owner_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
  end if;

  if not app_private.can_access_property(
    v_reservation.tenant_id,
    v_reservation.property_id,
    'reservations.manage'
  ) then
    raise exception 'Voce nao tem permissao para alterar esta reserva.';
  end if;

  if not app_private.has_tenant_permission(v_reservation.tenant_id, 'finance.manage') then
    raise exception 'Voce nao tem permissao para alterar o financeiro desta reserva.';
  end if;

  v_available := v_payment.amount - v_payment.refunded_amount;
  v_refund_amount := round(p_refund_amount, 2);

  if v_available <= 0 then
    raise exception 'Pagamento ja foi totalmente estornado.';
  end if;

  if v_refund_amount > v_available then
    raise exception 'Valor do estorno supera o saldo disponivel do pagamento.';
  end if;

  insert into public.reservation_payments (
    tenant_id,
    property_id,
    reservation_id,
    charge_id,
    parent_payment_id,
    reversal_type,
    reversal_reason,
    amount,
    currency,
    payment_method,
    status,
    proof_url,
    notes,
    confirmed_by,
    confirmed_at,
    refunded_amount,
    reversed_by,
    reversed_at
  ) values (
    v_payment.tenant_id,
    v_payment.property_id,
    v_payment.reservation_id,
    v_payment.charge_id,
    v_payment.id,
    'refund',
    v_reason,
    v_refund_amount,
    v_payment.currency,
    v_payment.payment_method,
    'refunded',
    v_payment.proof_url,
    concat_ws(E'\n', 'Estorno: ' || v_reason, v_note),
    p_user_id,
    now(),
    v_refund_amount,
    p_user_id,
    now()
  )
  returning id into v_refund_id;

  update public.reservation_payments
     set refunded_amount = refunded_amount + v_refund_amount,
         status = case
           when refunded_amount + v_refund_amount >= amount then 'refunded'
           else 'confirmed'
         end,
         reversal_reason = v_reason,
         reversed_by = p_user_id,
         reversed_at = now(),
         notes = concat_ws(E'\n', nullif(notes, ''), 'Estorno registrado: ' || v_reason),
         updated_at = now()
   where id = v_payment.id;

  if v_payment.charge_id is not null then
    v_charge_state := app_private.sync_reservation_charge_state(v_payment.charge_id);
  end if;

  v_payment_state := app_private.sync_reservation_payment_state(v_reservation.id);
  perform app_private.upsert_reservation_income_transaction(
    v_reservation.id,
    p_user_id,
    v_refund_id,
    v_payment.charge_id
  );

  v_account_id := app_private.ensure_reservation_financial_account(
    v_reservation.tenant_id,
    v_reservation.owner_id
  );
  v_category_id := app_private.ensure_reservation_refund_category(v_reservation.tenant_id);
  v_guest_name := app_private.get_primary_reservation_guest_name(
    v_reservation.tenant_id,
    v_reservation.id
  );

  insert into public.transactions (
    tenant_id,
    financial_account_id,
    property_id,
    reservation_id,
    reservation_charge_id,
    reservation_payment_id,
    expense_category_id,
    guest_name,
    transaction_type,
    status,
    amount,
    currency,
    due_date,
    paid_at,
    description
  ) values (
    v_reservation.tenant_id,
    v_account_id,
    v_reservation.property_id,
    v_reservation.id,
    v_payment.charge_id,
    v_refund_id,
    v_category_id,
    v_guest_name,
    'expense',
    'paid',
    v_refund_amount,
    v_reservation.currency,
    current_date,
    now(),
    'Estorno do pagamento da reserva ' || v_reservation.code
  );

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
    v_reservation.status,
    p_user_id,
    'Estorno de ' || to_char(v_refund_amount, 'FM999G999G990D00') || ' registrado: ' || v_reason,
    jsonb_build_object(
      'origem',
      'financeiro',
      'evento',
      case when v_refund_amount >= v_payment.amount then 'estorno_total' else 'estorno_parcial' end,
      'payment_id',
      v_payment.id,
      'refund_payment_id',
      v_refund_id,
      'charge_id',
      v_payment.charge_id,
      'amount',
      v_refund_amount,
      'payment_status',
      v_payment_state ->> 'paymentStatus',
      'atomic',
      true
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
    'Estorno registrado. Motivo: ' || v_reason,
    p_user_id
  );

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'paymentId',
    v_payment.id,
    'refundPaymentId',
    v_refund_id,
    'amount',
    v_refund_amount,
    'paymentStatus',
    v_payment_state ->> 'paymentStatus',
    'chargeStatus',
    v_charge_state ->> 'status'
  );
end;
$$;

create or replace function public.cancel_reservation_payment(
  p_payment_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_reason text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.cancel_reservation_payment(
    p_payment_id,
    p_tenant_id,
    p_owner_id,
    p_user_id,
    p_reason
  );
$$;

create or replace function public.refund_reservation_payment(
  p_payment_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_refund_amount numeric,
  p_reason text,
  p_note text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.refund_reservation_payment(
    p_payment_id,
    p_tenant_id,
    p_owner_id,
    p_user_id,
    p_refund_amount,
    p_reason,
    p_note
  );
$$;

comment on function public.cancel_reservation_payment(uuid, uuid, uuid, uuid, text) is
  'Cancela pagamento manual registrado por engano, recalcula cobranca/reserva e preserva historico financeiro.';
comment on function public.refund_reservation_payment(uuid, uuid, uuid, uuid, numeric, text, text) is
  'Registra estorno total ou parcial de pagamento manual sem executar estorno bancario real.';

revoke all on function public.cancel_reservation_payment(uuid, uuid, uuid, uuid, text)
  from public, anon;
revoke all on function public.refund_reservation_payment(uuid, uuid, uuid, uuid, numeric, text, text)
  from public, anon;

grant execute on function public.cancel_reservation_payment(uuid, uuid, uuid, uuid, text)
  to authenticated;
grant execute on function public.refund_reservation_payment(uuid, uuid, uuid, uuid, numeric, text, text)
  to authenticated;

revoke all on function app_private.cancel_reservation_payment(uuid, uuid, uuid, uuid, text)
  from public, anon;
revoke all on function app_private.refund_reservation_payment(uuid, uuid, uuid, uuid, numeric, text, text)
  from public, anon;

grant execute on function app_private.cancel_reservation_payment(uuid, uuid, uuid, uuid, text)
  to authenticated, service_role;
grant execute on function app_private.refund_reservation_payment(uuid, uuid, uuid, uuid, numeric, text, text)
  to authenticated, service_role;

notify pgrst, 'reload schema';
