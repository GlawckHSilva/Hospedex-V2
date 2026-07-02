/*
  Templates de e-mail do Gerenciamento.

  A tabela guarda modelos globais do Hospedex e personalizacoes por tenant.
  O proprietario nunca acessa templates de outro tenant e nenhum segredo de
  provedor de e-mail fica armazenado aqui.
*/

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  template_key text not null,
  channel text not null default 'email' check (channel in ('email')),
  name text not null,
  description text not null default '',
  subject text not null,
  title text not null,
  body text not null,
  button_text text,
  button_url text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  is_customized boolean not null default false,
  default_subject text not null,
  default_title text not null,
  default_body text not null,
  default_button_text text,
  default_button_url text,
  variables_allowed text[] not null default '{}'::text[],
  last_validation_status text not null default 'valid' check (last_validation_status in ('valid', 'invalid')),
  last_validation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_templates_tenant_unique unique (tenant_id, template_key, channel)
);

create unique index if not exists message_templates_global_unique
  on public.message_templates (template_key, channel)
  where tenant_id is null;

create index if not exists message_templates_tenant_channel_idx
  on public.message_templates (tenant_id, channel, is_active);

drop trigger if exists set_message_templates_updated_at
  on public.message_templates;
create trigger set_message_templates_updated_at
before update on public.message_templates
for each row execute function app_private.set_updated_at();

alter table public.message_templates enable row level security;

drop policy if exists "message_templates_select" on public.message_templates;
drop policy if exists "message_templates_insert" on public.message_templates;
drop policy if exists "message_templates_update" on public.message_templates;
drop policy if exists "message_templates_delete" on public.message_templates;

create policy "message_templates_select" on public.message_templates
for select to authenticated
using (
  tenant_id is null
  or app_private.has_tenant_permission(message_templates.tenant_id, 'integrations.read')
  or app_private.has_tenant_permission(message_templates.tenant_id, 'integrations.manage')
);

create policy "message_templates_insert" on public.message_templates
for insert to authenticated
with check (
  tenant_id is not null
  and app_private.has_tenant_permission(message_templates.tenant_id, 'integrations.manage')
);

create policy "message_templates_update" on public.message_templates
for update to authenticated
using (
  tenant_id is not null
  and app_private.has_tenant_permission(message_templates.tenant_id, 'integrations.manage')
)
with check (
  tenant_id is not null
  and app_private.has_tenant_permission(message_templates.tenant_id, 'integrations.manage')
);

create policy "message_templates_delete" on public.message_templates
for delete to authenticated
using (
  tenant_id is not null
  and app_private.has_tenant_permission(message_templates.tenant_id, 'integrations.manage')
);

grant select, insert, update, delete on public.message_templates to authenticated;
grant all on public.message_templates to service_role;

comment on table public.message_templates is
  'Modelos globais e customizados por tenant para comunicacao por e-mail.';
comment on column public.message_templates.tenant_id is
  'Nulo para o padrao global do Hospedex; preenchido para personalizacao do tenant.';
comment on column public.message_templates.variables_allowed is
  'Lista de variaveis aceitas no template. Variaveis fora da lista bloqueiam salvamento.';
comment on policy "message_templates_select" on public.message_templates is
  'Templates globais sao visiveis para usuarios autenticados; customizacoes ficam restritas ao tenant.';

with variaveis as (
  select array[
    'nome_proprietario',
    'nome_hospede',
    'codigo_reserva',
    'nome_casa',
    'periodo_reserva',
    'data_checkin',
    'data_checkout',
    'valor_total',
    'valor_pendente',
    'status_reserva',
    'status_pagamento',
    'link_painel',
    'link_reserva',
    'telefone_hospede',
    'nome_tenant',
    'data_atual'
  ]::text[] as lista
),
defaults(template_key, name, description, subject, title, body, button_text, button_url) as (
  values
    (
      'nova_reserva_recebida',
      'Nova reserva recebida',
      'Enviado quando uma nova reserva entra no sistema.',
      'Nova reserva recebida no Hospedex',
      'Voce recebeu uma nova reserva',
      'Ola, {{nome_proprietario}}.' || chr(10) || chr(10) ||
      'Voce recebeu uma nova reserva.' || chr(10) || chr(10) ||
      'Reserva: {{codigo_reserva}}' || chr(10) ||
      'Hospede: {{nome_hospede}}' || chr(10) ||
      'Casa: {{nome_casa}}' || chr(10) ||
      'Periodo: {{periodo_reserva}}' || chr(10) ||
      'Valor total: {{valor_total}}' || chr(10) || chr(10) ||
      'Acesse o painel para analisar os detalhes.',
      'Ver reserva',
      '{{link_reserva}}'
    ),
    (
      'reserva_aguardando_pagamento',
      'Reserva aguardando pagamento',
      'Enviado quando a reserva aguarda pagamento.',
      'Reserva aguardando pagamento',
      'Pagamento pendente da reserva',
      'Ola, {{nome_proprietario}}.' || chr(10) || chr(10) ||
      'A reserva {{codigo_reserva}} esta aguardando pagamento.' || chr(10) ||
      'Hospede: {{nome_hospede}}' || chr(10) ||
      'Valor pendente: {{valor_pendente}}' || chr(10) ||
      'Status: {{status_pagamento}}.',
      'Ver reserva',
      '{{link_reserva}}'
    ),
    (
      'pagamento_recebido',
      'Pagamento recebido',
      'Enviado apos a confirmacao de um pagamento.',
      'Pagamento recebido no Hospedex',
      'Pagamento confirmado',
      'O pagamento da reserva {{codigo_reserva}} foi registrado.' || chr(10) ||
      'Hospede: {{nome_hospede}}' || chr(10) ||
      'Casa: {{nome_casa}}' || chr(10) ||
      'Valor total: {{valor_total}}.',
      'Abrir painel',
      '{{link_painel}}'
    ),
    (
      'reserva_cancelada',
      'Reserva cancelada',
      'Enviado quando uma reserva e cancelada.',
      'Reserva cancelada',
      'Reserva cancelada',
      'A reserva {{codigo_reserva}} foi cancelada.' || chr(10) ||
      'Hospede: {{nome_hospede}}' || chr(10) ||
      'Casa: {{nome_casa}}' || chr(10) ||
      'Periodo: {{periodo_reserva}}.',
      'Ver reserva',
      '{{link_reserva}}'
    ),
    (
      'checkin_previsto',
      'Check-in previsto',
      'Enviado antes da data de check-in do hospede.',
      'Check-in previsto para {{data_checkin}}',
      'Check-in previsto',
      'A reserva {{codigo_reserva}} tem check-in previsto para {{data_checkin}}.' || chr(10) ||
      'Hospede: {{nome_hospede}}' || chr(10) ||
      'Telefone: {{telefone_hospede}}' || chr(10) ||
      'Casa: {{nome_casa}}.',
      'Ver detalhes',
      '{{link_reserva}}'
    ),
    (
      'checkout_previsto',
      'Check-out previsto',
      'Enviado antes da data de check-out do hospede.',
      'Check-out previsto para {{data_checkout}}',
      'Check-out previsto',
      'A reserva {{codigo_reserva}} tem check-out previsto para {{data_checkout}}.' || chr(10) ||
      'Hospede: {{nome_hospede}}' || chr(10) ||
      'Casa: {{nome_casa}}.',
      'Ver detalhes',
      '{{link_reserva}}'
    ),
    (
      'limpeza_pendente',
      'Limpeza pendente',
      'Enviado quando uma limpeza precisa ser realizada.',
      'Limpeza pendente',
      'Limpeza pendente',
      'Existe uma limpeza pendente vinculada a {{nome_casa}}.' || chr(10) ||
      'Reserva: {{codigo_reserva}}' || chr(10) ||
      'Data atual: {{data_atual}}.',
      'Abrir painel',
      '{{link_painel}}'
    ),
    (
      'pendencia_operacional',
      'Pendencia operacional',
      'Enviado quando existe uma pendencia no gerenciamento.',
      'Pendencia operacional no Hospedex',
      'Pendencia operacional',
      'O tenant {{nome_tenant}} possui uma pendencia operacional.' || chr(10) ||
      'Reserva: {{codigo_reserva}}' || chr(10) ||
      'Status: {{status_reserva}}.',
      'Ver pendencias',
      '{{link_painel}}'
    ),
    (
      'licenca_vencendo',
      'Licenca vencendo',
      'Enviado quando a licenca esta perto do vencimento.',
      'Sua licenca Hospedex esta vencendo',
      'Licenca vencendo',
      'Ola, {{nome_proprietario}}.' || chr(10) || chr(10) ||
      'A licenca do tenant {{nome_tenant}} precisa de atencao.' || chr(10) ||
      'Acesse o painel para verificar os detalhes.',
      'Abrir painel',
      '{{link_painel}}'
    ),
    (
      'email_teste',
      'E-mail de teste',
      'Modelo usado para validar a futura configuracao de envio.',
      'Teste de e-mail Hospedex',
      'E-mail de teste',
      'Ola, {{nome_proprietario}}.' || chr(10) || chr(10) ||
      'Este e um e-mail de teste do Hospedex para {{nome_tenant}}.',
      'Abrir painel',
      '{{link_painel}}'
    )
)
insert into public.message_templates (
  tenant_id,
  template_key,
  channel,
  name,
  description,
  subject,
  title,
  body,
  button_text,
  button_url,
  is_active,
  is_default,
  is_customized,
  default_subject,
  default_title,
  default_body,
  default_button_text,
  default_button_url,
  variables_allowed
)
select
  null,
  defaults.template_key,
  'email',
  defaults.name,
  defaults.description,
  defaults.subject,
  defaults.title,
  defaults.body,
  defaults.button_text,
  defaults.button_url,
  true,
  true,
  false,
  defaults.subject,
  defaults.title,
  defaults.body,
  defaults.button_text,
  defaults.button_url,
  variaveis.lista
from defaults
cross join variaveis
where not exists (
  select 1
  from public.message_templates atual
  where atual.tenant_id is null
    and atual.channel = 'email'
    and atual.template_key = defaults.template_key
);

notify pgrst, 'reload schema';
