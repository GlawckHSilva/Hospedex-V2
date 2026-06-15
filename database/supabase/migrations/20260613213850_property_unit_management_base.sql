alter table public.units
  add column capacity integer not null default 1 check (capacity > 0),
  add column bedrooms integer not null default 0 check (bedrooms >= 0),
  add column beds integer not null default 1 check (beds > 0),
  add column bathrooms integer not null default 0 check (bathrooms >= 0),
  add column base_price numeric(12, 2) not null default 0 check (base_price >= 0);

comment on column public.units.capacity is
  'Capacidade inicial da unidade. Mantida na unidade para suportar casas, pousadas e pequenos hotéis.';

comment on column public.units.base_price is
  'Valor base operacional da unidade. Pagamentos e tarifário avançado ficam fora desta etapa.';
