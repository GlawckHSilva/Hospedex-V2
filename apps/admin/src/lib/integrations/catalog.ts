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
    provider: "whatsapp",
    sincronizavel: false,
  },
  {
    categoria: "Localizacao",
    descricao: "Base para mapas, enderecos e contexto geografico das casas.",
    futura: false,
    nome: "Google Maps",
    provider: "google_maps",
    sincronizavel: false,
  },
  {
    categoria: "Operacao",
    descricao: "Base para previsao do tempo e alertas relacionados a estadia.",
    futura: false,
    nome: "Clima",
    provider: "weather",
    sincronizavel: true,
  },
  {
    categoria: "Financeiro",
    descricao:
      "Base segura para o gateway de pagamento definido pelo Hospedex.",
    futura: false,
    nome: "Pagamentos",
    provider: "payments",
    sincronizavel: true,
  },
  {
    categoria: "Comunicacao",
    descricao: "Base para mensagens transacionais enviadas em nome do tenant.",
    futura: false,
    nome: "E-mail",
    provider: "email",
    sincronizavel: true,
  },
  {
    categoria: "Calendario",
    descricao:
      "Base para importacao e exportacao de calendarios no formato iCal.",
    futura: false,
    nome: "Calendario / iCal",
    provider: "ical",
    sincronizavel: true,
  },
  {
    categoria: "Canais futuros",
    descricao: "Estrutura reservada para sincronizacao futura com o Airbnb.",
    futura: true,
    nome: "Airbnb",
    provider: "airbnb",
    sincronizavel: true,
  },
  {
    categoria: "Canais futuros",
    descricao: "Estrutura reservada para sincronizacao futura com o Booking.",
    futura: true,
    nome: "Booking",
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
