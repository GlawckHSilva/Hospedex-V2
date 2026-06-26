"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { supabaseMarketplaceConfigurado } from "./data";

type ResultadoRpcReserva = {
  code?: string;
  reservationId?: string;
  status?: string;
};

export async function solicitarReservaPublicaAction(formData: FormData) {
  const slug = textoObrigatorio(formData, "propertySlug", "propriedade");
  const destino = `/propriedades/${encodeURIComponent(slug)}`;

  let codigoReserva = "";

  try {
    if (!supabaseMarketplaceConfigurado()) {
      throw new ErroSolicitacao(
        "As solicitações estão temporariamente indisponíveis.",
      );
    }

    const checkIn = dataObrigatoria(formData, "checkIn", "check-in");
    const checkOut = dataObrigatoria(formData, "checkOut", "check-out");
    const quantidadeHospedes = numeroInteiro(formData, "quantidadeHospedes", "hóspedes", 1);

    if (checkOut <= checkIn) {
      throw new ErroSolicitacao("Check-out deve ser depois do check-in.");
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data, error } = await supabase.rpc("request_public_reservation", {
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guest_document: textoOpcional(formData, "hospedeDocumento"),
      p_guest_email: textoObrigatorio(formData, "hospedeEmail", "e-mail"),
      p_guest_name: textoObrigatorio(formData, "hospedeNome", "nome do hóspede"),
      p_guest_notes: textoOpcional(formData, "observacoes"),
      p_guest_phone: textoObrigatorio(formData, "hospedeTelefone", "telefone"),
      p_guests_count: quantidadeHospedes,
      p_property_slug: slug
    });

    if (error) throw new ErroRpcReserva(error.message);

    const resultado = data as ResultadoRpcReserva | null;
    codigoReserva = resultado?.code ?? "";
  } catch (erro) {
    const mensagem = obterMensagemPublica(erro);

    redirect(`${destino}?reserva=erro&mensagem=${encodeURIComponent(mensagem)}`);
  }

  redirect(
    `${destino}?reserva=sucesso${
      codigoReserva ? `&codigo=${encodeURIComponent(codigoReserva)}` : ""
    }`
  );
}

class ErroSolicitacao extends Error {}
class ErroRpcReserva extends Error {}

/**
 * A RPC não deve expor detalhes técnicos do PostgREST ou do banco ao visitante.
 * Somente regras de negócio conhecidas são traduzidas para mensagens públicas.
 */
function obterMensagemPublica(erro: unknown) {
  if (erro instanceof ErroSolicitacao) return erro.message;
  if (!(erro instanceof ErroRpcReserva)) {
    return "Não foi possível enviar a solicitação agora.";
  }

  const mensagem = normalizarTextoErro(erro.message);
  const mensagensConhecidas: Array<[string, string]> = [
    [
      "propriedade nao encontrada ou indisponivel",
      "Esta propriedade não está disponível para reserva.",
    ],
    ["check-in nao pode ser no passado", "O check-in não pode ser no passado."],
    [
      "check-out deve ser depois do check-in",
      "O check-out deve ser depois do check-in.",
    ],
    [
      "quantidade de hospedes acima da capacidade",
      "A quantidade de hóspedes excede a capacidade da casa.",
    ],
    [
      "quantidade de hospedes invalida",
      "Informe uma quantidade válida de hóspedes.",
    ],
    [
      "a casa ja possui solicitacao ou reserva neste periodo",
      "A casa já possui uma solicitação ou reserva neste período.",
    ],
    [
      "a casa esta bloqueada neste periodo",
      "A casa está indisponível neste período.",
    ],
  ];

  return (
    mensagensConhecidas.find(([trecho]) => mensagem.includes(trecho))?.[1] ??
    "Não foi possível enviar a solicitação agora."
  );
}

function normalizarTextoErro(mensagem: string) {
  return mensagem
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function textoObrigatorio(formData: FormData, chave: string, label: string) {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroSolicitacao(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string) {
  const valor = formData.get(chave)?.toString().trim();
  return valor || null;
}

function dataObrigatoria(formData: FormData, chave: string, label: string) {
  const valor = textoObrigatorio(formData, chave, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroSolicitacao(`Informe ${label} válido.`);
  }

  return valor;
}

function numeroInteiro(formData: FormData, chave: string, label: string, minimo: number) {
  const valor = Number.parseInt(textoObrigatorio(formData, chave, label), 10);

  if (!Number.isFinite(valor) || valor < minimo) {
    throw new ErroSolicitacao(`Informe ${label} válido.`);
  }

  return valor;
}
