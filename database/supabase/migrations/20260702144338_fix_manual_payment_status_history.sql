/*
  Corrige a timeline do pagamento manual de reserva.

  A tabela reservation_status_history registra status operacional da reserva.
  O status financeiro fica no metadata. Antes, o pagamento manual tentava gravar
  "paid" em from_status/to_status, violando a constraint e bloqueando o fluxo:
  aprovar reserva -> registrar pagamento -> check-in -> check-out.
*/

create or replace function app_private.confirm_manual_reservation_payment(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_amount numeric default null,
  p_payment_method text default null,
  p_charge_id uuid default null,
  p_proof_url text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_amount numeric(12, 2);
  v_charge public.reservation_charges%rowtype;
  v_charge_id uuid;
  v_paid numeric(12, 2);
  v_payment_id uuid;
  v_payment_method text;
  v_payment_state jsonb;
  v_reason text;
  v_reservation public.reservations%rowtype;
  v_timeline_status text;
begin
  /*
    Mesmo em SECURITY DEFINER, o usuario autenticado precisa ser o mesmo que
    chamou a action. Isso evita gravar pagamento cruzado entre tenants.
  */
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Voce nao tem permissao para registrar pagamento desta reserva.';
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
    and r.tenant_id = p_tenant_id
    and r.owner_id = p_owner_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
  end if;

  if v_reservation.status in ('cancelled', 'completed') then
    raise exception 'Reserva encerrada nao permite registrar pagamento.';
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

  if exists (
    select 1
    from public.reservations r
    where r.tenant_id = v_reservation.tenant_id
      and r.property_id = v_reservation.property_id
      and r.id <> v_reservation.id
      and r.status in ('awaiting_payment', 'confirmed', 'checked_in')
      and r.check_in < v_reservation.check_out
      and r.check_out > v_reservation.check_in
  ) then
    raise exception 'Conflito de datas encontrado para esta casa.';
  end if;

  select *
    into v_charge
  from public.reservation_charges c
  where c.id = coalesce(
      p_charge_id,
      (
        select c2.id
        from public.reservation_charges c2
        where c2.tenant_id = v_reservation.tenant_id
          and c2.reservation_id = v_reservation.id
          and c2.status in ('pending', 'partial', 'overdue')
        order by c2.created_at
        limit 1
      )
    )
    and c.tenant_id = v_reservation.tenant_id
    and c.reservation_id = v_reservation.id
  for update;

  if v_charge.id is null then
    insert into public.reservation_charges (
      tenant_id,
      property_id,
      reservation_id,
      charge_type,
      amount,
      currency,
      status,
      payment_method,
      payment_provider,
      manual_instructions,
      created_by
    ) values (
      v_reservation.tenant_id,
      v_reservation.property_id,
      v_reservation.id,
      'full',
      v_reservation.total_amount,
      v_reservation.currency,
      'pending',
      v_reservation.payment_method,
      'manual',
      'Cobranca criada automaticamente ao registrar pagamento manual.',
      p_user_id
    )
    returning * into v_charge;
  end if;

  select coalesce(sum(p.amount), 0)
    into v_paid
  from public.reservation_payments p
  where p.tenant_id = v_reservation.tenant_id
    and p.reservation_id = v_reservation.id
    and p.status = 'confirmed';

  v_amount := coalesce(p_amount, greatest(v_reservation.total_amount - v_paid, 0));

  if v_amount <= 0 then
    raise exception 'Valor do pagamento invalido.';
  end if;

  if v_paid + v_amount > v_reservation.total_amount then
    raise exception 'Valor do pagamento supera o saldo da reserva.';
  end if;

  v_payment_method := coalesce(p_payment_method, v_charge.payment_method, v_reservation.payment_method);

  if v_payment_method is null
    or v_payment_method not in ('pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer')
  then
    raise exception 'Forma de pagamento invalida.';
  end if;

  v_reason := coalesce(
    nullif(btrim(p_reason), ''),
    'Pagamento manual registrado para a reserva.'
  );

  insert into public.reservation_payments (
    tenant_id,
    property_id,
    reservation_id,
    charge_id,
    amount,
    currency,
    payment_method,
    status,
    proof_url,
    notes,
    confirmed_by,
    confirmed_at
  ) values (
    v_reservation.tenant_id,
    v_reservation.property_id,
    v_reservation.id,
    v_charge.id,
    v_amount,
    v_reservation.currency,
    v_payment_method,
    'confirmed',
    p_proof_url,
    v_reason,
    p_user_id,
    now()
  )
  returning id into v_payment_id;

  v_charge_id := v_charge.id;
  perform app_private.sync_reservation_charge_state(v_charge_id);
  v_payment_state := app_private.sync_reservation_payment_state(v_reservation.id);
  perform app_private.upsert_reservation_income_transaction(
    v_reservation.id,
    p_user_id,
    v_payment_id,
    v_charge_id
  );

  v_timeline_status := v_reservation.status;

  if v_reservation.status in ('pending', 'awaiting_payment') then
    update public.reservations
       set status = 'confirmed',
           updated_at = now()
     where id = v_reservation.id
       and tenant_id = v_reservation.tenant_id
       and owner_id = v_reservation.owner_id;

    v_timeline_status := 'confirmed';

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
      p_user_id,
      'Reserva confirmada apos pagamento manual.',
      jsonb_build_object(
        'origem',
        'pagamento',
        'evento',
        'reserva_confirmada_por_pagamento',
        'payment_id',
        v_payment_id,
        'atomic',
        true
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
    v_timeline_status,
    v_timeline_status,
    p_user_id,
    v_reason,
    jsonb_build_object(
      'origem',
      'financeiro',
      'evento',
      'pagamento_manual_confirmado',
      'charge_id',
      v_charge_id,
      'payment_id',
      v_payment_id,
      'amount',
      v_amount,
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
    v_reason,
    p_user_id
  );

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'paymentId',
    v_payment_id,
    'chargeId',
    v_charge_id,
    'amount',
    v_amount,
    'reservationStatus',
    v_timeline_status,
    'paymentStatus',
    v_payment_state ->> 'paymentStatus'
  );
end;
$$;

comment on function app_private.confirm_manual_reservation_payment(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  uuid,
  text,
  text
) is
  'Registra pagamento manual sem gravar status financeiro como status operacional da reserva.';

notify pgrst, 'reload schema';
