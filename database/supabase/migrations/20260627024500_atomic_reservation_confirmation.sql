/*
  Confirmacao atomica de reservas no gerenciamento.

  A confirmacao precisa ser transacional porque o calendario e sincronizado por
  trigger quando o status da reserva muda. Se uma etapa posterior falhar, o banco
  nao pode ficar com calendario bloqueado e resposta visual de erro para o dono.
*/

create or replace function app_private.confirm_reservation_operational(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_reservation public.reservations%rowtype;
  v_reason text := coalesce(nullif(btrim(p_reason), ''), 'Reserva confirmada pelo proprietario.');
begin
  /*
    A RPC usa security definer apenas para manter status, timeline e calendario
    na mesma transacao. A identidade autenticada continua obrigatoria para evitar
    que um usuario confirme reservas de outro tenant.
  */
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Voce nao tem permissao para confirmar esta reserva.';
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

  if not app_private.can_access_property(
    v_reservation.tenant_id,
    v_reservation.property_id,
    'reservations.manage'
  ) then
    raise exception 'Voce nao tem permissao para confirmar esta reserva.';
  end if;

  if v_reservation.status = 'cancelled' then
    raise exception 'Esta reserva ja foi cancelada.';
  end if;

  if v_reservation.status = 'confirmed' then
    raise exception 'A reserva ja esta confirmada.';
  end if;

  if v_reservation.status in ('checked_in', 'checked_out', 'completed') then
    raise exception 'Reserva ja encerrada nao pode ser confirmada.';
  end if;

  if v_reservation.status not in ('pending', 'awaiting_payment') then
    raise exception 'Status atual da reserva nao permite confirmacao.';
  end if;

  /*
    A casa e o item reservavel da V2. A validacao ignora unidade e protege contra
    overbooking ate que uma regra futura permita excecoes explicitas.
  */
  if exists (
    select 1
    from public.reservations r
    where r.tenant_id = v_reservation.tenant_id
      and r.property_id = v_reservation.property_id
      and r.id <> v_reservation.id
      and r.status in ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
      and r.check_in < v_reservation.check_out
      and r.check_out > v_reservation.check_in
  ) then
    raise exception 'Conflito de datas encontrado para esta casa.';
  end if;

  if exists (
    select 1
    from public.calendar_availability_blocks b
    where b.tenant_id = v_reservation.tenant_id
      and b.property_id = v_reservation.property_id
      and b.blocks_availability is true
      and b.status in (
        'blocked',
        'interdicted',
        'maintenance',
        'cleaning',
        'unavailable',
        'reserved'
      )
      and b.starts_on < v_reservation.check_out
      and b.ends_on > v_reservation.check_in
      and coalesce(
        b.reservation_id,
        '00000000-0000-0000-0000-000000000000'::uuid
      ) <> v_reservation.id
  ) then
    raise exception 'Conflito de datas encontrado para esta casa.';
  end if;

  update public.reservations
     set status = 'confirmed',
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
    'confirmed',
    p_user_id,
    v_reason,
    jsonb_build_object('origem', 'confirmacoes', 'atomic', true)
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

  /*
    O trigger sync_reservation_calendar_block roda dentro desta mesma transacao.
    Essa checagem evita sucesso visual se o bloqueio automatico nao existir.
  */
  if not exists (
    select 1
    from public.calendar_availability_blocks b
    where b.tenant_id = v_reservation.tenant_id
      and b.property_id = v_reservation.property_id
      and b.reservation_id = v_reservation.id
      and b.status = 'reserved'
      and b.starts_on = v_reservation.check_in
      and b.ends_on = v_reservation.check_out
      and b.blocks_availability is true
  ) then
    raise exception 'Nao foi possivel bloquear o periodo no calendario.';
  end if;

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'status',
    'confirmed'
  );
end;
$$;

comment on function app_private.confirm_reservation_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text
) is
  'Confirma reserva em transacao unica: valida tenant, permissao, conflitos, atualiza status, timeline e bloqueio de calendario por property_id.';

revoke all on function app_private.confirm_reservation_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text
) from public, anon;
grant execute on function app_private.confirm_reservation_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text
) to authenticated, service_role;

create or replace function public.confirm_reservation_operational(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.confirm_reservation_operational(
    p_reservation_id,
    p_tenant_id,
    p_owner_id,
    p_user_id,
    p_reason
  );
$$;

comment on function public.confirm_reservation_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text
) is
  'Entrada autenticada para confirmar reserva operacional sem expor detalhes administrativos ao frontend.';

revoke all on function public.confirm_reservation_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text
) from public, anon;
grant execute on function public.confirm_reservation_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text
) to authenticated;

notify pgrst, 'reload schema';
