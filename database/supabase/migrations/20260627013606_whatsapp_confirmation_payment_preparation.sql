/*
  Preparo de WhatsApp e forma de pagamento da reserva.

  Esta etapa nao envia mensagem real e nao integra gateway. Ela apenas guarda a
  preferencia de pagamento escolhida pelo hospede, as instrucoes simples do
  proprietario e a mensagem preparada para envio manual no WhatsApp.
*/

alter table public.reservations
  add column if not exists payment_method text;

alter table public.reservations
  drop constraint if exists reservations_payment_method_check;

alter table public.reservations
  add constraint reservations_payment_method_check
  check (
    payment_method is null
    or payment_method in ('pix', 'cash', 'debit_card', 'credit_card')
  );

comment on column public.reservations.payment_method is
  'Preferencia de pagamento escolhida pelo hospede. Nao guarda dados sensiveis nem aciona gateway.';

alter table public.tenant_settings
  add column if not exists pix_key text,
  add column if not exists pix_receiver_name text,
  add column if not exists pix_bank_name text,
  add column if not exists pix_payment_note text,
  add column if not exists cash_payment_instructions text,
  add column if not exists debit_card_payment_instructions text,
  add column if not exists credit_card_payment_instructions text,
  add column if not exists credit_card_installments_note text;

comment on column public.tenant_settings.pix_key is
  'Chave Pix publica informada pelo proprietario para mensagens manuais de confirmacao.';
comment on column public.tenant_settings.cash_payment_instructions is
  'Instrucao operacional para pagamento em dinheiro; nao representa cobranca automatica.';
comment on column public.tenant_settings.debit_card_payment_instructions is
  'Instrucao operacional para debito presencial ou combinado, sem dados de cartao.';
comment on column public.tenant_settings.credit_card_payment_instructions is
  'Instrucao operacional para credito ou link futuro, sem dados sensiveis.';

create table if not exists public.reservation_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  guest_phone text,
  message_body text not null,
  whatsapp_url text,
  status text not null default 'prepared',
  requires_manual_review boolean not null default false,
  review_reason text,
  prepared_by uuid references public.profiles(id) on delete set null,
  prepared_at timestamptz not null default now(),
  copied_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reservation_id),
  constraint reservation_whatsapp_messages_status_check
    check (status in ('prepared', 'copied', 'opened', 'sent_future'))
);

comment on table public.reservation_whatsapp_messages is
  'Mensagens de WhatsApp preparadas por reserva. Nao confirma envio real e nao armazena tokens.';
comment on column public.reservation_whatsapp_messages.message_body is
  'Texto final preparado para o proprietario copiar ou abrir no WhatsApp manualmente.';
comment on column public.reservation_whatsapp_messages.status is
  'Status manual da mensagem: preparada, copiada ou aberta. Envio real fica para integracao futura.';
comment on column public.reservation_whatsapp_messages.requires_manual_review is
  'Indica que a mensagem precisa de revisao antes de abrir WhatsApp, por exemplo Pix sem chave cadastrada.';

create index if not exists reservation_whatsapp_messages_tenant_idx
  on public.reservation_whatsapp_messages (tenant_id, owner_id);

create index if not exists reservation_whatsapp_messages_reservation_idx
  on public.reservation_whatsapp_messages (reservation_id);

drop trigger if exists set_reservation_whatsapp_messages_updated_at
  on public.reservation_whatsapp_messages;

create trigger set_reservation_whatsapp_messages_updated_at
before update on public.reservation_whatsapp_messages
for each row execute function app_private.set_updated_at();

alter table public.reservation_whatsapp_messages enable row level security;

drop policy if exists "reservation_whatsapp_messages_select" on public.reservation_whatsapp_messages;
drop policy if exists "reservation_whatsapp_messages_manage" on public.reservation_whatsapp_messages;

create policy "reservation_whatsapp_messages_select"
on public.reservation_whatsapp_messages
for select to authenticated
using (
  exists (
    select 1
    from public.reservations r
    where r.id = reservation_id
      and r.tenant_id = tenant_id
      and r.owner_id = owner_id
      and app_private.can_access_property(r.tenant_id, r.property_id, 'reservations.read')
  )
);

create policy "reservation_whatsapp_messages_manage"
on public.reservation_whatsapp_messages
for all to authenticated
using (
  exists (
    select 1
    from public.reservations r
    where r.id = reservation_id
      and r.tenant_id = tenant_id
      and r.owner_id = owner_id
      and app_private.can_access_property(r.tenant_id, r.property_id, 'reservations.manage')
  )
)
with check (
  exists (
    select 1
    from public.reservations r
    where r.id = reservation_id
      and r.tenant_id = tenant_id
      and r.owner_id = owner_id
      and app_private.can_access_property(r.tenant_id, r.property_id, 'reservations.manage')
  )
);

grant select, insert, update, delete on public.reservation_whatsapp_messages to authenticated;
grant all on public.reservation_whatsapp_messages to service_role;

/*
  A funcao publica continua sendo o unico ponto anonimo para criar solicitacoes.
  A forma de pagamento e apenas uma preferencia declarada pelo hospede.
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
  v_max_guests integer := 1;
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

  if v_payment_method is null or v_payment_method not in ('pix', 'cash', 'debit_card', 'credit_card') then
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
  'Cria solicitacao publica pendente diretamente para a casa com preferencia de pagamento sem dados sensiveis.';

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
  'Contrato publico para solicitar reserva diretamente para a casa com preferencia de pagamento.';

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

notify pgrst, 'reload schema';
