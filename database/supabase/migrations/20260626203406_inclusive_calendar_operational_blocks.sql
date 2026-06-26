/*
  Corrige a semantica dos bloqueios operacionais do calendario.

  Regra de negocio:
  - reservas continuam usando checkout exclusivo: [check_in, check_out);
  - bloqueios operacionais por casa usam fim inclusivo: [inicio, fim].

  A funcao abaixo converte qualquer bloqueio para um fim exclusivo efetivo
  somente para comparacao de conflito, calendario e contrato publico.
*/

create or replace function app_private.calendar_block_effective_ends_on(
  p_source text,
  p_block_type text,
  p_reservation_id uuid,
  p_ends_on date
)
returns date
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when p_source = 'reservation'
      or p_block_type = 'reservation'
      or p_reservation_id is not null
      then p_ends_on
    else p_ends_on + 1
  end;
$$;

comment on function app_private.calendar_block_effective_ends_on(text, text, uuid, date) is
  'Converte fim inclusivo de bloqueio operacional em fim exclusivo efetivo sem alterar reservas.';

alter table public.calendar_availability_blocks
  drop constraint if exists calendar_availability_blocks_check;

alter table public.calendar_availability_blocks
  drop constraint if exists calendar_availability_blocks_valid_period_check;

do $$
declare
  constraint_name name;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.calendar_availability_blocks'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%ends_on%'
      and pg_get_constraintdef(oid) like '%starts_on%'
  loop
    execute format(
      'alter table public.calendar_availability_blocks drop constraint if exists %I',
      constraint_name
    );
  end loop;
end;
$$;

alter table public.calendar_availability_blocks
  add constraint calendar_availability_blocks_valid_period_check
  check (
    app_private.calendar_block_effective_ends_on(
      source,
      block_type,
      reservation_id,
      ends_on
    ) > starts_on
  );

comment on table public.calendar_availability_blocks is
  'Blocos de disponibilidade por casa. Reservas usam checkout exclusivo; bloqueios operacionais usam fim inclusivo.';

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

create or replace function public.get_public_property_availability(
  p_property_ids uuid[],
  p_starts_on date default current_date,
  p_ends_on date default (current_date + 365)
)
returns table (
  property_id uuid,
  starts_on date,
  ends_on date,
  status text
)
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  with blocos as (
    select
      bloco.property_id,
      bloco.starts_on,
      app_private.calendar_block_effective_ends_on(
        bloco.source,
        bloco.block_type,
        bloco.reservation_id,
        bloco.ends_on
      ) as effective_ends_on,
      bloco.status
    from public.calendar_availability_blocks bloco
    where p_property_ids is not null
      and bloco.property_id = any(p_property_ids)
      and bloco.property_id is not null
      and bloco.blocks_availability is true
      and bloco.status in (
        'blocked',
        'interdicted',
        'maintenance',
        'cleaning',
        'unavailable',
        'reserved'
      )
      and app_private.is_marketplace_property_public(bloco.property_id)
  )
  select
    blocos.property_id,
    greatest(blocos.starts_on, coalesce(p_starts_on, current_date))::date as starts_on,
    least(blocos.effective_ends_on, coalesce(p_ends_on, current_date + 365))::date as ends_on,
    case blocos.status
      when 'reserved' then 'reserved'
      when 'blocked' then 'blocked'
      when 'maintenance' then 'maintenance'
      when 'cleaning' then 'cleaning'
      when 'interdicted' then 'interdicted'
      else 'unavailable'
    end as status
  from blocos
  where blocos.starts_on < coalesce(p_ends_on, current_date + 365)
    and blocos.effective_ends_on > coalesce(p_starts_on, current_date)
  order by blocos.starts_on, blocos.effective_ends_on;
$$;

comment on function public.get_public_property_availability(uuid[], date, date) is
  'Retorna somente periodos e status publicos de disponibilidade por casa, com bloqueios operacionais inclusivos.';

revoke all on function public.get_public_property_availability(uuid[], date, date)
  from public;
grant execute on function public.get_public_property_availability(uuid[], date, date)
  to anon, authenticated;

notify pgrst, 'reload schema';
