/*
  Transicao operacional atomica de status da reserva.

  Confirmacao, cancelamento e pagamento continuam nas RPCs dedicadas porque
  tambem mexem em calendario e financeiro. Esta funcao cobre check-in,
  check-out e conclusao para evitar update de status sem timeline/nota.
*/

create or replace function app_private.set_reservation_status_operational(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_target_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_reason text;
  v_reservation public.reservations%rowtype;
begin
  /*
    A identidade autenticada continua obrigatoria mesmo dentro de security
    definer. Isso preserva isolamento multi-tenant sem expor service role ao
    frontend.
  */
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Voce nao tem permissao para alterar esta reserva.';
  end if;

  select *
    into v_reservation
  from public.reservations reserva
  where reserva.id = p_reservation_id
    and reserva.tenant_id = p_tenant_id
    and reserva.owner_id = p_owner_id
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

  if v_reservation.status in ('cancelled', 'completed') then
    raise exception 'Reserva encerrada nao permite alterar status.';
  end if;

  if not (
    (v_reservation.status = 'confirmed' and p_target_status = 'checked_in') or
    (v_reservation.status = 'checked_in' and p_target_status = 'checked_out') or
    (v_reservation.status = 'checked_out' and p_target_status = 'completed')
  ) then
    raise exception 'Transicao de status invalida para esta reserva.';
  end if;

  v_reason := coalesce(
    nullif(btrim(p_reason), ''),
    case
      when p_target_status = 'checked_in' then 'Check-in registrado.'
      when p_target_status = 'checked_out' then 'Check-out registrado.'
      else 'Reserva concluida.'
    end
  );

  update public.reservations
     set status = p_target_status,
         checked_in_at = case
           when p_target_status = 'checked_in' then now()
           else checked_in_at
         end,
         checked_out_at = case
           when p_target_status = 'checked_out' then now()
           else checked_out_at
         end,
         updated_at = now()
   where id = v_reservation.id
     and tenant_id = v_reservation.tenant_id
     and owner_id = v_reservation.owner_id;

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
    p_target_status,
    p_user_id,
    v_reason,
    jsonb_build_object(
      'origem',
      'reservas',
      'evento',
      'status_operacional',
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
    'fromStatus',
    v_reservation.status,
    'status',
    p_target_status
  );
end;
$$;

comment on function app_private.set_reservation_status_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) is
  'Altera check-in, check-out e conclusao da reserva em transacao unica com timeline e nota.';

revoke all on function app_private.set_reservation_status_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) from public, anon;

grant execute on function app_private.set_reservation_status_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) to authenticated, service_role;

create or replace function public.set_reservation_status_operational(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_target_status text,
  p_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.set_reservation_status_operational(
    p_reservation_id,
    p_tenant_id,
    p_owner_id,
    p_user_id,
    p_target_status,
    p_reason
  );
$$;

comment on function public.set_reservation_status_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) is
  'Entrada autenticada para status operacional da reserva sem expor service role ao frontend.';

revoke all on function public.set_reservation_status_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) from public, anon;

grant execute on function public.set_reservation_status_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) to authenticated;

notify pgrst, 'reload schema';
