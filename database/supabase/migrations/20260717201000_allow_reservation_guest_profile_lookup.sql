/*
  Permite que o Gerenciamento mostre a foto do hospede em reservas do tenant.

  A leitura fica limitada ao perfil vinculado por guest_user_id em reservas do
  proprio tenant; nao libera listagem global de perfis.
*/
drop policy if exists "profiles_select_reservation_guest" on public.profiles;

create policy "profiles_select_reservation_guest" on public.profiles
for select to authenticated
using (
  exists (
    select 1
      from public.reservations r
     where r.guest_user_id = profiles.id
       and (
         app_private.is_tenant_owner(r.tenant_id)
         or app_private.has_tenant_permission(r.tenant_id, 'reservations.read')
         or app_private.has_tenant_permission(r.tenant_id, 'reservations.manage')
       )
  )
);

notify pgrst, 'reload schema';
