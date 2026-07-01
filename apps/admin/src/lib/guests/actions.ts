"use server";

import type { CrmGuestRating, CrmGuestRow, ReservationGuestRow, ReservationRow } from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import {
  carregarEscopoHospede,
  carregarHospedeGerenciavel,
  ErroRegraHospede,
  type ClienteSupabaseServer,
  type EscopoHospede
} from "./permissions";
import {
  avaliarRemocaoHospedeCrm,
  hospedeReservaCorrespondeAoCrmGuest
} from "./removal-rules";
import { AVALIACOES_HOSPEDE_CRM, type EntradaHospedeCrm } from "./types";

/**
 * Server actions do CRM.
 *
 * Dados privados, status e avaliacao interna sao alterados apenas no servidor
 * para garantir tenant correto e evitar exposicao de regras sensiveis ao cliente.
 */

const CAMINHO_HOSPEDES = "/hospedes";

export async function criarHospedeAction(formData: FormData) {
  const escopo = await carregarEscopoHospede();

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = obterEntradaHospede(formData);

    const existente = await localizarHospedeExistente(supabase, escopo.tenantId, {
      document_number: entrada.documentNumber,
      email: entrada.email,
      full_name: entrada.fullName,
      phone: entrada.phone
    });

    if (existente) {
      throw new ErroRegraHospede("Este hospede ja existe no CRM deste tenant.");
    }

    const { error } = await supabase.from("crm_guests").insert({
      birth_date: entrada.birthDate,
      city: entrada.city,
      created_by: escopo.userId,
      document_number: entrada.documentNumber,
      email: entrada.email,
      full_name: entrada.fullName,
      internal_rating: entrada.internalRating,
      metadata: {
        origem: "cadastro_manual",
        removivel_do_crm: true
      },
      owner_id: escopo.ownerId,
      phone: entrada.phone,
      private_notes: entrada.privateNotes,
      state: entrada.state,
      status: entrada.internalRating === "blocked" ? "blocked" : "active",
      tenant_id: escopo.tenantId
    });

    if (error) throw new Error(error.message);
    revalidarHospedes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao cadastrar hospede.");
  }

  redirect(`${CAMINHO_HOSPEDES}?sucesso=hospede-criado`);
}

export async function atualizarHospedeAction(formData: FormData) {
  const escopo = await carregarEscopoHospede();

  try {
    const supabase = await criarClienteSupabaseServer();
    const hospedeId = textoObrigatorio(formData, "hospedeId", "hospede");
    await carregarHospedeGerenciavel(supabase, escopo, hospedeId);
    const entrada = obterEntradaHospede(formData);

    const { error } = await supabase
      .from("crm_guests")
      .update({
        birth_date: entrada.birthDate,
        city: entrada.city,
        document_number: entrada.documentNumber,
        email: entrada.email,
        full_name: entrada.fullName,
        internal_rating: entrada.internalRating,
        phone: entrada.phone,
        private_notes: entrada.privateNotes,
        state: entrada.state,
        status: entrada.internalRating === "blocked" ? "blocked" : "active"
      })
      .eq("id", hospedeId)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId);

    if (error) throw new Error(error.message);
    revalidarHospedes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar hospede.");
  }

  redirect(`${CAMINHO_HOSPEDES}?sucesso=hospede-atualizado`);
}

export async function alternarBloqueioHospedeAction(formData: FormData) {
  const escopo = await carregarEscopoHospede();

  try {
    const supabase = await criarClienteSupabaseServer();
    const hospede = await carregarHospedeGerenciavel(
      supabase,
      escopo,
      textoObrigatorio(formData, "hospedeId", "hospede")
    );
    const bloquear = hospede.status !== "blocked";

    const { error } = await supabase
      .from("crm_guests")
      .update({
        internal_rating: bloquear ? "blocked" : "neutral",
        status: bloquear ? "blocked" : "active"
      })
      .eq("id", hospede.id)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarHospedes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao bloquear ou desbloquear hospede.");
  }

  redirect(`${CAMINHO_HOSPEDES}?sucesso=status-hospede`);
}

export async function excluirHospedeAction(formData: FormData) {
  const escopo = await carregarEscopoHospede();

  try {
    const supabase = await criarClienteSupabaseServer();
    const hospede = await carregarHospedeGerenciavel(
      supabase,
      escopo,
      textoObrigatorio(formData, "hospedeId", "hospede")
    );
    exigirConfirmacaoExclusao(formData);
    await exigirHospedeRemovivelDoCrm(supabase, escopo, hospede);

    // Exclusao logica preserva historico de reservas e auditoria do CRM.
    const { error } = await supabase
      .from("crm_guests")
      .update({
        deleted_at: new Date().toISOString(),
        status: "deleted"
      })
      .eq("id", hospede.id)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarHospedes();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao excluir hospede.");
  }

  redirect(`${CAMINHO_HOSPEDES}?sucesso=hospede-excluido`);
}

export async function sincronizarHospedeCrm(
  supabase: ClienteSupabaseServer,
  escopo: Pick<EscopoHospede, "ownerId" | "tenantId" | "userId">,
  hospede: Pick<
    ReservationGuestRow,
    "document_number" | "email" | "full_name" | "phone"
  >
) {
  const existente = await localizarHospedeExistente(supabase, escopo.tenantId, hospede);
  const dados = {
    document_number: hospede.document_number,
    email: hospede.email,
    full_name: hospede.full_name,
    phone: hospede.phone
  };

  if (existente) {
    const { error } = await supabase
      .from("crm_guests")
      .update(dados)
      .eq("id", existente.id)
      .eq("tenant_id", escopo.tenantId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("crm_guests").insert({
    ...dados,
    tenant_id: escopo.tenantId,
    owner_id: escopo.ownerId,
    created_by: escopo.userId,
    metadata: {
      origem: "reserva_manual",
      whatsapp_futuro: true,
      email_futuro: true,
      campanhas_futuras: true,
      fidelizacao_futura: true
    }
  });

  if (error) throw new Error(error.message);
}

async function localizarHospedeExistente(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  hospede: Pick<ReservationGuestRow, "document_number" | "email" | "full_name" | "phone">
) {
  let consulta = supabase
    .from("crm_guests")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .limit(1);

  if (hospede.email) consulta = consulta.ilike("email", hospede.email);
  else if (hospede.phone) consulta = consulta.eq("phone", hospede.phone);
  else if (hospede.document_number) consulta = consulta.eq("document_number", hospede.document_number);
  else consulta = consulta.ilike("full_name", hospede.full_name);

  const { data, error } = await consulta.maybeSingle<{ id: string }>();
  if (error) throw new Error(error.message);
  return data;
}

async function exigirHospedeRemovivelDoCrm(
  supabase: ClienteSupabaseServer,
  escopo: EscopoHospede,
  hospede: CrmGuestRow
) {
  const { data: hospedesReserva, error: erroHospedesReserva } = await supabase
    .from("reservation_guests")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .returns<ReservationGuestRow[]>();

  if (erroHospedesReserva) throw new Error(erroHospedesReserva.message);

  const reservaIds = (hospedesReserva ?? [])
    .filter((hospedeReserva) => hospedeReservaCorrespondeAoCrmGuest(hospede, hospedeReserva))
    .map((hospedeReserva) => hospedeReserva.reservation_id);

  if (!reservaIds.length) return;

  const { data: reservas, error: erroReservas } = await supabase
    .from("reservations")
    .select("*")
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .in("id", reservaIds)
    .returns<ReservationRow[]>();

  if (erroReservas) throw new Error(erroReservas.message);

  const resultado = avaliarRemocaoHospedeCrm(reservas ?? []);
  if (!resultado.permitida) {
    throw new ErroRegraHospede(
      resultado.motivo ?? "Nao e possivel apagar hospedes com historico operacional ativo."
    );
  }
}

function obterEntradaHospede(formData: FormData): EntradaHospedeCrm {
  return {
    birthDate: dataOpcional(formData, "birthDate"),
    city: textoOpcional(formData, "city"),
    documentNumber: textoOpcional(formData, "documentNumber"),
    email: textoOpcional(formData, "email"),
    fullName: textoObrigatorio(formData, "fullName", "nome"),
    internalRating: validarAvaliacao(textoObrigatorio(formData, "internalRating", "avaliacao")),
    phone: textoOpcional(formData, "phone"),
    privateNotes: textoOpcional(formData, "privateNotes"),
    state: textoOpcional(formData, "state"),
  };
}

function validarAvaliacao(valor: string): CrmGuestRating {
  if (AVALIACOES_HOSPEDE_CRM.includes(valor as CrmGuestRating)) {
    return valor as CrmGuestRating;
  }

  throw new ErroRegraHospede("Avaliacao interna invalida.");
}

function exigirConfirmacaoExclusao(formData: FormData) {
  if (formData.get("confirmarExclusao") !== "confirmado") {
    throw new ErroRegraHospede("Confirme a exclusao do hospede.");
  }
}

function dataOpcional(formData: FormData, chave: string): string | null {
  const valor = textoOpcional(formData, chave);
  if (!valor) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroRegraHospede("Informe uma data valida.");
  }
  return valor;
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraHospede(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function redirecionarComErro(erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroRegraHospede ? erro.message : "Nao foi possivel concluir a operacao.";

  if (!(erro instanceof ErroRegraHospede)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${CAMINHO_HOSPEDES}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarHospedes() {
  revalidatePath(CAMINHO_HOSPEDES);
  revalidatePath("/reservas");
}
