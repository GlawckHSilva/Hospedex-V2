-- Correcao da Area do Hospede.
-- Reforca o vinculo entre Auth e reservas feitas pelo Marketplace usando
-- e-mail normalizado e guest_user_id. O tenant continua protegido por RLS e o
-- hospede nao vira membro do tenant do proprietario.

create or replace function public.link_guest_reservations()
returns integer
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_guest_id uuid := auth.uid();
  v_guest_email text := lower(nullif(btrim(auth.jwt() ->> 'email'), ''));
  v_total integer := 0;
begin
  -- A fonte principal e o e-mail do Auth. O fallback em profiles cobre tokens
  -- sem claim de e-mail ou sessoes recem-criadas que ainda nao atualizaram JWT.
  if v_guest_id is not null and v_guest_email is null then
    select lower(nullif(btrim(email), ''))
      into v_guest_email
      from public.profiles
     where id = v_guest_id;
  end if;

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
         and lower(nullif(btrim(hospede.email), '')) = v_guest_email
     );

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

comment on function public.link_guest_reservations() is
  'Vincula reservas existentes ao hospede autenticado pelo e-mail normalizado do Auth.';

revoke all on function public.link_guest_reservations() from public;
revoke all on function public.link_guest_reservations() from anon;
grant execute on function public.link_guest_reservations() to authenticated, service_role;

create or replace function app_private.link_reservation_guest_to_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_guest_id uuid := auth.uid();
  v_guest_email text := lower(nullif(btrim(auth.jwt() ->> 'email'), ''));
begin
  -- Quando a solicitacao publica e feita com sessao ativa, o e-mail do form
  -- precisa bater com o e-mail autenticado. Isso impede vincular reserva a
  -- uma conta diferente apenas informando outro e-mail no formulario.
  if v_guest_id is null then
    return new;
  end if;

  if v_guest_email is null then
    select lower(nullif(btrim(email), ''))
      into v_guest_email
      from public.profiles
     where id = v_guest_id;
  end if;

  if new.is_primary is true
     and new.email is not null
     and lower(nullif(btrim(new.email), '')) = v_guest_email then
    update public.reservations reserva
       set guest_user_id = coalesce(reserva.guest_user_id, v_guest_id),
           updated_at = now()
     where reserva.id = new.reservation_id
       and reserva.guest_user_id is null;
  end if;

  return new;
end;
$$;

comment on function app_private.link_reservation_guest_to_auth_user() is
  'Vincula automaticamente novas solicitacoes publicas autenticadas ao guest_user_id correto.';

drop trigger if exists link_reservation_guest_to_auth_user
  on public.reservation_guests;

create trigger link_reservation_guest_to_auth_user
after insert or update of email, is_primary
on public.reservation_guests
for each row
execute function app_private.link_reservation_guest_to_auth_user();
