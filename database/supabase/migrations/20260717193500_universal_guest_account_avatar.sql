/*
  Conta universal do Marketplace.

  - O mesmo auth.uid() pode ser proprietario no Gerenciamento e hospede no Marketplace.
  - Avatar fica em bucket publico, mas a escrita e limitada a pasta do proprio usuario.
  - A solicitacao publica vincula a reserva ao auth.uid() quando houver sessao.
*/

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'hospedex-profile-avatars',
  'hospedex-profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function app_private.storage_owner_user_id(object_name text)
returns uuid
language plpgsql
stable
set search_path = public, app_private, storage
as $$
declare
  user_text text;
begin
  user_text := (storage.foldername(object_name))[1];
  return user_text::uuid;
exception
  when others then
    return null;
end;
$$;

drop policy if exists "profile_avatars_select_public" on storage.objects;
drop policy if exists "profile_avatars_insert_own" on storage.objects;
drop policy if exists "profile_avatars_update_own" on storage.objects;
drop policy if exists "profile_avatars_delete_own" on storage.objects;

create policy "profile_avatars_select_public" on storage.objects
for select to public
using (bucket_id = 'hospedex-profile-avatars');

create policy "profile_avatars_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'hospedex-profile-avatars'
  and app_private.storage_owner_user_id(name) = auth.uid()
);

create policy "profile_avatars_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'hospedex-profile-avatars'
  and app_private.storage_owner_user_id(name) = auth.uid()
)
with check (
  bucket_id = 'hospedex-profile-avatars'
  and app_private.storage_owner_user_id(name) = auth.uid()
);

create policy "profile_avatars_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'hospedex-profile-avatars'
  and app_private.storage_owner_user_id(name) = auth.uid()
);

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
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_auth_email text := lower(nullif(btrim(auth.jwt() ->> 'email'), ''));
  v_guest_email text := lower(nullif(btrim(p_guest_email), ''));
  v_property_owner_id uuid;
  v_result jsonb;
  v_reservation_id uuid;
begin
  if v_auth_user_id is not null and v_auth_email is null then
    select lower(nullif(btrim(email), ''))
      into v_auth_email
      from public.profiles
     where id = v_auth_user_id;
  end if;

  select p.owner_id
    into v_property_owner_id
    from public.properties p
   where p.slug = btrim(p_property_slug)
     and app_private.is_marketplace_property_public(p.id)
   limit 1;

  if v_property_owner_id is not null and v_property_owner_id = v_auth_user_id then
    raise exception 'Voce nao pode solicitar uma reserva para sua propria hospedagem.';
  end if;

  if v_auth_user_id is not null and v_guest_email is distinct from v_auth_email then
    raise exception 'Use o e-mail da sua conta para solicitar esta reserva.';
  end if;

  v_result := app_private.request_public_reservation(
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

  v_reservation_id := nullif(v_result ->> 'reservationId', '')::uuid;

  if v_auth_user_id is not null and v_reservation_id is not null then
    update public.reservations
       set guest_user_id = v_auth_user_id,
           updated_at = now()
     where id = v_reservation_id
       and guest_user_id is null;
  end if;

  return v_result;
end;
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
  'Contrato publico para solicitar reserva; associa auth.uid() ao hospede e bloqueia reserva da propria hospedagem.';

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
