/*
  Oficializa o modelo comercial atual de planos.

  Esta migration ajusta apenas catálogo e permissões de leitura pública da
  página /anunciar. Cobrança automática, comissão e add-ons ficam para fases
  futuras conforme documentação do produto.
*/

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
  (
    'essencial',
    'Essencial',
    'Para começar com uma casa publicada e operação básica organizada.',
    99.00,
    990.00,
    1,
    1,
    'active'
  ),
  (
    'inicial',
    'Inicial',
    'Para proprietários com até três casas e recursos comerciais essenciais.',
    179.00,
    1790.00,
    3,
    3,
    'active'
  ),
  (
    'profissional',
    'Profissional',
    'Para operação com até cinco casas, equipe e controle avançado.',
    260.00,
    2600.00,
    5,
    5,
    'active'
  ),
  (
    'premium',
    'Premium',
    'Para pousadas, pequenos hotéis e gestão premium com até oito casas.',
    399.00,
    3990.00,
    8,
    8,
    'active'
  )
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
    ('essencial', 'reports'),

    ('inicial', 'marketplace_visibility'),
    ('inicial', 'manual_approval'),
    ('inicial', 'payments'),
    ('inicial', 'gateway_primary'),
    ('inicial', 'regional_guide'),
    ('inicial', 'extra_services'),
    ('inicial', 'reports'),

    ('profissional', 'marketplace_visibility'),
    ('profissional', 'manual_approval'),
    ('profissional', 'payments'),
    ('profissional', 'gateway_primary'),
    ('profissional', 'regional_guide'),
    ('profissional', 'extra_services'),
    ('profissional', 'staff'),
    ('profissional', 'inventory'),
    ('profissional', 'cleaning'),
    ('profissional', 'crm'),
    ('profissional', 'reports'),

    ('premium', 'marketplace_visibility'),
    ('premium', 'manual_approval'),
    ('premium', 'payments'),
    ('premium', 'gateway_primary'),
    ('premium', 'regional_guide'),
    ('premium', 'extra_services'),
    ('premium', 'staff'),
    ('premium', 'inventory'),
    ('premium', 'cleaning'),
    ('premium', 'crm'),
    ('premium', 'reports'),
    ('premium', 'ics_sync'),
    ('premium', 'advanced_rates'),
    ('premium', 'automations'),
    ('premium', 'reviews'),
    ('premium', 'ai_assistant'),
    ('premium', 'ai_pricing'),
    ('premium', 'integrations')
),
planos_comerciais as (
  select id, code
  from public.plans
  where code in ('essencial', 'inicial', 'profissional', 'premium')
),
flags as (
  select id, key
  from public.feature_flags
)
insert into public.plan_features (plan_id, feature_flag_id, enabled, limits)
select
  planos_comerciais.id,
  flags.id,
  exists (
    select 1
    from recursos_por_plano
    where recursos_por_plano.plan_code = planos_comerciais.code
      and recursos_por_plano.flag_key = flags.key
  ),
  '{}'::jsonb
from planos_comerciais
cross join flags
on conflict (plan_id, feature_flag_id) do update set
  enabled = excluded.enabled,
  limits = excluded.limits;

-- O marketplace precisa ler apenas o contrato público dos planos.
-- Revogamos grants antigos para evitar exposição acidental de colunas internas.
revoke all privileges on public.plans from anon;
revoke all privileges on public.feature_flags from anon;
revoke all privileges on public.plan_features from anon;

grant select (
  id,
  code,
  name,
  description,
  monthly_price,
  annual_price,
  max_properties,
  status
) on public.plans to anon;

grant select (
  id,
  key,
  module,
  description,
  default_enabled,
  owner_configurable
) on public.feature_flags to anon;

grant select (
  plan_id,
  feature_flag_id,
  enabled,
  limits,
  created_at
) on public.plan_features to anon;

drop policy if exists "plans_select_public_active" on public.plans;
create policy "plans_select_public_active" on public.plans
for select to anon
using (status = 'active');

drop policy if exists "feature_flags_select_public_catalog" on public.feature_flags;
create policy "feature_flags_select_public_catalog" on public.feature_flags
for select to anon
using (true);

drop policy if exists "plan_features_select_public_active_plans" on public.plan_features;
create policy "plan_features_select_public_active_plans" on public.plan_features
for select to anon
using (
  exists (
    select 1
    from public.plans
    where plans.id = plan_features.plan_id
      and plans.status = 'active'
  )
);
