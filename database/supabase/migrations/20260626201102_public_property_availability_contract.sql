/*
  Contrato publico de disponibilidade da Casa.

  O Marketplace nao deve consultar calendar_availability_blocks nem reservas
  diretamente. Esta funcao retorna somente o periodo e o status publico por
  property_id, sem motivo interno, observacoes, usuario ou dados do tenant.
*/

revoke all privileges on table
  public.calendar_availability_blocks,
  public.reservations
from anon, public;

drop policy if exists "calendar_blocks_select_public_marketplace_availability"
  on public.calendar_availability_blocks;

create or replace function public.get_public_property_availability(
  p_property_ids uuid[],
  p_starts_on date default current_date,
  p_ends_on date default (current_date + 365)
)
returns table (
  property_id uuid,
  starts_on date,
  ends_on date,
  status text
)
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select
    bloco.property_id,
    greatest(bloco.starts_on, coalesce(p_starts_on, current_date))::date as starts_on,
    least(bloco.ends_on, coalesce(p_ends_on, current_date + 365))::date as ends_on,
    case bloco.status
      when 'reserved' then 'reserved'
      when 'blocked' then 'blocked'
      when 'maintenance' then 'maintenance'
      when 'cleaning' then 'cleaning'
      when 'interdicted' then 'interdicted'
      else 'unavailable'
    end as status
  from public.calendar_availability_blocks bloco
  where p_property_ids is not null
    and bloco.property_id = any(p_property_ids)
    and bloco.property_id is not null
    and bloco.blocks_availability is true
    and bloco.status in (
      'blocked',
      'interdicted',
      'maintenance',
      'cleaning',
      'unavailable',
      'reserved'
    )
    and bloco.starts_on < coalesce(p_ends_on, current_date + 365)
    and bloco.ends_on > coalesce(p_starts_on, current_date)
    and app_private.is_marketplace_property_public(bloco.property_id)
  order by bloco.starts_on, bloco.ends_on;
$$;

comment on function public.get_public_property_availability(uuid[], date, date) is
  'Retorna somente periodos e status publicos de disponibilidade por casa.';

revoke all on function public.get_public_property_availability(uuid[], date, date)
  from public;
grant execute on function public.get_public_property_availability(uuid[], date, date)
  to anon, authenticated;

notify pgrst, 'reload schema';
