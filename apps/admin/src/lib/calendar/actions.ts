"use server";

import type {
  CalendarAvailabilityBlockRow,
  CalendarAvailabilityStatus,
  ReservationRow
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import {
  carregarBloqueioGerenciavel,
  carregarEscopoCalendario,
  carregarPropriedadeDoCalendario,
  ErroRegraCalendario,
  type ClienteSupabaseServer,
  type EscopoCalendario
} from "./permissions";
import {
  LABEL_MOTIVO_BLOQUEIO,
  MOTIVOS_BLOQUEIO_CALENDARIO,
  type MotivoBloqueioCalendario
} from "./types";

/**
 * Server actions do calendario.
 *
 * A regra de conflito vive tambem no banco. A action valida escopo e entrada
 * para devolver mensagens melhores antes de delegar a protecao final ao trigger.
 */

const CAMINHO_CALENDARIO = "/calendario";

type EntradaBloqueio = {
  bloqueiaDisponibilidade: boolean;
  blocoTipo: CalendarAvailabilityBlockRow["block_type"];
  propriedadeId: string;
  inicio: string;
  fim: string;
  status: CalendarAvailabilityStatus;
  motivoCodigo: MotivoBloqueioCalendario;
  motivo: string;
  observacoes: string | null;
};

export async function bloquearPeriodoCalendarioAction(formData: FormData) {
  const escopo = await carregarEscopoCalendario();
  const retorno = montarRetornoCalendario(formData);

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = await obterEntradaBloqueio(supabase, escopo, formData);

    const { error } = await supabase.from("calendar_availability_blocks").insert({
      tenant_id: escopo.tenantId,
      owner_id: escopo.ownerId,
      property_id: entrada.propriedadeId,
      source: "manual",
      status: entrada.status,
      block_type: entrada.blocoTipo,
      blocks_availability: entrada.bloqueiaDisponibilidade,
      starts_on: entrada.inicio,
      ends_on: entrada.fim,
      reason: entrada.motivo,
      notes: entrada.observacoes,
      metadata: {
        motivoCodigo: entrada.motivoCodigo,
        preparadoParaIcs: true,
        preparadoParaTarifario: true
      },
      created_by: escopo.userId
    });

    if (error) throw new Error(error.message);
    revalidarCalendario();
  } catch (erro) {
    redirecionarComErro(retorno, erro, "Erro ao bloquear periodo.");
  }

  redirect(`${retorno}&sucesso=bloqueio-criado`);
}

export async function liberarPeriodoCalendarioAction(formData: FormData) {
  const escopo = await carregarEscopoCalendario();
  const retorno = montarRetornoCalendario(formData);

  try {
    const supabase = await criarClienteSupabaseServer();
    const bloqueioId = textoObrigatorio(formData, "bloqueioId", "bloqueio");
    const bloqueio = await carregarBloqueioGerenciavel(supabase, escopo, bloqueioId);

    if (bloqueio.status === "released") {
      throw new ErroRegraCalendario("Este periodo ja esta liberado.");
    }

    const { error } = await supabase
      .from("calendar_availability_blocks")
      .update({
        status: "released",
        notes: textoOpcional(formData, "observacoes") ?? bloqueio.notes
      })
      .eq("id", bloqueio.id)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId)
      .neq("source", "reservation");

    if (error) throw new Error(error.message);
    revalidarCalendario();
  } catch (erro) {
    redirecionarComErro(retorno, erro, "Erro ao liberar periodo.");
  }

  redirect(`${retorno}&sucesso=periodo-liberado`);
}

export async function editarBloqueioCalendarioAction(formData: FormData) {
  const escopo = await carregarEscopoCalendario();
  const retorno = montarRetornoCalendario(formData);

  try {
    const supabase = await criarClienteSupabaseServer();
    const bloqueioId = textoObrigatorio(formData, "bloqueioId", "bloqueio");
    const bloqueio = await carregarBloqueioGerenciavel(supabase, escopo, bloqueioId);
    const entrada = await obterEntradaBloqueio(supabase, escopo, formData);

    if (bloqueio.status === "released") {
      throw new ErroRegraCalendario("Este periodo ja esta liberado.");
    }

    const { error } = await supabase
      .from("calendar_availability_blocks")
      .update({
        block_type: entrada.blocoTipo,
        blocks_availability: entrada.bloqueiaDisponibilidade,
        ends_on: entrada.fim,
        metadata: {
          motivoCodigo: entrada.motivoCodigo,
          preparadoParaIcs: true,
          preparadoParaTarifario: true
        },
        notes: entrada.observacoes,
        property_id: entrada.propriedadeId,
        reason: entrada.motivo,
        starts_on: entrada.inicio,
        status: entrada.status
      })
      .eq("id", bloqueio.id)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId)
      .neq("source", "reservation");

    if (error) throw new Error(error.message);
    revalidarCalendario();
  } catch (erro) {
    redirecionarComErro(retorno, erro, "Erro ao editar bloqueio do calendario.");
  }

  redirect(`${retorno}&sucesso=bloqueio-atualizado`);
}

export async function editarReservaCalendarioAction(formData: FormData) {
  const escopo = await carregarEscopoCalendario();
  const retorno = montarRetornoCalendario(formData);

  try {
    exigirConfirmacaoImpactoReserva(formData);
    const supabase = await criarClienteSupabaseServer();
    const reservaId = textoObrigatorio(formData, "reservaId", "reserva");
    const reserva = await carregarReservaCalendario(supabase, escopo, reservaId);
    const entrada = obterEntradaReservaCalendario(formData, reserva.property_id);

    if (["cancelled", "completed"].includes(reserva.status)) {
      throw new ErroRegraCalendario("Reserva encerrada nao pode ser editada pelo calendario.");
    }

    await validarDisponibilidadeReservaCalendario(supabase, escopo, entrada, reserva.id);

    const { data: reservaAtualizada, error } = await supabase
      .from("reservations")
      .update({
        check_in: entrada.checkIn,
        check_out: entrada.checkOut,
        property_id: entrada.propriedadeId,
        total_amount: entrada.valorTotal
      })
      .eq("id", reserva.id)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId)
      .select("*")
      .single<ReservationRow>();

    if (error || !reservaAtualizada) {
      throw new Error(error?.message ?? "Reserva nao retornada apos atualizacao.");
    }

    await atualizarLancamentoFinanceiroDaReserva(
      supabase,
      escopo,
      reservaAtualizada,
      entrada.valorTotal
    );
    await registrarNotaReservaCalendario(
      supabase,
      escopo,
      reserva.id,
      montarNotaEdicaoReserva(reserva, reservaAtualizada, entrada.observacoes)
    );
    revalidarCalendario();
  } catch (erro) {
    redirecionarComErro(retorno, erro, "Erro ao editar reserva pelo calendario.");
  }

  redirect(`${retorno}&sucesso=reserva-calendario-atualizada`);
}

export async function cancelarReservaCalendarioAction(formData: FormData) {
  const escopo = await carregarEscopoCalendario();
  const retorno = montarRetornoCalendario(formData);

  try {
    exigirConfirmacaoImpactoReserva(formData);
    const supabase = await criarClienteSupabaseServer();
    const reservaId = textoObrigatorio(formData, "reservaId", "reserva");
    const motivo =
      textoOpcional(formData, "motivoCancelamento") ??
      "Reserva cancelada pelo calendario.";
    const reserva = await carregarReservaCalendario(supabase, escopo, reservaId);

    if (["cancelled", "completed"].includes(reserva.status)) {
      throw new ErroRegraCalendario("Reserva encerrada nao pode ser cancelada pelo calendario.");
    }

    await cancelarReservaCalendarioAtomica(supabase, escopo, reserva, motivo);
    revalidarCalendario();
  } catch (erro) {
    redirecionarComErro(retorno, erro, "Erro ao cancelar reserva pelo calendario.");
  }

  redirect(`${retorno}&sucesso=reserva-calendario-cancelada`);
}

async function obterEntradaBloqueio(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCalendario,
  formData: FormData
): Promise<EntradaBloqueio> {
  const propriedadeId = textoObrigatorio(formData, "propriedadeId", "propriedade");
  const inicio = dataObrigatoria(formData, "inicio", "data inicial");
  const fim = dataObrigatoria(formData, "fim", "data final");
  const motivoCodigo = validarMotivoBloqueio(
    textoObrigatorio(formData, "motivoTipo", "motivo")
  );
  const motivoDetalhe = textoOpcional(formData, "motivoDetalhe");

  await carregarPropriedadeDoCalendario(supabase, escopo, propriedadeId);

  // Bloqueios operacionais sao inclusivos: inicio 15/07 e fim 17/07
  // bloqueiam os dias 15, 16 e 17. Reservas continuam usando checkout exclusivo.
  if (new Date(`${fim}T00:00:00`) < new Date(`${inicio}T00:00:00`)) {
    throw new ErroRegraCalendario("Data final nao pode ser anterior a data inicial.");
  }

  return {
    bloqueiaDisponibilidade:
      motivoCodigo !== "maintenance" || checkboxAtivo(formData, "bloqueiaDisponibilidade"),
    blocoTipo: obterTipoBloco(motivoCodigo),
    propriedadeId,
    inicio,
    fim,
    status: obterStatusBloco(motivoCodigo),
    motivoCodigo,
    motivo: montarMotivoBloqueio(motivoCodigo, motivoDetalhe),
    observacoes: textoOpcional(formData, "observacoes")
  };
}

function obterTipoBloco(
  motivo: MotivoBloqueioCalendario
): CalendarAvailabilityBlockRow["block_type"] {
  if (motivo === "maintenance") return "maintenance";
  if (motivo === "interdicted") return "interdicted";
  if (motivo === "cleaning") return "cleaning";
  if (motivo === "unavailable") return "temporary_unavailable";
  return "manual";
}

function obterStatusBloco(
  motivo: MotivoBloqueioCalendario
): CalendarAvailabilityStatus {
  if (motivo === "maintenance") return "maintenance";
  if (motivo === "interdicted") return "interdicted";
  if (motivo === "cleaning") return "cleaning";
  if (motivo === "unavailable") return "unavailable";
  return "blocked";
}

function validarMotivoBloqueio(valor: string): MotivoBloqueioCalendario {
  if (MOTIVOS_BLOQUEIO_CALENDARIO.includes(valor as MotivoBloqueioCalendario)) {
    return valor as MotivoBloqueioCalendario;
  }

  throw new ErroRegraCalendario("Motivo de bloqueio invalido.");
}

function montarMotivoBloqueio(
  motivoCodigo: MotivoBloqueioCalendario,
  detalhe: string | null
) {
  const label = LABEL_MOTIVO_BLOQUEIO[motivoCodigo];

  // Guardamos um texto humano e um codigo em metadata para permitir filtros
  // futuros sem quebrar os bloqueios ja criados.
  if (!detalhe) return label;
  return `${label}: ${detalhe}`;
}

function dataObrigatoria(formData: FormData, chave: string, label: string): string {
  const valor = textoObrigatorio(formData, chave, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroRegraCalendario(`Informe ${label} valida.`);
  }
  return valor;
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraCalendario(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function checkboxAtivo(formData: FormData, chave: string): boolean {
  return formData.get(chave) === "on";
}

type EntradaReservaCalendario = {
  checkIn: string;
  checkOut: string;
  observacoes: string | null;
  propriedadeId: string;
  valorTotal: number;
};

async function carregarReservaCalendario(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCalendario,
  reservaId: string
) {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", reservaId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .maybeSingle<ReservationRow>();

  if (error || !data) {
    throw new ErroRegraCalendario("Reserva nao encontrada para este tenant.");
  }

  return data;
}

function obterEntradaReservaCalendario(
  formData: FormData,
  propriedadePadraoId: string
): EntradaReservaCalendario {
  const checkIn = dataObrigatoria(formData, "checkIn", "check-in");
  const checkOut = dataObrigatoria(formData, "checkOut", "check-out");

  if (new Date(`${checkOut}T00:00:00`) <= new Date(`${checkIn}T00:00:00`)) {
    throw new ErroRegraCalendario("Check-out deve ser posterior ao check-in.");
  }

  return {
    checkIn,
    checkOut,
    observacoes: textoOpcional(formData, "observacoesImpacto"),
    propriedadeId: textoOpcional(formData, "propriedadeId") ?? propriedadePadraoId,
    valorTotal: numeroMoeda(formData, "valorTotal", "valor total da reserva")
  };
}

async function validarDisponibilidadeReservaCalendario(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCalendario,
  entrada: EntradaReservaCalendario,
  reservaIgnoradaId: string
) {
  await carregarPropriedadeDoCalendario(supabase, escopo, entrada.propriedadeId);

  const [reservasResultado, bloqueiosResultado] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, code")
      .eq("tenant_id", escopo.tenantId)
      .eq("property_id", entrada.propriedadeId)
      .neq("id", reservaIgnoradaId)
      .neq("status", "cancelled")
      .lt("check_in", entrada.checkOut)
      .gt("check_out", entrada.checkIn)
      .limit(1)
      .returns<Array<{ code: string; id: string }>>(),
    supabase
      .from("calendar_availability_blocks")
      .select("id, reason")
      .eq("tenant_id", escopo.tenantId)
      .eq("property_id", entrada.propriedadeId)
      .neq("source", "reservation")
      .in("status", ["blocked", "interdicted", "maintenance", "cleaning", "unavailable", "reserved"])
      .lt("starts_on", entrada.checkOut)
      .gte("ends_on", entrada.checkIn)
      .limit(1)
      .returns<Array<{ id: string; reason: string | null }>>()
  ]);

  if (reservasResultado.error) throw new Error(reservasResultado.error.message);
  if (bloqueiosResultado.error) throw new Error(bloqueiosResultado.error.message);

  const reservaConflitante = reservasResultado.data?.[0];
  if (reservaConflitante) {
    throw new ErroRegraCalendario(
      `A casa ja possui reserva no periodo selecionado (${reservaConflitante.code}).`
    );
  }

  const bloqueioConflitante = bloqueiosResultado.data?.[0];
  if (bloqueioConflitante) {
    throw new ErroRegraCalendario(
      `A casa esta indisponivel no periodo selecionado${
        bloqueioConflitante.reason ? `: ${bloqueioConflitante.reason}` : "."
      }`
    );
  }
}

async function atualizarLancamentoFinanceiroDaReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCalendario,
  reserva: ReservationRow,
  valorTotal: number
) {
  const { error } = await supabase
    .from("transactions")
    .update({
      amount: valorTotal,
      due_date: reserva.check_in,
      property_id: reserva.property_id
    })
    .eq("tenant_id", escopo.tenantId)
    .eq("reservation_id", reserva.id)
    .eq("transaction_type", "income");

  if (error) throw new Error(error.message);
}

async function cancelarReservaCalendarioAtomica(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCalendario,
  reserva: ReservationRow,
  motivo: string
) {
  /*
    Cancelar pelo calendario tem o mesmo impacto de cancelar em Confirmacoes:
    libera periodo, atualiza pagamento e preserva financeiro em uma transacao.
  */
  const { error } = await supabase.rpc("cancel_reservation_operational", {
    p_owner_id: escopo.ownerId,
    p_reason: motivo,
    p_reservation_id: reserva.id,
    p_tenant_id: escopo.tenantId,
    p_user_id: escopo.userId
  });

  if (error) {
    throw new ErroRegraCalendario(traduzirErroCancelamentoAtomico(error.message));
  }
}

async function registrarNotaReservaCalendario(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCalendario,
  reservaId: string,
  conteudo: string
) {
  const { error } = await supabase.from("reservation_notes").insert({
    content: conteudo,
    created_by: escopo.userId,
    note_type: "system",
    reservation_id: reservaId,
    tenant_id: escopo.tenantId
  });

  if (error) throw new Error(error.message);
}

function montarNotaEdicaoReserva(
  anterior: ReservationRow,
  atualizada: ReservationRow,
  observacoes: string | null
) {
  const partes = [
    `Reserva editada pelo calendario: ${anterior.check_in} - ${anterior.check_out} para ${atualizada.check_in} - ${atualizada.check_out}.`,
    `Valor alterado de ${formatarMoeda(Number(anterior.total_amount))} para ${formatarMoeda(Number(atualizada.total_amount))}.`
  ];

  if (observacoes) partes.push(`Observacao: ${observacoes}`);
  return partes.join(" ");
}

function exigirConfirmacaoImpactoReserva(formData: FormData) {
  if (!checkboxAtivo(formData, "confirmarImpactoReserva")) {
    throw new ErroRegraCalendario(
      "Confirme que esta alteracao impacta a reserva, o calendario e o valor."
    );
  }
}

function numeroMoeda(formData: FormData, chave: string, label: string): number {
  const valor = Number.parseFloat(textoObrigatorio(formData, chave, label).replace(",", "."));
  if (!Number.isFinite(valor) || valor < 0) {
    throw new ErroRegraCalendario(`Informe ${label} valido.`);
  }
  return valor;
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(valor);
}

function montarRetornoCalendario(formData: FormData) {
  const params = new URLSearchParams();
  const mes = textoOpcional(formData, "mes");
  const semana = textoOpcional(formData, "semana");
  const visao = textoOpcional(formData, "visao");
  const propriedadeId = textoOpcional(formData, "filtroPropriedadeId");

  if (mes) params.set("mes", mes);
  if (semana) params.set("semana", semana);
  if (visao) params.set("visao", visao);
  if (propriedadeId) params.set("propriedadeId", propriedadeId);
  const query = params.toString();
  return query ? `${CAMINHO_CALENDARIO}?${query}` : `${CAMINHO_CALENDARIO}?`;
}

function redirecionarComErro(retorno: string, erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroRegraCalendario
      ? erro.message
      : "Nao foi possivel concluir a operacao.";

  if (!(erro instanceof ErroRegraCalendario)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${retorno}&erro=${encodeURIComponent(mensagem)}`);
}

function traduzirErroCancelamentoAtomico(mensagemBanco: string) {
  const mensagem = mensagemBanco.toLocaleLowerCase("pt-BR");

  if (mensagem.includes("calendario")) {
    return "Nao foi possivel liberar o periodo no calendario.";
  }

  if (mensagem.includes("financeiro")) {
    return "Voce nao tem permissao para cancelar reserva com pagamento recebido.";
  }

  if (mensagem.includes("permissao") || mensagem.includes("permission")) {
    return "Voce nao tem permissao para cancelar esta reserva.";
  }

  if (mensagem.includes("nao encontrada")) {
    return "Reserva nao encontrada.";
  }

  if (mensagem.includes("cancelada")) {
    return "Esta reserva ja foi cancelada.";
  }

  return "Nao foi possivel cancelar a reserva.";
}

function revalidarCalendario() {
  revalidatePath(CAMINHO_CALENDARIO);
  revalidatePath("/reservas");
  revalidatePath("/confirmacoes");
  revalidatePath("/financeiro");
}
