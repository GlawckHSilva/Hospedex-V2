import type {
  AmenityRow,
  JsonValue,
  MediaAssetRow,
  PlanRow,
  PropertyAmenityRow,
  PropertyRow,
  UnitCategoryRow,
  UnitRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  DadosModuloPropriedades,
  EnderecoPropriedade,
  LimitesPlanoPropriedades,
  PropriedadeComRelacionamentos,
  UnidadeComCategoria
} from "./types";

/**
 * Camada de leitura do módulo de Propriedades.
 *
 * Todas as consultas recebem o contexto autenticado para manter o isolamento por
 * tenant também na aplicação. A RLS do Supabase continua sendo a última barreira.
 */

const LIMITE_PADRAO_PLANO = 1;

type SubscriptionPlanoRow = {
  plan_id: string;
  status: string;
};

type PlanoLimiteRow = Pick<PlanRow, "name" | "max_properties" | "max_units">;

export function podeLerPropriedades(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("properties.read");
}

export function podeGerenciarPropriedades(contexto: ContextoAutenticacao): boolean {
  if (contexto.role === "owner") return true;
  return contexto.permissions.includes("properties.manage");
}

export async function carregarDadosModuloPropriedades(
  contexto: ContextoAutenticacao
): Promise<DadosModuloPropriedades> {
  const tenantId = contexto.tenant?.id;

  if (!tenantId) {
    return {
      propriedades: [],
      comodidadesDisponiveis: [],
      limitesPlano: criarLimitesPlanoPadrao(),
      podeGerenciar: false,
      multiUnidadesAtivo: false
    };
  }

  const supabase = await criarClienteSupabaseServer();
  const [
    propriedadesResultado,
    unidadesResultado,
    categoriasResultado,
    imagensResultado,
    comodidadesResultado,
    vinculosComodidadesResultado,
    limitesPlano
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .returns<PropertyRow[]>(),
    supabase
      .from("units")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .returns<UnitRow[]>(),
    supabase
      .from("unit_categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .returns<UnitCategoryRow[]>(),
    supabase
      .from("media_assets")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("media_type", "image")
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .returns<MediaAssetRow[]>(),
    supabase
      .from("amenities")
      .select("*")
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .order("name", { ascending: true })
      .returns<AmenityRow[]>(),
    supabase
      .from("property_amenities")
      .select("*")
      .eq("tenant_id", tenantId)
      .returns<PropertyAmenityRow[]>(),
    carregarLimitesPlano(tenantId)
  ]);

  registrarErroLeitura("propriedades", propriedadesResultado.error);
  registrarErroLeitura("unidades", unidadesResultado.error);
  registrarErroLeitura("categorias de unidade", categoriasResultado.error);
  registrarErroLeitura("imagens", imagensResultado.error);
  registrarErroLeitura("comodidades", comodidadesResultado.error);
  registrarErroLeitura("vínculos de comodidades", vinculosComodidadesResultado.error);

  const propriedades = montarPropriedades(
    propriedadesResultado.data ?? [],
    unidadesResultado.data ?? [],
    categoriasResultado.data ?? [],
    imagensResultado.data ?? [],
    comodidadesResultado.data ?? [],
    vinculosComodidadesResultado.data ?? []
  );

  return {
    propriedades,
    comodidadesDisponiveis: comodidadesResultado.data ?? [],
    limitesPlano: {
      ...limitesPlano,
      propriedadesUsadas: propriedades.length,
      unidadesUsadas: propriedades.reduce(
        (total, propriedade) => total + propriedade.unidades.length,
        0
      )
    },
    podeGerenciar: podeGerenciarPropriedades(contexto),
    multiUnidadesAtivo: Boolean(contexto.featureFlags.multi_unit)
  };
}

export async function carregarLimitesPlano(
  tenantId: string
): Promise<Omit<LimitesPlanoPropriedades, "propriedadesUsadas" | "unidadesUsadas">> {
  const supabase = await criarClienteSupabaseServer();
  const { data: assinatura, error: erroAssinatura } = await supabase
    .from("subscriptions")
    .select("plan_id,status")
    .eq("tenant_id", tenantId)
    .in("status", ["trialing", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionPlanoRow>();

  if (erroAssinatura) {
    registrarErroLeitura("assinatura do plano", erroAssinatura);
  }

  if (!assinatura?.plan_id) return criarLimitesPlanoPadrao();

  const { data: plano, error: erroPlano } = await supabase
    .from("plans")
    .select("name,max_properties,max_units")
    .eq("id", assinatura.plan_id)
    .maybeSingle<PlanoLimiteRow>();

  if (erroPlano) {
    registrarErroLeitura("limites do plano", erroPlano);
  }

  return {
    nomePlano: plano?.name ?? "Plano padrão",
    maxPropriedades: plano?.max_properties ?? LIMITE_PADRAO_PLANO,
    maxUnidades: plano?.max_units ?? LIMITE_PADRAO_PLANO
  };
}

export function normalizarEndereco(valor: JsonValue): EnderecoPropriedade {
  const endereco = valorEhObjeto(valor) ? valor : {};

  return {
    linha1: obterTextoJson(endereco, "linha1"),
    cidade: obterTextoJson(endereco, "cidade"),
    estado: obterTextoJson(endereco, "estado")
  };
}

function montarPropriedades(
  propriedades: PropertyRow[],
  unidades: UnitRow[],
  categorias: UnitCategoryRow[],
  imagens: MediaAssetRow[],
  comodidades: AmenityRow[],
  vinculosComodidades: PropertyAmenityRow[]
): PropriedadeComRelacionamentos[] {
  return propriedades.map((propriedade) => ({
    ...propriedade,
    enderecoFormatado: normalizarEndereco(propriedade.address),
    imagemCapa: obterImagemPrincipal(propriedade.id, null, imagens),
    imagens: imagens.filter(
      (imagem) => imagem.property_id === propriedade.id && !imagem.unit_id
    ),
    comodidades: montarComodidades(propriedade.id, comodidades, vinculosComodidades),
    unidades: montarUnidades(propriedade.id, unidades, categorias, imagens)
  }));
}

function montarUnidades(
  propriedadeId: string,
  unidades: UnitRow[],
  categorias: UnitCategoryRow[],
  imagens: MediaAssetRow[]
): UnidadeComCategoria[] {
  return unidades
    .filter((unidade) => unidade.property_id === propriedadeId)
    .map((unidade) => ({
      ...unidade,
      categoria:
        categorias.find((categoria) => categoria.id === unidade.unit_category_id) ?? null,
      imagens: imagens.filter((imagem) => imagem.unit_id === unidade.id)
    }));
}

function montarComodidades(
  propriedadeId: string,
  comodidades: AmenityRow[],
  vinculos: PropertyAmenityRow[]
) {
  const idsAtivos = new Set(
    vinculos
      .filter((vinculo) => vinculo.property_id === propriedadeId)
      .map((vinculo) => vinculo.amenity_id)
  );

  return comodidades.filter((comodidade) => idsAtivos.has(comodidade.id));
}

function obterImagemPrincipal(
  propriedadeId: string,
  unidadeId: string | null,
  imagens: MediaAssetRow[]
) {
  const imagensDaEntidade = imagens.filter(
    (imagem) => imagem.property_id === propriedadeId && imagem.unit_id === unidadeId
  );

  return (
    imagensDaEntidade.find((imagem) => imagem.is_cover) ??
    imagensDaEntidade[0] ??
    null
  );
}

function criarLimitesPlanoPadrao() {
  return {
    nomePlano: "Plano padrão",
    maxPropriedades: LIMITE_PADRAO_PLANO,
    maxUnidades: LIMITE_PADRAO_PLANO,
    propriedadesUsadas: 0,
    unidadesUsadas: 0
  };
}

function obterTextoJson(valor: Record<string, JsonValue>, chave: string): string {
  const dado = valor[chave];
  return typeof dado === "string" ? dado : "";
}

function valorEhObjeto(valor: JsonValue): valor is Record<string, JsonValue> {
  return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function registrarErroLeitura(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  console.error(`Erro ao carregar ${modulo} do tenant.`, erro.message);
}
