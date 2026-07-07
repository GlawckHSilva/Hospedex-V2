import type {
  FeatureFlagRow,
  JsonValue,
  MediaAssetRow,
  PropertyRow,
  ReservationRow,
  TenantStatus
} from "@hospedex/types";

import { criarClienteSupabaseServer } from "../../supabase/server";
import { carregarDadosProprietarios } from "../proprietarios/data";
import type {
  DadosModuloProprietarios,
  ProprietarioCompleto
} from "../proprietarios/types";

/**
 * Dados da tela Super Admin > Empreendimentos.
 *
 * A tela reaproveita o cadastro administrativo de proprietarios e acrescenta
 * somente indicadores operacionais do tenant. Nenhuma regra de provisionamento
 * e duplicada aqui.
 */

export type FiltrosEmpreendimentos = {
  busca: string;
  licenca: string;
  modulo: string;
  ordenacao: "recentes" | "antigos" | "nome" | "mais_casas" | "licenca_vencendo";
  plano: string;
  status: TenantStatus | "todos";
};

export type MetricaEmpreendimento = {
  detalhe: string;
  label: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  valor: string;
};

export type OperacaoEmpreendimento = {
  casasLimite: number;
  casasUsadas: number;
  receitaOperacional: number;
  reservasFuturas: number;
  reservasTotal: number;
};

export type CasaEmpreendimento = {
  banheiros: number;
  capacidade: number;
  cidade: string;
  criadaEm: string;
  diaria: number;
  endereco: string;
  estado: string;
  id: string;
  imagemCapaUrl: string | null;
  imagensTotal: number;
  isPublica: boolean;
  nome: string;
  paginaPublicaUrl: string | null;
  propriedade: PropertyRow;
  quartos: number;
  reservasFuturas: number;
  reservasTotal: number;
  status: PropertyRow["status"];
  taxaLimpeza: number;
  tipo: PropertyRow["property_type"];
  atualizadaEm: string;
};

export type EmpreendimentoCompleto = ProprietarioCompleto & {
  casas: CasaEmpreendimento[];
  operacao: OperacaoEmpreendimento;
};

export type DadosModuloEmpreendimentos = Pick<
  DadosModuloProprietarios,
  "featureFlags" | "planFeatures" | "planos"
> & {
  empreendimentos: EmpreendimentoCompleto[];
  filtros: FiltrosEmpreendimentos;
  metricas: MetricaEmpreendimento[];
};

const STATUS_TENANT: Array<FiltrosEmpreendimentos["status"]> = [
  "todos",
  "trial",
  "active",
  "past_due",
  "suspended",
  "cancelled"
];
const MARKETPLACE_URL =
  process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "https://hospedex-marketplace.vercel.app";

export async function carregarDadosEmpreendimentos(
  params: Record<string, string | string[] | undefined>
): Promise<DadosModuloEmpreendimentos> {
  const filtros = normalizarFiltros(params);
  const base = await carregarDadosProprietarios({});
  const operacaoPorTenant = await carregarOperacao(base.proprietarios);
  const todos = base.proprietarios.map((proprietario) => ({
    ...proprietario,
    casas: operacaoPorTenant.get(proprietario.tenant.id)?.casas ?? [],
    operacao: operacaoPorTenant.get(proprietario.tenant.id)?.operacao ?? operacaoVazia(proprietario)
  }));

  const empreendimentos = ordenarEmpreendimentos(
    todos.filter((empreendimento) =>
      passaNosFiltros(empreendimento, base.featureFlags, base.planFeatures, filtros)
    ),
    filtros.ordenacao
  );

  return {
    empreendimentos,
    featureFlags: base.featureFlags,
    filtros,
    metricas: montarMetricas(todos),
    planFeatures: base.planFeatures,
    planos: base.planos
  };
}

function normalizarFiltros(
  params: Record<string, string | string[] | undefined>
): FiltrosEmpreendimentos {
  const status = lerParametro(params, "status");
  const ordenacao = lerParametro(params, "ordenacao");

  return {
    busca: lerParametro(params, "busca"),
    licenca: lerParametro(params, "licenca") || "todas",
    modulo: lerParametro(params, "modulo") || "todos",
    ordenacao: ["recentes", "antigos", "nome", "mais_casas", "licenca_vencendo"].includes(ordenacao)
      ? (ordenacao as FiltrosEmpreendimentos["ordenacao"])
      : "recentes",
    plano: lerParametro(params, "plano") || "todos",
    status: STATUS_TENANT.includes(status as FiltrosEmpreendimentos["status"])
      ? (status as FiltrosEmpreendimentos["status"])
      : "todos"
  };
}

async function carregarOperacao(proprietarios: ProprietarioCompleto[]) {
  const idsTenant = proprietarios.map((proprietario) => proprietario.tenant.id);
  if (!idsTenant.length) return new Map<string, { casas: CasaEmpreendimento[]; operacao: OperacaoEmpreendimento }>();

  const supabase = await criarClienteSupabaseServer();
  const [casasResultado, reservasResultado] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .in("tenant_id", idsTenant)
      .is("deleted_at", null)
      .returns<PropertyRow[]>(),
    supabase
      .from("reservations")
      .select("tenant_id,property_id,status,check_in,total_amount")
      .in("tenant_id", idsTenant)
      .returns<Array<Pick<ReservationRow, "check_in" | "property_id" | "status" | "tenant_id" | "total_amount">>>()
  ]);

  registrarErroLeitura("casas por empreendimento", casasResultado.error);
  registrarErroLeitura("reservas por empreendimento", reservasResultado.error);

  const hoje = new Date().toISOString().slice(0, 10);
  const propriedades = casasResultado.data ?? [];
  const imagensPorPropriedade = await carregarImagens(propriedades.map((propriedade) => propriedade.id));
  const reservasPorPropriedade = agruparPorPropriedade(reservasResultado.data ?? []);
  const mapa = new Map<string, { casas: CasaEmpreendimento[]; operacao: OperacaoEmpreendimento }>();

  proprietarios.forEach((proprietario) =>
    mapa.set(proprietario.tenant.id, { casas: [], operacao: operacaoVazia(proprietario) })
  );

  propriedades.forEach((casa) => {
    const dados = mapa.get(casa.tenant_id);
    if (!dados) return;
    dados.operacao.casasUsadas += 1;
    dados.casas.push(
      montarCasaEmpreendimento(
        casa,
        imagensPorPropriedade.get(casa.id) ?? [],
        reservasPorPropriedade.get(casa.id) ?? []
      )
    );
  });

  (reservasResultado.data ?? []).forEach((reserva) => {
    const dados = mapa.get(reserva.tenant_id);
    if (!dados) return;
    dados.operacao.reservasTotal += 1;
    if (reserva.status !== "cancelled" && reserva.check_in >= hoje) {
      dados.operacao.reservasFuturas += 1;
    }
  });

  proprietarios.forEach((proprietario) => {
    const dados = mapa.get(proprietario.tenant.id);
    if (!dados) return;
    dados.operacao.receitaOperacional = proprietario.transactions
      .filter((transacao) => transacao.transaction_type === "income" && transacao.status === "paid")
      .reduce((total, transacao) => total + Number(transacao.amount), 0);
  });

  return mapa;
}

async function carregarImagens(idsPropriedades: string[]) {
  const unicos = [...new Set(idsPropriedades)].filter(Boolean);
  if (!unicos.length) return new Map<string, MediaAssetRow[]>();

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .in("property_id", unicos)
    .eq("media_type", "image")
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .returns<MediaAssetRow[]>();

  registrarErroLeitura("imagens das casas do empreendimento", error);
  return agruparPorPropriedade(data ?? []);
}

function montarCasaEmpreendimento(
  propriedade: PropertyRow,
  imagens: MediaAssetRow[],
  reservas: Array<Pick<ReservationRow, "check_in" | "property_id" | "status" | "tenant_id" | "total_amount">>
): CasaEmpreendimento {
  const endereco = objetoJson(propriedade.address);
  const estrutura = objetoJson(propriedade.structure_details);
  const valores = objetoJson(propriedade.pricing_details);
  const imagemCapa = imagens.find((imagem) => imagem.is_cover) ?? imagens[0] ?? null;
  const reservasValidas = reservas.filter((reserva) => reserva.status !== "cancelled");
  const hoje = new Date().toISOString().slice(0, 10);

  return {
    banheiros: numeroJson(estrutura, "banheiros"),
    capacidade: numeroJson(estrutura, "hospedesMaximos", numeroJson(estrutura, "maxGuests")),
    cidade: textoJson(endereco, "cidade") || textoJson(endereco, "city"),
    criadaEm: propriedade.created_at,
    diaria: numeroJson(valores, "valorDiaria", numeroJson(valores, "daily_rate")),
    endereco: montarEndereco(endereco),
    estado: textoJson(endereco, "estado") || textoJson(endereco, "state"),
    id: propriedade.id,
    imagemCapaUrl: imagemCapa?.url ?? null,
    imagensTotal: imagens.length,
    isPublica: propriedade.is_public,
    nome: propriedade.name,
    paginaPublicaUrl: propriedade.is_public ? `${MARKETPLACE_URL}/propriedades/${propriedade.slug}` : null,
    propriedade,
    quartos: numeroJson(estrutura, "quartos"),
    reservasFuturas: reservasValidas.filter((reserva) => reserva.check_in >= hoje).length,
    reservasTotal: reservas.length,
    status: propriedade.status,
    taxaLimpeza: numeroJson(valores, "taxaLimpeza"),
    tipo: propriedade.property_type,
    atualizadaEm: propriedade.updated_at
  };
}

function agruparPorPropriedade<T extends { property_id: string | null }>(linhas: T[]) {
  return linhas.reduce((mapa, linha) => {
    if (!linha.property_id) return mapa;
    const lista = mapa.get(linha.property_id) ?? [];
    lista.push(linha);
    mapa.set(linha.property_id, lista);
    return mapa;
  }, new Map<string, T[]>());
}

function operacaoVazia(proprietario: ProprietarioCompleto): OperacaoEmpreendimento {
  return {
    casasLimite: obterLimiteCasas(proprietario),
    casasUsadas: 0,
    receitaOperacional: 0,
    reservasFuturas: 0,
    reservasTotal: 0
  };
}

function passaNosFiltros(
  empreendimento: EmpreendimentoCompleto,
  featureFlags: FeatureFlagRow[],
  planFeatures: DadosModuloProprietarios["planFeatures"],
  filtros: FiltrosEmpreendimentos
) {
  if (filtros.status !== "todos" && empreendimento.tenant.status !== filtros.status) return false;
  if (filtros.plano !== "todos" && empreendimento.plan?.id !== filtros.plano) return false;
  if (filtros.licenca !== "todas" && (empreendimento.license?.status ?? "sem_licenca") !== filtros.licenca) {
    return false;
  }
  if (
    filtros.modulo !== "todos" &&
    !moduloEstaAtivo(empreendimento, featureFlags.find((flag) => flag.id === filtros.modulo), planFeatures)
  ) {
    return false;
  }
  if (!filtros.busca) return true;

  const alvo = [
    empreendimento.tenant.name,
    empreendimento.profile?.full_name,
    empreendimento.profile?.email,
    empreendimento.plan?.name
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return alvo.includes(filtros.busca.toLowerCase());
}

function ordenarEmpreendimentos(
  empreendimentos: EmpreendimentoCompleto[],
  ordenacao: FiltrosEmpreendimentos["ordenacao"]
) {
  return [...empreendimentos].sort((a, b) => {
    if (ordenacao === "antigos") return a.tenant.created_at.localeCompare(b.tenant.created_at);
    if (ordenacao === "nome") return a.tenant.name.localeCompare(b.tenant.name, "pt-BR");
    if (ordenacao === "mais_casas") return b.operacao.casasUsadas - a.operacao.casasUsadas;
    if (ordenacao === "licenca_vencendo") {
      return dataOrdenavel(a.license?.expires_at) - dataOrdenavel(b.license?.expires_at);
    }
    return b.tenant.created_at.localeCompare(a.tenant.created_at);
  });
}

function montarMetricas(empreendimentos: EmpreendimentoCompleto[]): MetricaEmpreendimento[] {
  const ativos = empreendimentos.filter((item) => item.tenant.status === "active").length;
  const bloqueados = empreendimentos.filter((item) =>
    ["suspended", "cancelled"].includes(item.tenant.status)
  ).length;
  const vencendo = empreendimentos.filter((item) => licencaVencendo(item.license?.expires_at)).length;
  const casasUsadas = empreendimentos.reduce((total, item) => total + item.operacao.casasUsadas, 0);
  const casasLimite = empreendimentos.reduce((total, item) => total + item.operacao.casasLimite, 0);

  return [
    metrica("Total", empreendimentos.length, "Empreendimentos cadastrados", "info"),
    metrica("Ativos", ativos, "Tenants operacionais", "success"),
    metrica("Bloqueados", bloqueados, "Suspensos ou cancelados", "danger"),
    metrica("Licencas vencendo", vencendo, "Proximos 30 dias", "warning"),
    {
      detalhe: "Casas usadas / limite",
      label: "Uso de casas",
      tone: "neutral",
      valor: `${Intl.NumberFormat("pt-BR").format(casasUsadas)}/${Intl.NumberFormat("pt-BR").format(casasLimite)}`
    }
  ];
}

export function moduloEstaAtivo(
  empreendimento: EmpreendimentoCompleto,
  flag: FeatureFlagRow | undefined,
  planFeatures: DadosModuloProprietarios["planFeatures"]
) {
  if (!flag) return false;
  const override = empreendimento.tenantFeatures.find((item) => item.feature_flag_id === flag.id);
  const inclusoNoPlano = planFeatures.some(
    (item) => item.plan_id === empreendimento.plan?.id && item.feature_flag_id === flag.id && item.enabled
  );

  return override?.enabled ?? (inclusoNoPlano || flag.default_enabled);
}

export function origemModulo(
  empreendimento: EmpreendimentoCompleto,
  flag: FeatureFlagRow,
  planFeatures: DadosModuloProprietarios["planFeatures"]
) {
  const override = empreendimento.tenantFeatures.find((item) => item.feature_flag_id === flag.id);
  if (override) return "Manual";
  const inclusoNoPlano = planFeatures.some(
    (item) => item.plan_id === empreendimento.plan?.id && item.feature_flag_id === flag.id && item.enabled
  );
  if (inclusoNoPlano) return "Plano";
  return "Global";
}

function obterLimiteCasas(proprietario: ProprietarioCompleto) {
  const limiteLicenca = extrairNumero(proprietario.license?.limits, "max_properties");
  return limiteLicenca ?? proprietario.plan?.max_properties ?? 0;
}

function extrairNumero(valor: JsonValue | undefined, chave: string) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const bruto = valor[chave];
  const numero = typeof bruto === "number" ? bruto : typeof bruto === "string" ? Number(bruto) : NaN;
  return Number.isFinite(numero) ? numero : null;
}

function objetoJson(valor: JsonValue): Record<string, JsonValue> {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
}

function textoJson(valor: Record<string, JsonValue>, chave: string) {
  const dado = valor[chave];
  return typeof dado === "string" ? dado : "";
}

function numeroJson(valor: Record<string, JsonValue>, chave: string, padrao = 0) {
  const dado = valor[chave];
  return typeof dado === "number" && Number.isFinite(dado) ? dado : padrao;
}

function montarEndereco(endereco: Record<string, JsonValue>) {
  return [
    textoJson(endereco, "linha1") || textoJson(endereco, "address"),
    textoJson(endereco, "numero"),
    textoJson(endereco, "bairro"),
    textoJson(endereco, "referencia")
  ]
    .filter(Boolean)
    .join(", ");
}

function licencaVencendo(data: string | null | undefined) {
  if (!data) return false;
  const hoje = new Date();
  const limite = new Date();
  limite.setDate(hoje.getDate() + 30);
  const alvo = new Date(`${data}T00:00:00`);
  return alvo >= hoje && alvo <= limite;
}

function dataOrdenavel(data: string | null | undefined) {
  return data ? new Date(`${data}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
}

function lerParametro(params: Record<string, string | string[] | undefined>, chave: string) {
  const valor = params[chave];
  return (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? "";
}

function metrica(
  label: string,
  valor: number,
  detalhe: string,
  tone: MetricaEmpreendimento["tone"]
): MetricaEmpreendimento {
  return {
    detalhe,
    label,
    tone,
    valor: Intl.NumberFormat("pt-BR").format(valor)
  };
}

function registrarErroLeitura(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  console.error(`Erro ao carregar ${modulo}.`, erro.message);
}
