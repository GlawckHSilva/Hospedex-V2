import type {
  FeatureFlagRow,
  JsonValue,
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

export type EmpreendimentoCompleto = ProprietarioCompleto & {
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

export async function carregarDadosEmpreendimentos(
  params: Record<string, string | string[] | undefined>
): Promise<DadosModuloEmpreendimentos> {
  const filtros = normalizarFiltros(params);
  const base = await carregarDadosProprietarios({});
  const operacaoPorTenant = await carregarOperacao(base.proprietarios);
  const todos = base.proprietarios.map((proprietario) => ({
    ...proprietario,
    operacao: operacaoPorTenant.get(proprietario.tenant.id) ?? operacaoVazia(proprietario)
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
  if (!idsTenant.length) return new Map<string, OperacaoEmpreendimento>();

  const supabase = await criarClienteSupabaseServer();
  const [casasResultado, reservasResultado] = await Promise.all([
    supabase
      .from("properties")
      .select("tenant_id,status,deleted_at")
      .in("tenant_id", idsTenant)
      .is("deleted_at", null)
      .returns<Array<Pick<PropertyRow, "deleted_at" | "status" | "tenant_id">>>(),
    supabase
      .from("reservations")
      .select("tenant_id,status,check_in,total_amount")
      .in("tenant_id", idsTenant)
      .returns<Array<Pick<ReservationRow, "check_in" | "status" | "tenant_id" | "total_amount">>>()
  ]);

  registrarErroLeitura("casas por empreendimento", casasResultado.error);
  registrarErroLeitura("reservas por empreendimento", reservasResultado.error);

  const hoje = new Date().toISOString().slice(0, 10);
  const mapa = new Map<string, OperacaoEmpreendimento>();

  proprietarios.forEach((proprietario) => mapa.set(proprietario.tenant.id, operacaoVazia(proprietario)));

  (casasResultado.data ?? []).forEach((casa) => {
    const operacao = mapa.get(casa.tenant_id);
    if (operacao) operacao.casasUsadas += 1;
  });

  (reservasResultado.data ?? []).forEach((reserva) => {
    const operacao = mapa.get(reserva.tenant_id);
    if (!operacao) return;
    operacao.reservasTotal += 1;
    if (reserva.status !== "cancelled" && reserva.check_in >= hoje) {
      operacao.reservasFuturas += 1;
    }
  });

  proprietarios.forEach((proprietario) => {
    const operacao = mapa.get(proprietario.tenant.id);
    if (!operacao) return;
    operacao.receitaOperacional = proprietario.transactions
      .filter((transacao) => transacao.transaction_type === "income" && transacao.status === "paid")
      .reduce((total, transacao) => total + Number(transacao.amount), 0);
  });

  return mapa;
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
