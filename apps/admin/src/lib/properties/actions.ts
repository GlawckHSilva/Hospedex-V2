"use server";

import type {
  PropertyRow,
  PropertyStatus,
  PropertyType,
  UnitCategoryRow,
  UnitRow,
  UnitStatus,
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import { carregarLimitesPlano } from "./data";
import {
  enviarImagemParaStorage,
  obterArquivoImagem,
  obterArquivosImagem,
  removerImagemDoStorage,
} from "./media-storage";
import {
  carregarEscopoGerenciamento,
  carregarPropriedadeGerenciavel,
  ErroRegraNegocio,
  type ClienteSupabaseServer,
  type EscopoGerenciamento,
} from "./permissions";
import type { EnderecoPropriedade } from "./types";

/**
 * Server actions do módulo de Propriedades e Unidades.
 *
 * As regras de tenant, owner, plano e feature flag ficam no servidor porque o
 * cliente nunca deve decidir sozinho o que pode ser gravado em um SaaS multi-tenant.
 */

const CAMINHO_PROPRIEDADES = "/propriedades";
const CAMINHO_UNIDADES = "/unidades";
const STATUS_PROPRIEDADE: PropertyStatus[] = ["draft", "published", "paused"];
const TIPOS_PROPRIEDADE: PropertyType[] = [
  "seasonal_home",
  "inn",
  "small_hotel",
];
const STATUS_UNIDADE: UnitStatus[] = ["active", "inactive", "maintenance"];
const CATEGORIAS_UNIDADE = ["Standard", "Luxo", "Master"];
const MAX_PARCELAS_CARTAO = 12;

type EntradaPropriedade = {
  endereco: EnderecoPropriedade;
  estrutura: {
    areaExterna: boolean;
    banheiros: number;
    camas: number;
    churrasqueira: boolean;
    garagemVagas: number;
    hospedesMaximos: number;
    piscina: boolean;
    quartos: number;
  };
  comodidadeIds: string[];
  comodidadesPersonalizadas: string[];
  descricaoCompleta: string | null;
  descricaoCurta: string | null;
  destaqueMarketplace: boolean;
  galeriaArquivos: File[];
  galeriaIndicePrincipal: number | null;
  galeriaOrdens: number[];
  galeriaTitulos: string[];
  imagemCapaArquivo: File | null;
  nome: string;
  publica: boolean;
  regras: {
    checkInTime: string | null;
    checkOutTime: string | null;
    permiteEventos: boolean;
    permiteFumantes: boolean;
    permitePets: boolean;
    regrasAdicionais: string | null;
  };
  status: PropertyStatus;
  tipo: PropertyType;
  valores: {
    aceitaCartaoCredito: boolean;
    caucao: number;
    hospedesInclusos: number;
    jurosParcelasCartao: Array<{
      jurosPercentual: number;
      parcela: number;
    }>;
    maxParcelasCartao: number;
    taxaLimpeza: number;
    valorDiaria: number;
    valorHospedeExtra: number;
  };
};

type EntradaUnidade = {
  propriedadeId: string;
  nome: string;
  categoria: string;
  imagensArquivos: File[];
  capacidade: number;
  quartos: number;
  camas: number;
  banheiros: number;
  valorBase: number;
  status: UnitStatus;
};

export async function criarPropriedadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const entrada = obterEntradaPropriedade(formData);
    const supabase = await criarClienteSupabaseServer();

    await garantirLimitePropriedades(supabase, escopo.tenantId);
    if (!escopo.contexto.featureFlags.multi_unit) {
      await garantirLimiteUnidades(supabase, escopo.tenantId);
    }

    const { data: propriedade, error } = await supabase
      .from("properties")
      .insert({
        tenant_id: escopo.tenantId,
        // O owner_id vem do tenant, não do usuário logado, para equipe criar sem virar dona do imóvel.
        owner_id: escopo.ownerId,
        name: entrada.nome,
        slug: gerarIdentificadorUrl(entrada.nome),
        property_type: entrada.tipo,
        status: entrada.status,
        headline: entrada.descricaoCurta ?? entrada.nome,
        description: entrada.descricaoCompleta ?? entrada.descricaoCurta,
        short_description: entrada.descricaoCurta,
        full_description: entrada.descricaoCompleta,
        is_public: entrada.publica,
        marketplace_featured: entrada.destaqueMarketplace,
        address: entrada.endereco,
        structure_details: entrada.estrutura,
        pricing_details: entrada.valores,
        timezone: "America/Sao_Paulo",
      })
      .select("*")
      .single<PropertyRow>();

    if (error || !propriedade) {
      throw new Error(
        error?.message ?? "Propriedade não retornada após criação.",
      );
    }

    if (!escopo.contexto.featureFlags.multi_unit) {
      await salvarUnidadePadraoCasa(supabase, escopo.tenantId, propriedade, entrada);
    }

    await salvarConfiguracoesDaCasa(supabase, escopo, propriedade.id, entrada);
    await salvarComodidadesDaCasa(supabase, escopo, propriedade.id, entrada);
    await salvarImagemCapa(supabase, escopo.tenantId, propriedade.id, entrada);
    await salvarGaleriaPropriedade(supabase, escopo.tenantId, propriedade.id, entrada);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(
      CAMINHO_PROPRIEDADES,
      erro,
      "Erro ao criar propriedade.",
    );
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=propriedade-criada`);
}

export async function atualizarPropriedadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const propriedadeId = textoObrigatorio(
      formData,
      "propriedadeId",
      "propriedade",
    );
    const entrada = obterEntradaPropriedade(formData);
    const supabase = await criarClienteSupabaseServer();

    const { data: propriedade, error } = await supabase
      .from("properties")
      .update({
        name: entrada.nome,
        property_type: entrada.tipo,
        status: entrada.status,
        headline: entrada.descricaoCurta ?? entrada.nome,
        description: entrada.descricaoCompleta ?? entrada.descricaoCurta,
        short_description: entrada.descricaoCurta,
        full_description: entrada.descricaoCompleta,
        is_public: entrada.publica,
        marketplace_featured: entrada.destaqueMarketplace,
        address: entrada.endereco,
        structure_details: entrada.estrutura,
        pricing_details: entrada.valores,
      })
      .eq("id", propriedadeId)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId)
      .select("*")
      .maybeSingle<PropertyRow>();

    if (error || !propriedade) {
      throw new ErroRegraNegocio(
        "Propriedade não encontrada para este tenant.",
      );
    }

    if (!escopo.contexto.featureFlags.multi_unit) {
      await salvarUnidadePadraoCasa(supabase, escopo.tenantId, propriedade, entrada);
    }

    await salvarConfiguracoesDaCasa(supabase, escopo, propriedade.id, entrada);
    await salvarComodidadesDaCasa(supabase, escopo, propriedade.id, entrada);
    await salvarImagemCapa(supabase, escopo.tenantId, propriedade.id, entrada);
    await salvarGaleriaPropriedade(supabase, escopo.tenantId, propriedade.id, entrada);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(
      CAMINHO_PROPRIEDADES,
      erro,
      "Erro ao atualizar propriedade.",
    );
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=propriedade-atualizada`);
}

export async function alternarStatusPropriedadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const propriedadeId = textoObrigatorio(
      formData,
      "propriedadeId",
      "propriedade",
    );
    const supabase = await criarClienteSupabaseServer();
    const propriedade = await carregarPropriedadeDoTenant(
      supabase,
      escopo,
      propriedadeId,
    );
    const statusDestino: PropertyStatus =
      propriedade.status === "paused" ? "published" : "paused";

    // Pausar preserva dados e unidades; arquivamento fica fora desta etapa para evitar perda operacional.
    const { error } = await supabase
      .from("properties")
      .update({ status: statusDestino })
      .eq("id", propriedade.id)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId);

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(CAMINHO_PROPRIEDADES, erro, "Erro ao alterar status.");
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=status-propriedade`);
}

export async function excluirPropriedadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    exigirConfirmacaoExclusao(formData);
    const propriedadeId = textoObrigatorio(
      formData,
      "propriedadeId",
      "propriedade",
    );
    const supabase = await criarClienteSupabaseServer();
    const propriedade = await carregarPropriedadeDoTenant(
      supabase,
      escopo,
      propriedadeId,
    );

    // A exclusão de propriedade é lógica para preservar histórico operacional,
    // reservas futuras e auditoria multi-tenant sem expor a propriedade nas listas.
    const { error } = await supabase
      .from("properties")
      .update({
        deleted_at: new Date().toISOString(),
        status: "archived",
      })
      .eq("id", propriedade.id)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId);

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(
      CAMINHO_PROPRIEDADES,
      erro,
      "Erro ao excluir propriedade.",
    );
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=propriedade-excluida`);
}

export async function atualizarRegrasCasaAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const propriedadeId = textoObrigatorio(formData, "propriedadeId", "propriedade");
    const supabase = await criarClienteSupabaseServer();
    await carregarPropriedadeGerenciavel(supabase, escopo, propriedadeId);

    const { error } = await supabase.from("property_settings").upsert(
      {
        tenant_id: escopo.tenantId,
        property_id: propriedadeId,
        check_in_time: validarHoraOpcional(formData, "checkInTime"),
        check_out_time: validarHoraOpcional(formData, "checkOutTime"),
        allow_pets: checkboxAtivo(formData, "allowPets"),
        allow_smoking: checkboxAtivo(formData, "allowSmoking"),
        allow_events: checkboxAtivo(formData, "allowEvents"),
        max_guests: numeroInteiro(formData, "maxGuests", "capacidade maxima", 1),
        min_responsible_age: numeroInteiro(
          formData,
          "minResponsibleAge",
          "idade minima",
          0
        ),
        additional_rules: textoOpcional(formData, "additionalRules")
      },
      { onConflict: "property_id" }
    );

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(CAMINHO_PROPRIEDADES, erro, "Erro ao atualizar regras da casa.");
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=regras-casa-atualizadas`);
}

export async function atualizarPoliticaCancelamentoAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const propriedadeId = textoObrigatorio(formData, "propriedadeId", "propriedade");
    const supabase = await criarClienteSupabaseServer();
    await carregarPropriedadeGerenciavel(supabase, escopo, propriedadeId);

    const { error } = await supabase.from("property_settings").upsert(
      {
        tenant_id: escopo.tenantId,
        property_id: propriedadeId,
        cancellation_refund_until_days: numeroInteiro(
          formData,
          "refundUntilDays",
          "dias para reembolso",
          0
        ),
        cancellation_refund_until_percentage: numeroPercentual(
          formData,
          "refundUntilPercentage",
          "percentual de reembolso"
        ),
        cancellation_late_until_days: numeroInteiro(
          formData,
          "lateUntilDays",
          "dias para reembolso tardio",
          0
        ),
        cancellation_late_refund_percentage: numeroPercentual(
          formData,
          "lateRefundPercentage",
          "percentual tardio"
        ),
        cancellation_no_refund_within_days: numeroInteiro(
          formData,
          "noRefundWithinDays",
          "periodo sem reembolso",
          0
        ),
        cancellation_notes: textoOpcional(formData, "cancellationNotes")
      },
      { onConflict: "property_id" }
    );

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(
      CAMINHO_PROPRIEDADES,
      erro,
      "Erro ao atualizar politica de cancelamento."
    );
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=politica-cancelamento-atualizada`);
}

export async function atualizarRegrasReservaAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const propriedadeId = textoObrigatorio(formData, "propriedadeId", "propriedade");
    const minNights = numeroInteiro(formData, "minNights", "minimo de diarias", 1);
    const maxNights = numeroInteiroOuNulo(formData, "maxNights", "maximo de diarias", 1);
    const minAdvanceDays = numeroInteiro(
      formData,
      "minAdvanceDays",
      "antecedencia minima",
      0
    );
    const maxAdvanceDays = numeroInteiroOuNulo(
      formData,
      "maxAdvanceDays",
      "antecedencia maxima",
      0
    );

    if (maxNights !== null && maxNights < minNights) {
      throw new ErroRegraNegocio("Maximo de diarias deve ser maior ou igual ao minimo.");
    }
    if (maxAdvanceDays !== null && maxAdvanceDays < minAdvanceDays) {
      throw new ErroRegraNegocio("Antecedencia maxima deve ser maior ou igual a minima.");
    }

    const supabase = await criarClienteSupabaseServer();
    await carregarPropriedadeGerenciavel(supabase, escopo, propriedadeId);

    const { error } = await supabase.from("property_settings").upsert(
      {
        tenant_id: escopo.tenantId,
        property_id: propriedadeId,
        min_nights: minNights,
        max_nights: maxNights,
        min_advance_days: minAdvanceDays,
        max_advance_days: maxAdvanceDays,
        booking_mode: validarModoReserva(textoObrigatorio(formData, "bookingMode", "modo de reserva"))
      },
      { onConflict: "property_id" }
    );

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(
      CAMINHO_PROPRIEDADES,
      erro,
      "Erro ao atualizar regras de reserva."
    );
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=regras-reserva-atualizadas`);
}

export async function criarUnidadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();
  const caminhoRetorno = obterCaminhoRetorno(formData);

  try {
    const entrada = obterEntradaUnidade(formData);
    const supabase = await criarClienteSupabaseServer();

    await carregarPropriedadeDoTenant(supabase, escopo, entrada.propriedadeId);
    await garantirLimiteUnidades(supabase, escopo.tenantId);
    await garantirRegraMultiUnidade(
      supabase,
      escopo.tenantId,
      entrada.propriedadeId,
      escopo.contexto.featureFlags.multi_unit,
    );

    const categoria = await criarOuObterCategoria(
      supabase,
      escopo.tenantId,
      entrada,
    );
    const { data: unidade, error } = await supabase
      .from("units")
      .insert({
        tenant_id: escopo.tenantId,
        property_id: entrada.propriedadeId,
        unit_category_id: categoria?.id ?? null,
        code: gerarIdentificadorUrl(entrada.nome),
        name: entrada.nome,
        status: entrada.status,
        capacity: entrada.capacidade,
        bedrooms: entrada.quartos,
        beds: entrada.camas,
        bathrooms: entrada.banheiros,
        base_price: entrada.valorBase,
      })
      .select("*")
      .single<UnitRow>();

    if (error || !unidade)
      throw new Error(error?.message ?? "Unidade não retornada.");
    await salvarImagensUnidade(supabase, escopo.tenantId, unidade, entrada);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao criar unidade.");
  }

  redirect(`${caminhoRetorno}?sucesso=unidade-criada`);
}

export async function atualizarUnidadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();
  const caminhoRetorno = obterCaminhoRetorno(formData);

  try {
    const unidadeId = textoObrigatorio(formData, "unidadeId", "unidade");
    const entrada = obterEntradaUnidade(formData);
    const supabase = await criarClienteSupabaseServer();
    const unidadeAtual = await carregarUnidadeDoTenant(
      supabase,
      escopo.tenantId,
      unidadeId,
    );

    await carregarPropriedadeDoTenant(supabase, escopo, entrada.propriedadeId);
    await garantirRegraMultiUnidade(
      supabase,
      escopo.tenantId,
      entrada.propriedadeId,
      escopo.contexto.featureFlags.multi_unit,
      unidadeId,
    );

    const categoria = await criarOuObterCategoria(
      supabase,
      escopo.tenantId,
      entrada,
    );
    const mudouPropriedade = unidadeAtual.property_id !== entrada.propriedadeId;
    const { error } = await supabase
      .from("units")
      .update({
        property_id: entrada.propriedadeId,
        unit_category_id: categoria?.id ?? null,
        code: mudouPropriedade
          ? gerarIdentificadorUrl(entrada.nome)
          : unidadeAtual.code,
        name: entrada.nome,
        status: entrada.status,
        capacity: entrada.capacidade,
        bedrooms: entrada.quartos,
        beds: entrada.camas,
        bathrooms: entrada.banheiros,
        base_price: entrada.valorBase,
      })
      .eq("id", unidadeId)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    await salvarImagensUnidade(
      supabase,
      escopo.tenantId,
      { id: unidadeId, property_id: entrada.propriedadeId },
      entrada,
    );
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao atualizar unidade.");
  }

  redirect(`${caminhoRetorno}?sucesso=unidade-atualizada`);
}

export async function alternarStatusUnidadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();
  const caminhoRetorno = obterCaminhoRetorno(formData);

  try {
    const unidadeId = textoObrigatorio(formData, "unidadeId", "unidade");
    const supabase = await criarClienteSupabaseServer();
    const unidade = await carregarUnidadeDoTenant(
      supabase,
      escopo.tenantId,
      unidadeId,
    );
    const statusDestino: UnitStatus =
      unidade.status === "active" ? "inactive" : "active";

    // A pausa operacional deixa a unidade fora do uso futuro sem apagar histórico ou categoria.
    const { error } = await supabase
      .from("units")
      .update({ status: statusDestino })
      .eq("id", unidade.id)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao alterar unidade.");
  }

  redirect(`${caminhoRetorno}?sucesso=status-unidade`);
}

export async function excluirUnidadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();
  const caminhoRetorno = obterCaminhoRetorno(formData);

  try {
    exigirConfirmacaoExclusao(formData);
    const unidadeId = textoObrigatorio(formData, "unidadeId", "unidade");
    const supabase = await criarClienteSupabaseServer();
    const unidade = await carregarUnidadeDoTenant(
      supabase,
      escopo.tenantId,
      unidadeId,
    );
    await carregarPropriedadeDoTenant(supabase, escopo, unidade.property_id);
    await removerImagensDaUnidade(supabase, escopo.tenantId, unidade.id);

    // A unidade é excluída somente após validar tenant e propriedade. O schema atual
    // mantém FKs preparadas para preservar reservas com unit_id nulo quando necessário.
    const { error } = await supabase
      .from("units")
      .delete()
      .eq("id", unidade.id)
      .eq("tenant_id", escopo.tenantId);

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(caminhoRetorno, erro, "Erro ao excluir unidade.");
  }

  redirect(`${caminhoRetorno}?sucesso=unidade-excluida`);
}

function obterEntradaPropriedade(formData: FormData): EntradaPropriedade {
  const hospedesMaximos = numeroInteiro(
    formData,
    "hospedesMaximos",
    "quantidade maxima de hospedes",
    1,
  );
  const quartos = numeroInteiroOpcional(formData, "quartosCasa", 0, 0);
  const camas = numeroInteiroOpcional(formData, "camasCasa", 1, 1);
  const banheiros = numeroInteiroOpcional(formData, "banheirosCasa", 0, 0);
  const valorDiaria = numeroMoedaOpcional(formData, "valorDiaria", 0);

  return {
    endereco: {
      bairro: textoOpcional(formData, "bairro") ?? "",
      cep: textoOpcional(formData, "cep") ?? "",
      cidade: textoObrigatorio(formData, "cidade", "cidade"),
      complemento: textoOpcional(formData, "complemento") ?? "",
      estado: textoObrigatorio(formData, "estado", "estado"),
      googleMapsLink: textoOpcional(formData, "googleMapsLink") ?? "",
      linha1: textoObrigatorio(formData, "endereco", "endereco"),
      numero: textoOpcional(formData, "numero") ?? "",
      referencia: textoOpcional(formData, "referencia") ?? "",
    },
    estrutura: {
      areaExterna: checkboxAtivo(formData, "areaExterna"),
      banheiros,
      camas,
      churrasqueira: checkboxAtivo(formData, "churrasqueira"),
      garagemVagas: numeroInteiroOpcional(formData, "garagemVagas", 0, 0),
      hospedesMaximos,
      piscina: checkboxAtivo(formData, "piscina"),
      quartos,
    },
    comodidadeIds: obterValoresMultiplos(formData, "comodidadeIds"),
    comodidadesPersonalizadas: obterComodidadesPersonalizadas(formData),
    descricaoCompleta: textoOpcional(formData, "descricaoCompleta"),
    descricaoCurta: textoOpcional(formData, "descricaoCurta"),
    destaqueMarketplace: checkboxAtivo(formData, "destaqueMarketplace"),
    galeriaArquivos: obterArquivosImagem(formData, "imagensGaleriaArquivos"),
    galeriaIndicePrincipal: numeroInteiroOpcionalOuNulo(
      formData,
      "imagemPrincipalGaleriaIndice",
      0,
    ),
    galeriaOrdens: obterNumerosInteirosMultiplos(formData, "ordensGaleria"),
    galeriaTitulos: obterValoresMultiplos(formData, "titulosGaleria"),
    imagemCapaArquivo: obterArquivoImagem(formData, "imagemCapaArquivo"),
    nome: textoObrigatorio(formData, "nome", "nome"),
    publica: checkboxAtivo(formData, "visibilidadePublica"),
    regras: {
      checkInTime: validarHoraOpcional(formData, "checkInTime"),
      checkOutTime: validarHoraOpcional(formData, "checkOutTime"),
      permiteEventos: checkboxAtivo(formData, "allowEvents"),
      permiteFumantes: checkboxAtivo(formData, "allowSmoking"),
      permitePets: checkboxAtivo(formData, "allowPets"),
      regrasAdicionais: textoOpcional(formData, "additionalRules"),
    },
    status: validarStatusPropriedade(
      textoObrigatorio(formData, "status", "status"),
    ),
    tipo: validarTipoPropriedade(textoObrigatorio(formData, "tipo", "tipo")),
    valores: {
      aceitaCartaoCredito: checkboxAtivo(formData, "aceitaCartaoCredito"),
      caucao: numeroMoedaOpcional(formData, "caucao", 0),
      hospedesInclusos: numeroInteiroOpcional(formData, "hospedesInclusos", 1, 1),
      jurosParcelasCartao: obterJurosParcelasCartao(formData),
      maxParcelasCartao: Math.min(
        numeroInteiroOpcional(formData, "maxParcelasCartao", 1, 1),
        MAX_PARCELAS_CARTAO,
      ),
      taxaLimpeza: numeroMoedaOpcional(formData, "taxaLimpeza", 0),
      valorDiaria,
      valorHospedeExtra: numeroMoedaOpcional(formData, "valorHospedeExtra", 0),
    },
  };
}

function obterJurosParcelasCartao(formData: FormData) {
  if (!checkboxAtivo(formData, "aceitaCartaoCredito")) return [];

  const maxParcelas = Math.min(
    numeroInteiroOpcional(formData, "maxParcelasCartao", 1, 1),
    MAX_PARCELAS_CARTAO,
  );

  return Array.from({ length: maxParcelas }, (_, indice) => {
    const parcela = indice + 1;
    return {
      jurosPercentual: numeroPercentualOpcional(
        formData,
        `jurosParcela${parcela}`,
        0,
      ),
      parcela,
    };
  });
}

function obterComodidadesPersonalizadas(formData: FormData): string[] {
  const nomes = obterValoresMultiplos(formData, "comodidadesPersonalizadas");

  return Array.from(new Set(nomes)).map((nome) => {
    if (nome.length > 80) {
      throw new ErroRegraNegocio("Comodidade personalizada deve ter no maximo 80 caracteres.");
    }
    return nome;
  });
}


function obterEntradaUnidade(formData: FormData): EntradaUnidade {
  return {
    propriedadeId: textoObrigatorio(formData, "propriedadeId", "propriedade"),
    nome: textoObrigatorio(formData, "nome", "nome"),
    categoria: obterCategoriaUnidade(formData),
    imagensArquivos: obterArquivosImagem(formData, "imagensUnidadeArquivos"),
    capacidade: numeroInteiro(formData, "capacidade", "capacidade", 1),
    quartos: numeroInteiro(formData, "quartos", "quartos", 0),
    camas: numeroInteiro(formData, "camas", "camas", 1),
    banheiros: numeroInteiro(formData, "banheiros", "banheiros", 0),
    valorBase: numeroMoeda(formData, "valorBase", "valor base"),
    status: validarStatusUnidade(
      textoObrigatorio(formData, "status", "status"),
    ),
  };
}

async function salvarUnidadePadraoCasa(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedade: Pick<PropertyRow, "id">,
  entrada: EntradaPropriedade,
) {
  const dadosUnidade = {
    base_price: entrada.valores.valorDiaria,
    bathrooms: entrada.estrutura.banheiros,
    bedrooms: entrada.estrutura.quartos,
    beds: entrada.estrutura.camas,
    capacity: entrada.estrutura.hospedesMaximos,
    name: "Casa inteira",
    status: "active" as UnitStatus,
  };
  const { data: unidadeExistente, error: erroBusca } = await supabase
    .from("units")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedade.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<UnitRow>();

  if (erroBusca) throw new Error(erroBusca.message);

  if (unidadeExistente) {
    const { error } = await supabase
      .from("units")
      .update(dadosUnidade)
      .eq("id", unidadeExistente.id)
      .eq("tenant_id", tenantId);

    if (error) throw new Error(error.message);
    return;
  }

  /*
    Enquanto multiunidades estiver desligado, cada casa precisa de uma unidade
    interna para reservas, calendario e disponibilidade continuarem vinculados.
  */
  const { error } = await supabase.from("units").insert({
    ...dadosUnidade,
    code: "casa-inteira",
    property_id: propriedade.id,
    tenant_id: tenantId,
    unit_category_id: null,
  });

  if (error) throw new Error(error.message);
}

async function salvarConfiguracoesDaCasa(
  supabase: ClienteSupabaseServer,
  escopo: EscopoGerenciamento,
  propriedadeId: string,
  entrada: EntradaPropriedade,
) {
  const { error } = await supabase.from("property_settings").upsert(
    {
      additional_rules: entrada.regras.regrasAdicionais,
      allow_events: entrada.regras.permiteEventos,
      allow_pets: entrada.regras.permitePets,
      allow_smoking: entrada.regras.permiteFumantes,
      check_in_time: entrada.regras.checkInTime,
      check_out_time: entrada.regras.checkOutTime,
      max_guests: entrada.estrutura.hospedesMaximos,
      property_id: propriedadeId,
      tenant_id: escopo.tenantId,
    },
    { onConflict: "property_id" },
  );

  if (error) throw new Error(error.message);
}

async function salvarComodidadesDaCasa(
  supabase: ClienteSupabaseServer,
  escopo: EscopoGerenciamento,
  propriedadeId: string,
  entrada: EntradaPropriedade,
) {
  const idsPersonalizados = await obterOuCriarComodidadesPersonalizadas(
    supabase,
    escopo.tenantId,
    entrada.comodidadesPersonalizadas,
  );
  const idsValidos = await obterComodidadesValidas(
    supabase,
    escopo.tenantId,
    [...entrada.comodidadeIds, ...idsPersonalizados],
  );

  const { error: erroLimpeza } = await supabase
    .from("property_amenities")
    .delete()
    .eq("tenant_id", escopo.tenantId)
    .eq("property_id", propriedadeId);

  if (erroLimpeza) throw new Error(erroLimpeza.message);
  if (!idsValidos.length) return;

  const { error } = await supabase.from("property_amenities").insert(
    idsValidos.map((amenityId) => ({
      amenity_id: amenityId,
      property_id: propriedadeId,
      tenant_id: escopo.tenantId,
    })),
  );

  if (error) throw new Error(error.message);
}

async function obterOuCriarComodidadesPersonalizadas(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  nomes: string[],
) {
  const ids: string[] = [];

  for (const nome of nomes) {
    const code = normalizarCodigoUnico(nome);

    // Comodidade personalizada pertence ao tenant. Outro proprietario pode usar o mesmo nome sem compartilhar dados.
    const { data: existente, error: erroBusca } = await supabase
      .from("amenities")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("code", code)
      .maybeSingle<{ id: string }>();

    if (erroBusca) throw new Error(erroBusca.message);

    if (existente) {
      ids.push(existente.id);
      continue;
    }

    const { data: criada, error } = await supabase
      .from("amenities")
      .insert({
        category: "personalizada",
        code,
        is_system: false,
        name: nome,
        tenant_id: tenantId,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !criada) {
      throw new Error(error?.message ?? "Comodidade personalizada nao criada.");
    }

    ids.push(criada.id);
  }

  return ids;
}

async function obterComodidadesValidas(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  comodidadeIds: string[],
) {
  const idsUnicos = Array.from(new Set(comodidadeIds));
  if (!idsUnicos.length) return [];

  const { data, error } = await supabase
    .from("amenities")
    .select("id")
    .in("id", idsUnicos)
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);

  if (error) throw new Error(error.message);
  return (data ?? []).map((comodidade) => comodidade.id);
}

async function garantirLimitePropriedades(
  supabase: ClienteSupabaseServer,
  tenantId: string,
) {
  const limites = await carregarLimitesPlano(tenantId);
  const { count, error } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .neq("status", "archived");

  if (error) throw new Error(error.message);

  if ((count ?? 0) >= limites.maxPropriedades) {
    throw new ErroRegraNegocio(
      `Limite do plano atingido: ${limites.maxPropriedades} propriedade(s).`,
    );
  }
}

async function garantirLimiteUnidades(
  supabase: ClienteSupabaseServer,
  tenantId: string,
) {
  const limites = await carregarLimitesPlano(tenantId);
  const { count, error } = await supabase
    .from("units")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);

  if ((count ?? 0) >= limites.maxUnidades) {
    throw new ErroRegraNegocio(
      `Limite do plano atingido: ${limites.maxUnidades} unidade(s).`,
    );
  }
}

async function garantirRegraMultiUnidade(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
  multiUnidadeAtivo: boolean | undefined,
  unidadeIdIgnorada?: string,
) {
  if (multiUnidadeAtivo) return;

  let consulta = supabase
    .from("units")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedadeId);

  if (unidadeIdIgnorada) {
    consulta = consulta.neq("id", unidadeIdIgnorada);
  }

  const { count, error } = await consulta;
  if (error) throw new Error(error.message);

  // Sem a feature flag multi_unit, uma propriedade representa uma casa ou unidade única.
  if ((count ?? 0) > 0) {
    throw new ErroRegraNegocio(
      "A feature flag de multiunidades está desligada para este tenant.",
    );
  }
}

async function carregarPropriedadeDoTenant(
  supabase: ClienteSupabaseServer,
  escopo: EscopoGerenciamento,
  propriedadeId: string,
) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propriedadeId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId)
    .is("deleted_at", null)
    .maybeSingle<PropertyRow>();

  if (error || !data) {
    throw new ErroRegraNegocio("Propriedade não encontrada para este tenant.");
  }

  return data;
}

async function carregarUnidadeDoTenant(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  unidadeId: string,
) {
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("id", unidadeId)
    .eq("tenant_id", tenantId)
    .maybeSingle<UnitRow>();

  if (error || !data) {
    throw new ErroRegraNegocio("Unidade não encontrada para este tenant.");
  }

  return data;
}

async function criarOuObterCategoria(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  entrada: EntradaUnidade,
) {
  const { data: categoriaExistente, error: erroBusca } = await supabase
    .from("unit_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("property_id", entrada.propriedadeId)
    .eq("name", entrada.categoria)
    .maybeSingle<UnitCategoryRow>();

  if (erroBusca) throw new Error(erroBusca.message);
  if (categoriaExistente) return categoriaExistente;

  // A categoria nasce simples para agrupar unidades semelhantes sem criar CRUD específico agora.
  const { data: categoria, error } = await supabase
    .from("unit_categories")
    .insert({
      tenant_id: tenantId,
      property_id: entrada.propriedadeId,
      name: entrada.categoria,
      max_guests: entrada.capacidade,
      bedrooms: entrada.quartos,
      bathrooms: entrada.banheiros,
    })
    .select("*")
    .single<UnitCategoryRow>();

  if (error || !categoria)
    throw new Error(error?.message ?? "Categoria não criada.");
  return categoria;
}

async function salvarImagensUnidade(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  unidade: Pick<UnitRow, "id" | "property_id">,
  entrada: EntradaUnidade,
) {
  if (!entrada.imagensArquivos.length) return;

  const proximaOrdem = await obterProximaOrdemMidia(
    supabase,
    tenantId,
    unidade.property_id,
    unidade.id,
  );

  await Promise.all(
    entrada.imagensArquivos.map(async (arquivo, indice) => {
      const midia = await enviarImagemParaStorage(
        supabase,
        {
          escopo: "unidade",
          propertyId: unidade.property_id,
          tenantId,
          unitId: unidade.id,
        },
        arquivo,
      );

      const { error } = await supabase.from("media_assets").insert({
        alt: arquivo.name,
        is_cover: proximaOrdem === 0 && indice === 0,
        media_type: "image",
        property_id: unidade.property_id,
        sort_order: proximaOrdem + indice,
        status: "active",
        storage_bucket: midia.bucket,
        storage_path: midia.path,
        tenant_id: tenantId,
        unit_id: unidade.id,
        url: midia.url,
      });

      if (error) throw new Error(error.message);
    }),
  );
}

async function removerImagensDaUnidade(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  unidadeId: string,
) {
  const { data: imagens, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("unit_id", unidadeId)
    .eq("status", "active");

  if (error) throw new Error(error.message);

  await Promise.all(
    (imagens ?? []).map((imagem) => removerImagemDoStorage(supabase, imagem)),
  );
}

async function obterProximaOrdemMidia(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
  unidadeId: string | null,
) {
  let consulta = supabase
    .from("media_assets")
    .select("sort_order")
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedadeId)
    .eq("status", "active")
    .order("sort_order", { ascending: false })
    .limit(1);

  consulta = unidadeId ? consulta.eq("unit_id", unidadeId) : consulta.is("unit_id", null);

  const { data, error } = await consulta.maybeSingle<{ sort_order: number }>();

  if (error) throw new Error(error.message);
  return (data?.sort_order ?? -1) + 1;
}

async function salvarImagemCapa(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
  entrada: EntradaPropriedade,
) {
  if (!entrada.imagemCapaArquivo) return;

  const arquivo = await enviarImagemParaStorage(
    supabase,
    {
      escopo: "capa",
      propertyId: propriedadeId,
      tenantId,
    },
    entrada.imagemCapaArquivo,
  );

  // Apenas uma imagem principal fica marcada por propriedade para evitar ambiguidade no marketplace futuro.
  const { error: erroCapaAnterior } = await supabase
    .from("media_assets")
    .update({ is_cover: false })
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedadeId)
    .is("unit_id", null)
    .eq("is_cover", true);

  if (erroCapaAnterior) throw new Error(erroCapaAnterior.message);

  const { error } = await supabase.from("media_assets").insert({
    tenant_id: tenantId,
    property_id: propriedadeId,
    unit_id: null,
    media_type: "image",
    storage_bucket: arquivo.bucket,
    storage_path: arquivo.path,
    url: arquivo.url,
    alt: `Imagem de capa de ${entrada.nome}`,
    sort_order: 0,
    is_cover: true,
    status: "active",
  });
  if (error) throw new Error(error.message);
}

async function salvarGaleriaPropriedade(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
  entrada: EntradaPropriedade,
) {
  if (!entrada.galeriaArquivos.length) return;

  const galeriaDefineCapa =
    entrada.galeriaIndicePrincipal !== null && !entrada.imagemCapaArquivo;

  if (galeriaDefineCapa) {
    // Apenas uma imagem principal por propriedade evita conflito no marketplace e nos cards do gerenciamento.
    const { error } = await supabase
      .from("media_assets")
      .update({ is_cover: false })
      .eq("tenant_id", tenantId)
      .eq("property_id", propriedadeId)
      .is("unit_id", null)
      .eq("is_cover", true);

    if (error) throw new Error(error.message);
  }

  const proximaOrdem = await obterProximaOrdemMidia(
    supabase,
    tenantId,
    propriedadeId,
    null,
  );

  await Promise.all(
    entrada.galeriaArquivos.map(async (arquivo, indice) => {
      const midia = await enviarImagemParaStorage(
        supabase,
        {
          escopo: "galeria",
          propertyId: propriedadeId,
          tenantId,
        },
        arquivo,
      );

      const titulo = entrada.galeriaTitulos[indice]?.trim() || arquivo.name;
      const ordemInformada = entrada.galeriaOrdens[indice];

      const { error } = await supabase.from("media_assets").insert({
        alt: titulo,
        is_cover: galeriaDefineCapa && entrada.galeriaIndicePrincipal === indice,
        media_type: "image",
        property_id: propriedadeId,
        sort_order: ordemInformada ?? proximaOrdem + indice,
        status: "active",
        storage_bucket: midia.bucket,
        storage_path: midia.path,
        tenant_id: tenantId,
        unit_id: null,
        url: midia.url,
      });

      if (error) throw new Error(error.message);
    }),
  );
}

function textoObrigatorio(
  formData: FormData,
  chave: string,
  label: string,
): string {
  const valor = formData.get(chave)?.toString().trim();
  if (!valor) throw new ErroRegraNegocio(`Informe ${label}.`);
  return valor;
}

function textoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave)?.toString().trim();
  return valor ? valor : null;
}

function obterValoresMultiplos(formData: FormData, chave: string): string[] {
  return formData
    .getAll(chave)
    .map((valor) => valor.toString().trim())
    .filter(Boolean);
}

function obterNumerosInteirosMultiplos(formData: FormData, chave: string): number[] {
  return formData
    .getAll(chave)
    .map((valor) => Number.parseInt(valor.toString(), 10))
    .filter((valor) => Number.isFinite(valor) && valor >= 0);
}

function numeroInteiroOpcionalOuNulo(
  formData: FormData,
  chave: string,
  minimo: number,
): number | null {
  const valorBruto = formData.get(chave)?.toString().trim();
  if (!valorBruto) return null;

  const valor = Number.parseInt(valorBruto, 10);
  if (Number.isNaN(valor) || valor < minimo) {
    throw new ErroRegraNegocio("Informe os dados da galeria corretamente.");
  }
  return valor;
}

function numeroInteiroOpcional(
  formData: FormData,
  chave: string,
  padrao: number,
  minimo: number,
): number {
  const valorBruto = formData.get(chave)?.toString().trim();
  if (!valorBruto) return padrao;

  const valor = Number.parseInt(valorBruto, 10);
  if (Number.isNaN(valor) || valor < minimo) {
    throw new ErroRegraNegocio("Informe os dados da casa corretamente.");
  }

  return valor;
}

function numeroInteiro(
  formData: FormData,
  chave: string,
  label: string,
  minimo: number,
): number {
  const valor = Number.parseInt(textoObrigatorio(formData, chave, label), 10);
  if (Number.isNaN(valor) || valor < minimo) {
    throw new ErroRegraNegocio(`Informe ${label} válido.`);
  }
  return valor;
}

function numeroInteiroOuNulo(
  formData: FormData,
  chave: string,
  label: string,
  minimo: number,
): number | null {
  const valorBruto = formData.get(chave)?.toString().trim();
  if (!valorBruto) return null;

  const valor = Number.parseInt(valorBruto, 10);
  if (Number.isNaN(valor) || valor < minimo) {
    throw new ErroRegraNegocio(`Informe ${label} vÃ¡lido.`);
  }
  return valor;
}

function numeroPercentual(formData: FormData, chave: string, label: string): number {
  const valor = Number.parseFloat(
    textoObrigatorio(formData, chave, label).replace(",", "."),
  );
  if (Number.isNaN(valor) || valor < 0 || valor > 100) {
    throw new ErroRegraNegocio(`Informe ${label} entre 0 e 100.`);
  }
  return valor;
}

function numeroPercentualOpcional(
  formData: FormData,
  chave: string,
  padrao: number,
): number {
  const valorBruto = formData.get(chave)?.toString().trim();
  if (!valorBruto) return padrao;

  const valor = Number.parseFloat(valorBruto.replace(",", "."));
  if (Number.isNaN(valor) || valor < 0 || valor > 100) {
    throw new ErroRegraNegocio("Informe o percentual de juros entre 0 e 100.");
  }
  return valor;
}

function validarHoraOpcional(formData: FormData, chave: string): string | null {
  const valor = textoOpcional(formData, chave);
  if (!valor) return null;
  if (/^\d{2}:\d{2}$/.test(valor)) return valor;
  throw new ErroRegraNegocio("Informe horarios validos.");
}

function checkboxAtivo(formData: FormData, chave: string): boolean {
  return formData.get(chave) === "on";
}

function numeroMoedaOpcional(
  formData: FormData,
  chave: string,
  padrao: number,
): number {
  const valorBruto = formData.get(chave)?.toString().trim();
  if (!valorBruto) return padrao;

  const valor = Number.parseFloat(valorBruto.replace(",", "."));
  if (Number.isNaN(valor) || valor < 0) {
    throw new ErroRegraNegocio("Informe o valor base da casa corretamente.");
  }

  return valor;
}

function numeroMoeda(formData: FormData, chave: string, label: string): number {
  const valor = Number.parseFloat(
    textoObrigatorio(formData, chave, label).replace(",", "."),
  );
  if (Number.isNaN(valor) || valor < 0) {
    throw new ErroRegraNegocio(`Informe ${label} válido.`);
  }
  return valor;
}

function validarTipoPropriedade(valor: string): PropertyType {
  if (TIPOS_PROPRIEDADE.includes(valor as PropertyType))
    return valor as PropertyType;
  throw new ErroRegraNegocio("Tipo de propriedade inválido.");
}

function validarStatusPropriedade(valor: string): PropertyStatus {
  if (STATUS_PROPRIEDADE.includes(valor as PropertyStatus)) {
    return valor as PropertyStatus;
  }
  throw new ErroRegraNegocio("Status da propriedade inválido.");
}

function validarStatusUnidade(valor: string): UnitStatus {
  if (STATUS_UNIDADE.includes(valor as UnitStatus)) return valor as UnitStatus;
  throw new ErroRegraNegocio("Status da unidade inválido.");
}

function validarModoReserva(valor: string): "manual_approval" | "instant_booking" {
  if (valor === "manual_approval" || valor === "instant_booking") return valor;
  throw new ErroRegraNegocio("Modo de reserva inválido.");
}

function validarCategoriaUnidade(valor: string): string {
  if (CATEGORIAS_UNIDADE.includes(valor)) return valor;
  throw new ErroRegraNegocio("Categoria da unidade inválida.");
}

function obterCategoriaUnidade(formData: FormData): string {
  const categoria = textoObrigatorio(formData, "categoria", "categoria");
  if (categoria !== "Personalizada") return validarCategoriaUnidade(categoria);

  const personalizada = textoObrigatorio(
    formData,
    "categoriaPersonalizada",
    "categoria personalizada",
  );

  if (personalizada.length > 80) {
    throw new ErroRegraNegocio(
      "Categoria personalizada deve ter no máximo 80 caracteres.",
    );
  }

  return personalizada;
}

function exigirConfirmacaoExclusao(formData: FormData) {
  if (formData.get("confirmarExclusao") !== "confirmado") {
    throw new ErroRegraNegocio("Confirme a exclusão antes de continuar.");
  }
}

function gerarIdentificadorUrl(valor: string): string {
  const base = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `${base || "item"}-${Date.now().toString(36)}`;
}

function normalizarCodigoUnico(valor: string): string {
  return (
    valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || "comodidade"
  );
}

function redirecionarComErro(
  caminho: string,
  erro: unknown,
  mensagemLog: string,
): never {
  const mensagem =
    erro instanceof ErroRegraNegocio
      ? erro.message
      : "Não foi possível concluir a operação.";

  if (!(erro instanceof ErroRegraNegocio)) {
    console.error(mensagemLog, erro);
  }

  redirect(`${caminho}?erro=${encodeURIComponent(mensagem)}`);
}

function revalidarModulo() {
  revalidatePath(CAMINHO_PROPRIEDADES);
  revalidatePath(CAMINHO_UNIDADES);
}

function obterCaminhoRetorno(formData: FormData): string {
  const retorno = formData.get("retorno")?.toString();
  return retorno === CAMINHO_PROPRIEDADES
    ? CAMINHO_PROPRIEDADES
    : CAMINHO_UNIDADES;
}
