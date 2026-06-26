"use server";

import type {
  PropertyRow,
  PropertyStatus,
  PropertyType,
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteSupabaseServer } from "../supabase/server";
import { carregarLimitesPlano } from "./data";
import {
  enviarImagemParaStorage,
  obterArquivoImagem,
  obterArquivosImagem,
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
 * Server actions do módulo de Casas.
 *
 * As regras de tenant, owner e plano ficam no servidor porque o
 * cliente nunca deve decidir sozinho o que pode ser gravado em um SaaS multi-tenant.
 */

const CAMINHO_PROPRIEDADES = "/propriedades";
const ERRO_PERMISSAO_CASAS =
  "Você não tem permissão para cadastrar casas neste tenant.";
const STATUS_PROPRIEDADE: PropertyStatus[] = ["draft", "published", "paused"];
const TIPOS_PROPRIEDADE: PropertyType[] = [
  "seasonal_home",
  "inn",
  "small_hotel",
];
const MAX_PARCELAS_CARTAO = 12;

type EntradaPropriedade = {
  detalhesPublicos: {
    descricaoPublica: string | null;
    imagemCompartilhamento: string | null;
    nomeExibicao: string | null;
    tituloPublico: string | null;
  };
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
  comodidadesPersonalizadasExistentes: Array<{
    id: string;
    nome: string;
  }>;
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
    instrucoesEspeciais: string | null;
    observacoesInternas: string | null;
    permiteCriancas: boolean;
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
    cobraHospedeExtra: boolean;
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

export async function criarPropriedadeAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const entrada = obterEntradaPropriedade(formData);
    const supabase = await criarClienteSupabaseServer();

    await garantirTenantOperacionalParaCasas(supabase, escopo.tenantId);
    await garantirLimitePropriedades(supabase, escopo.tenantId);
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
        public_details: montarDetalhesPublicosBanco(entrada),
        address: entrada.endereco,
        structure_details: entrada.estrutura,
        pricing_details: entrada.valores,
        timezone: "America/Sao_Paulo",
      })
      .select("*")
      .single<PropertyRow>();

    if (error || !propriedade) {
      throw erroOperacaoCasa(
        error?.message ?? "Propriedade não retornada após criação.",
        ERRO_PERMISSAO_CASAS,
      );
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
      montarContextoErroCasa("criar", escopo),
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

    await garantirTenantOperacionalParaCasas(supabase, escopo.tenantId);
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
        public_details: montarDetalhesPublicosBanco(entrada),
        address: entrada.endereco,
        structure_details: entrada.estrutura,
        pricing_details: entrada.valores,
      })
      .eq("id", propriedadeId)
      .eq("tenant_id", escopo.tenantId)
      .select("*")
      .maybeSingle<PropertyRow>();

    if (error || !propriedade) {
      throw new ErroRegraNegocio(
        traduzirErroSupabase(
          error?.message,
          "Casa não encontrada ou sem permissão de edição para este tenant.",
        ),
      );
    }

    await Promise.all([
      salvarConfiguracoesDaCasa(supabase, escopo, propriedade.id, entrada),
      salvarComodidadesDaCasa(supabase, escopo, propriedade.id, entrada),
    ]);
    await salvarImagemCapa(supabase, escopo.tenantId, propriedade.id, entrada);
    await salvarGaleriaPropriedade(supabase, escopo.tenantId, propriedade.id, entrada);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(
      CAMINHO_PROPRIEDADES,
      erro,
      "Erro ao atualizar propriedade.",
      montarContextoErroCasa("atualizar", escopo),
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

    // Pausar preserva os dados da casa; arquivamento fica fora desta etapa para evitar perda operacional.
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

function obterEntradaPropriedade(formData: FormData): EntradaPropriedade {
  const nome = textoObrigatorio(formData, "nome", "nome");
  const hospedesMaximos = numeroInteiro(
    formData,
    "hospedesMaximos",
    "quantidade maxima de hospedes",
    1,
  );
  const quartos = numeroInteiroOpcional(formData, "quartosCasa", 0, 0);
  const camas = numeroInteiroOpcional(formData, "camasCasa", 1, 1);
  const banheiros = numeroInteiroOpcional(formData, "banheirosCasa", 0, 0);
  const valorDiaria = numeroMoedaObrigatoria(formData, "valorDiaria", "valor da diaria", 0.01);

  return {
    detalhesPublicos: {
      descricaoPublica: textoOpcional(formData, "descricaoPublica"),
      imagemCompartilhamento: validarUrlOpcional(formData, "imagemCompartilhamento"),
      nomeExibicao: textoOpcional(formData, "nomeExibicao") ?? nome,
      tituloPublico: textoOpcional(formData, "tituloPublico"),
    },
    endereco: {
      bairro: textoOpcional(formData, "bairro") ?? "",
      cep: textoOpcional(formData, "cep") ?? "",
      cidade: textoObrigatorio(formData, "cidade", "cidade"),
      complemento: textoOpcional(formData, "complemento") ?? "",
      estado: textoObrigatorio(formData, "estado", "estado"),
      googleMapsLink: textoOpcional(formData, "googleMapsLink") ?? "",
      latitude: numeroDecimalOpcionalOuNulo(formData, "latitude", -90, 90),
      linha1: textoObrigatorio(formData, "endereco", "endereco"),
      longitude: numeroDecimalOpcionalOuNulo(formData, "longitude", -180, 180),
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
    comodidadesPersonalizadasExistentes:
      obterComodidadesPersonalizadasExistentes(formData),
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
    nome,
    publica: checkboxAtivo(formData, "visibilidadePublica"),
    regras: {
      checkInTime: validarHoraOpcional(formData, "checkInTime"),
      checkOutTime: validarHoraOpcional(formData, "checkOutTime"),
      instrucoesEspeciais: textoOpcional(formData, "specialInstructions"),
      observacoesInternas: textoOpcional(formData, "internalNotes"),
      permiteCriancas: checkboxAtivo(formData, "allowChildren"),
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
      cobraHospedeExtra: checkboxAtivo(formData, "cobraHospedeExtra"),
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

function obterComodidadesPersonalizadasExistentes(formData: FormData) {
  const ids = obterValoresMultiplos(
    formData,
    "comodidadePersonalizadaExistenteIds",
  );
  const nomes = obterValoresMultiplos(
    formData,
    "comodidadePersonalizadaExistenteNomes",
  );

  return ids.map((id, indice) => {
    const nome = nomes[indice]?.trim();
    if (!nome || nome.length > 80) {
      throw new ErroRegraNegocio(
        "Comodidade personalizada deve possuir entre 1 e 80 caracteres.",
      );
    }
    return { id, nome };
  });
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
      allow_children: entrada.regras.permiteCriancas,
      allow_events: entrada.regras.permiteEventos,
      allow_pets: entrada.regras.permitePets,
      allow_smoking: entrada.regras.permiteFumantes,
      check_in_time: entrada.regras.checkInTime,
      check_out_time: entrada.regras.checkOutTime,
      internal_notes: entrada.regras.observacoesInternas,
      max_guests: entrada.estrutura.hospedesMaximos,
      property_id: propriedadeId,
      special_instructions: entrada.regras.instrucoesEspeciais,
      tenant_id: escopo.tenantId,
    },
    { onConflict: "property_id" },
  );

  if (error) {
    throw erroOperacaoCasa(error.message, "Não foi possível salvar as configurações da casa.");
  }
}

async function salvarComodidadesDaCasa(
  supabase: ClienteSupabaseServer,
  escopo: EscopoGerenciamento,
  propriedadeId: string,
  entrada: EntradaPropriedade,
) {
  await atualizarComodidadesPersonalizadasExistentes(
    supabase,
    escopo.tenantId,
    entrada.comodidadesPersonalizadasExistentes,
  );
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

  if (erroLimpeza) {
    throw erroOperacaoCasa(erroLimpeza.message, "Erro ao atualizar comodidades.");
  }
  if (!idsValidos.length) return;

  const { error } = await supabase.from("property_amenities").insert(
    idsValidos.map((amenityId) => ({
      amenity_id: amenityId,
      property_id: propriedadeId,
      tenant_id: escopo.tenantId,
    })),
  );

  if (error) {
    throw erroOperacaoCasa(error.message, "Erro ao atualizar comodidades.");
  }
}

async function atualizarComodidadesPersonalizadasExistentes(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  comodidades: EntradaPropriedade["comodidadesPersonalizadasExistentes"],
) {
  for (const comodidade of comodidades) {
    // Apenas comodidades customizadas do proprio tenant podem ser renomeadas.
    const { error } = await supabase
      .from("amenities")
      .update({
        code: normalizarCodigoUnico(comodidade.nome),
        name: comodidade.nome,
      })
      .eq("id", comodidade.id)
      .eq("tenant_id", tenantId)
      .eq("is_system", false);

    if (error) {
      throw erroOperacaoCasa(error.message, "Erro ao atualizar comodidade personalizada.");
    }
  }
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

    if (erroBusca) {
      throw erroOperacaoCasa(erroBusca.message, "Erro ao validar comodidade personalizada.");
    }

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
      throw erroOperacaoCasa(
        error?.message,
        "Comodidade personalizada não criada.",
      );
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

  if (error) {
    throw erroOperacaoCasa(error.message, "Erro ao validar comodidades da casa.");
  }
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

  if (error) {
    throw erroOperacaoCasa(error.message, "Não foi possível validar o limite de casas.");
  }

  if ((count ?? 0) >= limites.maxPropriedades) {
    throw new ErroRegraNegocio(
      `Limite do plano atingido: ${limites.maxPropriedades} propriedade(s).`,
    );
  }
}

function montarDetalhesPublicosBanco(entrada: EntradaPropriedade) {
  return {
    displayName: entrada.detalhesPublicos.nomeExibicao ?? entrada.nome,
    publicDescription: entrada.detalhesPublicos.descricaoPublica,
    publicTitle: entrada.detalhesPublicos.tituloPublico,
    shareImageUrl: entrada.detalhesPublicos.imagemCompartilhamento,
  };
}

async function garantirTenantOperacionalParaCasas(
  supabase: ClienteSupabaseServer,
  tenantId: string,
) {
  // A RLS do banco bloqueia cadastro de casas sem tenant/licenca operacional.
  // Validar antes do insert evita erro generico e mostra ao proprietario a acao correta.
  const { data: tenant, error: erroTenant } = await supabase
    .from("tenants")
    .select("status")
    .eq("id", tenantId)
    .maybeSingle<{ status: string }>();

  if (erroTenant) {
    throw new ErroRegraNegocio(
      traduzirErroSupabase(erroTenant.message, "Não foi possível validar o tenant."),
    );
  }
  if (!tenant || !["trial", "active", "past_due"].includes(tenant.status)) {
    throw new ErroRegraNegocio("Tenant inativo. Verifique o status da conta no Super Admin.");
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: licenca, error: erroLicenca } = await supabase
    .from("licenses")
    .select("status,starts_at,expires_at")
    .eq("tenant_id", tenantId)
    .in("status", ["trial", "active"])
    .lte("starts_at", hoje)
    .or(`expires_at.is.null,expires_at.gte.${hoje}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ expires_at: string | null; starts_at: string; status: string }>();

  if (erroLicenca) {
    throw new ErroRegraNegocio(
      traduzirErroSupabase(erroLicenca.message, "Não foi possível validar a licença."),
    );
  }
  if (!licenca) {
    throw new ErroRegraNegocio(
      "Licença ativa não encontrada. Verifique status e vencimento no Super Admin.",
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

async function obterProximaOrdemMidia(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
) {
  const consulta = supabase
    .from("media_assets")
    .select("sort_order")
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedadeId)
    .eq("status", "active")
    .order("sort_order", { ascending: false })
    .limit(1);

  const { data, error } = await consulta.maybeSingle<{ sort_order: number }>();

  if (error) {
    throw erroOperacaoCasa(error.message, "Não foi possível calcular a ordem das imagens.");
  }
  return (data?.sort_order ?? -1) + 1;
}

async function salvarImagemCapa(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
  entrada: EntradaPropriedade,
) {
  if (!entrada.imagemCapaArquivo) return;

  const arquivo = await executarEtapaCasa(
    "Erro ao salvar imagem de capa.",
    () =>
      enviarImagemParaStorage(
        supabase,
        {
          escopo: "capa",
          propertyId: propriedadeId,
          tenantId,
        },
        entrada.imagemCapaArquivo as File,
      ),
  );

  // Apenas uma imagem principal fica marcada por propriedade para evitar ambiguidade no marketplace futuro.
  const { error: erroCapaAnterior } = await supabase
    .from("media_assets")
    .update({ is_cover: false })
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedadeId)
    .eq("is_cover", true);

  if (erroCapaAnterior) {
    throw erroOperacaoCasa(erroCapaAnterior.message, "Erro ao atualizar imagem principal.");
  }

  const { error } = await supabase.from("media_assets").insert({
    tenant_id: tenantId,
    property_id: propriedadeId,
    media_type: "image",
    storage_bucket: arquivo.bucket,
    storage_path: arquivo.path,
    url: arquivo.url,
    alt: `Imagem de capa de ${entrada.nome}`,
    sort_order: 0,
    is_cover: true,
    status: "active",
  });
  if (error) {
    throw erroOperacaoCasa(error.message, "Erro ao salvar imagem de capa.");
  }
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
      .eq("is_cover", true);

    if (error) {
      throw erroOperacaoCasa(error.message, "Erro ao atualizar imagem principal.");
    }
  }

  const proximaOrdem = await obterProximaOrdemMidia(
    supabase,
    tenantId,
    propriedadeId,
  );

  await Promise.all(
    entrada.galeriaArquivos.map(async (arquivo, indice) => {
      const midia = await executarEtapaCasa(
        "Erro ao salvar imagens da galeria.",
        () =>
          enviarImagemParaStorage(
            supabase,
            {
              escopo: "galeria",
              propertyId: propriedadeId,
              tenantId,
            },
            arquivo,
          ),
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
        url: midia.url,
      });

      if (error) {
        throw erroOperacaoCasa(error.message, "Erro ao salvar imagens da galeria.");
      }
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

function numeroDecimalOpcionalOuNulo(
  formData: FormData,
  chave: string,
  minimo: number,
  maximo: number,
): number | null {
  const valorBruto = formData.get(chave)?.toString().trim();
  if (!valorBruto) return null;

  const valor = Number.parseFloat(valorBruto.replace(",", "."));
  if (!Number.isFinite(valor) || valor < minimo || valor > maximo) {
    throw new ErroRegraNegocio("Informe coordenadas geograficas validas.");
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

function validarUrlOpcional(formData: FormData, chave: string): string | null {
  const valor = textoOpcional(formData, chave);
  if (!valor) return null;

  try {
    const url = new URL(valor);
    if (url.protocol === "http:" || url.protocol === "https:") return valor;
  } catch {
    // A mensagem de negocio abaixo evita expor detalhes internos de parsing.
  }

  throw new ErroRegraNegocio("Informe uma URL publica valida.");
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

function numeroMoedaObrigatoria(
  formData: FormData,
  chave: string,
  label: string,
  minimo: number,
): number {
  const valor = Number.parseFloat(textoObrigatorio(formData, chave, label).replace(",", "."));
  if (!Number.isFinite(valor) || valor < minimo) {
    throw new ErroRegraNegocio(`Informe ${label} valido.`);
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

function validarModoReserva(valor: string): "manual_approval" | "instant_booking" {
  if (valor === "manual_approval" || valor === "instant_booking") return valor;
  throw new ErroRegraNegocio("Modo de reserva inválido.");
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
  contexto?: Record<string, unknown>,
): never {
  const mensagemTecnica = erro instanceof Error ? erro.message : null;
  const mensagem =
    erro instanceof ErroRegraNegocio
      ? traduzirErroSupabase(erro.message, erro.message)
      : traduzirErroSupabase(
          mensagemTecnica,
          "Não foi possível concluir a operação.",
        );

  // Logamos também erros de regra para diagnosticar produção sem mostrar detalhes técnicos ao usuário.
  console.error(mensagemLog, {
    contexto,
    mensagemTecnica,
    mensagemUsuario: mensagem,
  });

  redirect(`${caminho}?erro=${encodeURIComponent(mensagem)}`);
}

function traduzirErroSupabase(
  mensagemTecnica: string | null | undefined,
  fallback: string,
) {
  const mensagem = mensagemTecnica?.toLowerCase() ?? "";

  if (!mensagem) return fallback;
  if (mensagem.includes("row-level security") || mensagem.includes("rls")) {
    return fallbackEhSeguro(fallback) ? fallback : ERRO_PERMISSAO_CASAS;
  }
  if (mensagem.includes("duplicate key") && mensagem.includes("properties_slug")) {
    return "Já existe uma casa com identificador semelhante. Tente novamente.";
  }
  if (mensagem.includes("violates not-null constraint")) {
    return "Existe um campo obrigatório da casa sem preenchimento. Revise os dados e tente novamente.";
  }
  if (mensagem.includes("violates check constraint")) {
    return "Existe um valor inválido no cadastro da casa. Revise os dados e tente novamente.";
  }
  if (mensagem.includes("storage") || mensagem.includes("imagem") || mensagem.includes("mime")) {
    return "Não foi possível salvar a imagem. Verifique o formato e tente novamente.";
  }
  if (mensagem.includes("jwt") || mensagem.includes("session") || mensagem.includes("auth")) {
    return "Sessão expirada. Entre novamente.";
  }
  if (mensagem.includes("network") || mensagem.includes("fetch failed")) {
    return "Falha de conexão com o Supabase. Tente novamente em instantes.";
  }

  return fallback;
}

function erroOperacaoCasa(
  mensagemTecnica: string | null | undefined,
  fallback: string,
) {
  return new ErroRegraNegocio(traduzirErroSupabase(mensagemTecnica, fallback));
}

async function executarEtapaCasa<T>(
  fallback: string,
  etapa: () => Promise<T>,
): Promise<T> {
  try {
    return await etapa();
  } catch (erro) {
    const mensagemTecnica = erro instanceof Error ? erro.message : null;
    throw erroOperacaoCasa(mensagemTecnica, fallback);
  }
}

function fallbackEhSeguro(fallback: string) {
  const texto = fallback.toLowerCase();
  return (
    !texto.includes("row-level security") &&
    !texto.includes("rls") &&
    !texto.includes("não foi possível concluir")
  );
}

function montarContextoErroCasa(
  acao: "atualizar" | "criar",
  escopo: EscopoGerenciamento,
) {
  return {
    acao,
    permissoes: escopo.contexto.permissions,
    role: escopo.contexto.role,
    tenantId: escopo.tenantId,
    userId: escopo.contexto.userId,
  };
}

function revalidarModulo() {
  revalidatePath(CAMINHO_PROPRIEDADES);
}
