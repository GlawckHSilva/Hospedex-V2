/*
  Modulo de Hospedes e CRM da V2.

  Consolida hospedes por tenant sem depender do marketplace. Dados de CRM,
  avaliacao interna e observacoes privadas ficam separados das reservas para
  preparar WhatsApp, e-mail, campanhas, fidelizacao, cupons e aniversarios.
*/

create table if not exists public.crm_guests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  full_name text not null,
  email text,
  phone text,
  document_number text,
  city text,
  state text,
  birth_date date,
  status text not null default 'active'
    check (status in ('active', 'blocked', 'deleted')),
  internal_rating text not null default 'neutral'
    check (internal_rating in ('excellent', 'good', 'neutral', 'attention', 'blocked')),
  private_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.crm_guests is
  'Perfis consolidados de hospedes por tenant. Preparado para CRM sem enviar mensagens automaticamente.';
comment on column public.crm_guests.private_notes is
  'Observacoes privadas do proprietario; nunca devem ser expostas ao hospede.';
comment on column public.crm_guests.metadata is
  'Espaco controlado para WhatsApp, e-mail, campanhas, fidelizacao, cupons e aniversarios futuros.';

create index if not exists crm_guests_tenant_status_idx
  on public.crm_guests (tenant_id, status, full_name);
create index if not exists crm_guests_email_idx
  on public.crm_guests (tenant_id, lower(email))
  where email is not null and deleted_at is null;
create index if not exists crm_guests_phone_idx
  on public.crm_guests (tenant_id, phone)
  where phone is not null and deleted_at is null;
create index if not exists crm_guests_document_idx
  on public.crm_guests (tenant_id, document_number)
  where document_number is not null and deleted_at is null;

drop trigger if exists set_crm_guests_updated_at on public.crm_guests;
create trigger set_crm_guests_updated_at
before update on public.crm_guests
for each row execute function app_private.set_updated_at();

alter table public.crm_guests enable row level security;

drop policy if exists "crm_guests_select" on public.crm_guests;
drop policy if exists "crm_guests_manage" on public.crm_guests;

create policy "crm_guests_select"
on public.crm_guests
for select to authenticated
using (
  app_private.has_tenant_permission(tenant_id, 'reservations.read')
);

create policy "crm_guests_manage"
on public.crm_guests
for all to authenticated
using (
  app_private.has_tenant_permission(tenant_id, 'reservations.manage')
)
with check (
  app_private.has_tenant_permission(tenant_id, 'reservations.manage')
);

grant select, insert, update, delete on public.crm_guests to authenticated;
grant all on public.crm_guests to service_role;

insert into public.crm_guests (
  tenant_id,
  owner_id,
  full_name,
  email,
  phone,
  document_number,
  metadata
)
select distinct on (
  rg.tenant_id,
  coalesce(lower(nullif(rg.email, '')), nullif(rg.phone, ''), nullif(rg.document_number, ''), lower(rg.full_name))
)
  rg.tenant_id,
  r.owner_id,
  rg.full_name,
  nullif(rg.email, ''),
  nullif(rg.phone, ''),
  nullif(rg.document_number, ''),
  jsonb_build_object('origem', 'backfill_reservas')
from public.reservation_guests rg
join public.reservations r on r.id = rg.reservation_id
where rg.is_primary = true
  and not exists (
    select 1
    from public.crm_guests cg
    where cg.tenant_id = rg.tenant_id
      and cg.deleted_at is null
      and (
        (rg.email is not null and lower(cg.email) = lower(rg.email))
        or (rg.phone is not null and cg.phone = rg.phone)
        or (rg.document_number is not null and cg.document_number = rg.document_number)
      )
  )
order by
  rg.tenant_id,
  coalesce(lower(nullif(rg.email, '')), nullif(rg.phone, ''), nullif(rg.document_number, ''), lower(rg.full_name)),
  rg.created_at desc;
