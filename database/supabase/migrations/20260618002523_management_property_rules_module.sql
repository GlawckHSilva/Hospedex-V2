-- Politicas e regras da casa no Gerenciamento.
-- Evolui property_settings, que ja e a fonte por propriedade para regras de
-- operacao e reserva. Marketplace apenas consumira estes dados em etapa futura.

alter table public.property_settings
  add column if not exists allow_pets boolean not null default false,
  add column if not exists allow_smoking boolean not null default false,
  add column if not exists allow_events boolean not null default false,
  add column if not exists max_guests integer not null default 1,
  add column if not exists min_responsible_age integer not null default 18,
  add column if not exists additional_rules text,
  add column if not exists cancellation_refund_until_days integer not null default 7,
  add column if not exists cancellation_refund_until_percentage numeric(5, 2) not null default 100,
  add column if not exists cancellation_late_until_days integer not null default 1,
  add column if not exists cancellation_late_refund_percentage numeric(5, 2) not null default 50,
  add column if not exists cancellation_no_refund_within_days integer not null default 0,
  add column if not exists cancellation_notes text,
  add column if not exists min_advance_days integer not null default 0,
  add column if not exists max_advance_days integer;

comment on column public.property_settings.allow_pets is
  'Regra operacional da casa; nao libera marketplace automaticamente nesta etapa.';
comment on column public.property_settings.max_guests is
  'Capacidade maxima permitida pela regra da casa, separada da capacidade tecnica das unidades.';
comment on column public.property_settings.cancellation_refund_until_percentage is
  'Percentual de reembolso usado futuramente no cancelamento da reserva.';
comment on column public.property_settings.min_advance_days is
  'Antecedencia minima para reservar. Disponibilidade futura deve considerar este campo.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'property_settings_max_guests_check'
      and conrelid = 'public.property_settings'::regclass
  ) then
    alter table public.property_settings
      add constraint property_settings_max_guests_check check (max_guests > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'property_settings_min_responsible_age_check'
      and conrelid = 'public.property_settings'::regclass
  ) then
    alter table public.property_settings
      add constraint property_settings_min_responsible_age_check check (min_responsible_age >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'property_settings_cancellation_percentages_check'
      and conrelid = 'public.property_settings'::regclass
  ) then
    alter table public.property_settings
      add constraint property_settings_cancellation_percentages_check
      check (
        cancellation_refund_until_percentage between 0 and 100
        and cancellation_late_refund_percentage between 0 and 100
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'property_settings_cancellation_days_check'
      and conrelid = 'public.property_settings'::regclass
  ) then
    alter table public.property_settings
      add constraint property_settings_cancellation_days_check
      check (
        cancellation_refund_until_days >= 0
        and cancellation_late_until_days >= 0
        and cancellation_no_refund_within_days >= 0
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'property_settings_stay_window_check'
      and conrelid = 'public.property_settings'::regclass
  ) then
    alter table public.property_settings
      add constraint property_settings_stay_window_check
      check (max_nights is null or max_nights >= min_nights);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'property_settings_advance_window_check'
      and conrelid = 'public.property_settings'::regclass
  ) then
    alter table public.property_settings
      add constraint property_settings_advance_window_check
      check (
        min_advance_days >= 0
        and (max_advance_days is null or max_advance_days >= min_advance_days)
      );
  end if;
end $$;

insert into public.property_settings (
  tenant_id,
  property_id,
  booking_mode,
  min_nights,
  max_guests
)
select
  properties.tenant_id,
  properties.id,
  'manual_approval',
  1,
  greatest(coalesce(max(units.capacity), 1), 1)
from public.properties
left join public.units
  on units.property_id = properties.id
  and units.tenant_id = properties.tenant_id
where properties.deleted_at is null
group by properties.id, properties.tenant_id
on conflict (property_id) do nothing;

update public.property_settings settings
set max_guests = capacidade.max_capacity
from (
  select
    properties.id as property_id,
    greatest(coalesce(max(units.capacity), 1), 1) as max_capacity
  from public.properties
  left join public.units
    on units.property_id = properties.id
    and units.tenant_id = properties.tenant_id
  where properties.deleted_at is null
  group by properties.id
) capacidade
where settings.property_id = capacidade.property_id
  and settings.max_guests = 1;

grant select, insert, update, delete on public.property_settings to authenticated;
grant all on public.property_settings to service_role;
