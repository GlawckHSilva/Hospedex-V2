/*
  Casa como fonte de disponibilidade publica.

  Remove a dependencia operacional de unidade no calendario da casa, preserva
  registros antigos e separa dados publicos de observacoes internas.
*/

alter table public.properties
  add column if not exists public_details jsonb not null default '{}'::jsonb;

comment on column public.properties.public_details is
  'Dados opcionais de exibicao e compartilhamento. Nao contem observacoes internas.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'properties_public_details_object_check'
      and conrelid = 'public.properties'::regclass
  ) then
    alter table public.properties
      add constraint properties_public_details_object_check
      check (jsonb_typeof(public_details) = 'object');
  end if;
end $$;

update public.properties
set public_details =
  jsonb_strip_nulls(
    jsonb_build_object(
      'displayName', name,
      'publicTitle', headline,
      'publicDescription', short_description
    )
  ) || public_details;

alter table public.property_settings
  add column if not exists allow_children boolean not null default true,
  add column if not exists special_instructions text,
  add column if not exists internal_notes text;

comment on column public.property_settings.special_instructions is
  'Instrucoes da hospedagem preparadas para exibicao futura ao hospede.';
comment on column public.property_settings.internal_notes is
  'Observacoes privadas do gerenciamento. Nunca devem ser expostas ao Marketplace.';

alter table public.calendar_availability_blocks
  alter column unit_id drop not null,
  add column if not exists block_type text not null default 'manual',
  add column if not exists blocks_availability boolean not null default true;

alter table public.calendar_availability_blocks
  drop constraint if exists calendar_availability_blocks_status_check;

alter table public.calendar_availability_blocks
  add constraint calendar_availability_blocks_status_check
  check (
    status in (
      'available',
      'blocked',
      'interdicted',
      'maintenance',
      'cleaning',
      'unavailable',
      'reserved',
      'released'
    )
  );

alter table public.calendar_availability_blocks
  drop constraint if exists calendar_availability_blocks_block_type_check;

alter table public.calendar_availability_blocks
  add constraint calendar_availability_blocks_block_type_check
  check (
    block_type in (
      'manual',
      'interdicted',
      'maintenance',
      'temporary_unavailable',
      'cleaning',
      'reservation'
    )
  );

comment on column public.calendar_availability_blocks.unit_id is
  'Referencia historica opcional. A disponibilidade da V2 e calculada por casa.';
comment on column public.calendar_availability_blocks.block_type is
  'Classificacao administrativa do periodo sem expor observacoes internas.';
comment on column public.calendar_availability_blocks.blocks_availability is
  'Define se o periodo realmente impede novas reservas para a casa.';
comment on column public.calendar_availability_blocks.notes is
  'Observacao interna do gerenciamento. Nao deve ser retornada ao hospede.';

drop trigger if exists ensure_calendar_block_scope_and_conflict
  on public.calendar_availability_blocks;

update public.calendar_availability_blocks
set
  unit_id = null,
  block_type = case
    when source = 'reservation' then 'reservation'
    when metadata ->> 'motivoCodigo' = 'maintenance' then 'maintenance'
    when metadata ->> 'motivoCodigo' = 'cleaning' then 'cleaning'
    when metadata ->> 'motivoCodigo' = 'interdicted' then 'interdicted'
    when metadata ->> 'motivoCodigo' = 'unavailable' then 'temporary_unavailable'
    else 'manual'
  end,
  status = case
    when source = 'reservation' then status
    when metadata ->> 'motivoCodigo' = 'maintenance' then 'maintenance'
    when metadata ->> 'motivoCodigo' = 'cleaning' then 'cleaning'
    when metadata ->> 'motivoCodigo' = 'interdicted' then 'interdicted'
    else status
  end;

drop index if exists public.calendar_availability_blocks_tenant_idx;
drop index if exists public.calendar_availability_blocks_period_idx;

create index calendar_availability_blocks_tenant_idx
  on public.calendar_availability_blocks (tenant_id, property_id);

create index calendar_availability_blocks_period_idx
  on public.calendar_availability_blocks (property_id, starts_on, ends_on)
  where blocks_availability
    and status in (
      'blocked',
      'interdicted',
      'maintenance',
      'cleaning',
      'unavailable',
      'reserved'
    );

create or replace function app_private.calendar_block_is_active(target_status text)
returns boolean
language sql
immutable
as $$
  select target_status in (
    'blocked',
    'interdicted',
    'maintenance',
    'cleaning',
    'unavailable',
    'reserved'
  );
$$;

create or replace function app_private.ensure_calendar_block_scope_and_conflict()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if new.ends_on <= new.starts_on then
    raise exception 'A data final deve ser posterior a data inicial.';
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

  -- A casa e o item reservavel da V2. O calendario nao depende de unidade ativa.
  new.unit_id := null;

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

  if new.blocks_availability and app_private.calendar_block_is_active(new.status) then
    if exists (
      select 1
      from public.calendar_availability_blocks existing
      where existing.tenant_id = new.tenant_id
        and existing.property_id = new.property_id
        and existing.id <> coalesce(
          new.id,
          '00000000-0000-0000-0000-000000000000'::uuid
        )
        and existing.blocks_availability
        and app_private.calendar_block_is_active(existing.status)
        and daterange(existing.starts_on, existing.ends_on, '[)') &&
            daterange(new.starts_on, new.ends_on, '[)')
    ) then
      raise exception 'Ja existe indisponibilidade para esta casa no periodo.';
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.sync_reservation_calendar_block()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  active_reservation boolean;
begin
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
      'Reserva confirmada',
      'Bloqueio automatico gerado pela reserva.',
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
      set
        status = 'released',
        blocks_availability = false,
        notes = 'Reserva liberada pelo status ' || new.status || '.',
        updated_at = now()
    where reservation_id = new.id;
  end if;

  return new;
end;
$$;

update public.calendar_availability_blocks b
set
  status = case
    when r.status in ('confirmed', 'checked_in') then 'reserved'
    else 'released'
  end,
  block_type = 'reservation',
  blocks_availability = r.status in ('confirmed', 'checked_in'),
  unit_id = null,
  updated_at = now()
from public.reservations r
where b.reservation_id = r.id;

create trigger ensure_calendar_block_scope_and_conflict
before insert or update on public.calendar_availability_blocks
for each row execute function app_private.ensure_calendar_block_scope_and_conflict();
