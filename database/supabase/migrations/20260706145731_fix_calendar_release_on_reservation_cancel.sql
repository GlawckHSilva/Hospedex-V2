/*
  Corrige a liberacao do calendario quando uma reserva e cancelada.

  A RPC de cancelamento valida que nenhum bloqueio da reserva continua
  bloqueando disponibilidade. O trigger anterior alterava o status para
  released em algumas versoes, mas podia deixar blocks_availability=true.
*/

create or replace function app_private.sync_reservation_calendar_block()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  active_reservation boolean;
begin
  /*
    Na V2 a casa/propriedade e o item reservavel. Apenas reservas realmente
    confirmadas ou em hospedagem bloqueiam o calendario publico/operacional.
  */
  active_reservation := new.status in ('confirmed', 'checked_in');

  if active_reservation then
    insert into public.calendar_availability_blocks (
      tenant_id,
      property_id,
      unit_id,
      owner_id,
      reservation_id,
      source,
      status,
      block_type,
      blocks_availability,
      starts_on,
      ends_on,
      reason,
      notes,
      created_by
    )
    values (
      new.tenant_id,
      new.property_id,
      null,
      new.owner_id,
      new.id,
      'reservation',
      'reserved',
      'reservation',
      true,
      new.check_in,
      new.check_out,
      'Reserva ' || new.code,
      'Bloqueio automatico gerado pela reserva confirmada.',
      new.created_by
    )
    on conflict (reservation_id) where reservation_id is not null
    do update set
      tenant_id = excluded.tenant_id,
      property_id = excluded.property_id,
      unit_id = null,
      owner_id = excluded.owner_id,
      source = 'reservation',
      status = 'reserved',
      block_type = 'reservation',
      blocks_availability = true,
      starts_on = excluded.starts_on,
      ends_on = excluded.ends_on,
      reason = excluded.reason,
      notes = excluded.notes,
      updated_at = now();
  else
    update public.calendar_availability_blocks
       set tenant_id = new.tenant_id,
           property_id = new.property_id,
           owner_id = new.owner_id,
           status = 'released',
           block_type = 'reservation',
           blocks_availability = false,
           unit_id = null,
           notes = 'Reserva liberada pelo status ' || new.status || '.',
           updated_at = now()
     where reservation_id = new.id;
  end if;

  return new;
end;
$$;

create or replace function app_private.ensure_calendar_block_scope_and_conflict()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
begin
  /*
    Liberar um bloqueio antigo nao pode ficar preso por validacoes de escopo,
    porque o objetivo e justamente deixar de bloquear o calendario.
  */
  if new.status = 'released' and new.blocks_availability is false then
    new.unit_id = null;
    new.updated_at = now();
    return new;
  end if;

  if app_private.calendar_block_effective_ends_on(
    new.source,
    new.block_type,
    new.reservation_id,
    new.ends_on
  ) <= new.starts_on then
    raise exception 'Periodo invalido para o calendario.';
  end if;

  if not exists (
    select 1
    from public.properties p
    where p.id = new.property_id
      and p.tenant_id = new.tenant_id
      and p.owner_id = new.owner_id
      and p.deleted_at is null
  ) then
    raise exception 'Casa nao encontrada para este tenant.';
  end if;

  if new.reservation_id is not null and not exists (
    select 1
    from public.reservations r
    where r.id = new.reservation_id
      and r.tenant_id = new.tenant_id
      and r.property_id = new.property_id
      and r.owner_id = new.owner_id
  ) then
    raise exception 'Reserva nao pertence a casa informada.';
  end if;

  if app_private.calendar_block_is_active(new.status) and exists (
    select 1
    from public.calendar_availability_blocks existing
    where existing.tenant_id = new.tenant_id
      and existing.property_id = new.property_id
      and existing.id <> coalesce(
        new.id,
        '00000000-0000-0000-0000-000000000000'::uuid
      )
      and (
        new.reservation_id is null
        or existing.reservation_id is distinct from new.reservation_id
      )
      and app_private.calendar_block_is_active(existing.status)
      and daterange(
        existing.starts_on,
        app_private.calendar_block_effective_ends_on(
          existing.source,
          existing.block_type,
          existing.reservation_id,
          existing.ends_on
        ),
        '[)'
      ) &&
      daterange(
        new.starts_on,
        app_private.calendar_block_effective_ends_on(
          new.source,
          new.block_type,
          new.reservation_id,
          new.ends_on
        ),
        '[)'
      )
  ) then
    raise exception 'Ja existe indisponibilidade para esta casa no periodo.';
  end if;

  new.unit_id = null;
  new.updated_at = now();
  return new;
end;
$$;

update public.calendar_availability_blocks bloco
   set tenant_id = reserva.tenant_id,
       property_id = reserva.property_id,
       owner_id = reserva.owner_id,
       status = 'released',
       block_type = 'reservation',
       blocks_availability = false,
       unit_id = null,
       notes = 'Reserva liberada por correcao de cancelamento.',
       updated_at = now()
  from public.reservations reserva
 where bloco.reservation_id = reserva.id
   and reserva.status not in ('confirmed', 'checked_in')
   and bloco.blocks_availability is true;
