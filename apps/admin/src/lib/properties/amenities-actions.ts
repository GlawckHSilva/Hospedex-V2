"use server";

import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import {
  CAMINHO_PROPRIEDADES,
  redirecionarComErro,
  revalidarModuloPropriedades,
  textoObrigatorio
} from "./feedback";
import {
  carregarEscopoGerenciamento,
  carregarPropriedadeGerenciavel
} from "./permissions";

/**
 * Actions de comodidades.
 *
 * Comodidades globais têm tenant_id nulo e podem ser reutilizadas por qualquer
 * tenant; o vínculo com a propriedade continua isolado por tenant_id.
 */

export async function atualizarComodidadesPropriedadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const propriedadeId = textoObrigatorio(formData, "propriedadeId", "propriedade");
    const comodidadeIds = formData
      .getAll("comodidadeIds")
      .map((valor) => valor.toString())
      .filter(Boolean);
    const supabase = await criarClienteSupabaseServer();

    await carregarPropriedadeGerenciavel(supabase, escopo, propriedadeId);

    const { data: comodidadesValidas, error: erroComodidades } = await supabase
      .from("amenities")
      .select("id")
      .in("id", comodidadeIds.length ? comodidadeIds : ["00000000-0000-0000-0000-000000000000"])
      .or(`tenant_id.is.null,tenant_id.eq.${escopo.tenantId}`)
      .returns<Array<{ id: string }>>();

    if (erroComodidades) throw new Error(erroComodidades.message);

    const idsValidos = new Set((comodidadesValidas ?? []).map((comodidade) => comodidade.id));
    const novosVinculos = comodidadeIds
      .filter((id) => idsValidos.has(id))
      .map((amenityId) => ({
        amenity_id: amenityId,
        property_id: propriedadeId,
        tenant_id: escopo.tenantId
      }));

    const { error: erroLimpeza } = await supabase
      .from("property_amenities")
      .delete()
      .eq("tenant_id", escopo.tenantId)
      .eq("property_id", propriedadeId);

    if (erroLimpeza) throw new Error(erroLimpeza.message);

    if (novosVinculos.length) {
      const { error } = await supabase.from("property_amenities").insert(novosVinculos);
      if (error) throw new Error(error.message);
    }

    revalidarModuloPropriedades();
  } catch (erro) {
    redirecionarComErro(CAMINHO_PROPRIEDADES, erro, "Erro ao atualizar comodidades.");
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=comodidades-atualizadas`);
}
