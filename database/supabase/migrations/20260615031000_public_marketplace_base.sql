/*
  Base pública do Marketplace V2.

  A leitura anônima fica limitada à vitrine: propriedades publicadas, sem
  exclusão lógica, vinculadas a tenants ativos/trial e com proprietário coerente.
  Reserva, pagamento, hóspedes e dados administrativos continuam fora do escopo.
*/

grant usage on schema public to anon;
grant usage on schema app_private to anon;
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
  );
$$;
comment on function app_private.is_marketplace_property_public(uuid) is
  'Centraliza a regra de visibilidade pública do Marketplace V2 sem expor dados administrativos.';
grant execute on function app_private.is_marketplace_property_public(uuid)
to anon, authenticated, service_role;
grant select (
  id,
  tenant_id,
  name,
  slug,
  property_type,
  status,
  headline,
  description,
  address,
  timezone,
  created_at,
  updated_at,
  deleted_at
) on public.properties to anon;
grant select (
  id,
  property_id,
  unit_category_id,
  name,
  status,
  capacity,
  bedrooms,
  beds,
  bathrooms,
  base_price
) on public.units to anon;
grant select (
  id,
  property_id,
  name,
  description,
  max_guests,
  bedrooms,
  bathrooms
) on public.unit_categories to anon;
grant select (
  id,
  property_id,
  unit_id,
  media_type,
  storage_bucket,
  storage_path,
  url,
  alt,
  sort_order,
  is_cover,
  status
) on public.media_assets to anon;
grant select (
  property_id,
  amenity_id
) on public.property_amenities to anon;
grant select (
  id,
  code,
  name,
  category,
  is_system
) on public.amenities to anon;
drop policy if exists "properties_select_public_marketplace" on public.properties;
create policy "properties_select_public_marketplace" on public.properties
for select to anon
using (app_private.is_marketplace_property_public(id));
drop policy if exists "units_select_public_marketplace" on public.units;
create policy "units_select_public_marketplace" on public.units
for select to anon
using (
  status = 'active'
  and app_private.is_marketplace_property_public(property_id)
);
drop policy if exists "unit_categories_select_public_marketplace" on public.unit_categories;
create policy "unit_categories_select_public_marketplace" on public.unit_categories
for select to anon
using (app_private.is_marketplace_property_public(property_id));
drop policy if exists "media_assets_select_public_marketplace" on public.media_assets;
create policy "media_assets_select_public_marketplace" on public.media_assets
for select to anon
using (
  property_id is not null
  and media_type = 'image'
  and status = 'active'
  and app_private.is_marketplace_property_public(property_id)
);
drop policy if exists "property_amenities_select_public_marketplace" on public.property_amenities;
create policy "property_amenities_select_public_marketplace" on public.property_amenities
for select to anon
using (app_private.is_marketplace_property_public(property_id));
drop policy if exists "amenities_select_public_marketplace" on public.amenities;
create policy "amenities_select_public_marketplace" on public.amenities
for select to anon
using (
  exists (
    select 1
    from public.property_amenities pa
    where pa.amenity_id = amenities.id
      and app_private.is_marketplace_property_public(pa.property_id)
  )
);
