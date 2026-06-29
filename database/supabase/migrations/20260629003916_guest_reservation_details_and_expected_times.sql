/*
  Detalhes da reserva do hóspede e horários previstos.

  A Área do Hóspede precisa exibir dados úteis da estadia sem tornar o hóspede
  membro do tenant. Por isso a leitura completa da casa passa por RPC com filtro
  obrigatório em reservations.guest_user_id = auth.uid().
*/

alter table public.reservations
  add column if not exists expected_checkin_time time,
  add column if not exists expected_checkout_time time;

comment on column public.reservations.expected_checkin_time is
  'Horário previsto de chegada informado pelo hóspede. Opcional e visível ao proprietário.';
comment on column public.reservations.expected_checkout_time is
  'Horário previsto de saída informado pelo hóspede. Opcional e visível ao proprietário.';

create or replace function public.get_guest_reservation_stay_details(
  p_reservation_ids uuid[]
)
returns table (
  reservation_id uuid,
  property_details jsonb,
  owner_details jsonb,
  amenities jsonb,
  house_rules jsonb,
  regional_guide jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  with reservas_permitidas as (
    select r.*
    from public.reservations r
    where p_reservation_ids is not null
      and r.id = any(p_reservation_ids)
      and r.guest_user_id = (select auth.uid())
  )
  select
    r.id as reservation_id,
    jsonb_build_object(
      'id', p.id,
      'name', coalesce(nullif(p.public_details ->> 'displayName', ''), p.name),
      'slug', p.slug,
      'address', coalesce(p.address, '{}'::jsonb),
      'structureDetails', coalesce(p.structure_details, '{}'::jsonb),
      'pricingDetails', coalesce(p.pricing_details, '{}'::jsonb),
      'coverImageUrl', (
        select coalesce(
          nullif(m.url, ''),
          null
        )
        from public.media_assets m
        where m.property_id = p.id
          and m.media_type = 'image'
          and m.status = 'active'
        order by m.is_cover desc, m.sort_order asc
        limit 1
      ),
      'coverImageStorageBucket', (
        select m.storage_bucket
        from public.media_assets m
        where m.property_id = p.id
          and m.media_type = 'image'
          and m.status = 'active'
        order by m.is_cover desc, m.sort_order asc
        limit 1
      ),
      'coverImageStoragePath', (
        select m.storage_path
        from public.media_assets m
        where m.property_id = p.id
          and m.media_type = 'image'
          and m.status = 'active'
        order by m.is_cover desc, m.sort_order asc
        limit 1
      )
    ) as property_details,
    jsonb_build_object(
      'name', coalesce(nullif(owner_profile.full_name, ''), t.name),
      'businessName', t.name,
      'phone', coalesce(nullif(ts.phone, ''), owner_profile.phone),
      'whatsapp', nullif(ts.whatsapp, ''),
      'avatarUrl', coalesce(nullif(ts.logo_url, ''), owner_profile.avatar_url),
      'city', nullif(ts.city, ''),
      'state', nullif(ts.state, '')
    ) as owner_details,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'category', a.category
        )
        order by a.name
      )
      from public.property_amenities pa
      join public.amenities a on a.id = pa.amenity_id
      where pa.property_id = p.id
    ), '[]'::jsonb) as amenities,
    jsonb_build_object(
      'checkInTime', coalesce(to_char(ps.check_in_time, 'HH24:MI'), to_char(ts.default_check_in_time, 'HH24:MI'), '14:00'),
      'checkOutTime', coalesce(to_char(ps.check_out_time, 'HH24:MI'), to_char(ts.default_check_out_time, 'HH24:MI'), '11:00'),
      'allowPets', coalesce(ps.allow_pets, false),
      'allowChildren', coalesce(ps.allow_children, true),
      'allowSmoking', coalesce(ps.allow_smoking, false),
      'allowEvents', coalesce(ps.allow_events, false),
      'maxGuests', coalesce(
        ps.max_guests,
        case
          when jsonb_typeof(p.structure_details -> 'hospedesMaximos') = 'number'
            then (p.structure_details ->> 'hospedesMaximos')::integer
          else null
        end,
        r.guests_count
      ),
      'minResponsibleAge', coalesce(ps.min_responsible_age, 18),
      'minNights', coalesce(ps.min_nights, 1),
      'maxNights', ps.max_nights,
      'additionalRules', nullif(ps.additional_rules, ''),
      'specialInstructions', nullif(ps.special_instructions, ''),
      'cancellationNotes', nullif(ps.cancellation_notes, '')
    ) as house_rules,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', rg.id,
          'category', rg.category,
          'name', rg.name,
          'description', rg.description,
          'address', rg.address,
          'phone', rg.phone,
          'whatsapp', rg.whatsapp,
          'websiteUrl', rg.website_url,
          'openingHours', rg.opening_hours,
          'coverImageUrl', rg.cover_image_url
        )
        order by rg.display_order asc, rg.name asc
      )
      from public.regional_guide_locations rg
      where rg.tenant_id = p.tenant_id
        and rg.status = 'active'
        and rg.deleted_at is null
    ), '[]'::jsonb) as regional_guide
  from reservas_permitidas r
  join public.properties p on p.id = r.property_id
  join public.tenants t on t.id = r.tenant_id
  join public.profiles owner_profile on owner_profile.id = r.owner_id
  left join public.tenant_settings ts on ts.tenant_id = r.tenant_id
  left join public.property_settings ps
    on ps.tenant_id = r.tenant_id
   and ps.property_id = r.property_id;
$$;

comment on function public.get_guest_reservation_stay_details(uuid[]) is
  'Retorna dados seguros da estadia apenas para o hóspede autenticado dono da reserva.';

revoke all on function public.get_guest_reservation_stay_details(uuid[]) from public;
revoke all on function public.get_guest_reservation_stay_details(uuid[]) from anon;
grant execute on function public.get_guest_reservation_stay_details(uuid[])
  to authenticated, service_role;

drop function if exists public.request_public_reservation(
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text,
  text
);

drop function if exists app_private.request_public_reservation(
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text,
  text
);

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
  v_property public.properties%rowtype;
  v_reservation_id uuid;
  v_code text;
  v_daily_price numeric(12, 2) := 0;
  v_cleaning_fee numeric(12, 2) := 0;
  v_extra_guest_price numeric(12, 2) := 0;
  v_included_guests integer := 1;
  v_max_guests integer := 1;
  v_nights integer;
  v_total numeric(12, 2);
  v_guest_name text := nullif(btrim(p_guest_name), '');
  v_guest_phone text := nullif(btrim(p_guest_phone), '');
  v_guest_email text := lower(nullif(btrim(p_guest_email), ''));
  v_guest_document text := nullif(btrim(p_guest_document), '');
  v_guest_notes text := nullif(btrim(p_guest_notes), '');
  v_payment_method text := nullif(btrim(p_payment_method), '');
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

  if jsonb_typeof(v_property.pricing_details -> 'valorDiaria') = 'number' then
    v_daily_price := greatest((v_property.pricing_details ->> 'valorDiaria')::numeric, 0);
  end if;

  if jsonb_typeof(v_property.pricing_details -> 'taxaLimpeza') = 'number' then
    v_cleaning_fee := greatest((v_property.pricing_details ->> 'taxaLimpeza')::numeric, 0);
  end if;

  if jsonb_typeof(v_property.pricing_details -> 'hospedesInclusos') = 'number' then
    v_included_guests := greatest((v_property.pricing_details ->> 'hospedesInclusos')::integer, 1);
  end if;

  if jsonb_typeof(v_property.pricing_details -> 'valorHospedeExtra') = 'number'
    and coalesce((v_property.pricing_details ->> 'cobraHospedeExtra')::boolean, false)
  then
    v_extra_guest_price := greatest(
      (v_property.pricing_details ->> 'valorHospedeExtra')::numeric,
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

  v_nights := greatest((p_check_out - p_check_in), 1);
  v_total :=
    (v_nights * v_daily_price)
    + v_cleaning_fee
    + (greatest(p_guests_count - v_included_guests, 0) * v_extra_guest_price * v_nights);

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
      p_expected_checkout_time
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
  'Cria solicitacao publica pendente para a casa, com horarios previstos opcionais informados pelo hospede.';

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

create or replace function public.request_public_reservation(
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
    p_guest_notes,
    p_payment_method,
    p_expected_checkin_time,
    p_expected_checkout_time
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
  text,
  text,
  time,
  time
) is
  'Contrato publico para solicitar reserva com horarios previstos opcionais.';

revoke all on function public.request_public_reservation(
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
  text,
  text,
  time,
  time
) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
