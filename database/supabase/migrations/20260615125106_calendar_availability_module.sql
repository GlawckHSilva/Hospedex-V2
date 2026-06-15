/*
  Módulo de Calendário e Disponibilidade da V2.

  A disponibilidade é controlada por unidade, com bloqueios manuais e blocos
  derivados de reserva. Integrações .ics ficam preparadas por campos de origem,
  mas não são executadas nesta etapa.
*/

alter table public.units
  add column if not exists allow_overbooking boolean not null default false;
comment on column public.units.allow_overbooking is
  'Permite conflito intencional de calendário para a unidade. Deve ficar falso por padrão.';
create table if not exists public.calendar_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  reservation_id uuid references public.reservations(id) on delete set null,
  source text not null default 'manual'
    check (source in ('manual', 'reservation', 'period', 'ics_import')),
  status text not null default 'blocked'
    check (status in ('available', 'blocked', 'unavailable', 'reserved', 'released')),
  starts_on date not null,
  ends_on date not null,
  reason text,
  notes text,
  external_uid text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on > starts_on)
);
comment on table public.calendar_availability_blocks is
  'Blocos de disponibilidade por unidade. Usa intervalo [starts_on, ends_on) para alinhar check-in/check-out.';
comment on column public.calendar_availability_blocks.external_uid is
  'Reservado para importação/exportação .ics futura, sem integração real nesta etapa.';
create unique index if not exists calendar_availability_blocks_reservation_id_uidx
  on public.calendar_availability_blocks (reservation_id)
  where reservation_id is not null;
create index if not exists calendar_availability_blocks_tenant_idx
  on public.calendar_availability_blocks (tenant_id, property_id, unit_id);
create index if not exists calendar_availability_blocks_period_idx
  on public.calendar_availability_blocks (unit_id, starts_on, ends_on)
  where status in ('blocked', 'unavailable', 'reserved');
create or replace function app_private.calendar_block_is_active(target_status text)
returns boolean
language sql
immutable
as $$
  select target_status in ('blocked', 'unavailable', 'reserved');
$$;
create or replace function app_private.ensure_calendar_block_scope_and_conflict()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  unit_overbooking boolean;
begin
  if new.ends_on <= new.starts_on then
    raise exception 'A data final deve ser posterior à data inicial.';
  end if;

  select u.allow_overbooking
    into unit_overbooking
  from public.units u
  join public.properties p on p.id = u.property_id
  where u.id = new.unit_id
    and u.tenant_id = new.tenant_id
    and u.property_id = new.property_id
    and p.tenant_id = new.tenant_id
    and p.owner_id = new.owner_id
    and p.deleted_at is null;

  if unit_overbooking is null then
    raise exception 'Unidade não encontrada para este tenant.';
  end if;

  if new.reservation_id is not null then
    if not exists (
      select 1
      from public.reservations r
      where r.id = new.reservation_id
        and r.tenant_id = new.tenant_id
        and r.property_id = new.property_id
        and r.owner_id = new.owner_id
        and r.unit_id = new.unit_id
    ) then
      raise exception 'Reserva não pertence à unidade informada.';
    end if;
  end if;

  /*
    Overbooking é opt-in por unidade. Quando desativado, qualquer bloqueio ativo
    com interseção de datas impede outro bloqueio/reserva ativa no mesmo período.
  */
  if not unit_overbooking and app_private.calendar_block_is_active(new.status) then
    if exists (
      select 1
      from public.calendar_availability_blocks existing
      where existing.tenant_id = new.tenant_id
        and existing.unit_id = new.unit_id
        and existing.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
        and app_private.calendar_block_is_active(existing.status)
        and daterange(existing.starts_on, existing.ends_on, '[)') &&
            daterange(new.starts_on, new.ends_on, '[)')
    ) then
      raise exception 'Já existe indisponibilidade para esta unidade no período.';
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists ensure_calendar_block_scope_and_conflict
  on public.calendar_availability_blocks;
create trigger ensure_calendar_block_scope_and_conflict
before insert or update on public.calendar_availability_blocks
for each row execute function app_private.ensure_calendar_block_scope_and_conflict();
create or replace function app_private.sync_reservation_calendar_block()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  active_reservation boolean;
begin
  active_reservation := new.status in (
    'pending',
    'awaiting_payment',
    'confirmed',
    'checked_in'
  );

  if new.unit_id is null then
    update public.calendar_availability_blocks
      set status = 'released',
          notes = 'Reserva sem unidade vinculada.',
          updated_at = now()
    where reservation_id = new.id;
    return new;
  end if;

  if active_reservation then
    insert into public.calendar_availability_blocks (
      tenant_id,
      property_id,
      unit_id,
      owner_id,
      reservation_id,
      source,
      status,
      starts_on,
      ends_on,
      reason,
      notes,
      created_by
    )
    values (
      new.tenant_id,
      new.property_id,
      new.unit_id,
      new.owner_id,
      new.id,
      'reservation',
      'reserved',
      new.check_in,
      new.check_out,
      'Reserva ' || new.code,
      'Bloqueio automático gerado pela reserva.',
      new.created_by
    )
    on conflict (reservation_id) where reservation_id is not null
    do update set
      tenant_id = excluded.tenant_id,
      property_id = excluded.property_id,
      unit_id = excluded.unit_id,
      owner_id = excluded.owner_id,
      source = 'reservation',
      status = 'reserved',
      starts_on = excluded.starts_on,
      ends_on = excluded.ends_on,
      reason = excluded.reason,
      notes = excluded.notes,
      updated_at = now();
  else
    update public.calendar_availability_blocks
      set status = 'released',
          notes = 'Reserva liberada pelo status ' || new.status || '.',
          updated_at = now()
    where reservation_id = new.id;
  end if;

  return new;
end;
$$;
drop trigger if exists sync_reservation_calendar_block
  on public.reservations;
create trigger sync_reservation_calendar_block
after insert or update of unit_id, property_id, check_in, check_out, status
on public.reservations
for each row execute function app_private.sync_reservation_calendar_block();
insert into public.calendar_availability_blocks (
  tenant_id,
  property_id,
  unit_id,
  owner_id,
  reservation_id,
  source,
  status,
  starts_on,
  ends_on,
  reason,
  notes,
  created_by
)
select
  r.tenant_id,
  r.property_id,
  r.unit_id,
  r.owner_id,
  r.id,
  'reservation',
  'reserved',
  r.check_in,
  r.check_out,
  'Reserva ' || r.code,
  'Bloqueio automático gerado pela reserva.',
  r.created_by
from public.reservations r
where r.unit_id is not null
  and r.status in ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
on conflict (reservation_id) where reservation_id is not null
do update set
  tenant_id = excluded.tenant_id,
  property_id = excluded.property_id,
  unit_id = excluded.unit_id,
  owner_id = excluded.owner_id,
  status = 'reserved',
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  reason = excluded.reason,
  notes = excluded.notes,
  updated_at = now();
alter table public.calendar_availability_blocks enable row level security;
drop policy if exists "calendar_availability_blocks_select"
  on public.calendar_availability_blocks;
drop policy if exists "calendar_availability_blocks_manage"
  on public.calendar_availability_blocks;
create policy "calendar_availability_blocks_select"
on public.calendar_availability_blocks
for select to authenticated
using (
  app_private.can_access_property(tenant_id, property_id, 'reservations.read')
);
create policy "calendar_availability_blocks_manage"
on public.calendar_availability_blocks
for all to authenticated
using (
  source <> 'reservation'
  and app_private.can_access_property(tenant_id, property_id, 'reservations.manage')
)
with check (
  source <> 'reservation'
  and app_private.can_access_property(tenant_id, property_id, 'reservations.manage')
);
grant select, insert, update, delete on public.calendar_availability_blocks
to authenticated;
grant all on public.calendar_availability_blocks
to service_role;
