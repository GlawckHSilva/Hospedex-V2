-- Planos iniciais da V2.
-- Esta seed garante que o Super Admin consiga criar proprietarios com plano,
-- licenca e feature flags sem depender de cadastro manual previo.

insert into public.plans (
  code,
  name,
  description,
  monthly_price,
  annual_price,
  max_properties,
  max_units,
  status
) values
  ('essencial', 'Essencial', 'Plano inicial para casas e operacao simples.', 99.00, 990.00, 1, 1, 'active'),
  ('profissional', 'Profissional', 'Plano para pousadas e operacoes com equipe.', 199.00, 1990.00, 5, 20, 'active'),
  ('premium', 'Premium', 'Plano para multiunidades com recursos avancados.', 399.00, 3990.00, 20, 100, 'active')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price,
  max_properties = excluded.max_properties,
  max_units = excluded.max_units,
  status = excluded.status,
  updated_at = now();

with recursos_por_plano(plan_code, flag_key) as (
  values
    ('essencial', 'marketplace_visibility'),
    ('essencial', 'manual_approval'),
    ('profissional', 'marketplace_visibility'),
    ('profissional', 'manual_approval'),
    ('profissional', 'multi_unit'),
    ('profissional', 'cleaning'),
    ('profissional', 'inventory'),
    ('profissional', 'staff'),
    ('profissional', 'crm'),
    ('profissional', 'reports'),
    ('premium', 'marketplace_visibility'),
    ('premium', 'manual_approval'),
    ('premium', 'multi_unit'),
    ('premium', 'cleaning'),
    ('premium', 'inventory'),
    ('premium', 'staff'),
    ('premium', 'crm'),
    ('premium', 'reports'),
    ('premium', 'ics_sync'),
    ('premium', 'advanced_rates'),
    ('premium', 'automations'),
    ('premium', 'extra_services'),
    ('premium', 'reviews'),
    ('premium', 'regional_guide')
)
insert into public.plan_features (plan_id, feature_flag_id, enabled, limits)
select plans.id, feature_flags.id, true, '{}'::jsonb
from recursos_por_plano
join public.plans on plans.code = recursos_por_plano.plan_code
join public.feature_flags on feature_flags.key = recursos_por_plano.flag_key
on conflict (plan_id, feature_flag_id) do update set
  enabled = excluded.enabled,
  limits = excluded.limits;
