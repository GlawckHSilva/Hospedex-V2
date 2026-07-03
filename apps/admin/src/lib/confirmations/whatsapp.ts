import type {
  JsonValue,
  PropertyRow,
  ReservationGuestRow,
  ReservationPaymentMethod,
  ReservationRow,
  ReservationWhatsappMessageRow,
  TenantSettingRow,
} from "@hospedex/types";

import type { ClienteSupabaseServer } from "../finance/permissions";

/**
 * Prepara mensagens manuais de WhatsApp para reservas confirmadas.
 *
 * Esta camada nao chama API externa e nao marca mensagem como enviada. O foco e
 * deixar a comunicacao pronta, mantendo tenant_id e property_id como barreiras
 * de seguranca e evitando dados sensiveis de pagamento.
 */

export class ErroMensagemWhatsapp extends Error {}

type EscopoMensagemWhatsapp = {
  ownerId: string;
  tenantId: string;
  userId: string;
};

type BaseMensagem = {
  configuracoes: TenantSettingRow | null;
  hospede: ReservationGuestRow | null;
  propriedade: PropertyRow;
};

const LABEL_FORMA_PAGAMENTO: Record<ReservationPaymentMethod, string> = {
  bank_transfer: "Transferencia bancaria",
  cash: "Dinheiro",
  credit_card: "Cartao de credito",
  debit_card: "Cartao de debito",
  pix: "Pix",
};

export async function prepararMensagemWhatsappReserva(
  supabase: ClienteSupabaseServer,
  escopo: EscopoMensagemWhatsapp,
  reserva: ReservationRow
) {
  const base = await carregarBaseMensagem(supabase, escopo, reserva);
  const mensagem = montarMensagem(reserva, base);
  const telefone = normalizarTelefoneWhatsapp(base.hospede?.phone ?? null);
  const motivoRevisao = obterMotivoRevisao(reserva, base, telefone);
  const whatsappUrl = telefone && !motivoRevisao
    ? `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`
    : null;

  const { data, error } = await supabase
    .from("reservation_whatsapp_messages")
    .upsert(
      {
        guest_phone: base.hospede?.phone ?? null,
        message_body: mensagem,
        owner_id: escopo.ownerId,
        prepared_by: escopo.userId,
        reservation_id: reserva.id,
        review_reason: motivoRevisao,
        status: "prepared",
        tenant_id: escopo.tenantId,
        whatsapp_url: whatsappUrl,
        requires_manual_review: Boolean(motivoRevisao),
      },
      { onConflict: "reservation_id" }
    )
    .select("*")
    .single<ReservationWhatsappMessageRow>();

  if (error || !data) {
    throw new ErroMensagemWhatsapp(
      "Reserva confirmada, mas nao foi possivel preparar a mensagem de WhatsApp."
    );
  }

  await registrarNotaMensagemPreparada(supabase, escopo, reserva.id, motivoRevisao);
  return data;
}

export async function registrarMensagemWhatsappCopiada(
  supabase: ClienteSupabaseServer,
  escopo: EscopoMensagemWhatsapp,
  mensagemId: string
) {
  const mensagem = await atualizarStatusMensagem(
    supabase,
    escopo,
    mensagemId,
    "copied",
    { copied_at: new Date().toISOString() }
  );

  await registrarNotaOperacional(
    supabase,
    escopo,
    mensagem.reservation_id,
    "Mensagem de confirmacao copiada para envio manual no WhatsApp."
  );
}

export async function registrarMensagemWhatsappAberta(
  supabase: ClienteSupabaseServer,
  escopo: EscopoMensagemWhatsapp,
  mensagemId: string
) {
  const mensagem = await atualizarStatusMensagem(
    supabase,
    escopo,
    mensagemId,
    "opened",
    { opened_at: new Date().toISOString() }
  );

  await registrarNotaOperacional(
    supabase,
    escopo,
    mensagem.reservation_id,
    "WhatsApp aberto com mensagem preparada. Envio real nao foi confirmado pelo sistema."
  );
}

async function carregarBaseMensagem(
  supabase: ClienteSupabaseServer,
  escopo: EscopoMensagemWhatsapp,
  reserva: ReservationRow
): Promise<BaseMensagem> {
  const [propriedadeResultado, hospedeResultado, configuracoesResultado] =
    await Promise.all([
      supabase
        .from("properties")
        .select("*")
        .eq("id", reserva.property_id)
        .eq("tenant_id", escopo.tenantId)
        .eq("owner_id", escopo.ownerId)
        .maybeSingle<PropertyRow>(),
      supabase
        .from("reservation_guests")
        .select("*")
        .eq("tenant_id", escopo.tenantId)
        .eq("reservation_id", reserva.id)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle<ReservationGuestRow>(),
      supabase
        .from("tenant_settings")
        .select("*")
        .eq("tenant_id", escopo.tenantId)
        .maybeSingle<TenantSettingRow>(),
    ]);

  if (propriedadeResultado.error || !propriedadeResultado.data) {
    throw new ErroMensagemWhatsapp(
      "Reserva confirmada, mas a casa nao foi encontrada para preparar a mensagem."
    );
  }

  if (hospedeResultado.error) {
    throw new ErroMensagemWhatsapp(
      "Reserva confirmada, mas o hospede nao foi carregado para preparar a mensagem."
    );
  }

  if (configuracoesResultado.error) {
    throw new ErroMensagemWhatsapp(
      "Reserva confirmada, mas as configuracoes de pagamento nao foram carregadas."
    );
  }

  return {
    configuracoes: configuracoesResultado.data ?? null,
    hospede: hospedeResultado.data ?? null,
    propriedade: propriedadeResultado.data,
  };
}

function montarMensagem(reserva: ReservationRow, base: BaseMensagem) {
  const formaPagamento = reserva.payment_method ?? "pix";
  const localizacao = formatarLocalizacao(base.propriedade.address);
  const instrucoes = montarInstrucoesPagamento(formaPagamento, base.configuracoes);
  const contato = montarContatoProprietario(base.configuracoes);
  const avisoPagamento =
    ["paid", "received"].includes(reserva.payment_status)
      ? "Pagamento ja registrado como recebido no Hospedex."
      : "A reserva esta aguardando confirmacao de pagamento.";

  return [
    `Ola, ${base.hospede?.full_name ?? "hospede"}! Sua reserva foi confirmada no Hospedex.`,
    "",
    `Casa: ${base.propriedade.name}`,
    `Localizacao: ${localizacao}`,
    `Periodo: ${formatarData(reserva.check_in)} ate ${formatarData(reserva.check_out)}`,
    `Hospedes: ${reserva.guests_count}`,
    `Valor total: ${formatarMoeda(Number(reserva.total_amount), reserva.currency)}`,
    `Forma de pagamento escolhida: ${LABEL_FORMA_PAGAMENTO[formaPagamento]}`,
    "",
    "Instrucoes de pagamento:",
    instrucoes,
    "",
    avisoPagamento,
    "Apos o pagamento, envie o comprovante para conferencia do proprietario.",
    "",
    "Contato do proprietario:",
    contato,
  ].join("\n");
}

function montarInstrucoesPagamento(
  formaPagamento: ReservationPaymentMethod,
  configuracoes: TenantSettingRow | null
) {
  if (formaPagamento === "pix") {
    return [
      configuracoes?.pix_key ? `Chave Pix: ${configuracoes.pix_key}` : "Chave Pix ainda nao cadastrada.",
      configuracoes?.pix_receiver_name ? `Recebedor: ${configuracoes.pix_receiver_name}` : null,
      configuracoes?.payment_receiver_document ? `CPF/CNPJ: ${configuracoes.payment_receiver_document}` : null,
      configuracoes?.pix_bank_name ? `Banco/instituicao: ${configuracoes.pix_bank_name}` : null,
      configuracoes?.pix_payment_note ?? "Envie o comprovante apos realizar o pagamento.",
    ].filter(Boolean).join("\n");
  }

  if (formaPagamento === "cash") {
    return configuracoes?.cash_payment_instructions ??
      "Pagamento em dinheiro no check-in, conforme combinado com o proprietario.";
  }

  if (formaPagamento === "debit_card") {
    return configuracoes?.debit_card_payment_instructions ??
      "Pagamento via debito conforme disponibilidade do proprietario.";
  }

  if (formaPagamento === "bank_transfer") {
    return configuracoes?.bank_transfer_payment_instructions ??
      "Transferencia bancaria conforme instrucoes do proprietario.";
  }

  return [
    configuracoes?.credit_card_payment_instructions ??
      "Pagamento via credito conforme regras combinadas com o proprietario.",
    configuracoes?.credit_card_installments_note ?? null,
  ].filter(Boolean).join("\n");
}

function obterMotivoRevisao(
  reserva: ReservationRow,
  base: BaseMensagem,
  telefoneWhatsapp: string | null
) {
  if (!base.hospede?.phone || !telefoneWhatsapp) {
    return "Telefone do hospede nao informado ou invalido.";
  }

  if ((reserva.payment_method ?? "pix") === "pix" && !base.configuracoes?.pix_key) {
    return "Cadastre a chave Pix antes de abrir o WhatsApp com instrucoes de pagamento.";
  }

  return null;
}

async function atualizarStatusMensagem(
  supabase: ClienteSupabaseServer,
  escopo: EscopoMensagemWhatsapp,
  mensagemId: string,
  status: "copied" | "opened",
  datas: Partial<ReservationWhatsappMessageRow>
) {
  const { data, error } = await supabase
    .from("reservation_whatsapp_messages")
    .update({ ...datas, status })
    .eq("id", mensagemId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .select("*")
    .single<ReservationWhatsappMessageRow>();

  if (error || !data) {
    throw new ErroMensagemWhatsapp("Nao foi possivel atualizar o status da mensagem.");
  }

  return data;
}

async function registrarNotaMensagemPreparada(
  supabase: ClienteSupabaseServer,
  escopo: EscopoMensagemWhatsapp,
  reservaId: string,
  motivoRevisao: string | null
) {
  const complemento = motivoRevisao ? ` Revisao necessaria: ${motivoRevisao}` : "";

  await registrarNotaOperacional(
    supabase,
    escopo,
    reservaId,
    `Mensagem de confirmacao preparada para WhatsApp.${complemento}`
  );
}

async function registrarNotaOperacional(
  supabase: ClienteSupabaseServer,
  escopo: EscopoMensagemWhatsapp,
  reservaId: string,
  conteudo: string
) {
  const { error } = await supabase.from("reservation_notes").insert({
    content: conteudo,
    created_by: escopo.userId,
    note_type: "system",
    reservation_id: reservaId,
    tenant_id: escopo.tenantId,
  });

  if (error) {
    throw new ErroMensagemWhatsapp("Nao foi possivel registrar a timeline do WhatsApp.");
  }
}

function formatarLocalizacao(endereco: JsonValue) {
  const dados = valorEhObjeto(endereco) ? endereco : {};
  const cidade = textoJson(dados, "cidade") || textoJson(dados, "city");
  const estado = textoJson(dados, "estado") || textoJson(dados, "state");

  return [cidade, estado].filter(Boolean).join(", ") || "Localizacao nao informada";
}

function montarContatoProprietario(configuracoes: TenantSettingRow | null) {
  const contatos = [
    configuracoes?.whatsapp ? `WhatsApp: ${configuracoes.whatsapp}` : null,
    configuracoes?.phone ? `Telefone: ${configuracoes.phone}` : null,
    configuracoes?.email ? `E-mail: ${configuracoes.email}` : null,
  ].filter(Boolean);

  return contatos.length ? contatos.join("\n") : "Contato ainda nao cadastrado.";
}

function normalizarTelefoneWhatsapp(telefone: string | null) {
  const digitos = telefone?.replace(/\D/g, "") ?? "";
  if (!digitos) return null;
  if (digitos.length >= 12) return digitos;
  if (digitos.length >= 10) return `55${digitos}`;
  return null;
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${valor}T00:00:00`));
}

function formatarMoeda(valor: number, moeda: string) {
  return new Intl.NumberFormat("pt-BR", {
    currency: moeda,
    style: "currency",
  }).format(valor);
}

function textoJson(valor: Record<string, JsonValue>, chave: string) {
  const dado = valor[chave];
  return typeof dado === "string" ? dado : "";
}

function valorEhObjeto(valor: JsonValue): valor is Record<string, JsonValue> {
  return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}
