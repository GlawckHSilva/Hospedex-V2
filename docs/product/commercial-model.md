# Modelo comercial Hospedex V2

Este documento oficializa o modelo comercial atual. Cobrança automática,
comissão automática, checkout de assinatura e add-ons pagos ficam para fases
futuras.

## Planos

| Plano | Casas incluídas | Mensal | Anual |
| --- | ---: | ---: | ---: |
| Essencial | 1 | R$ 99 | R$ 990 |
| Inicial | 3 | R$ 179 | R$ 1.790 |
| Profissional | 5 | R$ 260 | R$ 2.600 |
| Premium | 8 | R$ 399 | R$ 3.990 |

O anual cobra 10 meses e libera 12 meses de uso.

## Trial

- 30 dias grátis.
- Baseado no Profissional.
- Limitado a 3 casas.

## Casas adicionais

- R$ 50/mês por casa adicional.
- Cobrança recorrente mensal.
- Nesta fase não existe cobrança automática.
- O Super Admin pode ajustar manualmente `licenses.limits.max_properties`.

## Módulos por plano

Todos os planos incluem: Casas, Reservas, Calendário, Hóspedes, Financeiro
básico, voucher/comprovante, pagamento manual e relatórios básicos.

Inicial em diante: Mercado Pago, Guia da região, Serviços extras e Página
pública opcional.

Profissional em diante: Funcionários, Inventário, Limpeza, CRM e IA como extra
pago quando o módulo estiver comercialmente liberado.

Premium: recursos avançados, avaliações, automações, iCal, tarifas avançadas e
IA em condição melhor ou inclusa conforme feature flags.

## Extras planejados

- WhatsApp automático: R$ 29,90/mês.
- IA: R$ 39,90/mês.
- Casa adicional: R$ 50/mês.
- Funcionários: incluído no Profissional e Premium, com extra futuro possível.

## Página pública e Marketplace

A página pública da casa é opcional e o proprietário escolhe se ativa. O
Marketplace Hospedex é separado e continua controlado pelo Super Admin.

Reservas vindas da página pública ou do Marketplace têm comissão comercial de
2% sobre o valor total. Reservas manuais criadas no Gerenciamento têm comissão
0%.

Nesta fase a comissão não é calculada nem cobrada automaticamente.

## Licença vencida

Há 5 dias de tolerância após o vencimento. Durante a tolerância, o sistema
continua funcionando com aviso.

Após a tolerância, o proprietário pode visualizar dados, mas não pode criar
casas, publicar casas, confirmar reservas, criar reservas manuais, ativar
Marketplace, adicionar funcionários ou usar módulos pagos. A tela de
regularização deve continuar acessível.

## Papel do Super Admin

O plano define o pacote base. `tenant_features` libera ou bloqueia exceções por
tenant. `licenses.limits.max_properties` continua sendo o limite real usado pelo
Gerenciamento.

## Cobranca da assinatura Hospedex

A cobranca da mensalidade/anuidade Hospedex e separada das cobrancas de
reservas feitas pelos proprietarios. Reservas continuam usando as tabelas
operacionais do tenant e as credenciais Mercado Pago do proprio proprietario.

A assinatura da plataforma usa tabelas proprias:
`platform_subscription_invoices`, `platform_subscription_payments` e
`platform_payment_events`. O Mercado Pago da plataforma sera global do
Hospedex/Super Admin e tera webhook separado em fase futura.

Esta fase cria apenas a base de dados e auditoria para cobrancas da plataforma.
Nao ha checkout, link de pagamento, webhook ou renovacao automatica de licenca
nesta etapa.
