"use server";

import type {
  PropertyRow,
  ReservationGuestRow,
  ReservationRow,
  ReservationStatus,
  ReservationStatusHistoryRow
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import { sincronizarHospedeCrm } from "../guests/actions";
import {
  carregarEscopoReservas,
  carregarPropriedadeDaReserva,
  carregarReservaGerenciavel,
  ErroRegraReserva,
  type ClienteSupabaseServer,
  type EscopoReserva
} from "./permissions";
import { STATUS_RESERVA } from "./types";

/**
 * Server actions do módulo de Reservas.
 *
 * Regras de status, tenant e owner ficam no servidor porque reservas alteram
 * operação e receita futura. O cliente apenas envia intenção de mudança.
 */

const CAMINHO_RESERVAS = "/reservas";

const TRANSICOES_RESERVA: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["awaiting_payment", "confirmed", "cancelled"],
  awaiting_payment: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "completed", "cancelled"],
  checked_in: ["checked_out", "cancelled"],
  checked_out: ["completed"],
  completed: [],
  cancelled: []
};

type EntradaReserva = {
  propriedadeId: string;
  hospedeNome: string;
  hospedeEmail: string | null;
  hospedeTelefone: string | null;
  hospedeDocumento: string | null;
  checkIn: string;
  checkOut: string;
  quantidadeHospedes: number;
  valorBase: number;
  observacoes: string | null;
  observacoesHospede: string | null;
  observacoesInternas: string | null;
};

export async function criarReservaManualAction(formData: FormData) {
  const escopo = await carregarEscopoReservas();

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = await obterEntradaReserva(supabase, escopo, formData);
    const statusInicial: ReservationStatus = "pending";

    await validarDisponibilidadeCasa(supabase, escopo, entrada);

    const { data: reserva, error } = await supabase
      .from("reservations")
      .insert({
        tenant_id: escopo.tenantId,
        property_id: entrada.propriedadeId,
        owner_id: escopo.ownerId,
        code: gerarCodigoReserva(),
        status: statusInicial,
        source: "manual",
        check_in: entrada.checkIn,
        check_out: entrada.checkOut,
        guests_count: entrada.quantidadeHospedes,
        total_amount: entrada.valorBase,
        currency: "BRL",
        notes: entrada.observacoes,
        guest_notes: entrada.observacoesHospede,
        internal_notes: entrada.observacoesInternas,
        created_by: escopo.userId
      })
      .select("*")
      .single<{ id: string; status: ReservationStatus }>();

    if (error || !reserva) {
      throw new Error(error?.message ?? "Reserva não retornada após criação.");
    }

    await salvarHospedePrincipal(supabase, escopo, reserva.id, entrada);
    await salvarServicoExtraInicial(supabase, escopo, reserva.id, formData);
    await salvarObservacaoInicial(supabase, escopo, reserva.id, entrada);
    await registrarHistoricoStatus(supabase, escopo, reserva.id, null, statusInicial, "Reserva manual criada.");
    revalidarReservas();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao criar reserva.");
  }

  redirect(`${CAMINHO_RESERVAS}?sucesso=reserva-criada`);
}

export async function atualizarReservaAction(formData: FormData) {
  const escopo = await carregarEscopoReservas();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reservaId = textoObrigatorio(formData, "reservaId", "reserva");
    const reservaAtual = await carregarReservaGerenciavel(supabase, escopo, reservaId);
    const entrada = await obterEntradaReserva(supabase, escopo, formData);

    // Reservas canceladas e concluídas são terminais para preservar histórico financeiro futuro.
    if (["cancelled", "completed"].includes(reservaAtual.status)) {
      throw new ErroRegraReserva("Reserva encerrada não pode ser editada.");
    }

    await validarDisponibilidadeCasa(supabase, escopo, entrada, reservaId);

    const { error } = await supabase
      .from("reservations")
      .update({
        property_id: entrada.propriedadeId,
        check_in: entrada.checkIn,
        check_out: entrada.checkOut,
        guests_count: entrada.quantidadeHospedes,
        total_amount: entrada.valorBase,
        notes: entrada.observacoes,
        guest_notes: entrada.observacoesHospede,
        internal_notes: entrada.observacoesInternas
      })
      .eq("id", reservaId)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId);

    if (error) throw new Error(error.message);

    await salvarHospedePrincipal(supabase, escopo, reservaId, entrada);
    await registrarEventosAtualizacao(supabase, escopo, reservaAtual, entrada);
    revalidarReservas();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar reserva.");
  }

  redirect(`${CAMINHO_RESERVAS}?sucesso=reserva-atualizada`);
}

export async function alterarStatusReservaAction(formData: FormData) {
  const escopo = await carregarEscopoReservas();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reservaId = textoObrigatorio(formData, "reservaId", "reserva");
    const statusDestino = validarStatusReserva(textoObrigatorio(formData, "status", "status"));
    const motivo = textoOpcional(formData, "motivo");
    const reserva = await carregarReservaGerenciavel(supabase, escopo, reservaId);

    if (reserva.status !== statusDestino) {
      validarTransicaoReserva(reserva.status, statusDestino);
      await atualizarStatusReserva(
        supabase,
        escopo,
        reservaId,
        reserva.status,
        statusDestino,
        motivo
      );
    }

    revalidarReservas();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar status da reserva.");
  }

  redirect(`${CAMINHO_RESERVAS}?sucesso=status-reserva`);
}

export async function cancelarReservaAction(formData: FormData) {
  const escopo = await carregarEscopoReservas();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reservaId = textoObrigatorio(formData, "reservaId", "reserva");
    const motivo = textoOpcional(formData, "motivo") ?? "Reserva cancelada manualmente.";
    const reserva = await carregarReservaGerenciavel(supabase, escopo, reservaId);

    if (reserva.status !== "cancelled") {
      validarTransicaoReserva(reserva.status, "cancelled");
      await atualizarStatusReserva(supabase, escopo, reservaId, reserva.status, "cancelled", motivo);
    }

    revalidarReservas();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao cancelar reserva.");
  }

  redirect(`${CAMINHO_RESERVAS}?sucesso=reserva-cancelada`);
}

export async function adicionarServicoExtraReservaAction(formData: FormData) {
  const escopo = await carregarEscopoReservas();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reservaId = textoObrigatorio(formData, "reservaId", "reserva");
    await carregarReservaGerenciavel(supabase, escopo, reservaId);
    await inserirServicoExtra(supabase, escopo, reservaId, formData);
    revalidarReservas();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao adicionar serviço extra.");
  }

  redirect(`${CAMINHO_RESERVAS}?sucesso=servico-extra`);
}

export async function adicionarObservacaoReservaAction(formData: FormData) {
  const escopo = await carregarEscopoReservas();

  try {
    const supabase = await criarClienteSupabaseServer();
    const reservaId = textoObrigatorio(formData, "reservaId", "reserva");
    const conteudo = textoObrigatorio(formData, "observacao", "observação");
    await carregarReservaGerenciavel(supabase, escopo, reservaId);

    const { error } = await supabase.from("reservation_notes").insert({
      tenant_id: escopo.tenantId,
      reservation_id: reservaId,
      note_type: "internal",
      content: conteudo,
      created_by: escopo.userId
    });

    if (error) throw new Error(error.message);
    revalidarReservas();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao adicionar observação.");
  }

  redirect(`${CAMINHO_RESERVAS}?sucesso=observacao-adicionada`);
}

async function obterEntradaReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  formData: FormData
): Promise<EntradaReserva> {
  const propriedadeId = textoObrigatorio(formData, "propriedadeId", "propriedade");
  const checkIn = dataObrigatoria(formData, "checkIn", "check-in");
  const checkOut = dataObrigatoria(formData, "checkOut", "check-out");
  const quantidadeHospedes = numeroInteiro(
    formData,
    "quantidadeHospedes",
    "hóspedes",
    1
  );
  const propriedade = await carregarPropriedadeDaReserva(
    supabase,
    escopo,
    propriedadeId
  );

  if (quantidadeHospedes > obterCapacidadeCasa(propriedade)) {
    throw new ErroRegraReserva("A quantidade de hóspedes excede a capacidade da casa.");
  }

  if (new Date(`${checkOut}T00:00:00`) <= new Date(`${checkIn}T00:00:00`)) {
    throw new ErroRegraReserva("Check-out deve ser posterior ao check-in.");
  }

  return {
    propriedadeId,
    hospedeNome: textoObrigatorio(formData, "hospedeNome", "nome do hóspede"),
    hospedeEmail: textoOpcional(formData, "hospedeEmail"),
    hospedeTelefone: textoOpcional(formData, "hospedeTelefone"),
    hospedeDocumento: textoOpcional(formData, "hospedeDocumento"),
    checkIn,
    checkOut,
    quantidadeHospedes,
    valorBase: numeroMoeda(formData, "valorBase", "valor da reserva"),
    observacoes: textoOpcional(formData, "observacoes"),
    observacoesHospede: textoOpcional(formData, "observacoesHospede"),
    observacoesInternas: textoOpcional(formData, "observacoesInternas")
  };
}

async function validarDisponibilidadeCasa(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  entrada: EntradaReserva,
  reservaIgnoradaId?: string
) {
  await validarBloqueioManualCalendario(supabase, escopo, entrada);

  // A casa e o recurso reservavel da V2. Sobreposicoes sao bloqueadas por
  // propriedade para impedir duas estadias no mesmo periodo.
  let consulta = supabase
    .from("reservations")
    .select("id, code")
    .eq("tenant_id", escopo.tenantId)
    .eq("property_id", entrada.propriedadeId)
    .neq("status", "cancelled")
    .lt("check_in", entrada.checkOut)
    .gt("check_out", entrada.checkIn)
    .limit(1);

  if (reservaIgnoradaId) {
    consulta = consulta.neq("id", reservaIgnoradaId);
  }

  const { data, error } = await consulta.returns<Array<{ id: string; code: string }>>();

  if (error) throw new Error(error.message);

  const conflito = data?.[0];
  if (conflito) {
    throw new ErroRegraReserva(
      `A casa ja possui reserva no periodo selecionado (${conflito.code}).`
    );
  }
}

async function validarBloqueioManualCalendario(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  entrada: EntradaReserva
) {
  const { data, error } = await supabase
    .from("calendar_availability_blocks")
    .select("id, reason")
    .eq("tenant_id", escopo.tenantId)
    .eq("property_id", entrada.propriedadeId)
    .neq("source", "reservation")
    .in("status", ["blocked", "unavailable"])
    .lt("starts_on", entrada.checkOut)
    .gt("ends_on", entrada.checkIn)
    .limit(1)
    .returns<Array<{ id: string; reason: string | null }>>();

  if (error) throw new Error(error.message);

  const bloqueio = data?.[0];
  if (bloqueio) {
    throw new ErroRegraReserva(
      `A casa esta bloqueada no periodo selecionado${bloqueio.reason ? `: ${bloqueio.reason}` : "."}`
    );
  }
}

async function registrarEventosAtualizacao(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaAtual: ReservationRow,
  entrada: EntradaReserva
) {
  const eventos: string[] = [];

  if (reservaAtual.check_in !== entrada.checkIn || reservaAtual.check_out !== entrada.checkOut) {
    eventos.push(
      `Datas alteradas de ${reservaAtual.check_in} - ${reservaAtual.check_out} para ${entrada.checkIn} - ${entrada.checkOut}.`
    );
  }

  if (Number(reservaAtual.total_amount) !== entrada.valorBase) {
    eventos.push(
      `Valor alterado de ${formatarMoeda(Number(reservaAtual.total_amount))} para ${formatarMoeda(entrada.valorBase)}.`
    );
  }

  if (eventos.length === 0) return;

  // Eventos de sistema deixam a timeline auditavel sem misturar regras de
  // pagamento, check-in ou atendimento que ainda serao implementadas.
  const { error } = await supabase.from("reservation_notes").insert(
    eventos.map((content) => ({
      tenant_id: escopo.tenantId,
      reservation_id: reservaAtual.id,
      note_type: "system" as const,
      content,
      created_by: escopo.userId
    }))
  );

  if (error) throw new Error(error.message);
}

async function salvarHospedePrincipal(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaId: string,
  entrada: EntradaReserva
) {
  const { data: hospedeAtual, error: erroBusca } = await supabase
    .from("reservation_guests")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .eq("reservation_id", reservaId)
    .eq("is_primary", true)
    .maybeSingle<ReservationGuestRow>();

  if (erroBusca) throw new Error(erroBusca.message);

  const dadosHospede = {
    tenant_id: escopo.tenantId,
    reservation_id: reservaId,
    full_name: entrada.hospedeNome,
    email: entrada.hospedeEmail,
    phone: entrada.hospedeTelefone,
    document_number: entrada.hospedeDocumento,
    is_primary: true
  };

  const resultado = hospedeAtual
    ? await supabase
        .from("reservation_guests")
        .update(dadosHospede)
        .eq("id", hospedeAtual.id)
        .eq("tenant_id", escopo.tenantId)
    : await supabase.from("reservation_guests").insert(dadosHospede);

  if (resultado.error) throw new Error(resultado.error.message);
  await sincronizarHospedeCrm(supabase, escopo, dadosHospede);
}

async function salvarServicoExtraInicial(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaId: string,
  formData: FormData
) {
  if (!textoOpcional(formData, "servicoExtraNome")) return;
  await inserirServicoExtra(supabase, escopo, reservaId, formData);
}

async function inserirServicoExtra(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaId: string,
  formData: FormData
) {
  const nome = textoObrigatorio(formData, "servicoExtraNome", "serviço extra");
  const quantidade = numeroInteiro(formData, "servicoExtraQuantidade", "quantidade", 1);
  const valorUnitario = numeroMoeda(formData, "servicoExtraValor", "valor do serviço");
  const total = quantidade * valorUnitario;

  const { error } = await supabase.from("reservation_extra_services").insert({
    tenant_id: escopo.tenantId,
    reservation_id: reservaId,
    name: nome,
    description: textoOpcional(formData, "servicoExtraDescricao"),
    quantity: quantidade,
    unit_price: valorUnitario,
    total_amount: total,
    currency: "BRL",
    status: "active",
    created_by: escopo.userId
  });

  if (error) throw new Error(error.message);
}

async function salvarObservacaoInicial(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaId: string,
  entrada: EntradaReserva
) {
  const observacoes: Array<{
    tenant_id: string;
    reservation_id: string;
    note_type: "internal" | "guest";
    content: string;
    created_by: string;
  }> = [
    entrada.observacoesInternas
      ? {
          tenant_id: escopo.tenantId,
          reservation_id: reservaId,
          note_type: "internal" as const,
          content: entrada.observacoesInternas,
          created_by: escopo.userId
        }
      : null,
    entrada.observacoesHospede
      ? {
          tenant_id: escopo.tenantId,
          reservation_id: reservaId,
          note_type: "guest" as const,
          content: entrada.observacoesHospede,
          created_by: escopo.userId
        }
      : null
  ].filter((observacao): observacao is NonNullable<typeof observacao> => Boolean(observacao));

  if (observacoes.length === 0) return;
  const { error } = await supabase.from("reservation_notes").insert(observacoes);
  if (error) throw new Error(error.message);
}

async function atualizarStatusReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaId: string,
  statusAtual: ReservationStatus,
  statusDestino: ReservationStatus,
  motivo: string | null
) {
  const dados: Record<string, string | null> = { status: statusDestino };

  if (statusDestino === "checked_in") dados.checked_in_at = new Date().toISOString();
  if (statusDestino === "checked_out") dados.checked_out_at = new Date().toISOString();
  if (statusDestino === "cancelled") {
    dados.cancelled_at = new Date().toISOString();
    dados.cancelled_by = escopo.userId;
    dados.cancellation_reason = motivo;
  }

  const { error } = await supabase
    .from("reservations")
    .update(dados)
    .eq("id", reservaId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId);

  if (error) throw new Error(error.message);
  await registrarHistoricoStatus(supabase, escopo, reservaId, statusAtual, statusDestino, motivo);
}

async function registrarHistoricoStatus(
  supabase: ClienteSupabaseServer,
  escopo: EscopoReserva,
  reservaId: string,
  statusAnterior: ReservationStatus | null,
  statusDestino: ReservationStatus,
  motivo: string | null
) {
  const { error } = await supabase.from("reservation_status_history").insert({
    tenant_id: escopo.tenantId,
    reservation_id: reservaId,
    from_status: statusAnterior,
    to_status: statusDestino,
    changed_by: escopo.userId,
    reason: motivo,
    metadata: {}
  } satisfies Partial<ReservationStatusHistoryRow>);

  if (error) throw new Error(error.message);
}

function validarTransicaoReserva(
  statusAtual: ReservationStatus,
  statusDestino: ReservationStatus
) {
  const permitidos = TRANSICOES_RESERVA[statusAtual];

  // Status terminal evita reabrir reservas já canceladas/concluídas sem trilha formal futura.
  if (!permitidos.includes(statusDestino)) {
    throw new ErroRegraReserva("Transição de status inválida para esta reserva.");
  }
}

function validarStatusReserva(valor: string): ReservationStatus {
  if (STATUS_RESERVA.includes(valor as ReservationStatus)) return valor as ReservationStatus;
  throw new ErroRegraReserva("Status de reserva inválido.");
}

function dataObrigatoria(formData: FormData, chave: string, label: string): string {
  const valor = textoObrigatorio(formData, chave, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroRegraReserva(`Informe ${label} válido.`);
  }
  return valor;
}

function obterCapacidadeCasa(propriedade: PropertyRow) {
  const estrutura = propriedade.structure_details;

  if (!estrutura || typeof estrutura !== "object" || Array.isArray(estrutura)) {
    return 1;
  }

  const capacidade = estrutura.hospedesMaximos;
  return typeof capacidade === "number" && capacidade > 0 ? capacidade : 1;
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraReserva(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function numeroInteiro(
  formData: FormData,
  chave: string,
  label: string,
  minimo: number
): number {
  const valor = Number.parseInt(textoObrigatorio(formData, chave, label), 10);
  if (Number.isNaN(valor) || valor < minimo) {
    throw new ErroRegraReserva(`Informe ${label} válido.`);
  }
  return valor;
}

function numeroMoeda(formData: FormData, chave: string, label: string): number {
  const valor = Number.parseFloat(textoObrigatorio(formData, chave, label).replace(",", "."));
  if (Number.isNaN(valor) || valor < 0) {
    throw new ErroRegraReserva(`Informe ${label} válido.`);
  }
  return valor;
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(valor);
}

function gerarCodigoReserva(): string {
  const data = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const sufixo = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `RES-${data}-${sufixo}`;
}

function redirecionarComErro(erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroRegraReserva
      ? erro.message
      : "Não foi possível concluir a operação.";

  if (!(erro instanceof ErroRegraReserva)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${CAMINHO_RESERVAS}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarReservas() {
  revalidatePath(CAMINHO_RESERVAS);
}
