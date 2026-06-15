/*
  Responsável por evoluir a base de Reservas da V2.

  A estrutura inicial já existia no schema multi-tenant. Esta migration amplia
  os estados operacionais, adiciona serviços extras e cria observações separadas
  para manter histórico, atendimento e futuras integrações sem misturar dados.
*/

do $$
begin
  -- "draft" era um estado técnico inicial. A V2 passa a operar com "pending".
  update public.reservations
  set status = 'pending'
  where status = 'draft';

  alter table public.reservations
    drop constraint if exists reservations_status_check;

  alter table public.reservations
    add constraint reservations_status_check
    check (
      status in (
        'pending',
        'awaiting_payment',
        'confirmed',
        'checked_in',
        'checked_out',
        'completed',
        'cancelled'
      )
    );

  alter table public.reservations
    alter column status set default 'pending';
end $$;

alter table public.reservations
  add column if not exists guest_notes text,
  add column if not exists internal_notes text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id) on delete set null,
  add column if not exists cancellation_reason text,
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_out_at timestamptz;

comment on column public.reservations.guest_notes is
  'Observações visíveis ao hóspede em etapas futuras de WhatsApp e check-in.';
comment on column public.reservations.internal_notes is
  'Observações internas do tenant; não devem ser expostas ao hóspede.';
comment on column public.reservations.cancellation_reason is
  'Motivo operacional do cancelamento para auditoria e atendimento.';

do $$
begin
  alter table public.reservation_status_history
    drop constraint if exists reservation_status_history_from_status_check;

  alter table public.reservation_status_history
    drop constraint if exists reservation_status_history_to_status_check;

  alter table public.reservation_status_history
    add constraint reservation_status_history_from_status_check
    check (
      from_status is null or from_status in (
        'pending',
        'awaiting_payment',
        'confirmed',
        'checked_in',
        'checked_out',
        'completed',
        'cancelled'
      )
    );

  alter table public.reservation_status_history
    add constraint reservation_status_history_to_status_check
    check (
      to_status in (
        'pending',
        'awaiting_payment',
        'confirmed',
        'checked_in',
        'checked_out',
        'completed',
        'cancelled'
      )
    );
end $$;

alter table public.reservation_status_history
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.reservation_extra_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  name text not null,
  description text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  currency char(3) not null default 'BRL',
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reservation_extra_services is
  'Serviços extras vinculados à reserva; prepara cobrança futura sem implementar gateway.';

create table if not exists public.reservation_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  note_type text not null default 'internal' check (note_type in ('internal', 'guest', 'system')),
  content text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.reservation_notes is
  'Linha do tempo textual da reserva; separa atendimento, observações internas e eventos futuros.';

create index if not exists reservation_status_history_reservation_id_idx
  on public.reservation_status_history (reservation_id);
create index if not exists reservation_status_history_created_at_idx
  on public.reservation_status_history (created_at);
create index if not exists reservation_extra_services_tenant_id_idx
  on public.reservation_extra_services (tenant_id);
create index if not exists reservation_extra_services_reservation_id_idx
  on public.reservation_extra_services (reservation_id);
create index if not exists reservation_notes_tenant_id_idx
  on public.reservation_notes (tenant_id);
create index if not exists reservation_notes_reservation_id_idx
  on public.reservation_notes (reservation_id);

alter table public.reservation_extra_services enable row level security;
alter table public.reservation_notes enable row level security;

drop policy if exists "reservation_extra_services_select" on public.reservation_extra_services;
drop policy if exists "reservation_extra_services_manage" on public.reservation_extra_services;
drop policy if exists "reservation_notes_select" on public.reservation_notes;
drop policy if exists "reservation_notes_manage" on public.reservation_notes;

create policy "reservation_extra_services_select" on public.reservation_extra_services
for select to authenticated
using (
  exists (
    select 1 from public.reservations r
    where r.id = reservation_id
      and r.tenant_id = tenant_id
      and app_private.can_access_property(r.tenant_id, r.property_id, 'reservations.read')
  )
);

create policy "reservation_extra_services_manage" on public.reservation_extra_services
for all to authenticated
using (
  exists (
    select 1 from public.reservations r
    where r.id = reservation_id
      and r.tenant_id = tenant_id
      and app_private.can_access_property(r.tenant_id, r.property_id, 'reservations.manage')
  )
)
with check (
  exists (
    select 1 from public.reservations r
    where r.id = reservation_id
      and r.tenant_id = tenant_id
      and app_private.can_access_property(r.tenant_id, r.property_id, 'reservations.manage')
  )
);

create policy "reservation_notes_select" on public.reservation_notes
for select to authenticated
using (
  exists (
    select 1 from public.reservations r
    where r.id = reservation_id
      and r.tenant_id = tenant_id
      and app_private.can_access_property(r.tenant_id, r.property_id, 'reservations.read')
  )
);

create policy "reservation_notes_manage" on public.reservation_notes
for all to authenticated
using (
  exists (
    select 1 from public.reservations r
    where r.id = reservation_id
      and r.tenant_id = tenant_id
      and app_private.can_access_property(r.tenant_id, r.property_id, 'reservations.manage')
  )
)
with check (
  exists (
    select 1 from public.reservations r
    where r.id = reservation_id
      and r.tenant_id = tenant_id
      and app_private.can_access_property(r.tenant_id, r.property_id, 'reservations.manage')
  )
);

drop trigger if exists set_reservation_extra_services_updated_at
  on public.reservation_extra_services;

create trigger set_reservation_extra_services_updated_at
before update on public.reservation_extra_services
for each row execute function app_private.set_updated_at();

grant select on
  public.reservation_extra_services,
  public.reservation_notes
to authenticated;

grant all on
  public.reservation_extra_services,
  public.reservation_notes
to service_role;
