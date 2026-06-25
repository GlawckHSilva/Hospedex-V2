/*
  Corrige o contrato publico do Marketplace V2.

  A visibilidade e centralizada no banco para impedir que consultas anonimas
  exponham casas privadas. A solicitacao de reserva usa uma funcao interna
  protegida porque inserts anonimos diretos nas tabelas operacionais violariam
  o isolamento multi-tenant e ampliariam a superficie de ataque.
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
      and exists (
        select 1
        from public.units u
        where u.tenant_id = p.tenant_id
          and u.property_id = p.id
          and u.status = 'active'
      )
  );
$$;

comment on function app_private.is_marketplace_property_public(uuid) is
  'Exige intencao publica, publicacao, tenant e licenca validos, feature flag ativa e unidade disponivel.';

revoke all on function app_private.is_marketplace_property_public(uuid)
from public;
grant execute on function app_private.is_marketplace_property_public(uuid)
to anon, authenticated, service_role;

/*
  O nucleo fica fora do schema exposto pela Data API. SECURITY DEFINER e
  necessario somente aqui para gravar a solicitacao sem liberar INSERT anonimo
  nas tabelas de reservas, hospedes, CRM, historico e observacoes.
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
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_property public.properties%rowtype;
  v_unit public.units%rowtype;
  v_reservation_id uuid;
  v_code text;
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

  if p_unit_id is null then
    raise exception 'Informe uma unidade valida.';
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
  limit 1;

  if v_property.id is null then
    raise exception 'Propriedade nao encontrada ou indisponivel.';
  end if;

  /*
    O bloqueio da unidade serializa solicitacoes publicas concorrentes.
    Isso evita que duas chamadas passem pela verificacao antes dos inserts.
  */
  select u.*
    into v_unit
  from public.units u
  where u.id = p_unit_id
    and u.tenant_id = v_property.tenant_id
    and u.property_id = v_property.id
    and u.status = 'active'
  for update;

  if v_unit.id is null then
    raise exception 'Unidade nao encontrada ou indisponivel.';
  end if;

  if p_guests_count > v_unit.capacity then
    raise exception 'Quantidade de hospedes acima da capacidade da unidade.';
  end if;

  if not v_unit.allow_overbooking then
    if exists (
      select 1
      from public.reservations r
      where r.tenant_id = v_property.tenant_id
        and r.property_id = v_property.id
        and r.unit_id = v_unit.id
        and r.status in ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
        and r.check_in < p_check_out
        and r.check_out > p_check_in
    ) then
      raise exception 'A unidade ja possui solicitacao ou reserva neste periodo.';
    end if;

    if exists (
      select 1
      from public.calendar_availability_blocks b
      where b.tenant_id = v_property.tenant_id
        and b.property_id = v_property.id
        and b.unit_id = v_unit.id
        and b.status in ('blocked', 'unavailable', 'reserved')
        and b.starts_on < p_check_out
        and b.ends_on > p_check_in
    ) then
      raise exception 'A unidade esta bloqueada neste periodo.';
    end if;
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

  v_total := greatest((p_check_out - p_check_in), 1) *
    coalesce(v_unit.base_price, 0);

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
    v_unit.id,
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
  uuid,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text
) is
  'Cria solicitacao publica pendente com validacao de vitrine, tenant, capacidade e disponibilidade.';

revoke all on function app_private.request_public_reservation(
  text,
  uuid,
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
  uuid,
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
  A funcao publica e somente o contrato RPC consumido pelo Marketplace.
  Ela nao possui privilegios elevados e nao expoe tabelas internas.
*/
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
    p_unit_id,
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
  uuid,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text
) is
  'Contrato publico para solicitar reserva pendente sem liberar escrita anonima direta.';

revoke all on function public.request_public_reservation(
  text,
  uuid,
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
  uuid,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated;

notify pgrst, 'reload schema';
