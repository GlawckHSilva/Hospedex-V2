/*
  Solicitação pública de reserva.

  A escrita anônima passa por uma função validada para evitar expor inserts
  diretos nas tabelas operacionais. A função confere vitrine pública, tenant,
  licença, unidade ativa, capacidade e conflito de datas antes de criar dados.
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
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_property public.properties%rowtype;
  v_unit public.units%rowtype;
  v_reservation_id uuid;
  v_code text;
  v_total numeric(12, 2);
  v_guest_name text := nullif(trim(p_guest_name), '');
  v_guest_phone text := nullif(trim(p_guest_phone), '');
  v_guest_email text := lower(nullif(trim(p_guest_email), ''));
  v_guest_document text := nullif(trim(p_guest_document), '');
  v_guest_notes text := nullif(trim(p_guest_notes), '');
begin
  if nullif(trim(p_property_slug), '') is null then
    raise exception 'Propriedade inválida.';
  end if;

  if p_check_in is null or p_check_out is null then
    raise exception 'Informe check-in e check-out.';
  end if;

  if p_check_in < current_date then
    raise exception 'Check-in não pode ser no passado.';
  end if;

  if p_check_out <= p_check_in then
    raise exception 'Check-out deve ser depois do check-in.';
  end if;

  if p_guests_count is null or p_guests_count < 1 then
    raise exception 'Quantidade de hóspedes inválida.';
  end if;

  if v_guest_name is null then
    raise exception 'Informe o nome do hóspede.';
  end if;

  if v_guest_phone is null then
    raise exception 'Informe o telefone do hóspede.';
  end if;

  if v_guest_email is null then
    raise exception 'Informe o e-mail do hóspede.';
  end if;

  select *
    into v_property
  from public.properties p
  where p.slug = trim(p_property_slug)
    and app_private.is_marketplace_property_public(p.id)
  limit 1;

  if v_property.id is null then
    raise exception 'Propriedade não encontrada ou indisponível.';
  end if;

  select *
    into v_unit
  from public.units u
  where u.id = p_unit_id
    and u.tenant_id = v_property.tenant_id
    and u.property_id = v_property.id
    and u.status = 'active'
  limit 1;

  if v_unit.id is null then
    raise exception 'Unidade não encontrada ou indisponível.';
  end if;

  if p_guests_count > v_unit.capacity then
    raise exception 'Quantidade de hóspedes acima da capacidade da unidade.';
  end if;

  if not v_unit.allow_overbooking then
  if exists (
    select 1
    from public.reservations r
    where r.tenant_id = v_property.tenant_id
      and r.unit_id = v_unit.id
      and r.status in ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
      and r.check_in < p_check_out
      and r.check_out > p_check_in
  ) then
    raise exception 'A unidade já possui solicitação ou reserva neste período.';
  end if;

  if exists (
    select 1
    from public.calendar_availability_blocks b
    where b.tenant_id = v_property.tenant_id
      and b.unit_id = v_unit.id
      and b.status in ('blocked', 'unavailable', 'reserved')
      and b.starts_on < p_check_out
      and b.ends_on > p_check_in
  ) then
    raise exception 'A unidade está bloqueada neste período.';
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

  v_total := greatest((p_check_out - p_check_in), 1) * coalesce(v_unit.base_price, 0);

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
    'Solicitação criada pelo marketplace público.',
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

  if exists (
    select 1
    from public.crm_guests cg
    where cg.tenant_id = v_property.tenant_id
      and cg.deleted_at is null
      and (
        lower(cg.email) = v_guest_email
        or cg.phone = v_guest_phone
      )
  ) then
    update public.crm_guests
       set full_name = v_guest_name,
           email = coalesce(v_guest_email, email),
           phone = coalesce(v_guest_phone, phone),
           document_number = coalesce(v_guest_document, document_number),
           status = 'active',
           metadata = coalesce(metadata, '{}'::jsonb) ||
             jsonb_build_object('ultima_origem', 'marketplace', 'ultima_reserva_id', v_reservation_id),
           updated_at = now()
     where id = (
       select cg.id
       from public.crm_guests cg
       where cg.tenant_id = v_property.tenant_id
         and cg.deleted_at is null
         and (
           lower(cg.email) = v_guest_email
           or cg.phone = v_guest_phone
         )
       order by cg.updated_at desc
       limit 1
     );
  else
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
      jsonb_build_object('origem', 'marketplace', 'primeira_reserva_id', v_reservation_id),
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
    'Solicitação pública criada pelo marketplace.',
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
    'Solicitação enviada pelo marketplace público. Preparado para aprovação, pagamento online, WhatsApp e login opcional do hóspede.',
    null
  );

  return jsonb_build_object(
    'reservationId', v_reservation_id,
    'code', v_code,
    'status', 'pending'
  );
end;
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
  'Recebe solicitação pública de reserva com validação completa de vitrine, tenant, licença, capacidade e disponibilidade.';

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
