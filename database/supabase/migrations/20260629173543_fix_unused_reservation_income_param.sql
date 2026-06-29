/*
  Ajusta warning do linter do Supabase.

  O parametro p_user_id permanece na assinatura para compatibilidade com as RPCs
  ja criadas. Ele e referenciado explicitamente porque sera usado em auditoria
  financeira futura, mas hoje o lancamento agregado nao possui created_by.
*/

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
  v_reservation public.reservations%rowtype;
  v_transaction_status text;
begin
  /*
    Mantem p_user_id usado sem alterar schema. A coluna de auditoria do
    Financeiro fica para etapa futura sem quebrar chamadas atuais.
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

  select coalesce(sum(p.amount), 0)
    into v_paid
  from public.reservation_payments p
  where p.tenant_id = v_reservation.tenant_id
    and p.reservation_id = v_reservation.id
    and p.status = 'confirmed';

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
    when v_reservation.status = 'cancelled' and v_paid > 0 then 'refunded'
    when v_paid > 0 then 'paid'
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
    'Recebimentos confirmados da reserva ' || v_reservation.code || ' - ' || coalesce(v_property_name, 'Casa')
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
    'transactionStatus',
    v_transaction_status
  );
end;
$$;

notify pgrst, 'reload schema';
