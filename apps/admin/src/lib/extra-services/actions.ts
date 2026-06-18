"use server";

import type {
  ExtraServiceChargeType,
  ExtraServiceRow,
  ExtraServiceStatus
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirAutenticacao } from "../auth/context";
import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import { podeGerenciarServicosExtras } from "./data";
import { TIPOS_COBRANCA_SERVICO_EXTRA } from "./types";

/**
 * Server actions do catalogo de Servicos Extras.
 *
 * Regras de negocio importantes ficam no servidor para proteger o tenant: o
 * navegador informa dados do formulario, mas o tenant e owner saem da sessao.
 */

const CAMINHO_SERVICOS_EXTRAS = "/servicos-extras";
const STATUS_VALIDOS: ExtraServiceStatus[] = ["active", "inactive"];

class ErroRegraServicoExtra extends Error {}

type EscopoServicoExtra = {
  contexto: ContextoAutenticacao;
  ownerId: string;
  tenantId: string;
  userId: string;
};

type EntradaServicoExtra = {
  amount: number;
  appliesToAllProperties: boolean;
  chargeType: ExtraServiceChargeType;
  description: string | null;
  internalNotes: string | null;
  isRequired: boolean;
  name: string;
  propertyIds: string[];
  status: ExtraServiceStatus;
};

export async function criarServicoExtraAction(formData: FormData) {
  const escopo = await carregarEscopoServicoExtra();

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = await obterEntradaServicoExtra(supabase, escopo, formData);
    const { data, error } = await supabase
      .from("extra_services")
      .insert({
        tenant_id: escopo.tenantId,
        owner_id: escopo.ownerId,
        name: entrada.name,
        description: entrada.description,
        amount: entrada.amount,
        charge_type: entrada.chargeType,
        status: entrada.status,
        is_required: entrada.isRequired,
        applies_to_all_properties: entrada.appliesToAllProperties,
        internal_notes: entrada.internalNotes,
        created_by: escopo.userId
      })
      .select("*")
      .single<ExtraServiceRow>();

    if (error) throw new Error(error.message);
    await substituirVinculosCasas(supabase, escopo, data.id, entrada);
    revalidarServicosExtras();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao criar servico extra.");
  }

  redirect(`${CAMINHO_SERVICOS_EXTRAS}?sucesso=servico-criado`);
}

export async function atualizarServicoExtraAction(formData: FormData) {
  const escopo = await carregarEscopoServicoExtra();

  try {
    const supabase = await criarClienteSupabaseServer();
    const servicoId = textoObrigatorio(formData, "servicoId", "servico");
    await carregarServicoExtra(supabase, escopo, servicoId);
    const entrada = await obterEntradaServicoExtra(supabase, escopo, formData);
    const { error } = await supabase
      .from("extra_services")
      .update({
        name: entrada.name,
        description: entrada.description,
        amount: entrada.amount,
        charge_type: entrada.chargeType,
        status: entrada.status,
        is_required: entrada.isRequired,
        applies_to_all_properties: entrada.appliesToAllProperties,
        internal_notes: entrada.internalNotes
      })
      .eq("id", servicoId)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    await substituirVinculosCasas(supabase, escopo, servicoId, entrada);
    revalidarServicosExtras();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar servico extra.");
  }

  redirect(`${CAMINHO_SERVICOS_EXTRAS}?sucesso=servico-atualizado`);
}

export async function alternarStatusServicoExtraAction(formData: FormData) {
  const escopo = await carregarEscopoServicoExtra();

  try {
    const supabase = await criarClienteSupabaseServer();
    const servicoId = textoObrigatorio(formData, "servicoId", "servico");
    const status = validarStatus(textoObrigatorio(formData, "status", "status"));
    await carregarServicoExtra(supabase, escopo, servicoId);
    const { error } = await supabase
      .from("extra_services")
      .update({ status })
      .eq("id", servicoId)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarServicosExtras();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar status do servico extra.");
  }

  redirect(`${CAMINHO_SERVICOS_EXTRAS}?sucesso=status-atualizado`);
}

export async function excluirServicoExtraAction(formData: FormData) {
  const escopo = await carregarEscopoServicoExtra();

  try {
    const supabase = await criarClienteSupabaseServer();
    const servicoId = textoObrigatorio(formData, "servicoId", "servico");
    await carregarServicoExtra(supabase, escopo, servicoId);

    // Exclusao logica preserva historico para reservas e relatorios futuros.
    const { error } = await supabase
      .from("extra_services")
      .update({
        deleted_at: new Date().toISOString(),
        status: "inactive"
      })
      .eq("id", servicoId)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);

    await supabase
      .from("extra_service_properties")
      .delete()
      .eq("tenant_id", escopo.tenantId)
      .eq("extra_service_id", servicoId);

    revalidarServicosExtras();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao excluir servico extra.");
  }

  redirect(`${CAMINHO_SERVICOS_EXTRAS}?sucesso=servico-excluido`);
}

async function carregarEscopoServicoExtra(): Promise<EscopoServicoExtra> {
  const contexto = await exigirAutenticacao();

  if (!contexto.tenant || !podeGerenciarServicosExtras(contexto)) {
    redirect("/sem-acesso?motivo=permissao-insuficiente");
  }

  if (!contexto.featureFlags.extra_services) {
    redirect("/sem-acesso?motivo=feature-flag-desabilitada");
  }

  return {
    contexto,
    ownerId: contexto.tenant.owner_id,
    tenantId: contexto.tenant.id,
    userId: contexto.userId
  };
}

async function obterEntradaServicoExtra(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoServicoExtra,
  formData: FormData
): Promise<EntradaServicoExtra> {
  const appliesToAllProperties = checkboxAtivo(formData, "appliesToAllProperties");
  const propertyIds = obterIdsUnicos(formData.getAll("propertyIds"));

  if (!appliesToAllProperties && propertyIds.length === 0) {
    throw new ErroRegraServicoExtra("Selecione pelo menos uma casa ou marque todas as casas.");
  }

  if (!appliesToAllProperties) {
    await validarCasasDoTenant(supabase, escopo, propertyIds);
  }

  return {
    amount: numeroMoeda(formData, "amount", "valor"),
    appliesToAllProperties,
    chargeType: validarTipoCobranca(textoObrigatorio(formData, "chargeType", "tipo de cobranca")),
    description: textoOpcional(formData, "description"),
    internalNotes: textoOpcional(formData, "internalNotes"),
    isRequired: checkboxAtivo(formData, "isRequired"),
    name: textoObrigatorio(formData, "name", "nome"),
    propertyIds,
    status: validarStatus(textoObrigatorio(formData, "status", "status"))
  };
}

async function substituirVinculosCasas(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoServicoExtra,
  servicoId: string,
  entrada: EntradaServicoExtra
) {
  await supabase
    .from("extra_service_properties")
    .delete()
    .eq("tenant_id", escopo.tenantId)
    .eq("extra_service_id", servicoId);

  if (entrada.appliesToAllProperties || entrada.propertyIds.length === 0) return;

  const { error } = await supabase.from("extra_service_properties").insert(
    entrada.propertyIds.map((propertyId) => ({
      tenant_id: escopo.tenantId,
      extra_service_id: servicoId,
      property_id: propertyId
    }))
  );

  if (error) throw new Error(error.message);
}

async function validarCasasDoTenant(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoServicoExtra,
  propertyIds: string[]
) {
  const { data, error } = await supabase
    .from("properties")
    .select("id")
    .eq("tenant_id", escopo.tenantId)
    .in("id", propertyIds)
    .is("deleted_at", null)
    .returns<Array<{ id: string }>>();

  if (error) throw new Error(error.message);
  if ((data ?? []).length !== propertyIds.length) {
    throw new ErroRegraServicoExtra("Uma ou mais casas nao pertencem ao tenant atual.");
  }
}

async function carregarServicoExtra(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  escopo: EscopoServicoExtra,
  servicoId: string
) {
  const { data, error } = await supabase
    .from("extra_services")
    .select("*")
    .eq("id", servicoId)
    .eq("tenant_id", escopo.tenantId)
    .is("deleted_at", null)
    .maybeSingle<ExtraServiceRow>();

  if (error || !data) {
    throw new ErroRegraServicoExtra("Servico extra nao encontrado para este tenant.");
  }

  return data;
}

function validarTipoCobranca(valor: string): ExtraServiceChargeType {
  const tipos = TIPOS_COBRANCA_SERVICO_EXTRA.map((tipo) => tipo.value);
  if (tipos.includes(valor as ExtraServiceChargeType)) {
    return valor as ExtraServiceChargeType;
  }

  throw new ErroRegraServicoExtra("Tipo de cobranca invalido.");
}

function validarStatus(valor: string): ExtraServiceStatus {
  if (STATUS_VALIDOS.includes(valor as ExtraServiceStatus)) {
    return valor as ExtraServiceStatus;
  }

  throw new ErroRegraServicoExtra("Status invalido.");
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraServicoExtra(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function numeroMoeda(formData: FormData, chave: string, label: string): number {
  const valor = Number.parseFloat(textoObrigatorio(formData, chave, label).replace(",", "."));
  if (Number.isNaN(valor) || valor < 0) {
    throw new ErroRegraServicoExtra(`Informe ${label} valido.`);
  }
  return valor;
}

function checkboxAtivo(formData: FormData, chave: string): boolean {
  return formData.get(chave) === "on";
}

function obterIdsUnicos(valores: FormDataEntryValue[]): string[] {
  return Array.from(
    new Set(
      valores
        .map((valor) => valor.toString().trim())
        .filter((valor) => valor.length > 0)
    )
  );
}

function revalidarServicosExtras() {
  revalidatePath(CAMINHO_SERVICOS_EXTRAS);
}

function redirecionarComErro(erro: unknown, mensagemPadrao: string): never {
  if (!(erro instanceof ErroRegraServicoExtra)) {
    console.error(mensagemPadrao, erro);
  }

  const mensagem = erro instanceof ErroRegraServicoExtra ? erro.message : mensagemPadrao;
  redirect(`${CAMINHO_SERVICOS_EXTRAS}?erro=${encodeURIComponent(mensagem)}`);
}
