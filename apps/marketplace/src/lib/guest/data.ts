import type {
  JsonValue,
  ReservationPaymentMethod,
  ReservationPaymentStatus,
  ReservationStatus
} from "@hospedex/types";

import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  CobrancaReservaHospede,
  FinanceiroReservaHospede,
  EstadoProtegido,
  HospedePrincipalReserva,
  InstrucaoPagamentoHospede,
  PagamentoReservaHospede,
  PerfilHospede,
  PoliticaCancelamentoHospede,
  PropriedadeReservaHospede,
  ProprietarioReservaHospede,
  ReservaHospedeDetalhe,
  ReservaHospedeResumo,
  TimelineReservaHospede
} from "./types";

type ResultadoProtegido<T> = {
  dados: T | null;
  estado: EstadoProtegido;
  mensagem: string | null;
};

type PerfilRow = {
  avatar_url: string | null;
  city: string | null;
  document_number: string | null;
  email: string;
  full_name: string | null;
  id: string;
  phone: string | null;
  platform_role: "user" | "super_admin";
  state: string | null;
};

type ReservaRow = {
  check_in: string;
  check_out: string;
  code: string;
  created_at: string;
  currency: string;
  expected_checkin_time: string | null;
  expected_checkout_time: string | null;
  guest_notes: string | null;
  guests_count: number;
  id: string;
  notes: string | null;
  owner_id: string;
  payment_method: ReservationPaymentMethod | null;
  payment_status: ReservationPaymentStatus;
  property_id: string;
  status: ReservationStatus;
  tenant_id: string;
  total_amount: number;
};

type HospedeReservaRow = {
  document_number: string | null;
  email: string | null;
  full_name: string;
  is_primary: boolean;
  phone: string | null;
  reservation_id: string;
};

type InstrucaoPagamentoRow = {
  instruction: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_whatsapp: string | null;
  payment_method: ReservationPaymentMethod | null;
  payment_status: ReservationPaymentStatus;
  prepared_message: string | null;
  reservation_id: string;
};

type HistoricoRow = {
  created_at: string;
  reason: string | null;
  to_status: ReservationStatus;
};

type CobrancaReservaRow = {
  amount: number;
  amount_paid: number;
  charge_type: CobrancaReservaHospede["tipo"];
  currency: string;
  due_at: string | null;
  manual_instructions: string | null;
  payment_method: ReservationPaymentMethod | null;
  reservation_id: string;
  status: CobrancaReservaHospede["status"];
};

type PagamentoReservaRow = {
  amount: number;
  confirmed_at: string | null;
  created_at: string;
  currency: string;
  parent_payment_id: string | null;
  payment_method: ReservationPaymentMethod | null;
  refunded_amount: number;
  reversal_reason: string | null;
  reversal_type: "cancel" | "refund" | null;
  reservation_id: string;
  status: PagamentoReservaHospede["status"];
};

type DetalhesEstadiaRow = {
  amenities: JsonValue;
  house_rules: JsonValue;
  owner_details: JsonValue;
  property_details: JsonValue;
  regional_guide: JsonValue;
  reservation_id: string;
};

type PoliticaCancelamentoRow = {
  late_refund_percentage: number;
  late_until_days: number;
  no_refund_within_days: number;
  notes: string | null;
  refund_until_days: number;
  refund_until_percentage: number;
  reservation_id: string;
};

type ComplementoEstadia = {
  checkInPadrao: string | null;
  checkOutPadrao: string | null;
  comodidades: string[];
  guiaRegiao: ReservaHospedeDetalhe["guiaRegiao"];
  propriedade: PropriedadeReservaHospede;
  proprietario: ProprietarioReservaHospede | null;
  regrasCasa: string[];
  taxaLimpeza: number;
};

const CAMPOS_RESERVA =
  "id,tenant_id,property_id,owner_id,code,status,check_in,check_out,expected_checkin_time,expected_checkout_time,guests_count,total_amount,currency,payment_method,payment_status,notes,guest_notes,created_at";

export async function carregarPerfilHospede(): Promise<
  ResultadoProtegido<PerfilHospede>
> {
  const contexto = await carregarContextoHospede();
  if (contexto.estado !== "ok" || !contexto.dados) return erroDoContexto(contexto);

  return {
    dados: contexto.dados.perfil,
    estado: "ok",
    mensagem: null
  };
}

export async function carregarReservasHospede(): Promise<
  ResultadoProtegido<ReservaHospedeResumo[]>
> {
  const contexto = await carregarContextoHospede();
  if (contexto.estado !== "ok" || !contexto.dados) return erroDoContexto(contexto);

  const supabase = contexto.dados.supabase;

  const { error: vinculoErro } = await supabase.rpc("link_guest_reservations");
  if (vinculoErro) {
    console.error("Erro ao vincular reservas antigas ao hospede.", vinculoErro);
  }

  const { data, error } = await supabase
    .from("reservations")
    .select(CAMPOS_RESERVA)
    .eq("guest_user_id", contexto.dados.perfil.id)
    .order("check_in", { ascending: false })
    .returns<ReservaRow[]>();

  if (error) {
    console.error("Erro ao carregar reservas do hospede.", error);
    return {
      dados: null,
      estado: "erro",
      mensagem: "Não foi possível carregar suas reservas."
    };
  }

  const reservas = data ?? [];
  const complementos = await carregarComplementosReservas(supabase, reservas);

  return {
    dados: reservas.map((reserva) => montarResumoReserva(reserva, complementos)),
    estado: "ok",
    mensagem: null
  };
}

export async function carregarReservaHospede(
  reservaId: string
): Promise<ResultadoProtegido<ReservaHospedeDetalhe>> {
  const contexto = await carregarContextoHospede();
  if (contexto.estado !== "ok" || !contexto.dados) return erroDoContexto(contexto);

  const supabase = contexto.dados.supabase;
  const { error: vinculoErro } = await supabase.rpc("link_guest_reservations");
  if (vinculoErro) {
    console.error("Erro ao vincular reserva antes do detalhe do hospede.", vinculoErro);
  }

  const { data, error } = await supabase
    .from("reservations")
    .select(CAMPOS_RESERVA)
    .eq("id", reservaId)
    .eq("guest_user_id", contexto.dados.perfil.id)
    .maybeSingle<ReservaRow>();

  if (error) {
    console.error("Erro ao carregar detalhe da reserva do hospede.", error);
    return {
      dados: null,
      estado: "erro",
      mensagem: "Não foi possível carregar esta reserva."
    };
  }

  if (!data) {
    return {
      dados: null,
      estado: "sem_permissao",
      mensagem: "Reserva não encontrada ou sem permissão para esta conta."
    };
  }

  const complementos = await carregarComplementosReservas(supabase, [data], {
    carregarHistorico: true
  });
  const resumo = montarResumoReserva(data, complementos);
  const estadia = complementos.estadiasPorReserva.get(data.id);

  return {
    dados: {
      ...resumo,
      checkInHorario: estadia?.checkInPadrao ?? null,
      checkOutHorario: estadia?.checkOutPadrao ?? null,
      comodidades: estadia?.comodidades ?? [],
      guiaRegiao: estadia?.guiaRegiao ?? [],
      observacoes: data.guest_notes ?? data.notes,
      cancelamento: montarPoliticaCancelamentoHospede(
        data,
        complementos.politicasCancelamentoPorReserva.get(data.id) ?? null,
        resumo.financeiro.valorPago
      ),
      proprietario: estadia?.proprietario ?? null,
      regrasCasa: estadia?.regrasCasa ?? resumo.propriedade?.regras ?? [],
      taxaLimpeza: estadia?.taxaLimpeza ?? 0,
      timeline: montarTimeline(data, complementos.historicoPorReserva.get(data.id) ?? [])
    },
    estado: "ok",
    mensagem: null
  };
}

async function carregarContextoHospede(): Promise<
  ResultadoProtegido<{
    perfil: PerfilHospede;
    supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServer>>>;
  }>
> {
  const supabase = await criarClienteSupabaseServer();

  if (!supabase) {
    return {
      dados: null,
      estado: "erro",
      mensagem: "Variaveis do Supabase ausentes no Marketplace."
    };
  }

  const { data: usuarioResultado, error: usuarioErro } = await supabase.auth.getUser();
  const usuario = usuarioResultado.user;

  if (usuarioErro || !usuario) {
    return {
      dados: null,
      estado: "nao_autenticado",
      mensagem: "Entre para visualizar suas reservas."
    };
  }

  const { data: perfil, error: perfilErro } = await supabase
    .from("profiles")
    .select(
      "id,email,full_name,phone,avatar_url,platform_role,document_number,city,state"
    )
    .eq("id", usuario.id)
    .maybeSingle<PerfilRow>();

  if (perfilErro || !perfil) {
    console.error("Perfil do hospede nao encontrado.", perfilErro);
    return {
      dados: null,
      estado: "erro",
      mensagem: "Perfil não encontrado para esta conta."
    };
  }

  if (perfil.platform_role === "super_admin") {
    return {
      dados: null,
      estado: "sem_permissao",
      mensagem: "Esta conta pertence ao gerenciamento e não pode acessar a Área do Hóspede."
    };
  }

  return {
    dados: {
      perfil: {
        avatarUrl: perfil.avatar_url,
        cidade: perfil.city,
        documento: perfil.document_number,
        email: perfil.email,
        estado: perfil.state,
        id: perfil.id,
        nome: perfil.full_name,
        telefone: perfil.phone
      },
      supabase
    },
    estado: "ok",
    mensagem: null
  };
}

async function carregarComplementosReservas(
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServer>>>,
  reservas: ReservaRow[],
  opcoes: { carregarHistorico?: boolean } = {}
) {
  const reservaIds = reservas.map((reserva) => reserva.id);

  if (!reservas.length) {
    return {
      estadiasPorReserva: new Map<string, ComplementoEstadia>(),
      cobrancasPorReserva: new Map<string, CobrancaReservaHospede[]>(),
      hospedesPorReserva: new Map<string, HospedePrincipalReserva>(),
      historicoPorReserva: new Map<string, HistoricoRow[]>(),
      instrucoesPorReserva: new Map<string, InstrucaoPagamentoHospede>(),
      pagamentosPorReserva: new Map<string, PagamentoReservaHospede[]>(),
      politicasCancelamentoPorReserva: new Map<string, PoliticaCancelamentoRow>(),
      propriedadesPorReserva: new Map<string, PropriedadeReservaHospede>()
    };
  }

  const [
    hospedes,
    estadias,
    instrucoes,
    historico,
    cobrancas,
    pagamentos,
    politicasCancelamento
  ] = await Promise.all([
    supabase
      .from("reservation_guests")
      .select("reservation_id,full_name,email,phone,document_number,is_primary")
      .in("reservation_id", reservaIds)
      .returns<HospedeReservaRow[]>(),
    supabase.rpc("get_guest_reservation_stay_details", {
      p_reservation_ids: reservaIds
    }) as unknown as Promise<{
      data: DetalhesEstadiaRow[] | null;
      error: Error | null;
    }>,
    supabase.rpc("get_guest_reservation_payment_guidance", {
      p_reservation_ids: reservaIds
    }) as unknown as Promise<{
      data: InstrucaoPagamentoRow[] | null;
      error: Error | null;
    }>,
    opcoes.carregarHistorico
      ? supabase
          .from("reservation_status_history")
          .select("reservation_id,to_status,reason,created_at")
          .in("reservation_id", reservaIds)
          .order("created_at", { ascending: true })
          .returns<(HistoricoRow & { reservation_id: string })[]>()
      : Promise.resolve({ data: [], error: null })
    ,
    supabase
      .from("reservation_charges")
      .select("reservation_id,charge_type,amount,amount_paid,currency,due_at,status,payment_method,manual_instructions")
      .in("reservation_id", reservaIds)
      .order("created_at", { ascending: true })
      .returns<CobrancaReservaRow[]>(),
    supabase
      .from("reservation_payments")
      .select("reservation_id,amount,currency,payment_method,status,created_at,confirmed_at,parent_payment_id,reversal_type,reversal_reason,refunded_amount")
      .in("reservation_id", reservaIds)
      .order("created_at", { ascending: true })
      .returns<PagamentoReservaRow[]>()
    ,
    opcoes.carregarHistorico
      ? (supabase.rpc("get_guest_reservation_cancellation_policy", {
          p_reservation_ids: reservaIds
        }) as unknown as Promise<{
          data: PoliticaCancelamentoRow[] | null;
          error: Error | null;
        }>)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (hospedes.error) console.error("Erro ao carregar hospedes da reserva.", hospedes.error);
  if (estadias.error) console.error("Erro ao carregar dados da estadia do hospede.", estadias.error);
  if (instrucoes.error) console.error("Erro ao carregar instrucoes de pagamento.", instrucoes.error);
  if (historico.error) console.error("Erro ao carregar timeline da reserva.", historico.error);
  if (cobrancas.error) console.error("Erro ao carregar cobrancas do hospede.", cobrancas.error);
  if (pagamentos.error) console.error("Erro ao carregar pagamentos do hospede.", pagamentos.error);
  if (politicasCancelamento.error) {
    console.error("Erro ao carregar politica de cancelamento do hospede.", politicasCancelamento.error);
  }

  const estadiasPorReserva = mapearEstadias(estadias.data ?? [], supabase);

  return {
    cobrancasPorReserva: mapearCobrancasHospede(cobrancas.data ?? []),
    estadiasPorReserva,
    hospedesPorReserva: mapearHospedes(hospedes.data ?? []),
    historicoPorReserva: mapearHistorico(historico.data ?? []),
    instrucoesPorReserva: mapearInstrucoes(instrucoes.data ?? []),
    pagamentosPorReserva: mapearPagamentosHospede(pagamentos.data ?? []),
    politicasCancelamentoPorReserva: mapearPoliticasCancelamento(politicasCancelamento.data ?? []),
    propriedadesPorReserva: new Map(
      [...estadiasPorReserva.entries()].map(([reservaId, estadia]) => [
        reservaId,
        estadia.propriedade
      ])
    )
  };
}

function erroDoContexto<T>(
  contexto: ResultadoProtegido<unknown>
): ResultadoProtegido<T> {
  return {
    dados: null,
    estado: contexto.estado === "ok" ? "erro" : contexto.estado,
    mensagem: contexto.mensagem
  };
}

function montarResumoReserva(
  reserva: ReservaRow,
  complementos: Awaited<ReturnType<typeof carregarComplementosReservas>>
): ReservaHospedeResumo {
  return {
    checkIn: reserva.check_in,
    checkOut: reserva.check_out,
    codigo: reserva.code,
    criadaEm: reserva.created_at,
    formaPagamento: reserva.payment_method,
    financeiro: montarFinanceiroHospede(reserva, complementos),
    hospede: complementos.hospedesPorReserva.get(reserva.id) ?? null,
    hospedesQuantidade: reserva.guests_count,
    horarioPrevistoCheckIn: reserva.expected_checkin_time,
    horarioPrevistoCheckOut: reserva.expected_checkout_time,
    id: reserva.id,
    pagamento: complementos.instrucoesPorReserva.get(reserva.id) ?? null,
    propriedade: complementos.propriedadesPorReserva.get(reserva.id) ?? null,
    status: reserva.status,
    statusPagamento: reserva.payment_status,
    total: Number(reserva.total_amount ?? 0)
  };
}

function mapearHospedes(hospedes: HospedeReservaRow[]) {
  const mapa = new Map<string, HospedePrincipalReserva>();

  for (const hospede of hospedes) {
    if (!hospede.is_primary) continue;

    mapa.set(hospede.reservation_id, {
      documento: hospede.document_number,
      email: hospede.email,
      nome: hospede.full_name,
      telefone: hospede.phone
    });
  }

  return mapa;
}

function mapearInstrucoes(instrucoes: InstrucaoPagamentoRow[]) {
  const mapa = new Map<string, InstrucaoPagamentoHospede>();

  for (const instrucao of instrucoes) {
    mapa.set(instrucao.reservation_id, {
      formaPagamento: instrucao.payment_method,
      instrucoes: instrucao.instruction,
      mensagemPreparada: instrucao.prepared_message,
      proprietarioNome: instrucao.owner_name,
      proprietarioTelefone: instrucao.owner_phone,
      proprietarioWhatsapp: instrucao.owner_whatsapp,
      statusPagamento: instrucao.payment_status
    });
  }

  return mapa;
}

function mapearCobrancasHospede(cobrancas: CobrancaReservaRow[]) {
  const mapa = new Map<string, CobrancaReservaHospede[]>();

  for (const cobranca of cobrancas) {
    const lista = mapa.get(cobranca.reservation_id) ?? [];
    lista.push({
      formaPagamento: cobranca.payment_method,
      instrucoes: cobranca.manual_instructions,
      status: cobranca.status,
      tipo: cobranca.charge_type,
      valor: Number(cobranca.amount),
      valorPago: Number(cobranca.amount_paid),
      valorPendente: Math.max(Number(cobranca.amount) - Number(cobranca.amount_paid), 0),
      vencimento: cobranca.due_at
    });
    mapa.set(cobranca.reservation_id, lista);
  }

  return mapa;
}

function mapearPagamentosHospede(pagamentos: PagamentoReservaRow[]) {
  const mapa = new Map<string, PagamentoReservaHospede[]>();

  for (const pagamento of pagamentos) {
    const lista = mapa.get(pagamento.reservation_id) ?? [];
    lista.push({
      confirmadoEm: pagamento.confirmed_at,
      criadoEm: pagamento.created_at,
      formaPagamento: pagamento.payment_method,
      motivoReversao: pagamento.reversal_reason,
      pagamentoOrigemId: pagamento.parent_payment_id,
      status: pagamento.status,
      tipoReversao: pagamento.reversal_type,
      valor: Number(pagamento.amount),
      valorEstornado: Number(pagamento.refunded_amount ?? 0)
    });
    mapa.set(pagamento.reservation_id, lista);
  }

  return mapa;
}

function mapearPoliticasCancelamento(politicas: PoliticaCancelamentoRow[]) {
  const mapa = new Map<string, PoliticaCancelamentoRow>();

  for (const politica of politicas) {
    mapa.set(politica.reservation_id, politica);
  }

  return mapa;
}

function montarPoliticaCancelamentoHospede(
  reserva: ReservaRow,
  politica: PoliticaCancelamentoRow | null,
  valorPago: number
): PoliticaCancelamentoHospede {
  const regra = politica ?? {
    late_refund_percentage: 50,
    late_until_days: 2,
    no_refund_within_days: 1,
    notes: null,
    refund_until_days: 7,
    refund_until_percentage: 100,
    reservation_id: reserva.id
  };
  const diasAntesCheckIn = calcularDiasAntesCheckIn(reserva.check_in);
  const percentual =
    diasAntesCheckIn >= regra.refund_until_days
      ? regra.refund_until_percentage
      : diasAntesCheckIn >= regra.late_until_days
        ? regra.late_refund_percentage
        : 0;
  const statusCancelaveis: ReservaRow["status"][] = [
    "pending",
    "awaiting_payment",
    "confirmed"
  ];
  const podeCancelar = statusCancelaveis.includes(reserva.status);

  return {
    itens: [
      `Ate ${regra.refund_until_days} dias antes do check-in: reembolso de ${formatarPercentualPolitica(regra.refund_until_percentage)}.`,
      `Ate ${regra.late_until_days} dias antes do check-in: reembolso de ${formatarPercentualPolitica(regra.late_refund_percentage)}.`,
      `Dentro dos ultimos ${regra.no_refund_within_days} dia(s): sem reembolso automatico.`
    ],
    mensagemBloqueio: podeCancelar
      ? null
      : reserva.status === "cancelled"
        ? "Esta reserva ja foi cancelada."
        : "Para cancelamentos em hospedagem ou reserva encerrada, fale com o proprietário.",
    observacoes: regra.notes,
    percentualReembolsoEstimado: percentual,
    podeCancelar,
    valorReembolsoEstimado: Math.max(valorPago * percentual / 100, 0)
  };
}

function montarFinanceiroHospede(
  reserva: ReservaRow,
  complementos: Awaited<ReturnType<typeof carregarComplementosReservas>>
): FinanceiroReservaHospede {
  const cobrancas = complementos.cobrancasPorReserva.get(reserva.id) ?? [];
  const pagamentos = complementos.pagamentosPorReserva.get(reserva.id) ?? [];
  const valorOriginalPago = pagamentos
    .filter((pagamento) => pagamento.tipoReversao === null && ["confirmed", "refunded"].includes(pagamento.status))
    .reduce((total, pagamento) => total + pagamento.valor, 0);
  const valorEstornado = pagamentos
    .filter((pagamento) => pagamento.tipoReversao === "refund" && pagamento.status === "refunded")
    .reduce((total, pagamento) => total + pagamento.valor, 0);
  const valorPagoPagamentos = Math.max(valorOriginalPago - valorEstornado, 0);
  const valorPagoCobrancas = cobrancas.reduce(
    (total, cobranca) => total + cobranca.valorPago,
    0
  );
  const valorPago = pagamentos.length ? valorPagoPagamentos : valorPagoCobrancas;
  const valorTotal = Number(reserva.total_amount ?? 0);

  return {
    cobrancaAberta:
      cobrancas.find((cobranca) =>
        ["pending", "partial", "overdue"].includes(cobranca.status)
      ) ?? null,
    pagamentos,
    statusPagamento: reserva.payment_status,
    valorPago,
    valorPendente: Math.max(valorTotal - valorPago, 0),
    valorTotal
  };
}

function mapearHistorico(historico: Array<HistoricoRow & { reservation_id: string }>) {
  const mapa = new Map<string, HistoricoRow[]>();

  for (const item of historico) {
    const lista = mapa.get(item.reservation_id) ?? [];
    lista.push(item);
    mapa.set(item.reservation_id, lista);
  }

  return mapa;
}

function mapearEstadias(
  estadias: DetalhesEstadiaRow[],
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServer>>>
) {
  const mapa = new Map<string, ComplementoEstadia>();

  for (const estadia of estadias) {
    const propriedadeJson = objetoJson(estadia.property_details);
    const endereco = objetoJson(propriedadeJson.address ?? null);
    const estrutura = objetoJson(propriedadeJson.structureDetails ?? null);
    const valores = objetoJson(propriedadeJson.pricingDetails ?? null);
    const regras = objetoJson(estadia.house_rules);
    const proprietarioJson = objetoJson(estadia.owner_details);
    const imagemCapa =
      textoJson(propriedadeJson, "coverImageUrl") ??
      montarUrlPublicaStorage(
        supabase,
        textoJson(propriedadeJson, "coverImageStorageBucket"),
        textoJson(propriedadeJson, "coverImageStoragePath")
      );

    const propriedade: PropriedadeReservaHospede = {
      bairro: textoJson(endereco, "bairro"),
      camas: numeroJsonPrimeiro(estrutura, ["camas", "beds"]),
      banheiros: numeroJsonPrimeiro(estrutura, ["banheiros", "bathrooms"]),
      cidade: textoJson(endereco, "cidade"),
      diaria: numeroJsonPrimeiro(valores, ["valorDiaria", "dailyRate"]),
      enderecoLinha: montarEndereco(endereco),
      estado: textoJson(endereco, "estado"),
      garagem: numeroJsonPrimeiro(estrutura, ["garagemVagas", "garageSpaces"]),
      googleMapsLink: textoJson(endereco, "googleMapsLink"),
      id: textoJson(propriedadeJson, "id") ?? "",
      imagemCapa,
      nome: textoJson(propriedadeJson, "name") ?? "Casa reservada",
      quartos: numeroJsonPrimeiro(estrutura, ["quartos", "bedrooms"]),
      regras: montarRegrasCasa(regras),
      slug: textoJson(propriedadeJson, "slug") ?? ""
    };

    mapa.set(estadia.reservation_id, {
      checkInPadrao: formatarHorarioPadrao(textoJson(regras, "checkInTime"), "check-in"),
      checkOutPadrao: formatarHorarioPadrao(textoJson(regras, "checkOutTime"), "check-out"),
      comodidades: mapearComodidades(estadia.amenities),
      guiaRegiao: mapearGuiaRegiao(estadia.regional_guide),
      propriedade,
      proprietario: mapearProprietario(proprietarioJson),
      regrasCasa: propriedade.regras,
      taxaLimpeza: numeroJsonPrimeiro(valores, ["taxaLimpeza", "cleaningFee"])
    });
  }

  return mapa;
}

function montarTimeline(
  reserva: ReservaRow,
  historico: HistoricoRow[]
): TimelineReservaHospede[] {
  const itens: TimelineReservaHospede[] = [
    {
      data: reserva.created_at,
      descricao: "Solicitacao criada no Marketplace.",
      status: reserva.status
    }
  ];

  for (const item of historico) {
    itens.push({
      data: item.created_at,
      descricao: item.reason ?? "Status da reserva atualizado.",
      status: item.to_status
    });
  }

  return itens.sort((a, b) => a.data.localeCompare(b.data));
}

function montarUrlPublicaStorage(
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServer>>>,
  bucket: string | null,
  caminho: string | null
) {
  if (!bucket || !caminho) return null;

  return supabase.storage.from(bucket).getPublicUrl(caminho).data.publicUrl;
}

function mapearProprietario(
  proprietario: Record<string, JsonValue>
): ProprietarioReservaHospede | null {
  const nome = textoJson(proprietario, "name");
  const empreendimento = textoJson(proprietario, "businessName");

  if (!nome && !empreendimento) return null;

  return {
    avatarUrl: textoJson(proprietario, "avatarUrl"),
    cidade: textoJson(proprietario, "city"),
    empreendimento,
    estado: textoJson(proprietario, "state"),
    nome,
    telefone: textoJson(proprietario, "phone"),
    whatsapp: textoJson(proprietario, "whatsapp")
  };
}

function mapearComodidades(valor: JsonValue) {
  if (!Array.isArray(valor)) return [];

  return valor
    .map((item) => {
      const comodidade = objetoJson(item);
      return textoJson(comodidade, "name");
    })
    .filter((item): item is string => Boolean(item));
}

function mapearGuiaRegiao(valor: JsonValue): ReservaHospedeDetalhe["guiaRegiao"] {
  if (!Array.isArray(valor)) return [];

  return valor
    .map((item) => {
      const local = objetoJson(item);
      const nome = textoJson(local, "name");
      if (!nome) return null;

      return {
        categoria: textoJson(local, "category") ?? "Recomendacao",
        endereco: textoJson(local, "address"),
        nome,
        telefone: textoJson(local, "phone"),
        whatsapp: textoJson(local, "whatsapp")
      };
    })
    .filter((item): item is ReservaHospedeDetalhe["guiaRegiao"][number] =>
      Boolean(item)
    );
}

function montarRegrasCasa(regras: Record<string, JsonValue>) {
  const itens: string[] = [];
  const checkIn = textoJson(regras, "checkInTime");
  const checkOut = textoJson(regras, "checkOutTime");
  const maximoHospedes = numeroJson(regras, "maxGuests");
  const idadeMinima = numeroJson(regras, "minResponsibleAge");
  const minimoDiarias = numeroJson(regras, "minNights");
  const maximoDiarias = numeroJson(regras, "maxNights");
  const regrasAdicionais = textoJson(regras, "additionalRules");
  const instrucoesEspeciais = textoJson(regras, "specialInstructions");
  const cancelamento = textoJson(regras, "cancellationNotes");

  if (checkIn) itens.push(`Check-in padrao a partir de ${checkIn}.`);
  if (checkOut) itens.push(`Check-out padrao ate ${checkOut}.`);
  if (maximoHospedes) {
    itens.push(
      `Capacidade máxima de ${maximoHospedes} ${
        maximoHospedes === 1 ? "hóspede" : "hóspedes"
      }.`,
    );
  }
  if (idadeMinima) itens.push(`Responsavel com idade minima de ${idadeMinima} anos.`);
  if (minimoDiarias) {
    itens.push(
      `Estadia mínima de ${minimoDiarias} ${
        minimoDiarias === 1 ? "diária" : "diárias"
      }.`,
    );
  }
  if (maximoDiarias) {
    itens.push(
      `Estadia máxima de ${maximoDiarias} ${
        maximoDiarias === 1 ? "diária" : "diárias"
      }.`,
    );
  }
  itens.push(
    booleanoJson(regras, "allowPets") ? "Pets permitidos." : "Pets não permitidos.",
    booleanoJson(regras, "allowSmoking")
      ? "Fumantes permitidos nas areas autorizadas."
      : "Fumantes não permitidos.",
    booleanoJson(regras, "allowEvents")
      ? "Eventos permitidos mediante autorizacao."
      : "Festas e eventos não permitidos."
  );
  if (regrasAdicionais) itens.push(regrasAdicionais);
  if (instrucoesEspeciais) itens.push(instrucoesEspeciais);
  if (cancelamento) itens.push(cancelamento);

  return itens;
}

function formatarHorarioPadrao(horario: string | null, tipo: "check-in" | "check-out") {
  if (!horario) return null;
  return tipo === "check-in" ? `A partir das ${horario}` : `Ate ${horario}`;
}

function calcularDiasAntesCheckIn(checkIn: string) {
  const hojeSaoPaulo = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo"
  }).format(new Date());
  const hoje = new Date(`${hojeSaoPaulo}T00:00:00`);
  const entrada = new Date(`${checkIn}T00:00:00`);
  return Math.ceil((entrada.getTime() - hoje.getTime()) / 86_400_000);
}

function formatarPercentualPolitica(valor: number) {
  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function objetoJson(valor: JsonValue): Record<string, JsonValue> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  return valor as Record<string, JsonValue>;
}

function textoJson(objeto: Record<string, JsonValue>, chave: string) {
  const valor = objeto[chave];
  return typeof valor === "string" ? valor : null;
}

function numeroJson(objeto: Record<string, JsonValue>, chave: string) {
  const valor = objeto[chave];
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }
  return 0;
}

function numeroJsonPrimeiro(objeto: Record<string, JsonValue>, chaves: string[]) {
  for (const chave of chaves) {
    const numero = numeroJson(objeto, chave);
    if (numero) return numero;
  }

  return 0;
}

function booleanoJson(objeto: Record<string, JsonValue>, chave: string) {
  const valor = objeto[chave];
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "string") return valor === "true";
  return false;
}

function montarEndereco(endereco: Record<string, JsonValue>) {
  const partes = [
    textoJson(endereco, "linha1"),
    textoJson(endereco, "numero"),
    textoJson(endereco, "bairro")
  ].filter(Boolean);

  return partes.length ? partes.join(", ") : null;
}
