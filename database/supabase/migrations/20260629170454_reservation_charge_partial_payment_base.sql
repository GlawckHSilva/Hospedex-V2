/*
  Base financeira de cobrancas e pagamentos parciais de reserva.

  Esta migration adiciona uma camada rastreavel entre reserva e Financeiro:
  - reservation_charges guarda o que precisa ser cobrado;
  - reservation_payments guarda cada pagamento manual confirmado;
  - transactions continua como lancamento financeiro agregado da reserva.

  O pagamento real por gateway/Pix/cartao continua fora do escopo. A regra
  atual registra apenas confirmacoes manuais sem expor service role ao frontend.
*/

do $$
declare
  constraint_name name;
begin
  /*
    Mantemos "received" por compatibilidade com dados e telas antigas, mas a
    nova regra usa "paid" e "partial" para diferenciar quitação total e parcial.
  */
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%payment_status%'
  loop
    execute format(
      'alter table public.reservations drop constraint if exists %I',
      constraint_name
    );
  end loop;
end;
$$;

alter table public.reservations
  add constraint reservations_payment_status_check
  check (payment_status in (
    'pending',
    'partial',
    'paid',
    'received',
    'overdue',
    'refunded',
    'cancelled'
  ));

alter table public.transactions
  add column if not exists reservation_charge_id uuid,
  add column if not exists reservation_payment_id uuid;

create table if not exists public.reservation_charges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  charge_type text not null default 'full'
    check (charge_type in ('deposit', 'remaining', 'full', 'extra', 'adjustment', 'refund')),
  amount numeric(12, 2) not null check (amount >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  currency char(3) not null default 'BRL',
  due_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'partial', 'paid', 'overdue', 'cancelled', 'refunded')),
  payment_method text
    check (payment_method is null or payment_method in ('pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer')),
  payment_provider text not null default 'manual'
    check (payment_provider in ('manual', 'gateway', 'none')),
  payment_link text,
  pix_copy_paste text,
  pix_qr_code text,
  manual_instructions text,
  internal_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservation_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  charge_id uuid references public.reservation_charges(id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null default 'BRL',
  payment_method text
    check (payment_method is null or payment_method in ('pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer')),
  status text not null default 'confirmed'
    check (status in ('pending_review', 'confirmed', 'rejected', 'cancelled', 'refunded')),
  proof_url text,
  gateway_transaction_id text,
  notes text,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions
  drop constraint if exists transactions_reservation_charge_id_fkey,
  add constraint transactions_reservation_charge_id_fkey
    foreign key (reservation_charge_id)
    references public.reservation_charges(id)
    on delete set null;

alter table public.transactions
  drop constraint if exists transactions_reservation_payment_id_fkey,
  add constraint transactions_reservation_payment_id_fkey
    foreign key (reservation_payment_id)
    references public.reservation_payments(id)
    on delete set null;

create index if not exists reservation_charges_reservation_idx
  on public.reservation_charges (tenant_id, reservation_id, status);
create index if not exists reservation_charges_property_idx
  on public.reservation_charges (tenant_id, property_id, due_at);
create index if not exists reservation_payments_reservation_idx
  on public.reservation_payments (tenant_id, reservation_id, status);
create index if not exists reservation_payments_charge_idx
  on public.reservation_payments (tenant_id, charge_id);
create index if not exists transactions_reservation_charge_idx
  on public.transactions (tenant_id, reservation_charge_id);
create index if not exists transactions_reservation_payment_idx
  on public.transactions (tenant_id, reservation_payment_id);

drop trigger if exists set_reservation_charges_updated_at on public.reservation_charges;
create trigger set_reservation_charges_updated_at
before update on public.reservation_charges
for each row execute function app_private.set_updated_at();

drop trigger if exists set_reservation_payments_updated_at on public.reservation_payments;
create trigger set_reservation_payments_updated_at
before update on public.reservation_payments
for each row execute function app_private.set_updated_at();

comment on table public.reservation_charges is
  'Cobrancas operacionais de reserva. Permite entrada, saldo restante, extras e ajustes sem depender de gateway.';
comment on table public.reservation_payments is
  'Pagamentos manuais confirmados de reserva. Preserva historico de pagamentos parciais antes do lancamento agregado no Financeiro.';
comment on column public.reservation_charges.internal_notes is
  'Observacao interna do gerenciamento. Nunca deve ser exibida ao hospede no Marketplace.';

alter table public.reservation_charges enable row level security;
alter table public.reservation_payments enable row level security;

drop policy if exists "reservation_charges_select" on public.reservation_charges;
drop policy if exists "reservation_charges_manage" on public.reservation_charges;
drop policy if exists "reservation_payments_select" on public.reservation_payments;
drop policy if exists "reservation_payments_manage" on public.reservation_payments;

create policy "reservation_charges_select"
on public.reservation_charges
for select to authenticated
using (
  app_private.can_access_property(tenant_id, property_id, 'reservations.read')
  or exists (
    select 1
    from public.reservations r
    where r.id = reservation_id
      and r.guest_user_id = auth.uid()
  )
);

create policy "reservation_charges_manage"
on public.reservation_charges
for all to authenticated
using (app_private.can_access_property(tenant_id, property_id, 'reservations.manage'))
with check (app_private.can_access_property(tenant_id, property_id, 'reservations.manage'));

create policy "reservation_payments_select"
on public.reservation_payments
for select to authenticated
using (
  app_private.can_access_property(tenant_id, property_id, 'finance.read')
  or exists (
    select 1
    from public.reservations r
    where r.id = reservation_id
      and r.guest_user_id = auth.uid()
  )
);

create policy "reservation_payments_manage"
on public.reservation_payments
for all to authenticated
using (app_private.can_access_property(tenant_id, property_id, 'finance.manage'))
with check (app_private.can_access_property(tenant_id, property_id, 'finance.manage'));

grant select, insert, update, delete on
  public.reservation_charges,
  public.reservation_payments
to authenticated;

grant all on
  public.reservation_charges,
  public.reservation_payments
to service_role;

create or replace function app_private.get_primary_reservation_guest_email(
  p_tenant_id uuid,
  p_reservation_id uuid
)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select hospede.email
  from public.reservation_guests hospede
  where hospede.tenant_id = p_tenant_id
    and hospede.reservation_id = p_reservation_id
    and hospede.is_primary is true
  order by hospede.created_at
  limit 1;
$$;

create or replace function app_private.sync_reservation_charge_state(
  p_charge_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_charge public.reservation_charges%rowtype;
  v_paid numeric(12, 2);
  v_status text;
begin
  /*
    Cobrancas sao recalculadas pelo banco para evitar que o frontend decida
    sozinho se uma entrada parcial quitou ou nao uma cobranca.
  */
  select *
    into v_charge
  from public.reservation_charges c
  where c.id = p_charge_id
  for update;

  if v_charge.id is null then
    raise exception 'Cobranca nao encontrada.';
  end if;

  select coalesce(sum(p.amount), 0)
    into v_paid
  from public.reservation_payments p
  where p.tenant_id = v_charge.tenant_id
    and p.charge_id = v_charge.id
    and p.status = 'confirmed';

  v_status := case
    when v_charge.status in ('cancelled', 'refunded') then v_charge.status
    when v_paid <= 0 then 'pending'
    when v_paid < v_charge.amount then 'partial'
    else 'paid'
  end;

  update public.reservation_charges
     set amount_paid = v_paid,
         status = v_status,
         updated_at = now()
   where id = v_charge.id;

  return jsonb_build_object(
    'chargeId',
    v_charge.id,
    'amountPaid',
    v_paid,
    'status',
    v_status
  );
end;
$$;

create or replace function app_private.sync_reservation_payment_state(
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_paid numeric(12, 2);
  v_payment_status text;
  v_reservation public.reservations%rowtype;
begin
  /*
    Status financeiro da reserva nasce da soma dos pagamentos confirmados.
    Pagamento pendente nao entra como receita recebida no Financeiro.
  */
  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
  end if;

  select coalesce(sum(p.amount), 0)
    into v_paid
  from public.reservation_payments p
  where p.tenant_id = v_reservation.tenant_id
    and p.reservation_id = v_reservation.id
    and p.status = 'confirmed';

  v_payment_status := case
    when v_reservation.status = 'cancelled' and v_paid > 0 then 'refunded'
    when v_reservation.status = 'cancelled' then 'cancelled'
    when v_paid <= 0 then 'pending'
    when v_paid < v_reservation.total_amount then 'partial'
    else 'paid'
  end;

  update public.reservations
     set payment_status = v_payment_status,
         payment_status_updated_at = now(),
         updated_at = now()
   where id = v_reservation.id;

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'amountPaid',
    v_paid,
    'paymentStatus',
    v_payment_status
  );
end;
$$;

create or replace function app_private.upsert_reservation_income_transaction(
  p_reservation_id uuid,
  p_user_id uuid default null,
  p_payment_id uuid default null,
  p_charge_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_account_id uuid;
  v_category_id uuid;
  v_guest_name text;
  v_paid numeric(12, 2);
  v_property_name text;
  v_reservation public.reservations%rowtype;
  v_transaction_status text;
begin
  /*
    O Financeiro continua com lancamento agregado por reserva porque existe um
    indice unico historico nessa relacao. Cada pagamento fica rastreavel em
    reservation_payments, e o lancamento agregado reflete o total recebido.
  */
  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
  end if;

  select coalesce(sum(p.amount), 0)
    into v_paid
  from public.reservation_payments p
  where p.tenant_id = v_reservation.tenant_id
    and p.reservation_id = v_reservation.id
    and p.status = 'confirmed';

  v_account_id := app_private.ensure_reservation_financial_account(
    v_reservation.tenant_id,
    v_reservation.owner_id
  );
  v_category_id := app_private.ensure_reservation_income_category(v_reservation.tenant_id);
  v_guest_name := app_private.get_primary_reservation_guest_name(
    v_reservation.tenant_id,
    v_reservation.id
  );

  select p.name
    into v_property_name
  from public.properties p
  where p.id = v_reservation.property_id;

  v_transaction_status := case
    when v_reservation.status = 'cancelled' and v_paid > 0 then 'refunded'
    when v_paid > 0 then 'paid'
    else 'pending'
  end;

  insert into public.transactions (
    tenant_id,
    financial_account_id,
    property_id,
    reservation_id,
    reservation_charge_id,
    reservation_payment_id,
    expense_category_id,
    guest_name,
    transaction_type,
    status,
    amount,
    currency,
    due_date,
    paid_at,
    description
  ) values (
    v_reservation.tenant_id,
    v_account_id,
    v_reservation.property_id,
    v_reservation.id,
    p_charge_id,
    p_payment_id,
    v_category_id,
    v_guest_name,
    'income',
    v_transaction_status,
    v_paid,
    v_reservation.currency,
    v_reservation.check_in,
    case when v_paid > 0 then now() else null end,
    'Recebimentos confirmados da reserva ' || v_reservation.code || ' - ' || coalesce(v_property_name, 'Casa')
  )
  on conflict (tenant_id, reservation_id) where transaction_type = 'income'
  do update set
    financial_account_id = excluded.financial_account_id,
    property_id = excluded.property_id,
    reservation_charge_id = excluded.reservation_charge_id,
    reservation_payment_id = excluded.reservation_payment_id,
    expense_category_id = excluded.expense_category_id,
    guest_name = excluded.guest_name,
    status = excluded.status,
    amount = excluded.amount,
    currency = excluded.currency,
    due_date = excluded.due_date,
    paid_at = excluded.paid_at,
    description = excluded.description,
    updated_at = now();

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'amountPaid',
    v_paid,
    'transactionStatus',
    v_transaction_status
  );
end;
$$;

create or replace function app_private.approve_reservation_charge_operational(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_charge_amount numeric default null,
  p_charge_type text default 'full',
  p_due_at timestamptz default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_amount numeric(12, 2);
  v_charge_id uuid;
  v_reason text;
  v_reservation public.reservations%rowtype;
begin
  /*
    Aprovar nao confirma a estadia definitivamente. A casa fica segurada como
    indisponivel temporaria ate o pagamento minimo/manual ser confirmado.
  */
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Voce nao tem permissao para aprovar esta reserva.';
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
    and r.tenant_id = p_tenant_id
    and r.owner_id = p_owner_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
  end if;

  if v_reservation.status <> 'pending' then
    raise exception 'Somente reservas pendentes podem gerar cobranca inicial.';
  end if;

  if not app_private.can_access_property(
    v_reservation.tenant_id,
    v_reservation.property_id,
    'reservations.manage'
  ) then
    raise exception 'Voce nao tem permissao para aprovar esta reserva.';
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.tenant_id = v_reservation.tenant_id
      and r.property_id = v_reservation.property_id
      and r.id <> v_reservation.id
      and r.status in ('awaiting_payment', 'confirmed', 'checked_in')
      and r.check_in < v_reservation.check_out
      and r.check_out > v_reservation.check_in
  ) then
    raise exception 'Conflito de datas encontrado para esta casa.';
  end if;

  if exists (
    select 1
    from public.calendar_availability_blocks b
    where b.tenant_id = v_reservation.tenant_id
      and b.property_id = v_reservation.property_id
      and b.blocks_availability is true
      and b.status in ('blocked', 'interdicted', 'maintenance', 'cleaning', 'unavailable', 'reserved')
      and b.starts_on < v_reservation.check_out
      and b.ends_on > v_reservation.check_in
      and coalesce(b.reservation_id, '00000000-0000-0000-0000-000000000000'::uuid) <> v_reservation.id
  ) then
    raise exception 'Conflito de datas encontrado para esta casa.';
  end if;

  if p_charge_type not in ('deposit', 'remaining', 'full', 'extra', 'adjustment') then
    raise exception 'Tipo de cobranca invalido.';
  end if;

  v_amount := coalesce(p_charge_amount, v_reservation.total_amount);

  if v_amount <= 0 or v_amount > v_reservation.total_amount then
    raise exception 'Valor da cobranca invalido.';
  end if;

  v_reason := coalesce(
    nullif(btrim(p_reason), ''),
    'Reserva aprovada e cobranca manual gerada.'
  );

  update public.reservations
     set status = 'awaiting_payment',
         payment_status = 'pending',
         payment_status_updated_at = now(),
         payment_status_updated_by = p_user_id,
         updated_at = now()
   where id = v_reservation.id;

  insert into public.reservation_charges (
    tenant_id,
    property_id,
    reservation_id,
    charge_type,
    amount,
    currency,
    due_at,
    status,
    payment_method,
    payment_provider,
    manual_instructions,
    created_by
  ) values (
    v_reservation.tenant_id,
    v_reservation.property_id,
    v_reservation.id,
    p_charge_type,
    v_amount,
    v_reservation.currency,
    p_due_at,
    'pending',
    v_reservation.payment_method,
    'manual',
    'Aguardando confirmacao manual do proprietario.',
    p_user_id
  )
  returning id into v_charge_id;

  insert into public.calendar_availability_blocks (
    tenant_id,
    property_id,
    unit_id,
    owner_id,
    reservation_id,
    source,
    status,
    block_type,
    blocks_availability,
    starts_on,
    ends_on,
    reason,
    notes,
    metadata,
    created_by
  ) values (
    v_reservation.tenant_id,
    v_reservation.property_id,
    null,
    v_reservation.owner_id,
    v_reservation.id,
    'reservation',
    'unavailable',
    'reservation',
    true,
    v_reservation.check_in,
    v_reservation.check_out,
    'Reserva aguardando pagamento ' || v_reservation.code,
    'Bloqueio temporario ate confirmacao de pagamento.',
    jsonb_build_object('tipo', 'hold_pagamento', 'charge_id', v_charge_id),
    p_user_id
  )
  on conflict (reservation_id) where reservation_id is not null
  do update set
    tenant_id = excluded.tenant_id,
    property_id = excluded.property_id,
    unit_id = null,
    owner_id = excluded.owner_id,
    source = 'reservation',
    status = 'unavailable',
    block_type = 'reservation',
    blocks_availability = true,
    starts_on = excluded.starts_on,
    ends_on = excluded.ends_on,
    reason = excluded.reason,
    notes = excluded.notes,
    metadata = excluded.metadata,
    updated_at = now();

  insert into public.reservation_status_history (
    tenant_id,
    reservation_id,
    from_status,
    to_status,
    changed_by,
    reason,
    metadata
  ) values (
    v_reservation.tenant_id,
    v_reservation.id,
    v_reservation.status,
    'awaiting_payment',
    p_user_id,
    v_reason,
    jsonb_build_object(
      'origem',
      'cobrancas',
      'evento',
      'cobranca_gerada',
      'charge_id',
      v_charge_id,
      'amount',
      v_amount,
      'atomic',
      true
    )
  );

  insert into public.reservation_notes (
    tenant_id,
    reservation_id,
    note_type,
    content,
    created_by
  ) values (
    v_reservation.tenant_id,
    v_reservation.id,
    'system',
    v_reason,
    p_user_id
  );

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'status',
    'awaiting_payment',
    'chargeId',
    v_charge_id,
    'chargeAmount',
    v_amount
  );
end;
$$;

create or replace function app_private.confirm_manual_reservation_payment(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_amount numeric default null,
  p_payment_method text default null,
  p_charge_id uuid default null,
  p_proof_url text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_amount numeric(12, 2);
  v_charge public.reservation_charges%rowtype;
  v_charge_id uuid;
  v_paid numeric(12, 2);
  v_payment_id uuid;
  v_payment_method text;
  v_payment_state jsonb;
  v_reason text;
  v_reservation public.reservations%rowtype;
begin
  /*
    Confirmacao manual de pagamento permite entrada parcial. Ao existir valor
    recebido, a reserva passa a confirmada e o calendario se torna definitivo.
  */
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Voce nao tem permissao para registrar pagamento desta reserva.';
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
    and r.tenant_id = p_tenant_id
    and r.owner_id = p_owner_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
  end if;

  if v_reservation.status in ('cancelled', 'completed') then
    raise exception 'Reserva encerrada nao permite registrar pagamento.';
  end if;

  if not app_private.can_access_property(
    v_reservation.tenant_id,
    v_reservation.property_id,
    'reservations.manage'
  ) then
    raise exception 'Voce nao tem permissao para alterar esta reserva.';
  end if;

  if not app_private.has_tenant_permission(v_reservation.tenant_id, 'finance.manage') then
    raise exception 'Voce nao tem permissao para alterar o financeiro desta reserva.';
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.tenant_id = v_reservation.tenant_id
      and r.property_id = v_reservation.property_id
      and r.id <> v_reservation.id
      and r.status in ('awaiting_payment', 'confirmed', 'checked_in')
      and r.check_in < v_reservation.check_out
      and r.check_out > v_reservation.check_in
  ) then
    raise exception 'Conflito de datas encontrado para esta casa.';
  end if;

  select *
    into v_charge
  from public.reservation_charges c
  where c.id = coalesce(
      p_charge_id,
      (
        select c2.id
        from public.reservation_charges c2
        where c2.tenant_id = v_reservation.tenant_id
          and c2.reservation_id = v_reservation.id
          and c2.status in ('pending', 'partial', 'overdue')
        order by c2.created_at
        limit 1
      )
    )
    and c.tenant_id = v_reservation.tenant_id
    and c.reservation_id = v_reservation.id
  for update;

  if v_charge.id is null then
    insert into public.reservation_charges (
      tenant_id,
      property_id,
      reservation_id,
      charge_type,
      amount,
      currency,
      status,
      payment_method,
      payment_provider,
      manual_instructions,
      created_by
    ) values (
      v_reservation.tenant_id,
      v_reservation.property_id,
      v_reservation.id,
      'full',
      v_reservation.total_amount,
      v_reservation.currency,
      'pending',
      v_reservation.payment_method,
      'manual',
      'Cobranca criada automaticamente ao registrar pagamento manual.',
      p_user_id
    )
    returning * into v_charge;
  end if;

  select coalesce(sum(p.amount), 0)
    into v_paid
  from public.reservation_payments p
  where p.tenant_id = v_reservation.tenant_id
    and p.reservation_id = v_reservation.id
    and p.status = 'confirmed';

  v_amount := coalesce(p_amount, greatest(v_reservation.total_amount - v_paid, 0));

  if v_amount <= 0 then
    raise exception 'Valor do pagamento invalido.';
  end if;

  if v_paid + v_amount > v_reservation.total_amount then
    raise exception 'Valor do pagamento supera o saldo da reserva.';
  end if;

  v_payment_method := coalesce(p_payment_method, v_charge.payment_method, v_reservation.payment_method);

  if v_payment_method is null
    or v_payment_method not in ('pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer')
  then
    raise exception 'Forma de pagamento invalida.';
  end if;

  v_reason := coalesce(
    nullif(btrim(p_reason), ''),
    'Pagamento manual registrado para a reserva.'
  );

  insert into public.reservation_payments (
    tenant_id,
    property_id,
    reservation_id,
    charge_id,
    amount,
    currency,
    payment_method,
    status,
    proof_url,
    notes,
    confirmed_by,
    confirmed_at
  ) values (
    v_reservation.tenant_id,
    v_reservation.property_id,
    v_reservation.id,
    v_charge.id,
    v_amount,
    v_reservation.currency,
    v_payment_method,
    'confirmed',
    p_proof_url,
    v_reason,
    p_user_id,
    now()
  )
  returning id into v_payment_id;

  v_charge_id := v_charge.id;
  perform app_private.sync_reservation_charge_state(v_charge_id);
  v_payment_state := app_private.sync_reservation_payment_state(v_reservation.id);
  perform app_private.upsert_reservation_income_transaction(
    v_reservation.id,
    p_user_id,
    v_payment_id,
    v_charge_id
  );

  if v_reservation.status in ('pending', 'awaiting_payment') then
    update public.reservations
       set status = 'confirmed',
           updated_at = now()
     where id = v_reservation.id
       and tenant_id = v_reservation.tenant_id
       and owner_id = v_reservation.owner_id;

    insert into public.reservation_status_history (
      tenant_id,
      reservation_id,
      from_status,
      to_status,
      changed_by,
      reason,
      metadata
    ) values (
      v_reservation.tenant_id,
      v_reservation.id,
      v_reservation.status,
      'confirmed',
      p_user_id,
      'Reserva confirmada apos pagamento manual.',
      jsonb_build_object(
        'origem',
        'pagamento',
        'evento',
        'reserva_confirmada_por_pagamento',
        'payment_id',
        v_payment_id,
        'atomic',
        true
      )
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
    v_reservation.tenant_id,
    v_reservation.id,
    coalesce((v_payment_state ->> 'paymentStatus'), v_reservation.payment_status),
    coalesce((v_payment_state ->> 'paymentStatus'), v_reservation.payment_status),
    p_user_id,
    v_reason,
    jsonb_build_object(
      'origem',
      'financeiro',
      'evento',
      'pagamento_manual_confirmado',
      'charge_id',
      v_charge_id,
      'payment_id',
      v_payment_id,
      'amount',
      v_amount,
      'atomic',
      true
    )
  );

  insert into public.reservation_notes (
    tenant_id,
    reservation_id,
    note_type,
    content,
    created_by
  ) values (
    v_reservation.tenant_id,
    v_reservation.id,
    'system',
    v_reason,
    p_user_id
  );

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'paymentId',
    v_payment_id,
    'chargeId',
    v_charge_id,
    'amount',
    v_amount,
    'reservationStatus',
    'confirmed',
    'paymentStatus',
    v_payment_state ->> 'paymentStatus'
  );
end;
$$;

create or replace function app_private.set_reservation_payment_operational(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_target_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_reason text;
  v_reservation public.reservations%rowtype;
begin
  /*
    Mantem compatibilidade com botoes antigos:
    - received/paid registra pagamento manual pelo saldo em aberto;
    - pending cancela o lancamento agregado, mas preserva reservation_payments.
  */
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Voce nao tem permissao para alterar o pagamento desta reserva.';
  end if;

  if p_target_status not in ('received', 'paid', 'pending') then
    raise exception 'Status de pagamento invalido.';
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
    and r.tenant_id = p_tenant_id
    and r.owner_id = p_owner_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
  end if;

  if p_target_status in ('received', 'paid') then
    return app_private.confirm_manual_reservation_payment(
      p_reservation_id,
      p_tenant_id,
      p_owner_id,
      p_user_id,
      null,
      v_reservation.payment_method,
      null,
      null,
      coalesce(p_reason, 'Pagamento marcado como recebido.')
    );
  end if;

  if v_reservation.status in ('cancelled', 'completed') then
    raise exception 'Reserva encerrada nao permite alterar pagamento.';
  end if;

  if not app_private.can_access_property(
    v_reservation.tenant_id,
    v_reservation.property_id,
    'reservations.manage'
  ) then
    raise exception 'Voce nao tem permissao para alterar esta reserva.';
  end if;

  if not app_private.has_tenant_permission(v_reservation.tenant_id, 'finance.manage') then
    raise exception 'Voce nao tem permissao para alterar o financeiro desta reserva.';
  end if;

  v_reason := coalesce(nullif(btrim(p_reason), ''), 'Pagamento voltou para pendente.');

  update public.reservation_payments
     set status = 'cancelled',
         notes = coalesce(notes, '') || case when notes is null then '' else E'\n' end || v_reason,
         updated_at = now()
   where tenant_id = v_reservation.tenant_id
     and reservation_id = v_reservation.id
     and status = 'confirmed';

  update public.reservation_charges
     set amount_paid = 0,
         status = 'pending',
         updated_at = now()
   where tenant_id = v_reservation.tenant_id
     and reservation_id = v_reservation.id
     and status in ('partial', 'paid');

  update public.transactions
     set status = 'pending',
         amount = 0,
         paid_at = null,
         description = coalesce(description, 'Recebimento da reserva ' || v_reservation.code)
           || ' - pagamento voltou para pendente',
         updated_at = now()
   where tenant_id = v_reservation.tenant_id
     and reservation_id = v_reservation.id
     and transaction_type = 'income';

  update public.reservations
     set payment_status = 'pending',
         payment_status_updated_at = now(),
         payment_status_updated_by = p_user_id,
         updated_at = now()
   where id = v_reservation.id;

  insert into public.reservation_status_history (
    tenant_id,
    reservation_id,
    from_status,
    to_status,
    changed_by,
    reason,
    metadata
  ) values (
    v_reservation.tenant_id,
    v_reservation.id,
    v_reservation.status,
    v_reservation.status,
    p_user_id,
    v_reason,
    jsonb_build_object(
      'origem',
      'financeiro',
      'evento',
      'pagamento_pendente',
      'payment_status',
      'pending',
      'atomic',
      true
    )
  );

  insert into public.reservation_notes (
    tenant_id,
    reservation_id,
    note_type,
    content,
    created_by
  ) values (
    v_reservation.tenant_id,
    v_reservation.id,
    'system',
    v_reason,
    p_user_id
  );

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'paymentStatus',
    'pending',
    'transactionStatus',
    'pending'
  );
end;
$$;

create or replace function app_private.cancel_reservation_operational(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_financial_status text;
  v_payment_status text;
  v_reason text := coalesce(nullif(btrim(p_reason), ''), 'Reserva cancelada pelo proprietario.');
  v_reservation public.reservations%rowtype;
begin
  /*
    Cancelamento libera calendario e preserva historico financeiro. Pagamentos
    confirmados viram refunded; pendentes viram cancelled.
  */
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Voce nao tem permissao para cancelar esta reserva.';
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
    and r.tenant_id = p_tenant_id
    and r.owner_id = p_owner_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
  end if;

  if v_reservation.status = 'cancelled' then
    raise exception 'Esta reserva ja foi cancelada.';
  end if;

  if v_reservation.status = 'completed' then
    raise exception 'Reserva concluida nao pode ser cancelada.';
  end if;

  if not app_private.can_access_property(
    v_reservation.tenant_id,
    v_reservation.property_id,
    'reservations.manage'
  ) then
    raise exception 'Voce nao tem permissao para cancelar esta reserva.';
  end if;

  if v_reservation.payment_status in ('received', 'paid', 'partial')
    and not app_private.has_tenant_permission(v_reservation.tenant_id, 'finance.manage')
  then
    raise exception 'Voce nao tem permissao para cancelar reserva com pagamento recebido.';
  end if;

  v_payment_status := case
    when v_reservation.payment_status in ('received', 'paid', 'partial') then 'refunded'
    else 'cancelled'
  end;
  v_financial_status := case
    when v_reservation.payment_status in ('received', 'paid', 'partial') then 'refunded'
    else 'cancelled'
  end;

  update public.reservation_payments
     set status = case when status = 'confirmed' then 'refunded' else 'cancelled' end,
         notes = coalesce(notes, '') || case when notes is null then '' else E'\n' end || v_reason,
         updated_at = now()
   where tenant_id = v_reservation.tenant_id
     and reservation_id = v_reservation.id
     and status in ('confirmed', 'pending_review');

  update public.reservation_charges
     set status = case when amount_paid > 0 then 'refunded' else 'cancelled' end,
         updated_at = now()
   where tenant_id = v_reservation.tenant_id
     and reservation_id = v_reservation.id
     and status in ('pending', 'partial', 'paid', 'overdue');

  update public.transactions
     set status = v_financial_status,
         paid_at = null,
         description = coalesce(description, 'Recebimento da reserva ' || v_reservation.code)
           || ' - cancelado junto com a reserva',
         updated_at = now()
   where tenant_id = v_reservation.tenant_id
     and reservation_id = v_reservation.id
     and transaction_type = 'income';

  update public.reservations
     set status = 'cancelled',
         payment_status = v_payment_status,
         payment_status_updated_at = now(),
         payment_status_updated_by = p_user_id,
         cancelled_at = now(),
         cancelled_by = p_user_id,
         cancellation_reason = v_reason,
         updated_at = now()
   where id = v_reservation.id
     and tenant_id = v_reservation.tenant_id
     and owner_id = v_reservation.owner_id;

  insert into public.reservation_status_history (
    tenant_id,
    reservation_id,
    from_status,
    to_status,
    changed_by,
    reason,
    metadata
  ) values (
    v_reservation.tenant_id,
    v_reservation.id,
    v_reservation.status,
    'cancelled',
    p_user_id,
    v_reason,
    jsonb_build_object(
      'origem',
      'reservas',
      'evento',
      'reserva_cancelada',
      'payment_status',
      v_payment_status,
      'finance_status',
      v_financial_status,
      'atomic',
      true
    )
  );

  insert into public.reservation_notes (
    tenant_id,
    reservation_id,
    note_type,
    content,
    created_by
  ) values (
    v_reservation.tenant_id,
    v_reservation.id,
    'system',
    v_reason,
    p_user_id
  );

  if exists (
    select 1
    from public.calendar_availability_blocks b
    where b.tenant_id = v_reservation.tenant_id
      and b.reservation_id = v_reservation.id
      and b.blocks_availability is true
      and b.status in ('blocked', 'interdicted', 'maintenance', 'cleaning', 'unavailable', 'reserved')
  ) then
    raise exception 'Nao foi possivel liberar o periodo no calendario.';
  end if;

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'status',
    'cancelled',
    'paymentStatus',
    v_payment_status,
    'financeStatus',
    v_financial_status
  );
end;
$$;

create or replace function app_private.confirm_reservation_operational(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_reservation public.reservations%rowtype;
  v_reason text := coalesce(nullif(btrim(p_reason), ''), 'Reserva confirmada pelo proprietario.');
begin
  /*
    Mantem a confirmacao manual existente, mas pendencias simples nao entram
    mais como conflito. Apenas cobrancas aguardando pagamento e reservas ativas
    seguram o periodo da casa.
  */
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Voce nao tem permissao para confirmar esta reserva.';
  end if;

  select *
    into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
    and r.tenant_id = p_tenant_id
    and r.owner_id = p_owner_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
  end if;

  if not app_private.can_access_property(
    v_reservation.tenant_id,
    v_reservation.property_id,
    'reservations.manage'
  ) then
    raise exception 'Voce nao tem permissao para confirmar esta reserva.';
  end if;

  if v_reservation.status = 'cancelled' then
    raise exception 'Esta reserva ja foi cancelada.';
  end if;

  if v_reservation.status = 'confirmed' then
    raise exception 'A reserva ja esta confirmada.';
  end if;

  if v_reservation.status in ('checked_in', 'checked_out', 'completed') then
    raise exception 'Reserva ja encerrada nao pode ser confirmada.';
  end if;

  if v_reservation.status not in ('pending', 'awaiting_payment') then
    raise exception 'Status atual da reserva nao permite confirmacao.';
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.tenant_id = v_reservation.tenant_id
      and r.property_id = v_reservation.property_id
      and r.id <> v_reservation.id
      and r.status in ('awaiting_payment', 'confirmed', 'checked_in')
      and r.check_in < v_reservation.check_out
      and r.check_out > v_reservation.check_in
  ) then
    raise exception 'Conflito de datas encontrado para esta casa.';
  end if;

  if exists (
    select 1
    from public.calendar_availability_blocks b
    where b.tenant_id = v_reservation.tenant_id
      and b.property_id = v_reservation.property_id
      and b.blocks_availability is true
      and b.status in ('blocked', 'interdicted', 'maintenance', 'cleaning', 'unavailable', 'reserved')
      and b.starts_on < v_reservation.check_out
      and b.ends_on > v_reservation.check_in
      and coalesce(b.reservation_id, '00000000-0000-0000-0000-000000000000'::uuid) <> v_reservation.id
  ) then
    raise exception 'Conflito de datas encontrado para esta casa.';
  end if;

  update public.reservations
     set status = 'confirmed',
         updated_at = now()
   where id = v_reservation.id
     and tenant_id = v_reservation.tenant_id
     and owner_id = v_reservation.owner_id;

  insert into public.reservation_status_history (
    tenant_id,
    reservation_id,
    from_status,
    to_status,
    changed_by,
    reason,
    metadata
  ) values (
    v_reservation.tenant_id,
    v_reservation.id,
    v_reservation.status,
    'confirmed',
    p_user_id,
    v_reason,
    jsonb_build_object('origem', 'confirmacoes', 'atomic', true)
  );

  insert into public.reservation_notes (
    tenant_id,
    reservation_id,
    note_type,
    content,
    created_by
  ) values (
    v_reservation.tenant_id,
    v_reservation.id,
    'system',
    v_reason,
    p_user_id
  );

  if not exists (
    select 1
    from public.calendar_availability_blocks b
    where b.tenant_id = v_reservation.tenant_id
      and b.property_id = v_reservation.property_id
      and b.reservation_id = v_reservation.id
      and b.status = 'reserved'
      and b.starts_on = v_reservation.check_in
      and b.ends_on = v_reservation.check_out
      and b.blocks_availability is true
  ) then
    raise exception 'Nao foi possivel bloquear o periodo no calendario.';
  end if;

  return jsonb_build_object(
    'reservationId',
    v_reservation.id,
    'status',
    'confirmed'
  );
end;
$$;

create or replace function public.approve_reservation_charge_operational(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_charge_amount numeric default null,
  p_charge_type text default 'full',
  p_due_at timestamptz default null,
  p_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.approve_reservation_charge_operational(
    p_reservation_id,
    p_tenant_id,
    p_owner_id,
    p_user_id,
    p_charge_amount,
    p_charge_type,
    p_due_at,
    p_reason
  );
$$;

create or replace function public.confirm_manual_reservation_payment(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_amount numeric default null,
  p_payment_method text default null,
  p_charge_id uuid default null,
  p_proof_url text default null,
  p_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.confirm_manual_reservation_payment(
    p_reservation_id,
    p_tenant_id,
    p_owner_id,
    p_user_id,
    p_amount,
    p_payment_method,
    p_charge_id,
    p_proof_url,
    p_reason
  );
$$;

comment on function public.approve_reservation_charge_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  timestamptz,
  text
) is
  'Aprova solicitacao, gera cobranca manual e cria bloqueio temporario por property_id.';

comment on function public.confirm_manual_reservation_payment(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  uuid,
  text,
  text
) is
  'Confirma pagamento manual parcial ou total, atualiza cobranca, reserva, calendario e Financeiro.';

revoke all on function public.approve_reservation_charge_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  timestamptz,
  text
) from public, anon;

revoke all on function public.confirm_manual_reservation_payment(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  uuid,
  text,
  text
) from public, anon;

grant execute on function public.approve_reservation_charge_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  timestamptz,
  text
) to authenticated;

grant execute on function public.confirm_manual_reservation_payment(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  uuid,
  text,
  text
) to authenticated;

revoke all on function app_private.approve_reservation_charge_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  timestamptz,
  text
) from public, anon;

revoke all on function app_private.confirm_manual_reservation_payment(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  uuid,
  text,
  text
) from public, anon;

grant execute on function app_private.approve_reservation_charge_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  timestamptz,
  text
) to authenticated, service_role;

grant execute on function app_private.confirm_manual_reservation_payment(
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  uuid,
  text,
  text
) to authenticated, service_role;

/*
  Solicitar reserva publica continua gerando status pending. Pending nao segura
  mais a disponibilidade; a seguranca temporaria nasce quando o proprietario
  aprova e gera uma cobranca.
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
  v_cleaning_fee numeric(12, 2) := 0;
  v_code text;
  v_daily_price numeric(12, 2) := 0;
  v_extra_guest_price numeric(12, 2) := 0;
  v_guest_document text := nullif(btrim(p_guest_document), '');
  v_guest_email text := lower(nullif(btrim(p_guest_email), ''));
  v_guest_name text := nullif(btrim(p_guest_name), '');
  v_guest_notes text := nullif(btrim(p_guest_notes), '');
  v_guest_phone text := nullif(btrim(p_guest_phone), '');
  v_included_guests integer := 1;
  v_max_guests integer := 1;
  v_nights integer;
  v_payment_method text := nullif(btrim(p_payment_method), '');
  v_property public.properties%rowtype;
  v_reservation_id uuid;
  v_total numeric(12, 2);
begin
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'Periodo invalido para a reserva.';
  end if;

  if p_guests_count is null or p_guests_count <= 0 then
    raise exception 'Informe a quantidade de hospedes.';
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
      and r.status in ('awaiting_payment', 'confirmed', 'checked_in')
      and r.check_in < p_check_out
      and r.check_out > p_check_in
  ) then
    raise exception 'A casa ja possui cobranca ou reserva neste periodo.';
  end if;

  if exists (
    select 1
    from public.calendar_availability_blocks b
    where b.tenant_id = v_property.tenant_id
      and b.property_id = v_property.id
      and b.blocks_availability is true
      and b.status in ('blocked', 'interdicted', 'maintenance', 'cleaning', 'unavailable', 'reserved')
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
    v_extra_guest_price := greatest((v_property.pricing_details ->> 'valorHospedeExtra')::numeric, 0);
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
    payment_status,
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
    'pending',
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

/*
  O contrato publico deve considerar apenas indisponibilidades ativas e reservas
  que ja possuem cobranca/confirmacao. Solicitacoes pendentes ainda dependem da
  decisao do proprietario.
*/
drop policy if exists "reservations_select_public_marketplace_availability"
  on public.reservations;
create policy "reservations_select_public_marketplace_availability"
on public.reservations
for select to anon
using (
  status in ('awaiting_payment', 'confirmed', 'checked_in')
  and app_private.is_marketplace_property_public(property_id)
);

notify pgrst, 'reload schema';
