/*
  Cancelamento de reserva pelo hospede.

  O hospede nao recebe acesso direto a tabelas internas. Ele consulta apenas a
  politica publica da propria reserva e cancela por RPC autenticada, mantendo
  RLS, financeiro, calendario e timeline consistentes.
*/

create or replace function public.get_guest_reservation_cancellation_policy(
  p_reservation_ids uuid[]
)
returns table (
  reservation_id uuid,
  refund_until_days integer,
  refund_until_percentage numeric,
  late_until_days integer,
  late_refund_percentage numeric,
  no_refund_within_days integer,
  notes text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    r.id as reservation_id,
    coalesce(ps.cancellation_refund_until_days, 7) as refund_until_days,
    coalesce(ps.cancellation_refund_until_percentage, 100) as refund_until_percentage,
    coalesce(ps.cancellation_late_until_days, 2) as late_until_days,
    coalesce(ps.cancellation_late_refund_percentage, 50) as late_refund_percentage,
    coalesce(ps.cancellation_no_refund_within_days, 1) as no_refund_within_days,
    nullif(ps.cancellation_notes, '') as notes
  from public.reservations r
  left join public.property_settings ps
    on ps.tenant_id = r.tenant_id
   and ps.property_id = r.property_id
  where p_reservation_ids is not null
    and r.id = any(p_reservation_ids)
    and r.guest_user_id = (select auth.uid());
$$;

comment on function public.get_guest_reservation_cancellation_policy(uuid[]) is
  'Retorna politica de cancelamento apenas para o hospede autenticado dono da reserva.';

revoke all on function public.get_guest_reservation_cancellation_policy(uuid[]) from public;
revoke all on function public.get_guest_reservation_cancellation_policy(uuid[]) from anon;
grant execute on function public.get_guest_reservation_cancellation_policy(uuid[])
  to authenticated, service_role;

create or replace function public.cancel_guest_reservation(
  p_reservation_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_days_before_checkin integer;
  v_financial_status text;
  v_paid_amount numeric := 0;
  v_payment_status text;
  v_reason text;
  v_refund_amount numeric := 0;
  v_refund_percentage numeric := 0;
  v_reservation public.reservations%rowtype;
  v_settings record;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Entre para cancelar esta reserva.';
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
    and r.guest_user_id = v_user_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada para este hospede.';
  end if;

  if v_reservation.status = 'cancelled' then
    raise exception 'Esta reserva ja foi cancelada.';
  end if;

  if v_reservation.status in ('checked_in', 'checked_out', 'completed') then
    raise exception 'Esta reserva ja esta em hospedagem ou encerrada. Fale com o proprietario.';
  end if;

  if v_reservation.status not in ('pending', 'awaiting_payment', 'confirmed') then
    raise exception 'Esta reserva nao permite cancelamento pelo hospede.';
  end if;

  select
    coalesce(ps.cancellation_refund_until_days, 7) as refund_until_days,
    coalesce(ps.cancellation_refund_until_percentage, 100) as refund_until_percentage,
    coalesce(ps.cancellation_late_until_days, 2) as late_until_days,
    coalesce(ps.cancellation_late_refund_percentage, 50) as late_refund_percentage,
    coalesce(ps.cancellation_no_refund_within_days, 1) as no_refund_within_days,
    nullif(ps.cancellation_notes, '') as notes
    into v_settings
  from public.reservations r
  left join public.property_settings ps
    on ps.tenant_id = r.tenant_id
   and ps.property_id = r.property_id
  where r.id = v_reservation.id;

  v_days_before_checkin := v_reservation.check_in - current_date;
  v_refund_percentage := case
    when v_days_before_checkin >= v_settings.refund_until_days
      then v_settings.refund_until_percentage
    when v_days_before_checkin >= v_settings.late_until_days
      then v_settings.late_refund_percentage
    else 0
  end;
  v_refund_percentage := greatest(least(coalesce(v_refund_percentage, 0), 100), 0);

  select coalesce(sum(
    case
      when p.reversal_type is null and p.status in ('confirmed', 'refunded') then p.amount
      when p.reversal_type = 'refund' and p.status = 'refunded' then -p.amount
      else 0
    end
  ), 0)
    into v_paid_amount
  from public.reservation_payments p
  where p.tenant_id = v_reservation.tenant_id
    and p.reservation_id = v_reservation.id;

  if v_paid_amount = 0 then
    select coalesce(sum(c.amount_paid), 0)
      into v_paid_amount
    from public.reservation_charges c
    where c.tenant_id = v_reservation.tenant_id
      and c.reservation_id = v_reservation.id;
  end if;

  v_paid_amount := greatest(coalesce(v_paid_amount, 0), 0);
  v_refund_amount := round(v_paid_amount * v_refund_percentage / 100, 2);
  v_payment_status := case when v_refund_amount > 0 then 'refunded' else 'cancelled' end;
  v_financial_status := v_payment_status;
  v_reason := coalesce(nullif(btrim(p_reason), ''), 'Reserva cancelada pelo hospede.');

  update public.reservation_payments
     set status = case when v_refund_amount > 0 then 'refunded' else 'cancelled' end,
         notes = coalesce(notes, '') || case when notes is null then '' else E'\n' end || v_reason,
         refunded_amount = case when v_refund_amount > 0 then amount else refunded_amount end,
         reversed_by = v_user_id,
         reversed_at = now(),
         updated_at = now()
   where tenant_id = v_reservation.tenant_id
     and reservation_id = v_reservation.id
     and status in ('confirmed', 'pending_review');

  update public.reservation_charges
     set status = case when amount_paid > 0 and v_refund_amount > 0 then 'refunded' else 'cancelled' end,
         updated_at = now()
   where tenant_id = v_reservation.tenant_id
     and reservation_id = v_reservation.id
     and status in ('pending', 'partial', 'paid', 'overdue');

  update public.transactions
     set status = v_financial_status,
         paid_at = null,
         description = coalesce(description, 'Recebimento da reserva ' || v_reservation.code)
           || ' - cancelado pelo hospede',
         updated_at = now()
   where tenant_id = v_reservation.tenant_id
     and reservation_id = v_reservation.id
     and transaction_type = 'income';

  update public.reservations
     set status = 'cancelled',
         payment_status = v_payment_status,
         payment_status_updated_at = now(),
         payment_status_updated_by = v_user_id,
         cancelled_at = now(),
         cancelled_by = v_user_id,
         cancellation_reason = v_reason,
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
    'cancelled',
    v_user_id,
    v_reason,
    jsonb_build_object(
      'origem', 'area_hospede',
      'evento', 'reserva_cancelada_pelo_hospede',
      'dias_antes_checkin', v_days_before_checkin,
      'percentual_reembolso', v_refund_percentage,
      'valor_pago', v_paid_amount,
      'valor_reembolso_estimado', v_refund_amount,
      'payment_status', v_payment_status,
      'finance_status', v_financial_status
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
    v_reason || ' Reembolso estimado pela politica: ' || v_refund_percentage::text || '%.',
    v_user_id
  );

  if exists (
    select 1
    from public.calendar_availability_blocks b
    where b.tenant_id = v_reservation.tenant_id
      and b.reservation_id = v_reservation.id
      and b.blocks_availability is true
  ) then
    raise exception 'Nao foi possivel liberar o periodo no calendario.';
  end if;

  return jsonb_build_object(
    'reservationId', v_reservation.id,
    'status', 'cancelled',
    'paymentStatus', v_payment_status,
    'refundPercentage', v_refund_percentage,
    'refundAmount', v_refund_amount
  );
end;
$$;

comment on function public.cancel_guest_reservation(uuid, text) is
  'Cancela a reserva pelo hospede autenticado, aplicando politica da propriedade e atualizando financeiro/calendario.';

revoke all on function public.cancel_guest_reservation(uuid, text) from public;
revoke all on function public.cancel_guest_reservation(uuid, text) from anon;
grant execute on function public.cancel_guest_reservation(uuid, text)
  to authenticated, service_role;
