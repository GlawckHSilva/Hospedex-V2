-- Feature flags controladas pela base funcional do Super Admin.
-- Mantem compatibilidade com seeds anteriores e apenas cria chaves ausentes.

insert into public.feature_flags (
  key,
  module,
  description,
  default_enabled,
  owner_configurable
) values
  (
    'calendar',
    'calendar',
    'Calendario e disponibilidade por unidade.',
    true,
    true
  ),
  (
    'api_future',
    'api',
    'Preparacao para API publica futura.',
    false,
    false
  )
on conflict (key) do update set
  module = excluded.module,
  description = excluded.description,
  owner_configurable = excluded.owner_configurable,
  updated_at = now();
