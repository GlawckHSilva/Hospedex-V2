/*
  Regras publicas do Marketplace V2.

  A vitrine anonima deve enxergar somente disponibilidade comercial, sem dados
  pessoais ou administrativos. Licenca, tenant, feature flag e unidade ativa sao
  validados no banco para impedir publicacao indevida por erro de interface.
*/

create or replace function app_private.marketplace_visibility_enabled(
  target_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select coalesce(
    (
      select coalesce(tf.enabled, ff.default_enabled)
      from public.feature_flags ff
      left join public.tenant_features tf
        on tf.feature_flag_id = ff.id
       and tf.tenant_id = target_tenant_id
      where ff.key = 'marketplace_visibility'
      limit 1
    ),
    false
  );
$$;

comment on function app_private.marketplace_visibility_enabled(uuid) is
  'Garante que o tenant so apareca no marketplace quando a feature flag publica estiver ativa.';

grant execute on function app_private.marketplace_visibility_enabled(uuid)
to anon, authenticated, service_role;

create or replace function app_private.is_marketplace_property_public(
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
    from public.properties p
    join public.tenants t on t.id = p.tenant_id
    where p.id = target_property_id
      and p.status = 'published'
      and p.deleted_at is null
      and t.deleted_at is null
      and t.status in ('trial', 'active')
      and t.owner_id = p.owner_id
      and app_private.marketplace_visibility_enabled(p.tenant_id)
      and exists (
        select 1
        from public.licenses l
        where l.tenant_id = p.tenant_id
          and l.owner_id = p.owner_id
          and l.status in ('trial', 'active')
          and l.starts_at <= current_date
          and (l.expires_at is null or l.expires_at >= current_date)
      )
      and exists (
        select 1
        from public.units u
        where u.tenant_id = p.tenant_id
          and u.property_id = p.id
          and u.status = 'active'
      )
  );
$$;

comment on function app_private.is_marketplace_property_public(uuid) is
  'Centraliza a regra publica: propriedade publicada, tenant valido, licenca ativa, feature flag ativa e unidade disponivel.';

grant execute on function app_private.is_marketplace_property_public(uuid)
to anon, authenticated, service_role;

grant select (
  tenant_id,
  property_id,
  unit_id,
  status,
  check_in,
  check_out
) on public.reservations to anon;

grant select (
  tenant_id,
  property_id,
  unit_id,
  status,
  starts_on,
  ends_on
) on public.calendar_availability_blocks to anon;

drop policy if exists "reservations_select_public_marketplace_availability"
  on public.reservations;
create policy "reservations_select_public_marketplace_availability"
on public.reservations
for select to anon
using (
  status in ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
  and app_private.is_marketplace_property_public(property_id)
);

drop policy if exists "calendar_blocks_select_public_marketplace_availability"
  on public.calendar_availability_blocks;
create policy "calendar_blocks_select_public_marketplace_availability"
on public.calendar_availability_blocks
for select to anon
using (
  status in ('blocked', 'unavailable', 'reserved')
  and app_private.is_marketplace_property_public(property_id)
);
