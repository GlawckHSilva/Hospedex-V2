/*
  Corrige definitivamente a regra de hospedes extras no Marketplace.

  A V2 usa a casa/propriedade como item reservavel. A regra abaixo continua
  baseada em property_id, preserva RLS via RPC publica existente e define:
  - capacidade cadastrada da casa como quantidade inclusa sem extra;
  - permissao para hospedes extras;
  - valor por hospede extra por reserva.
*/

update public.properties
set pricing_details =
  coalesce(pricing_details, '{}'::jsonb) ||
  jsonb_build_object(
    'tipoCobrancaHospedeExtra',
    'per_stay',
    'extra_guest_fee_type',
    'per_stay'
  )
where pricing_details ? 'tipoCobrancaHospedeExtra'
   or pricing_details ? 'extra_guest_fee_type'
   or pricing_details ? 'valorHospedeExtra'
   or pricing_details ? 'extra_guest_fee';

create or replace function app_private.request_public_reservation(
  p_property_slug text,
  p_check_in date,
  p_check_out date,
  p_guests_count integer,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_guest_document text default null,
  p_guest_notes text default null,
  p_payment_method text default null,
  p_expected_checkin_time time default null,
  p_expected_checkout_time time default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_allows_extra_guests boolean := false;
  v_cleaning_fee numeric(12, 2) := 0;
  v_code text;
  v_daily_price numeric(12, 2) := 0;
  v_effective_guest_limit integer := 1;
  v_extra_guest_amount numeric(12, 2) := 0;
  v_extra_guest_count integer := 0;
  v_extra_guest_fee_type text := 'per_stay';
  v_extra_guest_limit integer := 10;
  v_extra_guest_price numeric(12, 2) := 0;
  v_guest_document text := nullif(btrim(p_guest_document), '');
  v_guest_email text := lower(nullif(btrim(p_guest_email), ''));
  v_guest_name text := nullif(btrim(p_guest_name), '');
  v_guest_notes text := nullif(btrim(p_guest_notes), '');
  v_guest_phone text := nullif(btrim(p_guest_phone), '');
  v_max_guests integer := 1;
  v_nights integer;
  v_payment_method text := nullif(btrim(p_payment_method), '');
  v_pricing jsonb;
  v_property public.properties%rowtype;
  v_reservation_id uuid;
  v_total numeric(12, 2);
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

  if v_payment_method is null or v_payment_method not in (
    'pix',
    'cash',
    'debit_card',
    'credit_card',
    'bank_transfer'
  ) then
    raise exception 'Informe uma forma de pagamento valida.';
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

  v_pricing := coalesce(v_property.pricing_details, '{}'::jsonb);

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

  if jsonb_typeof(v_pricing -> 'valorDiaria') = 'number' then
    v_daily_price := greatest((v_pricing ->> 'valorDiaria')::numeric, 0);
  end if;

  if jsonb_typeof(v_pricing -> 'taxaLimpeza') = 'number' then
    v_cleaning_fee := greatest((v_pricing ->> 'taxaLimpeza')::numeric, 0);
  end if;

  v_allows_extra_guests := coalesce(
    case
      when jsonb_typeof(v_pricing -> 'cobraHospedeExtra') = 'boolean'
        then (v_pricing ->> 'cobraHospedeExtra')::boolean
      else null
    end,
    case
      when jsonb_typeof(v_pricing -> 'allows_extra_guests') = 'boolean'
        then (v_pricing ->> 'allows_extra_guests')::boolean
      else null
    end,
    false
  );

  if jsonb_typeof(v_pricing -> 'valorHospedeExtra') = 'number' then
    v_extra_guest_price := greatest((v_pricing ->> 'valorHospedeExtra')::numeric, 0);
  elsif jsonb_typeof(v_pricing -> 'extra_guest_fee') = 'number' then
    v_extra_guest_price := greatest((v_pricing ->> 'extra_guest_fee')::numeric, 0);
  end if;

  v_extra_guest_fee_type := coalesce(
    nullif(v_pricing ->> 'tipoCobrancaHospedeExtra', ''),
    nullif(v_pricing ->> 'extra_guest_fee_type', ''),
    'per_stay'
  );

  if v_extra_guest_fee_type not in ('per_stay', 'per_night') then
    v_extra_guest_fee_type := 'per_stay';
  end if;

  v_effective_guest_limit := case
    when v_allows_extra_guests and v_extra_guest_price > 0
      then v_max_guests + v_extra_guest_limit
    else v_max_guests
  end;

  if p_guests_count > v_effective_guest_limit then
    raise exception 'Esta casa permite no maximo % hospedes.', v_effective_guest_limit;
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
      and b.blocks_availability is true
      and b.status in (
        'blocked',
        'interdicted',
        'maintenance',
        'cleaning',
        'unavailable',
        'reserved'
      )
      and b.starts_on < p_check_out
      and b.ends_on > p_check_in
  ) then
    raise exception 'A casa esta bloqueada neste periodo.';
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

  v_nights := greatest((p_check_out - p_check_in), 1);

  if v_allows_extra_guests and v_extra_guest_price > 0 then
    v_extra_guest_count := greatest(p_guests_count - v_max_guests, 0);
  end if;

  v_extra_guest_amount :=
    v_extra_guest_count *
    v_extra_guest_price;

  v_total :=
    (v_nights * v_daily_price)
    + v_cleaning_fee
    + v_extra_guest_amount;

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
    expected_checkin_time,
    expected_checkout_time,
    guests_count,
    total_amount,
    currency,
    payment_method,
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
    p_expected_checkin_time,
    p_expected_checkout_time,
    p_guests_count,
    v_total,
    'BRL',
    v_payment_method,
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
    jsonb_build_object(
      'source',
      'marketplace',
      'payment_method',
      v_payment_method,
      'expected_checkin_time',
      p_expected_checkin_time,
      'expected_checkout_time',
      p_expected_checkout_time,
      'extra_guest_count',
      v_extra_guest_count,
      'extra_guest_fee_type',
      v_extra_guest_fee_type,
      'extra_guest_amount',
      v_extra_guest_amount
    )
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
    'Solicitacao enviada pelo marketplace publico com forma de pagamento: ' || v_payment_method || '.',
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
  text,
  text,
  time,
  time
) is
  'Cria solicitacao publica pendente para a casa, calculando hospedes extras por reserva acima da capacidade cadastrada.';

revoke all on function app_private.request_public_reservation(
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  time,
  time
) from public, anon;

grant execute on function app_private.request_public_reservation(
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  time,
  time
) to anon, authenticated, service_role;
