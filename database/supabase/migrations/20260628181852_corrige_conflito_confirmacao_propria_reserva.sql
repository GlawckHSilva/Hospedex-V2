/*
  Corrige falso conflito ao confirmar reserva pendente.

  Reservas pendentes ja podem ter um bloqueio automatico no calendario. Ao
  confirmar, o trigger de sincronizacao faz INSERT ... ON CONFLICT para atualizar
  esse mesmo bloqueio. Como triggers BEFORE INSERT rodam antes do ON CONFLICT, a
  validacao precisa ignorar bloqueios vinculados ao mesmo reservation_id.
*/
create or replace function app_private.ensure_calendar_block_scope_and_conflict()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
begin
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

comment on function app_private.ensure_calendar_block_scope_and_conflict() is
  'Valida escopo multi-tenant e conflitos do calendario, ignorando o bloqueio automatico da propria reserva.';

notify pgrst, 'reload schema';
