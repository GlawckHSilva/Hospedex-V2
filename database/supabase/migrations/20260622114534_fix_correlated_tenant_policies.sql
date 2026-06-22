/*
  Corrige policies com referencias correlacionadas ambiguas.

  Sem qualificar a coluna externa, o PostgreSQL podia interpretar tenant_id
  como coluna da tabela interna e aceitar uma comparacao sempre verdadeira.
*/

create or replace function app_private.can_access_reservation(
  target_tenant_id uuid,
  target_reservation_id uuid,
  permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.reservations reservation_scope
    where reservation_scope.id = target_reservation_id
      and reservation_scope.tenant_id = target_tenant_id
      and app_private.can_access_property(
        reservation_scope.tenant_id,
        reservation_scope.property_id,
        permission_code
      )
  );
$$;

comment on function app_private.can_access_reservation(uuid, uuid, text) is
  'Valida tenant, reserva, propriedade e permissao antes de liberar tabelas filhas da reserva.';

revoke all on function app_private.can_access_reservation(uuid, uuid, text) from public;
revoke all on function app_private.can_access_reservation(uuid, uuid, text) from anon;
grant execute on function app_private.can_access_reservation(uuid, uuid, text)
  to authenticated, service_role;

drop policy if exists "reservation_guests_select" on public.reservation_guests;
drop policy if exists "reservation_guests_manage" on public.reservation_guests;
drop policy if exists "reservation_status_history_select" on public.reservation_status_history;
drop policy if exists "reservation_status_history_manage" on public.reservation_status_history;
drop policy if exists "reservation_extra_services_select" on public.reservation_extra_services;
drop policy if exists "reservation_extra_services_manage" on public.reservation_extra_services;
drop policy if exists "reservation_notes_select" on public.reservation_notes;
drop policy if exists "reservation_notes_manage" on public.reservation_notes;

create policy "reservation_guests_select" on public.reservation_guests
for select to authenticated
using (
  app_private.can_access_reservation(
    reservation_guests.tenant_id,
    reservation_guests.reservation_id,
    'reservations.read'
  )
);

create policy "reservation_guests_manage" on public.reservation_guests
for all to authenticated
using (
  app_private.can_access_reservation(
    reservation_guests.tenant_id,
    reservation_guests.reservation_id,
    'reservations.manage'
  )
)
with check (
  app_private.can_access_reservation(
    reservation_guests.tenant_id,
    reservation_guests.reservation_id,
    'reservations.manage'
  )
);

create policy "reservation_status_history_select" on public.reservation_status_history
for select to authenticated
using (
  app_private.can_access_reservation(
    reservation_status_history.tenant_id,
    reservation_status_history.reservation_id,
    'reservations.read'
  )
);

create policy "reservation_status_history_manage" on public.reservation_status_history
for all to authenticated
using (
  app_private.can_access_reservation(
    reservation_status_history.tenant_id,
    reservation_status_history.reservation_id,
    'reservations.manage'
  )
)
with check (
  app_private.can_access_reservation(
    reservation_status_history.tenant_id,
    reservation_status_history.reservation_id,
    'reservations.manage'
  )
);

create policy "reservation_extra_services_select" on public.reservation_extra_services
for select to authenticated
using (
  app_private.can_access_reservation(
    reservation_extra_services.tenant_id,
    reservation_extra_services.reservation_id,
    'reservations.read'
  )
);

create policy "reservation_extra_services_manage" on public.reservation_extra_services
for all to authenticated
using (
  app_private.can_access_reservation(
    reservation_extra_services.tenant_id,
    reservation_extra_services.reservation_id,
    'reservations.manage'
  )
)
with check (
  app_private.can_access_reservation(
    reservation_extra_services.tenant_id,
    reservation_extra_services.reservation_id,
    'reservations.manage'
  )
);

create policy "reservation_notes_select" on public.reservation_notes
for select to authenticated
using (
  app_private.can_access_reservation(
    reservation_notes.tenant_id,
    reservation_notes.reservation_id,
    'reservations.read'
  )
);

create policy "reservation_notes_manage" on public.reservation_notes
for all to authenticated
using (
  app_private.can_access_reservation(
    reservation_notes.tenant_id,
    reservation_notes.reservation_id,
    'reservations.manage'
  )
)
with check (
  app_private.can_access_reservation(
    reservation_notes.tenant_id,
    reservation_notes.reservation_id,
    'reservations.manage'
  )
);

create or replace function app_private.is_extra_service_property_scope(
  target_tenant_id uuid,
  target_extra_service_id uuid,
  target_property_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.extra_services service_scope
    where service_scope.id = target_extra_service_id
      and service_scope.tenant_id = target_tenant_id
      and service_scope.deleted_at is null
  )
  and exists (
    select 1
    from public.properties property_scope
    where property_scope.id = target_property_id
      and property_scope.tenant_id = target_tenant_id
  );
$$;

comment on function app_private.is_extra_service_property_scope(uuid, uuid, uuid) is
  'Garante que servico extra e propriedade pertencem ao mesmo tenant da associacao.';

revoke all on function app_private.is_extra_service_property_scope(uuid, uuid, uuid) from public;
revoke all on function app_private.is_extra_service_property_scope(uuid, uuid, uuid) from anon;
grant execute on function app_private.is_extra_service_property_scope(uuid, uuid, uuid)
  to authenticated, service_role;

drop policy if exists "extra_service_properties_select_member"
  on public.extra_service_properties;
drop policy if exists "extra_service_properties_insert_reservations"
  on public.extra_service_properties;
drop policy if exists "extra_service_properties_update_reservations"
  on public.extra_service_properties;
drop policy if exists "extra_service_properties_delete_reservations"
  on public.extra_service_properties;

create policy "extra_service_properties_select_member"
on public.extra_service_properties
for select to authenticated
using (
  app_private.is_tenant_member(extra_service_properties.tenant_id)
  and app_private.is_extra_service_property_scope(
    extra_service_properties.tenant_id,
    extra_service_properties.extra_service_id,
    extra_service_properties.property_id
  )
);

create policy "extra_service_properties_insert_reservations"
on public.extra_service_properties
for insert to authenticated
with check (
  (
    app_private.has_tenant_permission(extra_service_properties.tenant_id, 'reservations.manage')
    or app_private.has_tenant_permission(extra_service_properties.tenant_id, 'settings.manage')
  )
  and app_private.is_extra_service_property_scope(
    extra_service_properties.tenant_id,
    extra_service_properties.extra_service_id,
    extra_service_properties.property_id
  )
);

create policy "extra_service_properties_update_reservations"
on public.extra_service_properties
for update to authenticated
using (
  (
    app_private.has_tenant_permission(extra_service_properties.tenant_id, 'reservations.manage')
    or app_private.has_tenant_permission(extra_service_properties.tenant_id, 'settings.manage')
  )
  and app_private.is_extra_service_property_scope(
    extra_service_properties.tenant_id,
    extra_service_properties.extra_service_id,
    extra_service_properties.property_id
  )
)
with check (
  (
    app_private.has_tenant_permission(extra_service_properties.tenant_id, 'reservations.manage')
    or app_private.has_tenant_permission(extra_service_properties.tenant_id, 'settings.manage')
  )
  and app_private.is_extra_service_property_scope(
    extra_service_properties.tenant_id,
    extra_service_properties.extra_service_id,
    extra_service_properties.property_id
  )
);

create policy "extra_service_properties_delete_reservations"
on public.extra_service_properties
for delete to authenticated
using (
  (
    app_private.has_tenant_permission(extra_service_properties.tenant_id, 'reservations.manage')
    or app_private.has_tenant_permission(extra_service_properties.tenant_id, 'settings.manage')
  )
  and app_private.is_extra_service_property_scope(
    extra_service_properties.tenant_id,
    extra_service_properties.extra_service_id,
    extra_service_properties.property_id
  )
);
