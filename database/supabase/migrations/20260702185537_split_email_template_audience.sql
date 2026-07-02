/*
  Separa templates internos do sistema e templates editáveis para hóspedes.

  - owner: notificações internas do Hospedex para o proprietário.
  - guest: mensagens enviadas aos hóspedes e personalizáveis pelo proprietário.
  - system: reservado para mensagens técnicas futuras controladas pela plataforma.
*/

alter table public.message_templates
  add column if not exists audience text;

update public.message_templates
set audience = 'owner'
where audience is null
  and template_key in (
    'nova_reserva_recebida',
    'reserva_aguardando_pagamento',
    'pagamento_recebido',
    'reserva_cancelada',
    'checkin_previsto',
    'checkout_previsto',
    'limpeza_pendente',
    'pendencia_operacional',
    'licenca_vencendo',
    'email_teste'
  );

update public.message_templates
set audience = 'guest'
where audience is null;

alter table public.message_templates
  alter column audience set default 'guest',
  alter column audience set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'message_templates_audience_check'
      and conrelid = 'public.message_templates'::regclass
  ) then
    alter table public.message_templates
      add constraint message_templates_audience_check
      check (audience in ('owner', 'guest', 'system'));
  end if;
end $$;

drop index if exists public.message_templates_global_unique;

alter table public.message_templates
  drop constraint if exists message_templates_tenant_unique;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'message_templates_tenant_audience_unique'
      and conrelid = 'public.message_templates'::regclass
  ) then
    alter table public.message_templates
      add constraint message_templates_tenant_audience_unique
      unique (tenant_id, template_key, channel, audience);
  end if;
end $$;

create unique index if not exists message_templates_global_audience_unique
  on public.message_templates (template_key, channel, audience)
  where tenant_id is null;

create index if not exists message_templates_audience_channel_idx
  on public.message_templates (audience, channel, tenant_id, is_active);

comment on column public.message_templates.audience is
  'Define o público do template. Proprietários só editam templates guest; owner/system ficam sob controle do Hospedex.';

with variaveis as (
  select array[
    'nome_hospede',
    'nome_proprietario',
    'nome_casa',
    'codigo_reserva',
    'periodo_reserva',
    'data_checkin',
    'data_checkout',
    'horario_checkin',
    'horario_checkout',
    'valor_total',
    'valor_pendente',
    'status_reserva',
    'status_pagamento',
    'telefone_proprietario',
    'email_proprietario',
    'endereco_casa',
    'regras_casa',
    'instrucoes_checkin',
    'instrucoes_checkout',
    'link_reserva',
    'link_pagamento',
    'link_portal_hospede',
    'nome_tenant',
    'data_atual'
  ]::text[] as lista
),
defaults(template_key, name, description, subject, title, body, button_text, button_url) as (
  values
    (
      'guest_reservation_confirmed',
      'Confirmação de reserva',
      'Enviado ao hóspede quando a reserva é confirmada.',
      'Sua reserva em {{nome_casa}} foi confirmada',
      'Reserva confirmada',
      'Olá, {{nome_hospede}}.' || chr(10) || chr(10) ||
      'Sua reserva em {{nome_casa}} foi confirmada.' || chr(10) || chr(10) ||
      'Reserva: {{codigo_reserva}}' || chr(10) ||
      'Período: {{periodo_reserva}}' || chr(10) ||
      'Check-in: {{data_checkin}} às {{horario_checkin}}' || chr(10) ||
      'Check-out: {{data_checkout}} às {{horario_checkout}}' || chr(10) ||
      'Valor total: {{valor_total}}',
      'Ver minha reserva',
      '{{link_reserva}}'
    ),
    (
      'guest_reservation_payment_pending',
      'Reserva aguardando pagamento',
      'Enviado ao hóspede quando a reserva aguarda pagamento.',
      'Sua reserva está aguardando pagamento',
      'Pagamento pendente',
      'Olá, {{nome_hospede}}.' || chr(10) || chr(10) ||
      'Recebemos sua solicitação para {{nome_casa}}.' || chr(10) ||
      'A reserva {{codigo_reserva}} está aguardando pagamento.' || chr(10) ||
      'Valor pendente: {{valor_pendente}}',
      'Ver pagamento',
      '{{link_pagamento}}'
    ),
    (
      'guest_payment_charge',
      'Cobrança de pagamento pendente',
      'Mensagem de cobrança amigável para pagamento pendente.',
      'Pagamento pendente da sua reserva',
      'Finalize seu pagamento',
      'Olá, {{nome_hospede}}.' || chr(10) || chr(10) ||
      'Existe um pagamento pendente para a reserva {{codigo_reserva}}.' || chr(10) ||
      'Casa: {{nome_casa}}' || chr(10) ||
      'Valor pendente: {{valor_pendente}}.',
      'Pagar agora',
      '{{link_pagamento}}'
    ),
    (
      'guest_payment_received',
      'Pagamento recebido',
      'Enviado ao hóspede após registro de pagamento.',
      'Pagamento recebido no Hospedex',
      'Pagamento confirmado',
      'Olá, {{nome_hospede}}.' || chr(10) || chr(10) ||
      'O pagamento da reserva {{codigo_reserva}} foi recebido.' || chr(10) ||
      'Casa: {{nome_casa}}' || chr(10) ||
      'Valor total: {{valor_total}}.',
      'Ver detalhes',
      '{{link_reserva}}'
    ),
    (
      'guest_checkin_instructions',
      'Instruções de check-in',
      'Enviado ao hóspede com instruções de chegada.',
      'Instruções de check-in em {{nome_casa}}',
      'Seu check-in está chegando',
      'Olá, {{nome_hospede}}.' || chr(10) || chr(10) ||
      'Seu check-in em {{nome_casa}} está previsto para {{data_checkin}} às {{horario_checkin}}.' || chr(10) ||
      'Endereço: {{endereco_casa}}' || chr(10) || chr(10) ||
      '{{instrucoes_checkin}}',
      'Abrir instruções',
      '{{link_reserva}}'
    ),
    (
      'guest_checkout_instructions',
      'Instruções de checkout',
      'Enviado ao hóspede com instruções de saída.',
      'Instruções de checkout em {{nome_casa}}',
      'Orientações de checkout',
      'Olá, {{nome_hospede}}.' || chr(10) || chr(10) ||
      'Seu check-out em {{nome_casa}} está previsto para {{data_checkout}} às {{horario_checkout}}.' || chr(10) || chr(10) ||
      '{{instrucoes_checkout}}',
      'Ver reserva',
      '{{link_reserva}}'
    ),
    (
      'guest_reservation_cancelled',
      'Reserva cancelada',
      'Enviado ao hóspede quando a reserva é cancelada.',
      'Sua reserva foi cancelada',
      'Reserva cancelada',
      'Olá, {{nome_hospede}}.' || chr(10) || chr(10) ||
      'A reserva {{codigo_reserva}} em {{nome_casa}} foi cancelada.' || chr(10) ||
      'Período: {{periodo_reserva}}.',
      'Ver reserva',
      '{{link_reserva}}'
    ),
    (
      'guest_arrival_reminder',
      'Lembrete de chegada',
      'Lembrete enviado antes da chegada do hóspede.',
      'Sua chegada em {{nome_casa}} está próxima',
      'Lembrete de chegada',
      'Olá, {{nome_hospede}}.' || chr(10) || chr(10) ||
      'Sua chegada em {{nome_casa}} está próxima.' || chr(10) ||
      'Check-in: {{data_checkin}} às {{horario_checkin}}' || chr(10) ||
      'Endereço: {{endereco_casa}}.',
      'Ver detalhes',
      '{{link_reserva}}'
    ),
    (
      'guest_post_stay_thanks',
      'Agradecimento pós-hospedagem',
      'Mensagem de agradecimento após a hospedagem.',
      'Obrigado pela sua hospedagem',
      'Obrigado por escolher {{nome_tenant}}',
      'Olá, {{nome_hospede}}.' || chr(10) || chr(10) ||
      'Obrigado por se hospedar em {{nome_casa}}.' || chr(10) ||
      'Será um prazer receber você novamente.',
      'Acessar reserva',
      '{{link_reserva}}'
    ),
    (
      'guest_house_rules',
      'Regras da casa',
      'Enviado ao hóspede com regras da casa.',
      'Regras da hospedagem em {{nome_casa}}',
      'Regras da casa',
      'Olá, {{nome_hospede}}.' || chr(10) || chr(10) ||
      'Estas são as regras principais de {{nome_casa}}:' || chr(10) || chr(10) ||
      '{{regras_casa}}',
      'Ver regras',
      '{{link_reserva}}'
    ),
    (
      'guest_stay_instructions',
      'Instruções da hospedagem',
      'Orientações gerais enviadas ao hóspede.',
      'Orientações para sua hospedagem',
      'Informações da hospedagem',
      'Olá, {{nome_hospede}}.' || chr(10) || chr(10) ||
      'Informações importantes para sua hospedagem em {{nome_casa}}:' || chr(10) ||
      'Endereço: {{endereco_casa}}' || chr(10) ||
      'Check-in: {{horario_checkin}}' || chr(10) ||
      'Check-out: {{horario_checkout}}',
      'Abrir portal do hóspede',
      '{{link_portal_hospede}}'
    ),
    (
      'guest_contract_guidelines',
      'Contrato ou orientações importantes',
      'Modelo para contrato simples ou orientações importantes.',
      'Orientações importantes da sua reserva',
      'Contrato e orientações',
      'Olá, {{nome_hospede}}.' || chr(10) || chr(10) ||
      'Seguem orientações importantes da reserva {{codigo_reserva}}:' || chr(10) ||
      'Casa: {{nome_casa}}' || chr(10) ||
      'Período: {{periodo_reserva}}' || chr(10) ||
      'Valor total: {{valor_total}}.',
      'Ver orientações',
      '{{link_reserva}}'
    )
)
insert into public.message_templates (
  tenant_id,
  template_key,
  channel,
  audience,
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
  'guest',
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
