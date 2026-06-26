import type {
  AmenityRow,
  JsonValue,
  LicenseRow,
  MediaAssetRow,
  PlanRow,
  PropertyAmenityRow,
  PropertyRow,
  PropertySettingRow
} from "@hospedex/types";

import type { ContextoAutenticacao } from "../auth/types";
import { criarClienteSupabaseServer } from "../supabase/server";
import type {
  DadosModuloPropriedades,
  DetalhesPublicosPropriedade,
  EnderecoPropriedade,
  EstruturaPropriedade,
  LimitesPlanoPropriedades,
  PropriedadeComRelacionamentos,
  ValoresPropriedade
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

type PlanoLimiteRow = Pick<PlanRow, "name" | "max_properties">;
type LicencaLimiteRow = Pick<LicenseRow, "limits" | "status">;

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
      podeGerenciar: false
    };
  }

  const supabase = await criarClienteSupabaseServer();
  const [
    propriedadesResultado,
    configuracoesResultado,
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
      .from("property_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .returns<PropertySettingRow[]>(),
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
  registrarErroLeitura("regras das casas", configuracoesResultado.error);
  registrarErroLeitura("imagens", imagensResultado.error);
  registrarErroLeitura("comodidades", comodidadesResultado.error);
  registrarErroLeitura("vínculos de comodidades", vinculosComodidadesResultado.error);

  const propriedades = montarPropriedades(
    propriedadesResultado.data ?? [],
    configuracoesResultado.data ?? [],
    imagensResultado.data ?? [],
    comodidadesResultado.data ?? [],
    vinculosComodidadesResultado.data ?? []
  );

  return {
    propriedades,
    comodidadesDisponiveis: comodidadesResultado.data ?? [],
    limitesPlano: {
      ...limitesPlano,
      propriedadesUsadas: propriedades.length
    },
    podeGerenciar: podeGerenciarPropriedades(contexto)
  };
}

export async function carregarLimitesPlano(
  tenantId: string
): Promise<Omit<LimitesPlanoPropriedades, "propriedadesUsadas">> {
  const supabase = await criarClienteSupabaseServer();
  const hoje = new Date().toISOString().slice(0, 10);
  const [assinaturaResultado, licencaResultado] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan_id,status")
      .eq("tenant_id", tenantId)
      .in("status", ["trialing", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<SubscriptionPlanoRow>(),
    supabase
      .from("licenses")
      .select("limits,status")
      .eq("tenant_id", tenantId)
      .in("status", ["trial", "active"])
      .lte("starts_at", hoje)
      .or(`expires_at.is.null,expires_at.gte.${hoje}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<LicencaLimiteRow>()
  ]);

  if (assinaturaResultado.error) {
    registrarErroLeitura("assinatura do plano", assinaturaResultado.error);
  }
  if (licencaResultado.error) {
    registrarErroLeitura("licenca do tenant", licencaResultado.error);
  }

  const assinatura = assinaturaResultado.data;
  const limiteLicenca = obterLimitePropriedadesLicenca(licencaResultado.data?.limits);

  if (!assinatura?.plan_id) return criarLimitesPlanoPadrao();

  const { data: plano, error: erroPlano } = await supabase
    .from("plans")
    .select("name,max_properties")
    .eq("id", assinatura.plan_id)
    .maybeSingle<PlanoLimiteRow>();

  if (erroPlano) {
    registrarErroLeitura("limites do plano", erroPlano);
  }

  return {
    nomePlano: plano?.name ?? "Plano padrão",
    maxPropriedades: limiteLicenca ?? plano?.max_properties ?? LIMITE_PADRAO_PLANO
  };
}

export function normalizarEndereco(valor: JsonValue): EnderecoPropriedade {
  const endereco = valorEhObjeto(valor) ? valor : {};

  return {
    bairro: obterTextoJson(endereco, "bairro"),
    cidade: obterTextoJson(endereco, "cidade"),
    cep: obterTextoJson(endereco, "cep"),
    complemento: obterTextoJson(endereco, "complemento"),
    estado: obterTextoJson(endereco, "estado"),
    googleMapsLink: obterTextoJson(endereco, "googleMapsLink"),
    latitude: obterNumeroJsonOuNulo(endereco, "latitude"),
    linha1: obterTextoJson(endereco, "linha1"),
    longitude: obterNumeroJsonOuNulo(endereco, "longitude"),
    numero: obterTextoJson(endereco, "numero"),
    referencia: obterTextoJson(endereco, "referencia")
  };
}

function montarPropriedades(
  propriedades: PropertyRow[],
  configuracoes: PropertySettingRow[],
  imagens: MediaAssetRow[],
  comodidades: AmenityRow[],
  vinculosComodidades: PropertyAmenityRow[]
): PropriedadeComRelacionamentos[] {
  const configuracoesPorPropriedade = indexarPorPropriedade(configuracoes);
  const imagensPorPropriedade = agruparPorPropriedade(imagens);
  const comodidadesPorPropriedade = montarComodidadesPorPropriedade(
    comodidades,
    vinculosComodidades
  );

  return propriedades.map((propriedade) => ({
    ...propriedade,
    detalhesPublicos: normalizarDetalhesPublicos(propriedade.public_details),
    enderecoFormatado: normalizarEndereco(propriedade.address),
    estrutura: normalizarEstrutura(propriedade.structure_details),
    imagemCapa: obterImagemPrincipal(imagensPorPropriedade.get(propriedade.id) ?? []),
    imagens: imagensPorPropriedade.get(propriedade.id) ?? [],
    comodidades: comodidadesPorPropriedade.get(propriedade.id) ?? [],
    regras:
      configuracoesPorPropriedade.get(propriedade.id) ??
      criarRegrasPadrao(propriedade),
    valores: normalizarValores(propriedade.pricing_details)
  }));
}

function indexarPorPropriedade<TItem extends { property_id: string | null }>(
  itens: TItem[]
) {
  const indice = new Map<string, TItem>();

  for (const item of itens) {
    if (!item.property_id) continue;
    indice.set(item.property_id, item);
  }

  return indice;
}

function agruparPorPropriedade<TItem extends { property_id: string | null }>(
  itens: TItem[]
) {
  const grupos = new Map<string, TItem[]>();

  for (const item of itens) {
    if (!item.property_id) continue;
    const grupo = grupos.get(item.property_id) ?? [];
    grupo.push(item);
    grupos.set(item.property_id, grupo);
  }

  return grupos;
}

function normalizarEstrutura(valor: JsonValue): EstruturaPropriedade {
  const estrutura = valorEhObjeto(valor) ? valor : {};

  return {
    areaExterna: obterBooleanoJson(estrutura, "areaExterna"),
    banheiros: obterNumeroJson(estrutura, "banheiros"),
    camas: obterNumeroJson(estrutura, "camas"),
    churrasqueira: obterBooleanoJson(estrutura, "churrasqueira"),
    garagemVagas: obterNumeroJson(estrutura, "garagemVagas"),
    hospedesMaximos: obterNumeroJson(estrutura, "hospedesMaximos", 1),
    piscina: obterBooleanoJson(estrutura, "piscina"),
    quartos: obterNumeroJson(estrutura, "quartos")
  };
}

function normalizarValores(valor: JsonValue): ValoresPropriedade {
  const valores = valorEhObjeto(valor) ? valor : {};

  return {
    aceitaCartaoCredito: obterBooleanoJson(valores, "aceitaCartaoCredito"),
    caucao: obterNumeroJson(valores, "caucao"),
    cobraHospedeExtra: obterBooleanoJson(valores, "cobraHospedeExtra"),
    hospedesInclusos: obterNumeroJson(valores, "hospedesInclusos", 1),
    jurosParcelasCartao: normalizarJurosParcelas(valores.jurosParcelasCartao ?? null),
    maxParcelasCartao: obterNumeroJson(valores, "maxParcelasCartao", 1),
    taxaLimpeza: obterNumeroJson(valores, "taxaLimpeza"),
    valorDiaria: obterNumeroJson(valores, "valorDiaria"),
    valorHospedeExtra: obterNumeroJson(valores, "valorHospedeExtra")
  };
}

function normalizarJurosParcelas(valor: JsonValue) {
  if (!Array.isArray(valor)) return [];

  return valor
    .map((item) => {
      if (!valorEhObjeto(item)) return null;
      return {
        jurosPercentual: obterNumeroJson(item, "jurosPercentual"),
        parcela: obterNumeroJson(item, "parcela")
      };
    })
    .filter((item): item is { jurosPercentual: number; parcela: number } =>
      Boolean(item && item.parcela > 0)
    );
}

function normalizarDetalhesPublicos(valor: JsonValue): DetalhesPublicosPropriedade {
  const detalhes = valorEhObjeto(valor) ? valor : {};

  return {
    descricaoPublica:
      obterTextoJson(detalhes, "publicDescription") ||
      obterTextoJson(detalhes, "descricaoPublica"),
    imagemCompartilhamento:
      obterTextoJson(detalhes, "shareImageUrl") ||
      obterTextoJson(detalhes, "imagemCompartilhamento"),
    nomeExibicao:
      obterTextoJson(detalhes, "displayName") ||
      obterTextoJson(detalhes, "nomeExibicao"),
    tituloPublico:
      obterTextoJson(detalhes, "publicTitle") ||
      obterTextoJson(detalhes, "tituloPublico")
  };
}

function criarRegrasPadrao(propriedade: PropertyRow): PropertySettingRow {
  const capacidade = normalizarEstrutura(propriedade.structure_details).hospedesMaximos;

  return {
    additional_rules: null,
    allow_children: true,
    allow_events: false,
    allow_pets: false,
    allow_smoking: false,
    booking_mode: "manual_approval",
    cancellation_late_refund_percentage: 50,
    cancellation_late_until_days: 1,
    cancellation_no_refund_within_days: 0,
    cancellation_notes: null,
    cancellation_refund_until_days: 7,
    cancellation_refund_until_percentage: 100,
    check_in_time: null,
    check_out_time: null,
    created_at: propriedade.created_at,
    id: `padrao-${propriedade.id}`,
    internal_notes: null,
    max_advance_days: null,
    max_guests: capacidade,
    max_nights: null,
    min_advance_days: 0,
    min_nights: 1,
    min_responsible_age: 18,
    property_id: propriedade.id,
    settings: {},
    special_instructions: null,
    tenant_id: propriedade.tenant_id,
    updated_at: propriedade.updated_at
  };
}

function montarComodidadesPorPropriedade(
  comodidades: AmenityRow[],
  vinculos: PropertyAmenityRow[]
) {
  const comodidadesPorId = new Map(
    comodidades.map((comodidade) => [comodidade.id, comodidade])
  );
  const resultado = new Map<string, AmenityRow[]>();

  for (const vinculo of vinculos) {
    const comodidade = comodidadesPorId.get(vinculo.amenity_id);
    if (!comodidade) continue;

    const lista = resultado.get(vinculo.property_id) ?? [];
    lista.push(comodidade);
    resultado.set(vinculo.property_id, lista);
  }

  return resultado;
}

function obterImagemPrincipal(imagens: MediaAssetRow[]) {
  return imagens.find((imagem) => imagem.is_cover) ?? imagens[0] ?? null;
}

function criarLimitesPlanoPadrao() {
  return {
    nomePlano: "Plano padrão",
    maxPropriedades: LIMITE_PADRAO_PLANO,
    propriedadesUsadas: 0
  };
}

function obterLimitePropriedadesLicenca(limites: JsonValue | undefined): number | null {
  if (!limites || !valorEhObjeto(limites)) return null;

  const maxPropriedades = limites.max_properties;
  if (typeof maxPropriedades !== "number" || !Number.isFinite(maxPropriedades)) {
    return null;
  }

  // O limite da licenca e o override administrativo do Super Admin para o tenant.
  // Ele prevalece sobre o plano para o Gerenciamento refletir mudancas imediatamente.
  return Math.max(1, Math.trunc(maxPropriedades));
}

function obterTextoJson(valor: Record<string, JsonValue>, chave: string): string {
  const dado = valor[chave];
  return typeof dado === "string" ? dado : "";
}

function obterNumeroJson(
  valor: Record<string, JsonValue>,
  chave: string,
  padrao = 0
): number {
  const dado = valor[chave];
  return typeof dado === "number" && Number.isFinite(dado) ? dado : padrao;
}

function obterNumeroJsonOuNulo(
  valor: Record<string, JsonValue>,
  chave: string
): number | null {
  const dado = valor[chave];
  return typeof dado === "number" && Number.isFinite(dado) ? dado : null;
}

function obterBooleanoJson(valor: Record<string, JsonValue>, chave: string): boolean {
  return valor[chave] === true;
}

function valorEhObjeto(valor: JsonValue): valor is Record<string, JsonValue> {
  return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function registrarErroLeitura(modulo: string, erro: { message: string } | null) {
  if (!erro) return;
  console.error(`Erro ao carregar ${modulo} do tenant.`, erro.message);
}
