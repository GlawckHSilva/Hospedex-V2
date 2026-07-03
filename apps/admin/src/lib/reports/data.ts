import type {
  ExpenseCategoryRow,
  PropertyRow,
  ReservationExtraServiceRow,
  ReservationGuestRow,
  ReservationRow,
  ReservationStatus,
  TransactionRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { filtrarPorPropriedadesAtivas } from "../properties/active-filter";
import { criarClienteSupabaseServer } from "../supabase/server";
import { podeLerRelatorios } from "./permissions";
import {
  CORES_STATUS_RESERVA_RELATORIOS,
  LABEL_STATUS_RESERVA_RELATORIOS,
  STATUS_RESERVA_RELATORIOS,
  type DadosModuloRelatorios,
  type FiltrosRelatorios,
  type HospedeRecorrenteRelatorio,
  type LancamentoDetalhadoRelatorio,
  type PontoSerieRelatorio,
  type PropriedadeRentavelRelatorio,
  type ReservaDetalhadaRelatorio,
  type ServicoExtraRelatorio,
  type StatusReservaRelatorio
} from "./types";

/**
 * Leitura dos Relatorios do proprietario.
 *
 * Todas as consultas usam tenant_id e owner_id do contexto autenticado. O filtro
 * recebido da URL apenas refina a consulta; ele nunca define o escopo de acesso.
 */

type DadosBaseRelatorios = {
  categorias: ExpenseCategoryRow[];
  extras: ReservationExtraServiceRow[];
  hospedes: ReservationGuestRow[];
  propriedades: PropertyRow[];
  reservas: ReservationRow[];
  transacoes: TransactionRow[];
};

export async function carregarDadosModuloRelatorios(
  contexto: ContextoAutenticacao,
  filtros: FiltrosRelatorios
): Promise<DadosModuloRelatorios> {
  const tenant = contexto.tenant;
  const tenantId = tenant?.id;
  const ownerId = tenant?.owner_id;

  if (!tenantId || !ownerId || !podeLerRelatorios(contexto)) {
    return criarDadosVazios(contexto, filtros);
  }

  const supabase = await criarClienteSupabaseServer();
  const periodo = obterPeriodoRelatorio(filtros);
  const [
    propriedadesResultado,
    reservasResultado,
    categoriasResultado,
    transacoesResultado
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .returns<PropertyRow[]>(),
    criarConsultaReservas(tenantId, ownerId, filtros, periodo.fimExclusivo),
    supabase
      .from("expense_categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("kind", { ascending: false })
      .order("name", { ascending: true })
      .returns<ExpenseCategoryRow[]>(),
    criarConsultaTransacoes(tenantId, filtros)
  ]);

  registrarErro("propriedades", propriedadesResultado.error);
  registrarErro("reservas", reservasResultado.error);
  registrarErro("categorias financeiras", categoriasResultado.error);
  registrarErro("lancamentos financeiros", transacoesResultado.error);

  const propriedades = propriedadesResultado.data ?? [];
  const reservas = filtrarPorPropriedadesAtivas(reservasResultado.data ?? [], propriedades);
  const idsReservas = reservas.map((reserva) => reserva.id);
  const [hospedes, extras] = await Promise.all([
    carregarHospedesReservas(tenantId, idsReservas),
    carregarExtrasReservas(tenantId, idsReservas)
  ]);

  const dados: DadosBaseRelatorios = {
    categorias: categoriasResultado.data ?? [],
    extras,
    hospedes,
    propriedades,
    reservas,
    transacoes: (transacoesResultado.data ?? []).filter((transacao) =>
      transacaoPertenceAoPeriodo(transacao, filtros)
    )
  };

  const serieFinanceira = montarSerieFinanceira(dados, filtros);
  const propriedadesRentaveis = montarPropriedadesRentaveis(dados);
  const hospedesRecorrentes = montarHospedesRecorrentes(dados);
  const servicosExtras = montarServicosExtras(dados);
  const reservasDetalhadas = montarReservasDetalhadas(dados);
  const lancamentosDetalhados = montarLancamentosDetalhados(dados);
  const resumo = montarResumo(dados, filtros, periodo.fimExclusivo);

  return {
    categoriasFinanceiras: dados.categorias,
    filtros,
    hospedesRecorrentes,
    lancamentosDetalhados,
    linhasCsv: montarLinhasCsv(
      resumo,
      serieFinanceira,
      propriedadesRentaveis,
      servicosExtras,
      reservasDetalhadas,
      lancamentosDetalhados
    ),
    propriedades: dados.propriedades,
    propriedadesRentaveis,
    reservasDetalhadas,
    reservasPorStatus: montarReservasPorStatus(dados.reservas),
    resumo,
    serieFinanceira,
    servicosExtras,
    tenantNome: tenant.name
  };
}

async function criarConsultaReservas(
  tenantId: string,
  ownerId: string,
  filtros: FiltrosRelatorios,
  fimExclusivo: string
) {
  const supabase = await criarClienteSupabaseServer();
  let consulta = supabase
    .from("reservations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("owner_id", ownerId)
    .lt("check_in", fimExclusivo)
    .gt("check_out", filtros.dataInicio)
    .order("check_in", { ascending: true });

  if (filtros.propriedadeId) consulta = consulta.eq("property_id", filtros.propriedadeId);
  if (filtros.statusReserva !== "todos") consulta = consulta.eq("status", filtros.statusReserva);

  return consulta.returns<ReservationRow[]>();
}

async function criarConsultaTransacoes(tenantId: string, filtros: FiltrosRelatorios) {
  const supabase = await criarClienteSupabaseServer();
  let consulta = supabase
    .from("transactions")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("transaction_type", ["income", "expense"])
    .order("created_at", { ascending: false })
    .limit(1000);

  if (filtros.propriedadeId) consulta = consulta.eq("property_id", filtros.propriedadeId);
  if (filtros.categoriaFinanceiraId) {
    consulta = consulta.eq("expense_category_id", filtros.categoriaFinanceiraId);
  }

  return consulta.returns<TransactionRow[]>();
}

async function carregarHospedesReservas(tenantId: string, idsReservas: string[]) {
  if (idsReservas.length === 0) return [];
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("reservation_guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("reservation_id", idsReservas)
    .returns<ReservationGuestRow[]>();

  registrarErro("hospedes das reservas", error);
  return data ?? [];
}

async function carregarExtrasReservas(tenantId: string, idsReservas: string[]) {
  if (idsReservas.length === 0) return [];
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("reservation_extra_services")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .in("reservation_id", idsReservas)
    .returns<ReservationExtraServiceRow[]>();

  registrarErro("servicos extras", error);
  return data ?? [];
}

function montarResumo(
  dados: DadosBaseRelatorios,
  filtros: FiltrosRelatorios,
  fimExclusivo: string
) {
  const receitasPagas = dados.transacoes.filter(
    (transacao) => transacao.transaction_type === "income" && transacao.status === "paid"
  );
  const despesasPagas = dados.transacoes.filter(
    (transacao) => transacao.transaction_type === "expense" && transacao.status === "paid"
  );
  const reservasValidas = dados.reservas.filter((reserva) => reserva.status !== "cancelled");
  const receitaReservas = somarReservasComExtras(reservasValidas, dados.extras);
  const noitesDisponiveis =
    Math.max(diferencaDias(filtros.dataInicio, fimExclusivo), 0) *
    dados.propriedades.filter((propriedade) => propriedade.status === "published").length;
  const noitesOcupadas = reservasValidas.reduce(
    (total, reserva) => total + calcularNoitesSobrepostas(reserva, filtros.dataInicio, fimExclusivo),
    0
  );

  return {
    despesasPeriodo: somarTransacoes(despesasPagas),
    hospedesRecorrentes: montarHospedesRecorrentes(dados).length,
    lucroPeriodo: somarTransacoes(receitasPagas) - somarTransacoes(despesasPagas),
    propriedadesRentaveis: montarPropriedadesRentaveis(dados).length,
    receitaPeriodo: somarTransacoes(receitasPagas),
    reservasPeriodo: dados.reservas.length,
    servicosExtras: dados.extras.reduce((total, extra) => total + Number(extra.total_amount), 0),
    taxaOcupacao:
      noitesDisponiveis > 0 ? Math.min(100, (noitesOcupadas / noitesDisponiveis) * 100) : 0,
    ticketMedio: reservasValidas.length > 0 ? receitaReservas / reservasValidas.length : 0
  };
}

function montarSerieFinanceira(
  dados: DadosBaseRelatorios,
  filtros: FiltrosRelatorios
): PontoSerieRelatorio[] {
  const mapa = criarMapaDias(filtros.dataInicio, obterPeriodoRelatorio(filtros).fimExclusivo);

  for (const transacao of dados.transacoes) {
    if (transacao.status !== "paid") continue;
    const data = obterDataTransacao(transacao);
    const ponto = mapa.get(data);
    if (!ponto) continue;
    if (transacao.transaction_type === "income") ponto.receita += Number(transacao.amount);
    if (transacao.transaction_type === "expense") ponto.despesas += Number(transacao.amount);
    ponto.lucro = ponto.receita - ponto.despesas;
  }

  for (const reserva of dados.reservas) {
    const ponto = mapa.get(reserva.check_in);
    if (ponto) ponto.reservas += 1;
  }

  return Array.from(mapa.values());
}

function montarReservasPorStatus(reservas: ReservationRow[]): StatusReservaRelatorio[] {
  return STATUS_RESERVA_RELATORIOS.map((status) => ({
    cor: CORES_STATUS_RESERVA_RELATORIOS[status],
    label: LABEL_STATUS_RESERVA_RELATORIOS[status],
    status,
    total: reservas.filter((reserva) => reserva.status === status).length
  })).filter((item) => item.total > 0);
}

function montarPropriedadesRentaveis(
  dados: DadosBaseRelatorios
): PropriedadeRentavelRelatorio[] {
  const reservasValidas = dados.reservas.filter((reserva) => reserva.status !== "cancelled");

  return dados.propriedades
    .map((propriedade) => {
      const reservasPropriedade = reservasValidas.filter(
        (reserva) => reserva.property_id === propriedade.id
      );
      const receitaReservas = somarReservasComExtras(reservasPropriedade, dados.extras);

      return {
        propriedadeId: propriedade.id,
        propriedadeNome: propriedade.name,
        receitaReservas,
        reservas: reservasPropriedade.length,
        ticketMedio:
          reservasPropriedade.length > 0 ? receitaReservas / reservasPropriedade.length : 0
      };
    })
    .filter((item) => item.reservas > 0)
    .sort((a, b) => b.receitaReservas - a.receitaReservas)
    .slice(0, 8);
}

function montarHospedesRecorrentes(dados: DadosBaseRelatorios): HospedeRecorrenteRelatorio[] {
  const reservasPorId = new Map(dados.reservas.map((reserva) => [reserva.id, reserva]));
  const grupos = new Map<string, ReservationGuestRow[]>();

  for (const hospede of dados.hospedes) {
    const identidade = normalizarIdentidadeHospede(hospede);
    if (!identidade) continue;
    grupos.set(identidade, [...(grupos.get(identidade) ?? []), hospede]);
  }

  return Array.from(grupos.entries())
    .map(([identidade, hospedes]) => {
      const idsReserva = Array.from(new Set(hospedes.map((hospede) => hospede.reservation_id)));
      const reservas = idsReserva
        .map((id) => reservasPorId.get(id))
        .filter((reserva): reserva is ReservationRow => Boolean(reserva));

      return {
        identidade,
        nome: hospedes[0]?.full_name ?? "Hospede",
        reservas: reservas.length,
        ultimaHospedagem: reservas.sort((a, b) => b.check_out.localeCompare(a.check_out))[0]
          ?.check_out ?? "",
        valorTotal: somarReservasComExtras(reservas, dados.extras)
      };
    })
    .filter((item) => item.reservas > 1)
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .slice(0, 8);
}

function montarServicosExtras(dados: DadosBaseRelatorios): ServicoExtraRelatorio[] {
  const mapa = new Map<string, ServicoExtraRelatorio>();

  for (const extra of dados.extras) {
    const chave = extra.name.trim().toLowerCase();
    const atual = mapa.get(chave) ?? { nome: extra.name, quantidade: 0, valorTotal: 0 };
    atual.quantidade += Number(extra.quantity);
    atual.valorTotal += Number(extra.total_amount);
    mapa.set(chave, atual);
  }

  return Array.from(mapa.values())
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .slice(0, 8);
}

function montarReservasDetalhadas(dados: DadosBaseRelatorios): ReservaDetalhadaRelatorio[] {
  const propriedades = new Map(dados.propriedades.map((propriedade) => [propriedade.id, propriedade.name]));
  const hospedesPrincipais = new Map(
    dados.hospedes
      .filter((hospede) => hospede.is_primary)
      .map((hospede) => [hospede.reservation_id, hospede.full_name])
  );

  return dados.reservas.map((reserva) => ({
    codigo: reserva.code,
    hospede: hospedesPrincipais.get(reserva.id) ?? "Hospede nao informado",
    pagamento: LABEL_PAGAMENTO_RELATORIOS[reserva.payment_status] ?? reserva.payment_status,
    propriedade: propriedades.get(reserva.property_id) ?? "Propriedade removida",
    status: LABEL_STATUS_RESERVA_RELATORIOS[reserva.status],
    total: Number(reserva.total_amount)
  }));
}

function montarLancamentosDetalhados(dados: DadosBaseRelatorios): LancamentoDetalhadoRelatorio[] {
  const categorias = new Map(dados.categorias.map((categoria) => [categoria.id, categoria.name]));

  return dados.transacoes.map((transacao) => ({
    categoria: transacao.expense_category_id
      ? categorias.get(transacao.expense_category_id) ?? "Categoria"
      : transacao.transaction_type === "income"
        ? "Receita"
        : "Despesa",
    data: obterDataTransacao(transacao),
    descricao: transacao.description ?? transacao.guest_name ?? "Lancamento financeiro",
    tipo: transacao.transaction_type === "income" ? "Receita" : "Despesa",
    valor: Number(transacao.amount)
  }));
}

function montarLinhasCsv(
  resumo: DadosModuloRelatorios["resumo"],
  serie: PontoSerieRelatorio[],
  propriedades: PropriedadeRentavelRelatorio[],
  servicosExtras: ServicoExtraRelatorio[],
  reservasDetalhadas: ReservaDetalhadaRelatorio[],
  lancamentosDetalhados: LancamentoDetalhadoRelatorio[]
) {
  return [
    ["Tipo", "Nome", "Receita", "Despesas", "Lucro", "Reservas", "Valor"],
    ["Resumo", "Receita por periodo", String(resumo.receitaPeriodo), "", "", "", ""],
    ["Resumo", "Despesas por periodo", "", String(resumo.despesasPeriodo), "", "", ""],
    ["Resumo", "Lucro por periodo", "", "", String(resumo.lucroPeriodo), "", ""],
    ["Resumo", "Reservas por periodo", "", "", "", String(resumo.reservasPeriodo), ""],
    ["Resumo", "Taxa de ocupacao", "", "", "", "", `${resumo.taxaOcupacao.toFixed(2)}%`],
    ["Resumo", "Ticket medio", "", "", "", "", String(resumo.ticketMedio)],
    ...serie.map((ponto) => [
      "Serie diaria",
      ponto.data,
      String(ponto.receita),
      String(ponto.despesas),
      String(ponto.lucro),
      String(ponto.reservas),
      ""
    ]),
    ...propriedades.map((propriedade) => [
      "Propriedade",
      propriedade.propriedadeNome,
      String(propriedade.receitaReservas),
      "",
      "",
      String(propriedade.reservas),
      String(propriedade.ticketMedio)
    ]),
    ...servicosExtras.map((servico) => [
      "Servico extra",
      servico.nome,
      String(servico.valorTotal),
      "",
      "",
      String(servico.quantidade),
      ""
    ]),
    ...reservasDetalhadas.map((reserva) => [
      "Reserva",
      reserva.codigo,
      "",
      "",
      "",
      reserva.status,
      String(reserva.total)
    ]),
    ...lancamentosDetalhados.map((lancamento) => [
      "Lancamento financeiro",
      lancamento.descricao,
      lancamento.tipo === "Receita" ? String(lancamento.valor) : "",
      lancamento.tipo === "Despesa" ? String(lancamento.valor) : "",
      "",
      lancamento.categoria,
      lancamento.data
    ])
  ];
}

function criarMapaDias(inicio: string, fimExclusivo: string) {
  const mapa = new Map<string, PontoSerieRelatorio>();
  let data = criarDataUtc(inicio);
  const fim = criarDataUtc(fimExclusivo);

  while (data < fim) {
    const chave = data.toISOString().slice(0, 10);
    mapa.set(chave, {
      data: chave,
      despesas: 0,
      lucro: 0,
      receita: 0,
      reservas: 0,
      rotulo: `${chave.slice(8, 10)}/${chave.slice(5, 7)}`
    });
    data = adicionarDiasData(data, 1);
  }

  return mapa;
}

export function montarFiltrosRelatorios(params: Record<string, string | string[] | undefined>) {
  const periodo = normalizarPeriodoRelatorios(
    lerParametro(params, "dataInicio"),
    lerParametro(params, "dataFim")
  );
  const status = lerParametro(params, "statusReserva");
  const categoriaFinanceiraId = lerParametro(params, "categoriaFinanceiraId");
  const propriedadeId = lerParametro(params, "propriedadeId");

  const filtros: FiltrosRelatorios = {
    dataFim: periodo.dataFim,
    dataInicio: periodo.dataInicio,
    statusReserva:
      status && STATUS_RESERVA_RELATORIOS.includes(status as ReservationStatus)
        ? (status as ReservationStatus)
        : "todos"
  };

  if (categoriaFinanceiraId) filtros.categoriaFinanceiraId = categoriaFinanceiraId;
  if (propriedadeId) filtros.propriedadeId = propriedadeId;

  return filtros;
}

function normalizarPeriodoRelatorios(dataInicio?: string, dataFim?: string) {
  const hoje = new Date();
  const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const fimHoje = hoje.toISOString().slice(0, 10);
  const inicio = dataValida(dataInicio) ? dataInicio : inicioMes;
  const fim = dataValida(dataFim) && dataFim >= inicio ? dataFim : fimHoje;

  return { dataFim: fim, dataInicio: inicio };
}

function obterPeriodoRelatorio(filtros: FiltrosRelatorios) {
  return {
    fimExclusivo: adicionarDiasString(filtros.dataFim, 1),
    inicio: filtros.dataInicio
  };
}

function transacaoPertenceAoPeriodo(transacao: TransactionRow, filtros: FiltrosRelatorios) {
  const data = obterDataTransacao(transacao);
  return data >= filtros.dataInicio && data <= filtros.dataFim;
}

function obterDataTransacao(transacao: TransactionRow) {
  return (transacao.paid_at ?? transacao.due_date ?? transacao.created_at).slice(0, 10);
}

function somarTransacoes(transacoes: TransactionRow[]) {
  return transacoes.reduce((total, transacao) => total + Number(transacao.amount), 0);
}

function somarReservasComExtras(reservas: ReservationRow[], extras: ReservationExtraServiceRow[]) {
  return reservas.reduce((total, reserva) => {
    const totalExtras = extras
      .filter((extra) => extra.reservation_id === reserva.id)
      .reduce((subtotal, extra) => subtotal + Number(extra.total_amount), 0);

    return total + Number(reserva.total_amount) + totalExtras;
  }, 0);
}

function calcularNoitesSobrepostas(reserva: ReservationRow, inicio: string, fimExclusivo: string) {
  const inicioReal = reserva.check_in > inicio ? reserva.check_in : inicio;
  const fimReal = reserva.check_out < fimExclusivo ? reserva.check_out : fimExclusivo;
  return Math.max(diferencaDias(inicioReal, fimReal), 0);
}

function diferencaDias(inicio: string, fim: string) {
  const umDia = 24 * 60 * 60 * 1000;
  return Math.round((criarDataUtc(fim).getTime() - criarDataUtc(inicio).getTime()) / umDia);
}

function normalizarIdentidadeHospede(hospede: ReservationGuestRow) {
  return (
    hospede.email?.trim().toLowerCase() ||
    hospede.phone?.replace(/\D/g, "") ||
    hospede.document_number?.replace(/\D/g, "") ||
    ""
  );
}

function adicionarDiasString(data: string, dias: number) {
  return adicionarDiasData(criarDataUtc(data), dias).toISOString().slice(0, 10);
}

function adicionarDiasData(data: Date, dias: number) {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate() + dias));
}

function criarDataUtc(data: string) {
  const [ano = "2026", mes = "01", dia = "01"] = data.split("-");
  return new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
}

function dataValida(valor?: string): valor is string {
  return Boolean(valor && /^\d{4}-\d{2}-\d{2}$/.test(valor));
}

function lerParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string
): string | undefined {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}

function criarDadosVazios(
  contexto: ContextoAutenticacao,
  filtros: FiltrosRelatorios
): DadosModuloRelatorios {
  return {
    categoriasFinanceiras: [],
    filtros,
    hospedesRecorrentes: [],
    lancamentosDetalhados: [],
    linhasCsv: [],
    propriedades: [],
    propriedadesRentaveis: [],
    reservasDetalhadas: [],
    reservasPorStatus: [],
    resumo: {
      despesasPeriodo: 0,
      hospedesRecorrentes: 0,
      lucroPeriodo: 0,
      propriedadesRentaveis: 0,
      receitaPeriodo: 0,
      reservasPeriodo: 0,
      servicosExtras: 0,
      taxaOcupacao: 0,
      ticketMedio: 0
    },
    serieFinanceira: [],
    servicosExtras: [],
    tenantNome: contexto.tenant?.name ?? "Tenant"
  };
}

const LABEL_PAGAMENTO_RELATORIOS: Record<string, string> = {
  cancelled: "Cancelado",
  paid: "Pago",
  pending: "Pendente",
  refunded: "Estornado"
};

function registrarErro(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  throw new Error(`Erro ao carregar ${modulo} dos relatorios: ${erro.message}`);
}
