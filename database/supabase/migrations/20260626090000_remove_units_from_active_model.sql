/*
  Remove unidades do modelo operacional da V2.

  A casa/propriedade passa a ser o recurso reservavel. As colunas unit_id e as
  tabelas antigas permanecem temporariamente para compatibilidade e auditoria,
  mas nenhum fluxo novo depende delas.
*/

alter table public.calendar_availability_blocks
  alter column unit_id drop not null;

update public.reservations set unit_id = null where unit_id is not null;
update public.calendar_availability_blocks set unit_id = null where unit_id is not null;
update public.cleaning_tasks set unit_id = null where unit_id is not null;
update public.inventory_items set unit_id = null where unit_id is not null;
update public.maintenance_tasks set unit_id = null where unit_id is not null;
update public.media_assets set unit_id = null where unit_id is not null;

drop index if exists public.calendar_availability_blocks_tenant_idx;
drop index if exists public.calendar_availability_blocks_period_idx;

create index if not exists calendar_availability_blocks_tenant_property_idx
  on public.calendar_availability_blocks (tenant_id, property_id);

create index if not exists calendar_availability_blocks_property_period_idx
  on public.calendar_availability_blocks (property_id, starts_on, ends_on)
  where status in ('blocked', 'unavailable', 'reserved');

comment on table public.calendar_availability_blocks is
  'Disponibilidade por casa/propriedade. unit_id existe apenas para compatibilidade legada.';

comment on column public.calendar_availability_blocks.unit_id is
  'Campo legado sem uso nos fluxos da V2. Novos registros devem manter null.';

/*
  O escopo do calendario e validado pela propriedade e pelo tenant. Isso evita
  misturar bloqueios de casas diferentes mesmo quando o usuario possui acesso a
  mais de uma propriedade.
*/
create or replace function app_private.ensure_calendar_block_scope_and_conflict()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
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
      and daterange(existing.starts_on, existing.ends_on, '[)') &&
          daterange(new.starts_on, new.ends_on, '[)')
  ) then
    raise exception 'Ja existe indisponibilidade para esta casa no periodo.';
  end if;

  new.unit_id = null;
  new.updated_at = now();
  return new;
end;
$$;

/*
  Reservas ativas geram um unico bloqueio para a casa. A sincronizacao nao
  depende mais de unidade e preserva o historico ao liberar reservas canceladas.
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
  active_reservation := new.status in (
    'pending',
    'awaiting_payment',
    'confirmed',
    'checked_in'
  );

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
      null,
      new.owner_id,
      new.id,
      'reservation',
      'reserved',
      new.check_in,
      new.check_out,
      'Reserva ' || new.code,
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
      starts_on = excluded.starts_on,
      ends_on = excluded.ends_on,
      reason = excluded.reason,
      notes = excluded.notes,
      updated_at = now();
  else
    update public.calendar_availability_blocks
      set status = 'released',
          unit_id = null,
          notes = 'Reserva liberada pelo status ' || new.status || '.',
          updated_at = now()
    where reservation_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_reservation_calendar_block on public.reservations;
create trigger sync_reservation_calendar_block
after insert or update of property_id, check_in, check_out, status
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
  null,
  r.owner_id,
  r.id,
  'reservation',
  'reserved',
  r.check_in,
  r.check_out,
  'Reserva ' || r.code,
  'Bloqueio automatico gerado pela reserva.',
  r.created_by
from public.reservations r
where r.status in ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
on conflict (reservation_id) where reservation_id is not null
do update set
  tenant_id = excluded.tenant_id,
  property_id = excluded.property_id,
  unit_id = null,
  owner_id = excluded.owner_id,
  status = 'reserved',
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  reason = excluded.reason,
  notes = excluded.notes,
  updated_at = now();

/*
  A vitrine publica depende da casa publicada, tenant/licenca validos e feature
  flag. A existencia de uma unidade nao participa mais da regra.
*/
create or replace function app_private.is_marketplace_property_public(
  target_property_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select exists (
    select 1
    from public.properties p
    join public.tenants t
      on t.id = p.tenant_id
     and t.owner_id = p.owner_id
    where p.id = target_property_id
      and p.is_public is true
      and p.status = 'published'
      and p.deleted_at is null
      and t.deleted_at is null
      and t.status in ('trial', 'active')
      and app_private.marketplace_visibility_enabled(p.tenant_id)
      and exists (
        select 1
        from public.licenses l
        where l.tenant_id = p.tenant_id
          and l.owner_id = p.owner_id
          and l.status in ('trial', 'active')
          and l.starts_at <= current_date
          and (l.expires_at is null or l.expires_at >= current_date)
      )
  );
$$;

comment on function app_private.is_marketplace_property_public(uuid) is
  'Exige casa publica, tenant e licenca validos e feature flag ativa.';

/*
  Cria a solicitacao publica diretamente para a casa. O bloqueio da linha da
  propriedade serializa chamadas concorrentes e evita dupla reserva no periodo.
*/
create or replace function app_private.request_public_reservation(
  p_property_slug text,
  p_check_in date,
  p_check_out date,
  p_guests_count integer,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_guest_document text default null,
  p_guest_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_property public.properties%rowtype;
  v_reservation_id uuid;
  v_code text;
  v_daily_price numeric(12, 2) := 0;
  v_max_guests integer := 1;
  v_total numeric(12, 2);
  v_guest_name text := nullif(btrim(p_guest_name), '');
  v_guest_phone text := nullif(btrim(p_guest_phone), '');
  v_guest_email text := lower(nullif(btrim(p_guest_email), ''));
  v_guest_document text := nullif(btrim(p_guest_document), '');
  v_guest_notes text := nullif(btrim(p_guest_notes), '');
begin
  if nullif(btrim(p_property_slug), '') is null then
    raise exception 'Propriedade invalida.';
  end if;

  if p_check_in is null or p_check_out is null then
    raise exception 'Informe check-in e check-out.';
  end if;

  if p_check_in < current_date then
    raise exception 'Check-in nao pode ser no passado.';
  end if;

  if p_check_out <= p_check_in then
    raise exception 'Check-out deve ser depois do check-in.';
  end if;

  if p_guests_count is null or p_guests_count < 1 then
    raise exception 'Quantidade de hospedes invalida.';
  end if;

  if v_guest_name is null then
    raise exception 'Informe o nome do hospede.';
  end if;

  if v_guest_phone is null then
    raise exception 'Informe o telefone do hospede.';
  end if;

  if v_guest_email is null then
    raise exception 'Informe o e-mail do hospede.';
  end if;

  select p.*
    into v_property
  from public.properties p
  where p.slug = btrim(p_property_slug)
    and app_private.is_marketplace_property_public(p.id)
  limit 1
  for update;

  if v_property.id is null then
    raise exception 'Propriedade nao encontrada ou indisponivel.';
  end if;

  select greatest(
      coalesce(
        ps.max_guests,
        case
          when jsonb_typeof(v_property.structure_details -> 'hospedesMaximos') = 'number'
            then (v_property.structure_details ->> 'hospedesMaximos')::integer
          else null
        end,
        1
      ),
      1
    )
    into v_max_guests
  from (select 1) base
  left join public.property_settings ps
    on ps.property_id = v_property.id
   and ps.tenant_id = v_property.tenant_id;

  if p_guests_count > v_max_guests then
    raise exception 'Quantidade de hospedes acima da capacidade da casa.';
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.tenant_id = v_property.tenant_id
      and r.property_id = v_property.id
      and r.status in ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
      and r.check_in < p_check_out
      and r.check_out > p_check_in
  ) then
    raise exception 'A casa ja possui solicitacao ou reserva neste periodo.';
  end if;

  if exists (
    select 1
    from public.calendar_availability_blocks b
    where b.tenant_id = v_property.tenant_id
      and b.property_id = v_property.id
      and b.status in ('blocked', 'unavailable', 'reserved')
      and b.starts_on < p_check_out
      and b.ends_on > p_check_in
  ) then
    raise exception 'A casa esta bloqueada neste periodo.';
  end if;

  if jsonb_typeof(v_property.pricing_details -> 'valorDiaria') = 'number' then
    v_daily_price := greatest(
      (v_property.pricing_details ->> 'valorDiaria')::numeric,
      0
    );
  end if;

  loop
    v_code := 'MKT-' || to_char(current_date, 'YYYYMMDD') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

    exit when not exists (
      select 1
      from public.reservations r
      where r.tenant_id = v_property.tenant_id
        and r.code = v_code
    );
  end loop;

  v_total := greatest((p_check_out - p_check_in), 1) * v_daily_price;

  insert into public.reservations (
    tenant_id,
    property_id,
    unit_id,
    owner_id,
    code,
    status,
    source,
    check_in,
    check_out,
    guests_count,
    total_amount,
    currency,
    notes,
    guest_notes,
    internal_notes,
    created_by
  ) values (
    v_property.tenant_id,
    v_property.id,
    null,
    v_property.owner_id,
    v_code,
    'pending',
    'marketplace',
    p_check_in,
    p_check_out,
    p_guests_count,
    v_total,
    'BRL',
    v_guest_notes,
    v_guest_notes,
    'Solicitacao criada pelo marketplace publico.',
    null
  )
  returning id into v_reservation_id;

  insert into public.reservation_guests (
    tenant_id,
    reservation_id,
    full_name,
    email,
    phone,
    document_number,
    is_primary
  ) values (
    v_property.tenant_id,
    v_reservation_id,
    v_guest_name,
    v_guest_email,
    v_guest_phone,
    v_guest_document,
    true
  );

  update public.crm_guests
     set full_name = v_guest_name,
         email = coalesce(v_guest_email, email),
         phone = coalesce(v_guest_phone, phone),
         document_number = coalesce(v_guest_document, document_number),
         status = 'active',
         metadata = coalesce(metadata, '{}'::jsonb) ||
           jsonb_build_object(
             'ultima_origem',
             'marketplace',
             'ultima_reserva_id',
             v_reservation_id
           ),
         updated_at = now()
   where id = (
     select cg.id
     from public.crm_guests cg
     where cg.tenant_id = v_property.tenant_id
       and cg.deleted_at is null
       and (
         (v_guest_email is not null and lower(cg.email) = v_guest_email)
         or (v_guest_phone is not null and cg.phone = v_guest_phone)
       )
     order by
       case when lower(cg.email) = v_guest_email then 0 else 1 end,
       cg.updated_at desc
     limit 1
   );

  if not found then
    insert into public.crm_guests (
      tenant_id,
      owner_id,
      full_name,
      email,
      phone,
      document_number,
      status,
      metadata,
      created_by
    ) values (
      v_property.tenant_id,
      v_property.owner_id,
      v_guest_name,
      v_guest_email,
      v_guest_phone,
      v_guest_document,
      'active',
      jsonb_build_object(
        'origem',
        'marketplace',
        'primeira_reserva_id',
        v_reservation_id
      ),
      null
    );
  end if;

  insert into public.reservation_status_history (
    tenant_id,
    reservation_id,
    from_status,
    to_status,
    changed_by,
    reason,
    metadata
  ) values (
    v_property.tenant_id,
    v_reservation_id,
    null,
    'pending',
    null,
    'Solicitacao publica criada pelo marketplace.',
    jsonb_build_object('source', 'marketplace')
  );

  insert into public.reservation_notes (
    tenant_id,
    reservation_id,
    note_type,
    content,
    created_by
  ) values (
    v_property.tenant_id,
    v_reservation_id,
    'system',
    'Solicitacao enviada pelo marketplace publico e aguardando aprovacao.',
    null
  );

  return jsonb_build_object(
    'reservationId',
    v_reservation_id,
    'code',
    v_code,
    'status',
    'pending'
  );
end;
$$;

comment on function app_private.request_public_reservation(
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text
) is
  'Cria solicitacao publica pendente diretamente para a casa.';

revoke all on function app_private.request_public_reservation(
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text
) from public;

grant execute on function app_private.request_public_reservation(
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated, service_role;

create or replace function public.request_public_reservation(
  p_property_slug text,
  p_check_in date,
  p_check_out date,
  p_guests_count integer,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_guest_document text default null,
  p_guest_notes text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.request_public_reservation(
    p_property_slug,
    p_check_in,
    p_check_out,
    p_guests_count,
    p_guest_name,
    p_guest_phone,
    p_guest_email,
    p_guest_document,
    p_guest_notes
  );
$$;

comment on function public.request_public_reservation(
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text
) is
  'Contrato publico para solicitar reserva diretamente para a casa.';

revoke all on function public.request_public_reservation(
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text
) from public;

grant execute on function public.request_public_reservation(
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated, service_role;

/*
  Adaptador temporario da assinatura anterior. O parametro de unidade e
  deliberadamente ignorado e pode ser removido em uma limpeza futura.
*/
create or replace function app_private.request_public_reservation(
  p_property_slug text,
  p_unit_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests_count integer,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_guest_document text default null,
  p_guest_notes text default null
)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, app_private
as $$
  select app_private.request_public_reservation(
    p_property_slug,
    p_check_in,
    p_check_out,
    p_guests_count,
    p_guest_name,
    p_guest_phone,
    p_guest_email,
    p_guest_document,
    p_guest_notes
  );
$$;

create or replace function public.request_public_reservation(
  p_property_slug text,
  p_unit_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests_count integer,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_guest_document text default null,
  p_guest_notes text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.request_public_reservation(
    p_property_slug,
    p_check_in,
    p_check_out,
    p_guests_count,
    p_guest_name,
    p_guest_phone,
    p_guest_email,
    p_guest_document,
    p_guest_notes
  );
$$;

revoke all privileges on table public.units, public.unit_categories from anon;
revoke all privileges on table public.units, public.unit_categories from public;

revoke all privileges on table
  public.properties,
  public.media_assets,
  public.calendar_availability_blocks,
  public.reservations
from anon;

grant select (
  id,
  tenant_id,
  name,
  slug,
  property_type,
  status,
  headline,
  description,
  address,
  timezone,
  created_at,
  updated_at,
  deleted_at,
  short_description,
  full_description,
  is_public,
  marketplace_featured,
  structure_details,
  pricing_details
) on public.properties to anon;

grant select (
  id,
  property_id,
  media_type,
  storage_bucket,
  storage_path,
  url,
  alt,
  sort_order,
  is_cover,
  status
) on public.media_assets to anon;

grant select (
  tenant_id,
  property_id,
  status,
  starts_on,
  ends_on
) on public.calendar_availability_blocks to anon;

grant select (
  tenant_id,
  property_id,
  status,
  check_in,
  check_out
) on public.reservations to anon;

notify pgrst, 'reload schema';
