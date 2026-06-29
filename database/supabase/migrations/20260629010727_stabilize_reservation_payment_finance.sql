/*
  Estabilizacao operacional de reservas, pagamento e financeiro.

  As operacoes criticas abaixo ficam no banco para preservar atomicidade:
  status da reserva, timeline, bloqueio de calendario e lancamento financeiro
  precisam mudar juntos ou nao mudar. Isso evita dinheiro sem reserva, reserva
  cancelada com calendario bloqueado e pagamento recebido sem rastreio.
*/

create unique index if not exists transactions_reservation_income_uidx
  on public.transactions (tenant_id, reservation_id)
  where transaction_type = 'income' and reservation_id is not null;

create or replace function app_private.sync_reservation_calendar_block()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  active_reservation boolean;
begin
  /*
    A casa e o item reservavel da V2. Pedidos pendentes nao bloqueiam o
    calendario definitivo; o bloqueio oficial nasce quando a reserva e
    confirmada. Isso evita indisponibilidade visual sem decisao do proprietario.
  */
  active_reservation := new.status in ('confirmed', 'checked_in');

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
      'Bloqueio automatico gerado pela reserva confirmada.',
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

update public.calendar_availability_blocks bloco
   set status = 'released',
       unit_id = null,
       notes = 'Reserva liberada por estabilizacao do fluxo operacional.',
       updated_at = now()
  from public.reservations reserva
 where bloco.reservation_id = reserva.id
   and bloco.source = 'reservation'
   and reserva.status not in ('confirmed', 'checked_in')
   and bloco.status <> 'released';

create or replace function app_private.ensure_reservation_income_category(
  p_tenant_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_category_id uuid;
begin
  insert into public.expense_categories (tenant_id, name, kind, status)
  values (p_tenant_id, 'Reserva', 'income', 'active')
  on conflict (tenant_id, name, kind)
  do update set
    status = 'active',
    updated_at = now()
  returning id into v_category_id;

  return v_category_id;
end;
$$;

create or replace function app_private.ensure_reservation_financial_account(
  p_tenant_id uuid,
  p_owner_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_account_id uuid;
begin
  perform app_private.ensure_finance_defaults(p_tenant_id, p_owner_id);

  select conta.id
    into v_account_id
  from public.financial_accounts conta
  where conta.tenant_id = p_tenant_id
    and conta.owner_id = p_owner_id
    and conta.status = 'active'
  order by conta.created_at
  limit 1;

  if v_account_id is null then
    insert into public.financial_accounts (
      tenant_id,
      owner_id,
      name,
      account_type,
      currency,
      status
    ) values (
      p_tenant_id,
      p_owner_id,
      'Caixa principal',
      'cash',
      'BRL',
      'active'
    )
    returning id into v_account_id;
  end if;

  return v_account_id;
end;
$$;

create or replace function app_private.get_primary_reservation_guest_name(
  p_tenant_id uuid,
  p_reservation_id uuid
)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select hospede.full_name
  from public.reservation_guests hospede
  where hospede.tenant_id = p_tenant_id
    and hospede.reservation_id = p_reservation_id
    and hospede.is_primary is true
  order by hospede.created_at
  limit 1;
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
  v_account_id uuid;
  v_category_id uuid;
  v_guest_name text;
  v_property_name text;
  v_reason text;
  v_reservation public.reservations%rowtype;
  v_transaction_status text;
begin
  /*
    Pagamento e financeiro sao alterados juntos. O frontend nunca usa service
    role; a identidade autenticada e conferida antes de qualquer escrita.
  */
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Voce nao tem permissao para alterar o pagamento desta reserva.';
  end if;

  if p_target_status not in ('received', 'pending') then
    raise exception 'Status de pagamento invalido.';
  end if;

  select *
    into v_reservation
  from public.reservations reserva
  where reserva.id = p_reservation_id
    and reserva.tenant_id = p_tenant_id
    and reserva.owner_id = p_owner_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reserva nao encontrada.';
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

  if not app_private.has_tenant_permission(
    v_reservation.tenant_id,
    'finance.manage'
  ) then
    raise exception 'Voce nao tem permissao para alterar o financeiro desta reserva.';
  end if;

  if p_target_status = 'received' and v_reservation.total_amount <= 0 then
    raise exception 'Valor da reserva invalido para registrar pagamento.';
  end if;

  v_account_id := app_private.ensure_reservation_financial_account(
    v_reservation.tenant_id,
    v_reservation.owner_id
  );
  v_category_id := app_private.ensure_reservation_income_category(
    v_reservation.tenant_id
  );
  v_guest_name := app_private.get_primary_reservation_guest_name(
    v_reservation.tenant_id,
    v_reservation.id
  );

  select propriedade.name
    into v_property_name
  from public.properties propriedade
  where propriedade.id = v_reservation.property_id;

  v_transaction_status := case
    when p_target_status = 'received' then 'paid'
    else 'pending'
  end;

  v_reason := coalesce(
    nullif(btrim(p_reason), ''),
    case
      when p_target_status = 'received' then 'Pagamento marcado como recebido.'
      else 'Pagamento voltou para pendente.'
    end
  );

  insert into public.transactions (
    tenant_id,
    financial_account_id,
    property_id,
    reservation_id,
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
    v_category_id,
    v_guest_name,
    'income',
    v_transaction_status,
    v_reservation.total_amount,
    v_reservation.currency,
    v_reservation.check_in,
    case when p_target_status = 'received' then now() else null end,
    case
      when p_target_status = 'received' then
        'Recebimento da reserva ' || v_reservation.code || ' - ' || coalesce(v_property_name, 'Casa')
      else
        'Pagamento pendente da reserva ' || v_reservation.code || ' - ' || coalesce(v_property_name, 'Casa')
    end
  )
  on conflict (tenant_id, reservation_id) where transaction_type = 'income'
  do update set
    financial_account_id = excluded.financial_account_id,
    property_id = excluded.property_id,
    expense_category_id = excluded.expense_category_id,
    guest_name = excluded.guest_name,
    status = excluded.status,
    amount = excluded.amount,
    currency = excluded.currency,
    due_date = excluded.due_date,
    paid_at = excluded.paid_at,
    description = excluded.description,
    updated_at = now();

  update public.reservations
     set payment_status = p_target_status,
         payment_status_updated_at = now(),
         payment_status_updated_by = p_user_id,
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
    v_reservation.status,
    p_user_id,
    v_reason,
    jsonb_build_object(
      'origem',
      'financeiro',
      'evento',
      case when p_target_status = 'received' then 'pagamento_recebido' else 'pagamento_pendente' end,
      'payment_status',
      p_target_status,
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
    p_target_status,
    'transactionStatus',
    v_transaction_status
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
    Cancelamento mexe em reserva, calendario e financeiro. A operacao precisa
    preservar historico de dinheiro: lancamento pago vira estornado, nao some.
  */
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Voce nao tem permissao para cancelar esta reserva.';
  end if;

  select *
    into v_reservation
  from public.reservations reserva
  where reserva.id = p_reservation_id
    and reserva.tenant_id = p_tenant_id
    and reserva.owner_id = p_owner_id
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

  if v_reservation.payment_status = 'received'
    and not app_private.has_tenant_permission(v_reservation.tenant_id, 'finance.manage')
  then
    raise exception 'Voce nao tem permissao para cancelar reserva com pagamento recebido.';
  end if;

  v_payment_status := case
    when v_reservation.payment_status = 'received' then 'refunded'
    else 'cancelled'
  end;
  v_financial_status := case
    when v_reservation.payment_status = 'received' then 'refunded'
    else 'cancelled'
  end;

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
    from public.calendar_availability_blocks bloco
    where bloco.tenant_id = v_reservation.tenant_id
      and bloco.reservation_id = v_reservation.id
      and bloco.blocks_availability is true
      and bloco.status in (
        'blocked',
        'interdicted',
        'maintenance',
        'cleaning',
        'unavailable',
        'reserved'
      )
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

comment on function app_private.set_reservation_payment_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) is
  'Altera pagamento e lancamento financeiro de reserva em transacao unica, sem confirmar reserva automaticamente.';

comment on function app_private.cancel_reservation_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text
) is
  'Cancela reserva em transacao unica e preserva historico financeiro por estorno/cancelamento rastreavel.';

revoke all on function app_private.set_reservation_payment_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) from public, anon;
revoke all on function app_private.cancel_reservation_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text
) from public, anon;

grant execute on function app_private.set_reservation_payment_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) to authenticated, service_role;
grant execute on function app_private.cancel_reservation_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text
) to authenticated, service_role;

create or replace function public.set_reservation_payment_operational(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_target_status text,
  p_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.set_reservation_payment_operational(
    p_reservation_id,
    p_tenant_id,
    p_owner_id,
    p_user_id,
    p_target_status,
    p_reason
  );
$$;

create or replace function public.cancel_reservation_operational(
  p_reservation_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_user_id uuid,
  p_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.cancel_reservation_operational(
    p_reservation_id,
    p_tenant_id,
    p_owner_id,
    p_user_id,
    p_reason
  );
$$;

comment on function public.set_reservation_payment_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) is
  'Entrada autenticada para marcar pagamento recebido ou pendente sem expor segredo ao frontend.';

comment on function public.cancel_reservation_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text
) is
  'Entrada autenticada para cancelar reserva mantendo calendario e financeiro consistentes.';

revoke all on function public.set_reservation_payment_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) from public, anon;
revoke all on function public.cancel_reservation_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text
) from public, anon;

grant execute on function public.set_reservation_payment_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) to authenticated;
grant execute on function public.cancel_reservation_operational(
  uuid,
  uuid,
  uuid,
  uuid,
  text
) to authenticated;

notify pgrst, 'reload schema';
