/*
  Detalhes publicos da pagina da casa no Marketplace.

  Reaproveita dados cadastrados no Gerenciamento sem expor observacoes internas
  e limita tudo a propriedades publicadas pela regra central do Marketplace.
*/

grant select (
  tenant_id,
  property_id,
  check_in_time,
  check_out_time,
  min_nights,
  max_nights,
  allow_pets,
  allow_smoking,
  allow_events,
  max_guests,
  min_responsible_age,
  additional_rules,
  cancellation_refund_until_days,
  cancellation_refund_until_percentage,
  cancellation_late_until_days,
  cancellation_late_refund_percentage,
  cancellation_no_refund_within_days,
  cancellation_notes
) on public.property_settings to anon;

drop policy if exists "property_settings_select_public_marketplace"
  on public.property_settings;
create policy "property_settings_select_public_marketplace"
on public.property_settings
for select to anon
using (app_private.is_marketplace_property_public(property_id));

grant select (
  id,
  tenant_id,
  category,
  name,
  description,
  address,
  phone,
  whatsapp,
  website_url,
  opening_hours,
  cover_image_url,
  display_order,
  status,
  deleted_at
) on public.regional_guide_locations to anon;

drop policy if exists "regional_guide_locations_select_public_marketplace"
  on public.regional_guide_locations;
create policy "regional_guide_locations_select_public_marketplace"
on public.regional_guide_locations
for select to anon
using (
  status = 'active'
  and deleted_at is null
  and exists (
    select 1
    from public.properties p
    where p.tenant_id = regional_guide_locations.tenant_id
      and app_private.is_marketplace_property_public(p.id)
  )
);

grant select (
  id,
  tenant_id,
  property_id,
  guest_name,
  rating,
  comment,
  reviewed_at,
  status,
  owner_response,
  owner_responded_at
) on public.property_reviews to anon;

drop policy if exists "property_reviews_select_public_marketplace"
  on public.property_reviews;
create policy "property_reviews_select_public_marketplace"
on public.property_reviews
for select to anon
using (
  status = 'approved'
  and app_private.is_marketplace_property_public(property_id)
);
