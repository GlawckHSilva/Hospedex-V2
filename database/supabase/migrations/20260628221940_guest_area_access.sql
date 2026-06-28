-- Area do Hospede.
-- Este bloco conecta uma conta autenticada do Marketplace as reservas feitas
-- com o mesmo e-mail, sem transformar hospede em membro de tenant.
-- A regra evita misturar acesso de proprietario/funcionario com o acesso do
-- cliente final e mantem a Casa/Propriedade como item reservavel.

alter table public.profiles
  add column if not exists document_number text,
  add column if not exists city text,
  add column if not exists state text;

comment on column public.profiles.document_number is
  'Documento opcional do hospede. Usado apenas no perfil do cliente final, sem autorizar acesso.';
comment on column public.profiles.city is
  'Cidade opcional do hospede para facilitar comunicacao e reservas futuras.';
comment on column public.profiles.state is
  'Estado opcional do hospede para facilitar comunicacao e reservas futuras.';

alter table public.reservations
  add column if not exists guest_user_id uuid references public.profiles(id) on delete set null;

comment on column public.reservations.guest_user_id is
  'Conta autenticada do hospede vinculada a reserva. O hospede so ve reservas ligadas a este id.';

create index if not exists reservations_guest_user_id_idx
  on public.reservations (guest_user_id);

create index if not exists reservation_guests_email_idx
  on public.reservation_guests (lower(email))
  where email is not null;

-- Backfill inicial para contas ja existentes. O e-mail e usado somente para
-- vincular reservas historicas; depois a autorizacao fica no guest_user_id.
update public.reservations reserva
   set guest_user_id = perfil.id
  from public.reservation_guests hospede
  join public.profiles perfil
    on lower(perfil.email) = lower(hospede.email)
 where hospede.reservation_id = reserva.id
   and hospede.is_primary is true
   and hospede.email is not null
   and reserva.guest_user_id is null;

drop policy if exists "reservations_select_guest_own" on public.reservations;
create policy "reservations_select_guest_own"
on public.reservations
for select
to authenticated
using (guest_user_id = (select auth.uid()));

drop policy if exists "reservation_guests_select_guest_own" on public.reservation_guests;
create policy "reservation_guests_select_guest_own"
on public.reservation_guests
for select
to authenticated
using (
  exists (
    select 1
    from public.reservations reserva
    where reserva.id = reservation_guests.reservation_id
      and reserva.guest_user_id = (select auth.uid())
  )
);

drop policy if exists "reservation_status_history_select_guest_own" on public.reservation_status_history;
create policy "reservation_status_history_select_guest_own"
on public.reservation_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.reservations reserva
    where reserva.id = reservation_status_history.reservation_id
      and reserva.guest_user_id = (select auth.uid())
  )
);

drop policy if exists "reservation_notes_select_guest_visible" on public.reservation_notes;
create policy "reservation_notes_select_guest_visible"
on public.reservation_notes
for select
to authenticated
using (
  note_type in ('guest', 'system')
  and exists (
    select 1
    from public.reservations reserva
    where reserva.id = reservation_notes.reservation_id
      and reserva.guest_user_id = (select auth.uid())
  )
);

create or replace function public.link_guest_reservations()
returns integer
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_guest_id uuid := auth.uid();
  v_guest_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_total integer := 0;
begin
  -- O vinculo depende de sessao autenticada e e-mail confirmado pelo Auth.
  -- Nao usamos user_metadata porque o hospede poderia alterar esses dados.
  if v_guest_id is null or v_guest_email is null then
    return 0;
  end if;

  update public.reservations reserva
     set guest_user_id = v_guest_id,
         updated_at = now()
   where reserva.guest_user_id is null
     and exists (
       select 1
       from public.reservation_guests hospede
       where hospede.reservation_id = reserva.id
         and hospede.is_primary is true
         and lower(hospede.email) = v_guest_email
     );

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

comment on function public.link_guest_reservations() is
  'Vincula reservas antigas ao hospede autenticado pelo e-mail do Auth, preservando RLS por guest_user_id.';

revoke all on function public.link_guest_reservations() from public;
revoke all on function public.link_guest_reservations() from anon;
grant execute on function public.link_guest_reservations() to authenticated, service_role;

create or replace function public.get_guest_reservation_payment_guidance(
  p_reservation_ids uuid[]
)
returns table (
  reservation_id uuid,
  payment_method text,
  payment_status text,
  instruction text,
  owner_name text,
  owner_phone text,
  owner_whatsapp text,
  prepared_message text
)
language sql
stable
security definer
set search_path = public, app_private
as $$
  select
    reserva.id as reservation_id,
    reserva.payment_method,
    reserva.payment_status,
    nullif(
      case reserva.payment_method
        when 'pix' then coalesce(
          nullif(configuracao.pix_payment_note, ''),
          'Combine o pagamento via Pix com o proprietario pelo contato informado.'
        )
        when 'cash' then coalesce(
          nullif(configuracao.cash_payment_instructions, ''),
          'Pagamento em dinheiro combinado diretamente com o proprietario.'
        )
        when 'debit_card' then coalesce(
          nullif(configuracao.debit_card_payment_instructions, ''),
          'Pagamento por debito sera orientado pelo proprietario, sem envio de dados sensiveis.'
        )
        when 'credit_card' then trim(concat_ws(
          ' ',
          nullif(configuracao.credit_card_payment_instructions, ''),
          nullif(configuracao.credit_card_installments_note, '')
        ))
        when 'bank_transfer' then coalesce(
          nullif(configuracao.bank_transfer_payment_instructions, ''),
          'Transferencia bancaria combinada diretamente com o proprietario.'
        )
        else 'O proprietario enviara as instrucoes de pagamento quando a reserva for confirmada.'
      end,
      ''
    ) as instruction,
    coalesce(nullif(proprietario.full_name, ''), tenant.name) as owner_name,
    coalesce(nullif(configuracao.phone, ''), proprietario.phone) as owner_phone,
    nullif(configuracao.whatsapp, '') as owner_whatsapp,
    concat(
      'Reserva ', reserva.code,
      ' - forma de pagamento: ', coalesce(reserva.payment_method, 'nao informada'),
      '. Valor oficial: BRL ', reserva.total_amount::text,
      '. Status do pagamento: ', reserva.payment_status, '.'
    ) as prepared_message
  from public.reservations reserva
  join public.tenants tenant on tenant.id = reserva.tenant_id
  join public.profiles proprietario on proprietario.id = reserva.owner_id
  left join public.tenant_settings configuracao on configuracao.tenant_id = reserva.tenant_id
  where reserva.id = any(p_reservation_ids)
    and reserva.guest_user_id = (select auth.uid());
$$;

comment on function public.get_guest_reservation_payment_guidance(uuid[]) is
  'Retorna apenas instrucoes de pagamento visiveis ao hospede dono da reserva, sem expor secrets nem service role.';

revoke all on function public.get_guest_reservation_payment_guidance(uuid[]) from public;
revoke all on function public.get_guest_reservation_payment_guidance(uuid[]) from anon;
grant execute on function public.get_guest_reservation_payment_guidance(uuid[])
  to authenticated, service_role;
