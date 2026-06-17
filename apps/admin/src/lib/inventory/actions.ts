"use server";

import type {
  InventoryConservationState,
  InventoryItemCategory,
  MaintenanceTaskPriority,
  MaintenanceTaskStatus,
  MaintenanceTaskType
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import {
  carregarEscopoInventario,
  carregarItemInventario,
  carregarPropriedadeInventario,
  carregarTarefaManutencao,
  carregarUnidadeInventario,
  ErroRegraInventario,
  type ClienteSupabaseServer,
  type EscopoInventario
} from "./permissions";
import {
  CATEGORIAS_INVENTARIO,
  ESTADOS_CONSERVACAO,
  PRIORIDADES_MANUTENCAO,
  STATUS_MANUTENCAO,
  TIPOS_MANUTENCAO
} from "./types";

/**
 * Server actions de Inventario e Manutencao.
 *
 * Todas as mutacoes validam tenant/propriedade/unidade no servidor. Fotos reais,
 * custos e notificacoes ficam preparados via URL/metadata, sem automacao nesta etapa.
 */

const CAMINHO_INVENTARIO = "/inventario";

type EntradaItemInventario = {
  category: InventoryItemCategory;
  conservationState: InventoryConservationState;
  estimatedValue: number;
  imageUrl: string | null;
  name: string;
  notes: string | null;
  propertyId: string;
  quantity: number;
  unitId: string | null;
};

type EntradaManutencao = {
  assignedTo: string | null;
  inventoryItemId: string | null;
  maintenanceType: MaintenanceTaskType;
  notes: string | null;
  priority: MaintenanceTaskPriority;
  propertyId: string;
  scheduledFor: string | null;
  status: MaintenanceTaskStatus;
  title: string;
  unitId: string | null;
};

export async function criarItemInventarioAction(formData: FormData) {
  const escopo = await carregarEscopoInventario();

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = await obterEntradaItem(supabase, escopo, formData);

    const { error } = await supabase.from("inventory_items").insert({
      tenant_id: escopo.tenantId,
      owner_id: escopo.ownerId,
      property_id: entrada.propertyId,
      unit_id: entrada.unitId,
      category: entrada.category,
      name: entrada.name,
      quantity: entrada.quantity,
      estimated_value: entrada.estimatedValue,
      conservation_state: entrada.conservationState,
      image_url: entrada.imageUrl,
      notes: entrada.notes,
      metadata: {
        garantia_futura: true,
        fotos_futuras: true,
        custos_futuros: true
      },
      created_by: escopo.userId
    });

    if (error) throw new Error(error.message);
    revalidarInventario();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao criar item de inventario.");
  }

  redirect(`${CAMINHO_INVENTARIO}?sucesso=item-criado`);
}

export async function atualizarItemInventarioAction(formData: FormData) {
  const escopo = await carregarEscopoInventario();

  try {
    const supabase = await criarClienteSupabaseServer();
    const itemId = textoObrigatorio(formData, "itemId", "item");
    await carregarItemInventario(supabase, escopo, itemId);
    const entrada = await obterEntradaItem(supabase, escopo, formData);

    const { error } = await supabase
      .from("inventory_items")
      .update({
        property_id: entrada.propertyId,
        unit_id: entrada.unitId,
        category: entrada.category,
        name: entrada.name,
        quantity: entrada.quantity,
        estimated_value: entrada.estimatedValue,
        conservation_state: entrada.conservationState,
        image_url: entrada.imageUrl,
        notes: entrada.notes
      })
      .eq("id", itemId)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId);

    if (error) throw new Error(error.message);
    revalidarInventario();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar item de inventario.");
  }

  redirect(`${CAMINHO_INVENTARIO}?sucesso=item-atualizado`);
}

export async function excluirItemInventarioAction(formData: FormData) {
  const escopo = await carregarEscopoInventario();

  try {
    const supabase = await criarClienteSupabaseServer();
    const item = await carregarItemInventario(
      supabase,
      escopo,
      textoObrigatorio(formData, "itemId", "item")
    );
    exigirConfirmacaoExclusao(formData);

    // Exclusao logica preserva historico de manutencoes e auditoria operacional.
    const { error } = await supabase
      .from("inventory_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarInventario();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao excluir item de inventario.");
  }

  redirect(`${CAMINHO_INVENTARIO}?sucesso=item-excluido`);
}

export async function criarTarefaManutencaoAction(formData: FormData) {
  const escopo = await carregarEscopoInventario();

  try {
    const supabase = await criarClienteSupabaseServer();
    const entrada = await obterEntradaManutencao(supabase, escopo, formData);

    const { error } = await supabase.from("maintenance_tasks").insert({
      tenant_id: escopo.tenantId,
      owner_id: escopo.ownerId,
      property_id: entrada.propertyId,
      unit_id: entrada.unitId,
      inventory_item_id: entrada.inventoryItemId,
      assigned_to: entrada.assignedTo,
      maintenance_type: entrada.maintenanceType,
      priority: entrada.priority,
      status: entrada.status,
      title: entrada.title,
      notes: entrada.notes,
      scheduled_for: entrada.scheduledFor,
      completed_at: entrada.status === "completed" ? new Date().toISOString() : null,
      completed_by: entrada.status === "completed" ? escopo.userId : null,
      metadata: {
        custos_futuros: true,
        fotos_antes_depois_futuras: true,
        notificacoes_futuras: true,
        integracao_financeira_futura: true
      },
      created_by: escopo.userId
    });

    if (error) throw new Error(error.message);
    revalidarInventario();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao criar manutencao.");
  }

  redirect(`${CAMINHO_INVENTARIO}?sucesso=manutencao-criada`);
}

export async function atualizarTarefaManutencaoAction(formData: FormData) {
  const escopo = await carregarEscopoInventario();

  try {
    const supabase = await criarClienteSupabaseServer();
    const tarefaId = textoObrigatorio(formData, "tarefaId", "manutencao");
    await carregarTarefaManutencao(supabase, escopo, tarefaId);
    const entrada = await obterEntradaManutencao(supabase, escopo, formData);

    const { error } = await supabase
      .from("maintenance_tasks")
      .update({
        property_id: entrada.propertyId,
        unit_id: entrada.unitId,
        inventory_item_id: entrada.inventoryItemId,
        assigned_to: entrada.assignedTo,
        maintenance_type: entrada.maintenanceType,
        priority: entrada.priority,
        status: entrada.status,
        title: entrada.title,
        notes: entrada.notes,
        scheduled_for: entrada.scheduledFor,
        completed_at: entrada.status === "completed" ? new Date().toISOString() : null,
        completed_by: entrada.status === "completed" ? escopo.userId : null
      })
      .eq("id", tarefaId)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarInventario();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao atualizar manutencao.");
  }

  redirect(`${CAMINHO_INVENTARIO}?sucesso=manutencao-atualizada`);
}

export async function alterarStatusManutencaoAction(formData: FormData) {
  const escopo = await carregarEscopoInventario();

  try {
    const supabase = await criarClienteSupabaseServer();
    const tarefa = await carregarTarefaManutencao(
      supabase,
      escopo,
      textoObrigatorio(formData, "tarefaId", "manutencao")
    );
    const status = validarStatusManutencao(textoObrigatorio(formData, "status", "status"));

    const { error } = await supabase
      .from("maintenance_tasks")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : tarefa.completed_at,
        completed_by: status === "completed" ? escopo.userId : tarefa.completed_by
      })
      .eq("id", tarefa.id)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarInventario();
  } catch (erro) {
    redirecionarComErro(erro, "Erro ao alterar status da manutencao.");
  }

  redirect(`${CAMINHO_INVENTARIO}?sucesso=status-manutencao`);
}

async function obterEntradaItem(
  supabase: ClienteSupabaseServer,
  escopo: EscopoInventario,
  formData: FormData
): Promise<EntradaItemInventario> {
  const propertyId = textoObrigatorio(formData, "propertyId", "propriedade");
  const unitId = textoOpcional(formData, "unitId");
  await carregarPropriedadeInventario(supabase, escopo, propertyId);
  if (unitId) await carregarUnidadeInventario(supabase, escopo, unitId, propertyId);

  return {
    category: validarCategoria(textoObrigatorio(formData, "category", "categoria")),
    conservationState: validarEstado(textoObrigatorio(formData, "conservationState", "estado")),
    estimatedValue: numeroMoeda(formData, "estimatedValue", "valor estimado"),
    imageUrl: textoOpcional(formData, "imageUrl"),
    name: textoObrigatorio(formData, "name", "nome"),
    notes: textoOpcional(formData, "notes"),
    propertyId,
    quantity: numeroInteiro(formData, "quantity", "quantidade", 0),
    unitId
  };
}

async function obterEntradaManutencao(
  supabase: ClienteSupabaseServer,
  escopo: EscopoInventario,
  formData: FormData
): Promise<EntradaManutencao> {
  const propertyId = textoObrigatorio(formData, "propertyId", "propriedade");
  const unitId = textoOpcional(formData, "unitId");
  const inventoryItemId = textoOpcional(formData, "inventoryItemId");
  await carregarPropriedadeInventario(supabase, escopo, propertyId);
  if (unitId) await carregarUnidadeInventario(supabase, escopo, unitId, propertyId);
  if (inventoryItemId) await carregarItemInventario(supabase, escopo, inventoryItemId);

  return {
    assignedTo: textoOpcional(formData, "assignedTo"),
    inventoryItemId,
    maintenanceType: validarTipoManutencao(textoObrigatorio(formData, "maintenanceType", "tipo")),
    notes: textoOpcional(formData, "notes"),
    priority: validarPrioridade(textoObrigatorio(formData, "priority", "prioridade")),
    propertyId,
    scheduledFor: dataOpcional(formData, "scheduledFor"),
    status: validarStatusManutencao(textoObrigatorio(formData, "status", "status")),
    title: textoObrigatorio(formData, "title", "titulo"),
    unitId
  };
}

function validarCategoria(valor: string): InventoryItemCategory {
  if (CATEGORIAS_INVENTARIO.includes(valor as InventoryItemCategory)) return valor as InventoryItemCategory;
  throw new ErroRegraInventario("Categoria de inventario invalida.");
}

function validarEstado(valor: string): InventoryConservationState {
  if (ESTADOS_CONSERVACAO.includes(valor as InventoryConservationState)) return valor as InventoryConservationState;
  throw new ErroRegraInventario("Estado de conservacao invalido.");
}

function validarTipoManutencao(valor: string): MaintenanceTaskType {
  if (TIPOS_MANUTENCAO.includes(valor as MaintenanceTaskType)) return valor as MaintenanceTaskType;
  throw new ErroRegraInventario("Tipo de manutencao invalido.");
}

function validarPrioridade(valor: string): MaintenanceTaskPriority {
  if (PRIORIDADES_MANUTENCAO.includes(valor as MaintenanceTaskPriority)) return valor as MaintenanceTaskPriority;
  throw new ErroRegraInventario("Prioridade invalida.");
}

function validarStatusManutencao(valor: string): MaintenanceTaskStatus {
  if (STATUS_MANUTENCAO.includes(valor as MaintenanceTaskStatus)) return valor as MaintenanceTaskStatus;
  throw new ErroRegraInventario("Status de manutencao invalido.");
}

function exigirConfirmacaoExclusao(formData: FormData) {
  if (formData.get("confirmarExclusao") !== "confirmado") {
    throw new ErroRegraInventario("Confirme a exclusao do item.");
  }
}

function dataOpcional(formData: FormData, chave: string): string | null {
  const valor = textoOpcional(formData, chave);
  if (!valor) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new ErroRegraInventario("Informe uma data valida.");
  return valor;
}

function textoObrigatorio(formData: FormData, chave: string, label: string): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraInventario(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function numeroInteiro(formData: FormData, chave: string, label: string, minimo: number): number {
  const valor = Number.parseInt(textoObrigatorio(formData, chave, label), 10);
  if (Number.isNaN(valor) || valor < minimo) throw new ErroRegraInventario(`Informe ${label} valida.`);
  return valor;
}

function numeroMoeda(formData: FormData, chave: string, label: string): number {
  const valor = Number.parseFloat(textoObrigatorio(formData, chave, label).replace(",", "."));
  if (Number.isNaN(valor) || valor < 0) throw new ErroRegraInventario(`Informe ${label} valido.`);
  return valor;
}

function redirecionarComErro(erro: unknown, mensagemLog: string): never {
  const mensagem =
    erro instanceof ErroRegraInventario ? erro.message : "Nao foi possivel concluir a operacao.";

  if (!(erro instanceof ErroRegraInventario)) console.error(mensagemLog, erro);
  redirect(`${CAMINHO_INVENTARIO}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarInventario() {
  revalidatePath(CAMINHO_INVENTARIO);
}
