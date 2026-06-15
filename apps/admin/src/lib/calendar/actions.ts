"use server";

import type { CalendarAvailabilityStatus } from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import {
  carregarBloqueioGerenciavel,
  carregarEscopoCalendario,
  carregarPropriedadeDoCalendario,
  carregarUnidadeDoCalendario,
  ErroRegraCalendario,
  type ClienteSupabaseServer,
  type EscopoCalendario
} from "./permissions";
import { STATUS_BLOQUEIO_CALENDARIO } from "./types";

/**
 * Server actions do calendario.
 *
 * A regra de conflito vive tambem no banco. A action valida escopo e entrada
 * para devolver mensagens melhores antes de delegar a protecao final ao trigger.
 */

const CAMINHO_CALENDARIO = "/calendario";

type EntradaBloqueio = {
  propriedadeId: string;
  unidadeId: string;
  inicio: string;
  fim: string;
  status: CalendarAvailabilityStatus;
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
      unit_id: entrada.unidadeId,
      source: "manual",
      status: entrada.status,
      starts_on: entrada.inicio,
      ends_on: entrada.fim,
      reason: entrada.motivo,
      notes: entrada.observacoes,
      metadata: {
        preparadoParaIcs: true
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

async function obterEntradaBloqueio(
  supabase: ClienteSupabaseServer,
  escopo: EscopoCalendario,
  formData: FormData
): Promise<EntradaBloqueio> {
  const propriedadeId = textoObrigatorio(formData, "propriedadeId", "propriedade");
  const unidadeId = textoObrigatorio(formData, "unidadeId", "unidade");
  const inicio = dataObrigatoria(formData, "inicio", "data inicial");
  const fim = dataObrigatoria(formData, "fim", "data final");
  const status = validarStatusBloqueio(textoObrigatorio(formData, "status", "status"));

  await carregarPropriedadeDoCalendario(supabase, escopo, propriedadeId);
  await carregarUnidadeDoCalendario(supabase, escopo, unidadeId, propriedadeId);

  // O calendario usa intervalo [inicio, fim), igual ao modelo de check-in/check-out.
  if (new Date(`${fim}T00:00:00`) <= new Date(`${inicio}T00:00:00`)) {
    throw new ErroRegraCalendario("Data final deve ser posterior a data inicial.");
  }

  return {
    propriedadeId,
    unidadeId,
    inicio,
    fim,
    status,
    motivo: textoObrigatorio(formData, "motivo", "motivo"),
    observacoes: textoOpcional(formData, "observacoes")
  };
}

function validarStatusBloqueio(valor: string): CalendarAvailabilityStatus {
  if (STATUS_BLOQUEIO_CALENDARIO.includes(valor as CalendarAvailabilityStatus)) {
    return valor as CalendarAvailabilityStatus;
  }

  throw new ErroRegraCalendario("Status de disponibilidade invalido.");
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

function montarRetornoCalendario(formData: FormData) {
  const params = new URLSearchParams();
  const mes = textoOpcional(formData, "mes");
  const propriedadeId = textoOpcional(formData, "filtroPropriedadeId");
  const unidadeId = textoOpcional(formData, "filtroUnidadeId");

  if (mes) params.set("mes", mes);
  if (propriedadeId) params.set("propriedadeId", propriedadeId);
  if (unidadeId) params.set("unidadeId", unidadeId);

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

function revalidarCalendario() {
  revalidatePath(CAMINHO_CALENDARIO);
  revalidatePath("/reservas");
}
