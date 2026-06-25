/*
  Restringe o papel anon ao minimo necessario para o Marketplace.

  O banco remoto possuia privilegios amplos de tabela para anon. Mesmo com RLS,
  manter INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER e REFERENCES aumenta a
  superficie de ataque. A escrita publica deve ocorrer exclusivamente pela RPC.
*/

revoke all privileges on table
  public.properties,
  public.units,
  public.unit_categories,
  public.media_assets,
  public.amenities,
  public.property_amenities,
  public.property_settings,
  public.regional_guide_locations,
  public.property_reviews,
  public.calendar_availability_blocks,
  public.reservations,
  public.reservation_guests,
  public.reservation_status_history,
  public.reservation_notes,
  public.crm_guests
from anon;

revoke all privileges on table
  public.properties,
  public.units,
  public.unit_categories,
  public.media_assets,
  public.amenities,
  public.property_amenities,
  public.property_settings,
  public.regional_guide_locations,
  public.property_reviews,
  public.calendar_availability_blocks,
  public.reservations,
  public.reservation_guests,
  public.reservation_status_history,
  public.reservation_notes,
  public.crm_guests
from public;

/*
  Somente colunas necessarias para montar a vitrine e consultar disponibilidade
  sao expostas. Dados pessoais, observacoes internas e historico ficam privados.
*/
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
  id,
  code,
  name,
  category,
  is_system
) on public.amenities to anon;

grant select (
  property_id,
  amenity_id
) on public.property_amenities to anon;

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

grant select (
  tenant_id,
  property_id,
  unit_id,
  status,
  starts_on,
  ends_on
) on public.calendar_availability_blocks to anon;

grant select (
  tenant_id,
  property_id,
  unit_id,
  status,
  check_in,
  check_out
) on public.reservations to anon;
