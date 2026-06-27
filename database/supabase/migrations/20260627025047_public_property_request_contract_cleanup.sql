/*
  Corrige o contrato publico de solicitacao da casa.

  A V2 usa a casa como item reservavel. Esta migration remove sobrecargas
  antigas com unidade, evita ambiguidade no PostgREST e expõe somente dados
  publicos mínimos para confiança e formas de pagamento.
*/

alter table public.tenant_settings
  add column if not exists bank_transfer_payment_instructions text;

comment on column public.tenant_settings.bank_transfer_payment_instructions is
  'Instrucoes publicas para transferencia bancaria futura. Nao deve armazenar dados sensiveis de cartao.';

alter table public.reservations
  drop constraint if exists reservations_payment_method_check;

alter table public.reservations
  add constraint reservations_payment_method_check
  check (
    payment_method is null
    or payment_method in ('pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer')
  );

drop function if exists public.request_public_reservation(
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
);

drop function if exists public.request_public_reservation(
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text
);

drop function if exists app_private.request_public_reservation(
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
  p_payment_method text default null
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
    jsonb_build_object('source', 'marketplace', 'payment_method', v_payment_method)
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
  text
) is
  'Cria solicitacao publica pendente diretamente para a casa, sem unidade, com forma de pagamento declarada e total base em BRL.';

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
  text
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
  p_guest_notes text default null,
  p_payment_method text default null
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
    p_payment_method
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
  text
) is
  'Contrato publico unico para solicitar reserva diretamente para a casa.';

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
  text,
  text
) to anon, authenticated, service_role;

/*
  Perfil publico usado no card de reserva. A funcao nao expoe tenant_id, e-mail
  interno, chaves Pix ou documentos; apenas sinais de confianca e quais metodos
  de pagamento estao configurados.
*/
create or replace function public.get_public_property_request_profiles(
  p_property_ids uuid[]
)
returns table (
  property_id uuid,
  owner_name text,
  owner_avatar_url text,
  public_phone text,
  public_whatsapp text,
  business_name text,
  city text,
  state text,
  short_description text,
  is_verified boolean,
  payment_pix boolean,
  payment_cash boolean,
  payment_debit_card boolean,
  payment_credit_card boolean,
  payment_bank_transfer boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select
    p.id as property_id,
    coalesce(nullif(owner_profile.full_name, ''), t.name) as owner_name,
    owner_profile.avatar_url as owner_avatar_url,
    coalesce(nullif(ts.phone, ''), owner_profile.phone) as public_phone,
    nullif(ts.whatsapp, '') as public_whatsapp,
    t.name as business_name,
    nullif(ts.city, '') as city,
    nullif(ts.state, '') as state,
    nullif(ts.short_description, '') as short_description,
    true as is_verified,
    nullif(ts.pix_key, '') is not null as payment_pix,
    nullif(ts.cash_payment_instructions, '') is not null as payment_cash,
    nullif(ts.debit_card_payment_instructions, '') is not null as payment_debit_card,
    (
      nullif(ts.credit_card_payment_instructions, '') is not null
      and case
        when jsonb_typeof(p.pricing_details -> 'aceitaCartaoCredito') = 'boolean'
          then (p.pricing_details ->> 'aceitaCartaoCredito')::boolean
        else false
      end
    ) as payment_credit_card,
    nullif(ts.bank_transfer_payment_instructions, '') is not null as payment_bank_transfer
  from public.properties p
  join public.tenants t on t.id = p.tenant_id
  join public.profiles owner_profile on owner_profile.id = p.owner_id
  left join public.tenant_settings ts on ts.tenant_id = p.tenant_id
  where p_property_ids is not null
    and p.id = any(p_property_ids)
    and app_private.is_marketplace_property_public(p.id);
$$;

comment on function public.get_public_property_request_profiles(uuid[]) is
  'Retorna dados publicos minimos de confianca e formas de pagamento configuradas para casas publicas.';

revoke all on function public.get_public_property_request_profiles(uuid[]) from public;
grant execute on function public.get_public_property_request_profiles(uuid[])
  to anon, authenticated;

notify pgrst, 'reload schema';
