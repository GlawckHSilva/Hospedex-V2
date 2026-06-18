-- Avaliacoes internas do Gerenciamento.
-- Esta estrutura prepara publicacao futura, mas nesta etapa somente o painel
-- administrativo autenticado pode ler, responder e ocultar avaliacoes.

insert into public.permissions (code, name, module, description) values
  ('reviews.read', 'Ver avaliacoes', 'reviews', 'Permite visualizar avaliacoes internas do tenant.'),
  ('reviews.manage', 'Gerenciar avaliacoes', 'reviews', 'Permite responder e moderar avaliacoes internas.')
on conflict (code) do update set
  name = excluded.name,
  module = excluded.module,
  description = excluded.description;

with mapa(role_code, permission_code) as (
  values
    ('administrador', 'reviews.read'),
    ('administrador', 'reviews.manage'),
    ('recepcao', 'reviews.read')
)
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join mapa on mapa.role_code = roles.code
join public.permissions on permissions.code = mapa.permission_code
where roles.tenant_id is not null
on conflict (role_id, permission_id) do nothing;

create table if not exists public.property_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete set null,
  guest_name text not null,
  guest_email text,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  reviewed_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'hidden')),
  owner_response text,
  owner_responded_at timestamptz,
  response_author_id uuid references public.profiles(id) on delete set null,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.property_reviews is
  'Avaliacoes internas por casa. Publicacao no marketplace, fotos, curtidas e ranking ficam para etapas futuras.';
comment on column public.property_reviews.tenant_id is
  'Tenant dono da avaliacao. Garante isolamento entre proprietarios.';
comment on column public.property_reviews.metadata is
  'Reservado para extensoes futuras como fotos, origem publica, curtidas e respostas do hospede.';

create index if not exists property_reviews_tenant_status_idx
  on public.property_reviews (tenant_id, status, reviewed_at desc);
create index if not exists property_reviews_property_idx
  on public.property_reviews (tenant_id, property_id, rating);
create index if not exists property_reviews_reservation_idx
  on public.property_reviews (reservation_id)
  where reservation_id is not null;

create or replace function app_private.ensure_property_review_scope()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  property_owner uuid;
begin
  select properties.owner_id
    into property_owner
  from public.properties
  where properties.id = new.property_id
    and properties.tenant_id = new.tenant_id
    and properties.deleted_at is null;

  if property_owner is null then
    raise exception 'Casa nao encontrada para este tenant.';
  end if;

  -- O owner vem da casa para impedir que o cliente envie outro proprietario.
  new.owner_id := property_owner;

  if new.reservation_id is not null then
    if not exists (
      select 1
      from public.reservations
      where reservations.id = new.reservation_id
        and reservations.tenant_id = new.tenant_id
        and reservations.property_id = new.property_id
        and reservations.owner_id = new.owner_id
    ) then
      raise exception 'Reserva nao pertence a casa informada.';
    end if;
  end if;

  if new.status <> 'hidden' then
    new.hidden_at := null;
    new.hidden_by := null;
  elsif new.hidden_at is null then
    new.hidden_at := now();
  end if;

  if new.owner_response is null then
    new.owner_responded_at := null;
    new.response_author_id := null;
  elsif new.owner_responded_at is null then
    new.owner_responded_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ensure_property_review_scope on public.property_reviews;
create trigger ensure_property_review_scope
before insert or update on public.property_reviews
for each row execute function app_private.ensure_property_review_scope();

alter table public.property_reviews enable row level security;

drop policy if exists "property_reviews_select_manager" on public.property_reviews;
drop policy if exists "property_reviews_insert_manager" on public.property_reviews;
drop policy if exists "property_reviews_update_manager" on public.property_reviews;
drop policy if exists "property_reviews_delete_manager" on public.property_reviews;

create policy "property_reviews_select_manager"
on public.property_reviews
for select to authenticated
using (
  app_private.can_access_property(tenant_id, property_id, 'reviews.read')
);

create policy "property_reviews_insert_manager"
on public.property_reviews
for insert to authenticated
with check (
  app_private.can_access_property(tenant_id, property_id, 'reviews.manage')
);

create policy "property_reviews_update_manager"
on public.property_reviews
for update to authenticated
using (
  app_private.can_access_property(tenant_id, property_id, 'reviews.manage')
)
with check (
  app_private.can_access_property(tenant_id, property_id, 'reviews.manage')
);

create policy "property_reviews_delete_manager"
on public.property_reviews
for delete to authenticated
using (
  app_private.can_access_property(tenant_id, property_id, 'reviews.manage')
);

-- Grants explicitos mantem a tabela disponivel via Data API em projetos novos;
-- a RLS acima continua definindo quais linhas cada usuario autenticado acessa.
grant select, insert, update, delete on public.property_reviews to authenticated;
grant all on public.property_reviews to service_role;
