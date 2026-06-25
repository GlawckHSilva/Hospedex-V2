import type { IntegrationProvider } from "@hospedex/types";

import type { DefinicaoIntegracao } from "./types";

/**
 * Catalogo estrutural das integracoes suportadas pela V2.
 *
 * Ele descreve capacidades da interface, nao conexoes reais. Provedores futuros
 * permanecem bloqueados ate que backend, credenciais e contratos sejam criados.
 */

export const CATALOGO_INTEGRACOES = [
  {
    categoria: "Comunicacao",
    descricao:
      "Base para atendimento e notificacoes operacionais pelo WhatsApp.",
    futura: false,
    nome: "WhatsApp",
    opcoesUso: [
      {
        descricao: "O Hospedex cuidara da estrutura tecnica quando o servico estiver ativo.",
        label: "Utilizar servico do Hospedex",
        valor: "hospedex",
      },
      {
        descricao: "Registre sua preferencia por uma conta propria, sem informar credenciais.",
        label: "Utilizar conta propria",
        valor: "conta_propria",
      },
    ],
    provider: "whatsapp",
    sincronizavel: false,
  },
  {
    categoria: "Localizacao",
    descricao: "Base para mapas, enderecos e contexto geografico das casas.",
    futura: false,
    nome: "Google Maps",
    opcoesUso: [
      {
        descricao: "Usar os dados de localizacao ja cadastrados no Hospedex.",
        label: "Localizacao automatica",
        valor: "automatico",
      },
      {
        descricao: "Escolher manualmente a cidade e o nome exibido.",
        label: "Configuracao manual",
        valor: "manual",
      },
    ],
    provider: "google_maps",
    sincronizavel: false,
  },
  {
    categoria: "Operacao",
    descricao: "Base para previsao do tempo e alertas relacionados a estadia.",
    futura: false,
    nome: "Clima",
    opcoesUso: [
      {
        descricao: "Preparar a previsao usando a cidade informada.",
        label: "Ativar previsao automatica",
        valor: "automatico",
      },
    ],
    provider: "weather",
    sincronizavel: true,
  },
  {
    categoria: "Financeiro",
    descricao:
      "Base segura para o gateway de pagamento definido pelo Hospedex.",
    futura: false,
    nome: "Pagamentos",
    opcoesUso: [
      {
        descricao: "Usar o gateway disponibilizado pelo Hospedex quando estiver ativo.",
        label: "Gateway Hospedex",
        valor: "hospedex",
      },
      {
        descricao: "Registrar preferencia por uma conta propria, sem expor credenciais.",
        label: "Conta propria",
        valor: "conta_propria",
      },
    ],
    provider: "payments",
    sincronizavel: true,
  },
  {
    categoria: "Comunicacao",
    descricao: "Base para mensagens transacionais enviadas em nome do tenant.",
    futura: false,
    nome: "E-mail",
    opcoesUso: [
      {
        descricao: "O Hospedex cuidara do envio tecnico quando o servico estiver ativo.",
        label: "Utilizar envio do Hospedex",
        valor: "hospedex",
      },
      {
        descricao: "Registrar preferencia por SMTP proprio sem informar senha ou servidor.",
        label: "Utilizar SMTP proprio",
        valor: "smtp_proprio",
      },
    ],
    provider: "email",
    sincronizavel: true,
  },
  {
    categoria: "Calendario",
    descricao:
      "Base para importacao e exportacao de calendarios no formato iCal.",
    futura: false,
    nome: "Calendario / iCal",
    opcoesUso: [
      {
        descricao: "Manter a operacao no calendario interno do Hospedex.",
        label: "Calendario Hospedex",
        valor: "hospedex",
      },
      {
        descricao: "Preparar preferencia para sincronizacao futura com Google Calendar.",
        label: "Google Calendar",
        valor: "google_calendar",
      },
      {
        descricao: "Preparar importacao e exportacao futura no formato iCal.",
        label: "iCal",
        valor: "ical",
      },
    ],
    provider: "ical",
    sincronizavel: true,
  },
  {
    categoria: "Canais futuros",
    descricao: "Estrutura reservada para sincronizacao futura com o Airbnb.",
    futura: true,
    nome: "Airbnb",
    opcoesUso: [],
    provider: "airbnb",
    sincronizavel: true,
  },
  {
    categoria: "Canais futuros",
    descricao: "Estrutura reservada para sincronizacao futura com o Booking.",
    futura: true,
    nome: "Booking",
    opcoesUso: [],
    provider: "booking",
    sincronizavel: true,
  },
] as const satisfies readonly DefinicaoIntegracao[];

const PROVIDERS = new Set<IntegrationProvider>(
  CATALOGO_INTEGRACOES.map((integracao) => integracao.provider),
);

export function providerIntegracaoValido(
  valor: string,
): valor is IntegrationProvider {
  return PROVIDERS.has(valor as IntegrationProvider);
}

export function obterDefinicaoIntegracao(provider: IntegrationProvider) {
  return CATALOGO_INTEGRACOES.find(
    (integracao) => integracao.provider === provider,
  )!;
}
