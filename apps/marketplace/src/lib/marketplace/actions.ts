"use server";

import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import { supabaseMarketplaceConfigurado } from "./data";

type ResultadoRpcReserva = {
  code?: string;
  reservationId?: string;
  status?: string;
};

const FORMAS_PAGAMENTO = new Set([
  "pix",
  "cash",
  "debit_card",
  "credit_card",
  "bank_transfer"
]);

export async function solicitarReservaPublicaAction(formData: FormData) {
  const slug = textoObrigatorio(formData, "propertySlug", "propriedade");
  const destino = `/propriedades/${encodeURIComponent(slug)}`;
  let codigoReserva = "";

  try {
    if (!supabaseMarketplaceConfigurado()) {
      throw new ErroSolicitacao(
        "As solicitações estão temporariamente indisponíveis."
      );
    }

    const checkIn = dataObrigatoria(formData, "checkIn", "check-in");
    const checkOut = dataObrigatoria(formData, "checkOut", "check-out");
    const quantidadeHospedes = numeroInteiro(
      formData,
      "quantidadeHospedes",
      "hóspedes",
      1
    );
    const horarioPrevistoCheckIn = horarioOpcional(
      formData,
      "horarioPrevistoCheckIn",
      "horario previsto de chegada"
    );
    const horarioPrevistoCheckOut = horarioOpcional(
      formData,
      "horarioPrevistoCheckOut",
      "horario previsto de saida"
    );
    const formaPagamento = formaPagamentoObrigatoria(formData);

    if (checkOut <= checkIn) {
      throw new ErroSolicitacao("Check-out deve ser depois do check-in.");
    }

    const supabase = await criarClienteSupabaseServer();
    if (!supabase) {
      throw new ErroSolicitacao(
        "As solicitações estão temporariamente indisponíveis."
      );
    }

    const { data: usuarioResultado } = await supabase.auth.getUser();
    const usuario = usuarioResultado.user;
    const perfilHospede = usuario
      ? await carregarPerfilHospedeLogado(supabase, usuario.id)
      : null;

    // Se o hospede estiver logado, a reserva usa obrigatoriamente o e-mail
    // autenticado. Isso impede criar uma reserva logada para outro e-mail.
    const emailHospede =
      usuario?.email?.trim().toLowerCase() ??
      textoObrigatorio(formData, "hospedeEmail", "e-mail").toLowerCase();
    const nomeHospede =
      textoOpcional(formData, "hospedeNome") ??
      perfilHospede?.full_name ??
      usuario?.email ??
      textoObrigatorio(formData, "hospedeNome", "nome do hóspede");
    const telefoneHospede =
      textoOpcional(formData, "hospedeTelefone") ??
      perfilHospede?.phone ??
      textoObrigatorio(formData, "hospedeTelefone", "telefone");

    const { data, error } = await supabase.rpc("request_public_reservation", {
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guest_document: textoOpcional(formData, "hospedeDocumento"),
      p_guest_email: emailHospede,
      p_guest_name: nomeHospede,
      p_guest_notes: textoOpcional(formData, "observacoes"),
      p_guest_phone: telefoneHospede,
      p_guests_count: quantidadeHospedes,
      p_payment_method: formaPagamento,
      p_expected_checkin_time: horarioPrevistoCheckIn,
      p_expected_checkout_time: horarioPrevistoCheckOut,
      p_property_slug: slug
    });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erro técnico ao solicitar reserva pública.", error);
      }

      throw new ErroRpcReserva(error.message);
    }

    const resultado = data as ResultadoRpcReserva | null;
    codigoReserva = resultado?.code ?? "";

    if (usuario) {
      await supabase.rpc("link_guest_reservations");
    }
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

async function carregarPerfilHospedeLogado(
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServer>>>,
  userId: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name,phone")
    .eq("id", userId)
    .maybeSingle<{ full_name: string | null; phone: string | null }>();

  if (error) {
    console.error("Erro ao carregar perfil do hóspede logado.", error);
  }

  return data;
}

/**
 * A RPC nao deve expor detalhes tecnicos do PostgREST ou do banco ao visitante.
 * Somente regras de negocio conhecidas sao traduzidas para mensagens publicas.
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
      "Esta propriedade não está disponível para reserva."
    ],
    ["check-in nao pode ser no passado", "O check-in não pode ser no passado."],
    [
      "check-out deve ser depois do check-in",
      "O check-out deve ser depois do check-in."
    ],
    [
      "quantidade de hospedes acima da capacidade",
      "A quantidade de hóspedes excede a capacidade da casa."
    ],
    [
      "quantidade de hospedes invalida",
      "Informe uma quantidade válida de hóspedes."
    ],
    [
      "a casa ja possui solicitacao ou reserva neste periodo",
      "A casa já possui uma solicitação ou reserva neste período."
    ],
    [
      "a casa esta bloqueada neste periodo",
      "A casa está indisponível neste período."
    ],
    ["informe uma forma de pagamento valida", "Escolha uma forma de pagamento."]
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

function formaPagamentoObrigatoria(formData: FormData) {
  const valor = textoObrigatorio(formData, "formaPagamento", "forma de pagamento");
  if (FORMAS_PAGAMENTO.has(valor)) return valor;

  throw new ErroSolicitacao("Escolha uma forma de pagamento válida.");
}

function dataObrigatoria(formData: FormData, chave: string, label: string) {
  const valor = textoObrigatorio(formData, chave, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroSolicitacao(`Informe ${label} válido.`);
  }

  return valor;
}

function horarioOpcional(formData: FormData, chave: string, label: string) {
  const valor = textoOpcional(formData, chave);
  if (!valor) return null;

  if (!/^\d{2}:\d{2}$/.test(valor)) {
    throw new ErroSolicitacao(`Informe ${label} valido.`);
  }

  return valor;
}

function numeroInteiro(
  formData: FormData,
  chave: string,
  label: string,
  minimo: number
) {
  const valor = Number.parseInt(textoObrigatorio(formData, chave, label), 10);

  if (!Number.isFinite(valor) || valor < minimo) {
    throw new ErroSolicitacao(`Informe ${label} válido.`);
  }

  return valor;
}
