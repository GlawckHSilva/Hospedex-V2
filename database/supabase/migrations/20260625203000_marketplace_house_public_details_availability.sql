/*
  Contrato publico da pagina da Casa.

  Libera somente dados de apresentacao e estados de disponibilidade. Motivos,
  observacoes internas e demais dados administrativos continuam privados.
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
  short_description,
  full_description,
  is_public,
  public_details,
  address,
  structure_details,
  pricing_details,
  timezone,
  created_at,
  updated_at,
  deleted_at
) on public.properties to anon;

grant select (
  tenant_id,
  property_id,
  check_in_time,
  check_out_time,
  min_nights,
  max_nights,
  allow_children,
  allow_pets,
  allow_smoking,
  allow_events,
  max_guests,
  min_responsible_age,
  additional_rules,
  special_instructions,
  cancellation_refund_until_days,
  cancellation_refund_until_percentage,
  cancellation_late_until_days,
  cancellation_late_refund_percentage,
  cancellation_no_refund_within_days,
  cancellation_notes
) on public.property_settings to anon;

grant select (
  property_id,
  status,
  blocks_availability,
  starts_on,
  ends_on
) on public.calendar_availability_blocks to anon;

create or replace function app_private.is_marketplace_property_public(
  target_property_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select exists (
    select 1
    from public.properties p
    join public.tenants t
      on t.id = p.tenant_id
     and t.owner_id = p.owner_id
    where p.id = target_property_id
      and p.is_public is true
      and p.status = 'published'
      and p.deleted_at is null
      and t.deleted_at is null
      and t.status in ('trial', 'active')
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
  );
$$;

comment on function app_private.is_marketplace_property_public(uuid) is
  'Exige publicacao, tenant, licenca e feature flag validos. A Casa nao depende de unidade ativa.';

drop policy if exists "calendar_blocks_select_public_marketplace_availability"
  on public.calendar_availability_blocks;

create policy "calendar_blocks_select_public_marketplace_availability"
on public.calendar_availability_blocks
for select to anon
using (
  blocks_availability is true
  and status in (
    'blocked',
    'interdicted',
    'maintenance',
    'cleaning',
    'unavailable',
    'reserved'
  )
  and app_private.is_marketplace_property_public(property_id)
);
