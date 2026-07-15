"use server";

import type {
  JsonValue,
  MediaAssetRow,
  PropertyRow,
  PropertySettingRow,
  PropertyStatus,
  PropertyType,
} from "@hospedex/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { exigirLicencaPermiteAcoesTenant } from "../license-state";
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
import type { EnderecoPropriedade, RascunhoFormularioCasa } from "./types";
import type {
  FormasPagamentoPropriedade,
  TipoCobrancaHospedeExtra,
} from "./types";

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

type ImagemExistenteEntrada = {
  id: string;
  ordem: number;
  principal: boolean;
  titulo: string;
};

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
  galeriaArquivoIds: string[];
  galeriaIndicePrincipal: number | null;
  galeriaExistente: ImagemExistenteEntrada[];
  galeriaOrdens: number[];
  galeriaTitulos: string[];
  imagensExistentesRemovidasIds: string[];
  imagemCapaArquivo: File | null;
  imagemCapaId: string | null;
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
    formasPagamento: FormasPagamentoPropriedade;
    hospedesInclusos: number;
    jurosParcelasCartao: Array<{
      jurosPercentual: number;
      parcela: number;
    }>;
    maxParcelasCartao: number;
    taxaLimpeza: number;
    tipoCobrancaHospedeExtra: TipoCobrancaHospedeExtra;
    valorDiaria: number;
    valorHospedeExtra: number;
  };
};

export type ResultadoSalvarPropriedade = {
  codigoSuporte?: string;
  mensagem: string;
  propriedadeId?: string;
  sincronizadoEm?: string;
  sucesso: boolean;
};

export async function salvarRascunhoPropriedadeAction(
  formData: FormData,
): Promise<ResultadoSalvarPropriedade> {
  let escopo: EscopoGerenciamento | null = null;
  const etapaWizard = textoOpcional(formData, "etapaWizard") ?? "desconhecida";

  try {
    escopo = await carregarEscopoGerenciamento();
    const propriedadeId = uuidObrigatorio(formData, "operacaoId", "operacao");
    const rascunho = obterRascunhoFormulario(formData, propriedadeId);
    const supabase = await criarClienteSupabaseServer();

    await garantirTenantOperacionalParaCasas(supabase, escopo.tenantId);
    await exigirLicencaPermiteAcoesTenant(escopo.tenantId);

    const { data: existente, error: erroBusca } = await supabase
      .from("properties")
      .select("*")
      .eq("id", propriedadeId)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId)
      .is("deleted_at", null)
      .maybeSingle<PropertyRow>();

    if (erroBusca) {
      throw erroOperacaoCasa(
        erroBusca.message,
        "Nao foi possivel verificar o rascunho no servidor.",
      );
    }

    if (!existente) {
      await garantirLimitePropriedades(supabase, escopo.tenantId);
    }

    // Casas publicadas nao recebem dados parciais nas colunas publicas.
    // O autosave delas fica apenas no JSON interno protegido por RLS.
    if (!existente || existente.status === "draft") {
      const registroRascunho = montarRegistroRascunho(
        formData,
        escopo,
        propriedadeId,
        existente,
      );
      const { error: erroRascunho } = existente
        ? await supabase
            .from("properties")
            .update(registroRascunho)
            .eq("id", propriedadeId)
            .eq("tenant_id", escopo.tenantId)
            .eq("owner_id", escopo.ownerId)
        : await supabase.from("properties").insert(registroRascunho);

      if (erroRascunho) {
        console.error("Erro bruto ao persistir a casa em rascunho.", {
          mensagemTecnica: erroRascunho.message,
          propriedadeId,
          tenantId: escopo.tenantId,
        });
        throw erroOperacaoCasa(
          erroRascunho.message,
          "Nao foi possivel salvar o rascunho no servidor.",
        );
      }
    }

    await salvarPayloadRascunhoServidor(
      supabase,
      escopo.tenantId,
      propriedadeId,
      rascunho,
    );

    const sincronizadoEm = new Date().toISOString();
    revalidatePath(CAMINHO_PROPRIEDADES);
    return {
      mensagem: "Rascunho salvo no servidor.",
      propriedadeId,
      sincronizadoEm,
      sucesso: true,
    };
  } catch (erro) {
    return criarResultadoErroCasa(
      erro,
      "Erro ao sincronizar rascunho da casa.",
      escopo
        ? {
            ...montarContextoErroCasa("criar", escopo),
            etapaWizard,
            operacao: "sincronizar-rascunho",
          }
        : { acao: "criar", etapaWizard, operacao: "sincronizar-rascunho" },
      textoOpcional(formData, "operacaoId") ?? undefined,
    );
  }
}

export async function criarPropriedadeAction(
  formData: FormData,
): Promise<ResultadoSalvarPropriedade> {
  let escopo: EscopoGerenciamento | null = null;
  let supabase: ClienteSupabaseServer | null = null;
  let propriedadeIdSalvamento: string | undefined;
  let etapaSalvamento = "inicio";
  try {
    escopo = await carregarEscopoGerenciamento();
    const entrada = obterEntradaPropriedade(formData);
    supabase = await criarClienteSupabaseServer();
    const propriedadeId = uuidObrigatorio(formData, "operacaoId", "operacao");
    propriedadeIdSalvamento = propriedadeId;

    etapaSalvamento = "validar-tenant-e-licenca";
    await garantirTenantOperacionalParaCasas(supabase, escopo.tenantId);
    await exigirLicencaPermiteAcoesTenant(escopo.tenantId);
    etapaSalvamento = "verificar-rascunho";
    const { data: existente, error: erroBusca } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propriedadeId)
      .eq("tenant_id", escopo.tenantId)
      .eq("owner_id", escopo.ownerId)
      .is("deleted_at", null)
      .maybeSingle<{ id: string }>();

    if (erroBusca) {
      throw erroOperacaoCasa(
        erroBusca.message,
        "Nao foi possivel verificar o rascunho da casa.",
      );
    }
    if (!existente) await garantirLimitePropriedades(supabase, escopo.tenantId);

    // O ID vem do rascunho local e permanece igual em novas tentativas.
    // Se a resposta anterior se perdeu, atualizamos a mesma casa em vez de duplicar.
    const registroPrincipal = {
        id: propriedadeId,
        tenant_id: escopo.tenantId,
        // O owner_id vem do tenant, não do usuário logado, para equipe criar sem virar dona do imóvel.
        owner_id: escopo.ownerId,
        name: entrada.nome,
        slug: gerarIdentificadorUrl(entrada.nome, propriedadeId),
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
      };
    etapaSalvamento = "salvar-dados-principais";
    const { error } = existente
      ? await supabase
          .from("properties")
          .update(registroPrincipal)
          .eq("id", propriedadeId)
          .eq("tenant_id", escopo.tenantId)
          .eq("owner_id", escopo.ownerId)
      : await supabase.from("properties").insert(registroPrincipal);

    if (error) {
      console.error("Erro bruto ao inserir os dados principais da casa.", {
        role: escopo.contexto.role,
        tenantId: escopo.tenantId,
        userId: escopo.contexto.userId,
        mensagemTecnica: error.message,
      });
      throw erroOperacaoCasa(error.message, ERRO_PERMISSAO_CASAS);
    }

    etapaSalvamento = "salvar-configuracoes";
    await salvarConfiguracoesDaCasa(supabase, escopo, propriedadeId, entrada);
    etapaSalvamento = "salvar-comodidades";
    await salvarComodidadesDaCasa(supabase, escopo, propriedadeId, entrada);
    etapaSalvamento = "salvar-imagem-capa";
    await salvarImagemCapa(supabase, escopo.tenantId, propriedadeId, entrada);
    etapaSalvamento = "salvar-galeria";
    await salvarGaleriaPropriedade(
      supabase,
      escopo.tenantId,
      propriedadeId,
      entrada,
    );
    etapaSalvamento = "confirmar-galeria";
    await confirmarGaleriaPropriedadePersistida(
      supabase,
      escopo.tenantId,
      propriedadeId,
      entrada,
    );
    etapaSalvamento = "limpar-rascunho";
    await limparRascunhoServidor(supabase, escopo.tenantId, propriedadeId);
    revalidarModulo();
    return {
      mensagem: "Casa criada com sucesso.",
      propriedadeId,
      sucesso: true,
    };
  } catch (erro) {
    if (
      supabase &&
      escopo &&
      propriedadeIdSalvamento &&
      ehFalhaMidiaCasa(erro)
    ) {
      await marcarCasaComoRascunhoAposFalhaMidia(
        supabase,
        escopo,
        propriedadeIdSalvamento,
      );
    }

    return criarResultadoErroCasa(
      erro,
      "Erro ao criar propriedade.",
      {
        ...(escopo
          ? montarContextoErroCasa("criar", escopo)
          : { acao: "criar" }),
        etapaWizard: textoOpcional(formData, "etapaWizard") ?? "desconhecida",
        operacao: etapaSalvamento,
      },
      propriedadeIdSalvamento ?? textoOpcional(formData, "operacaoId") ?? undefined,
    );
  }
}

export async function atualizarPropriedadeAction(
  formData: FormData,
): Promise<ResultadoSalvarPropriedade> {
  let escopo: EscopoGerenciamento | null = null;
  let etapaSalvamento = "inicio";
  try {
    escopo = await carregarEscopoGerenciamento();
    const propriedadeId = textoObrigatorio(
      formData,
      "propriedadeId",
      "propriedade",
    );
    const entrada = obterEntradaPropriedade(formData);
    const supabase = await criarClienteSupabaseServer();

    etapaSalvamento = "validar-tenant-e-licenca";
    await garantirTenantOperacionalParaCasas(supabase, escopo.tenantId);
    if (
      entrada.publica ||
      entrada.status === "published" ||
      entrada.destaqueMarketplace
    ) {
      await exigirLicencaPermiteAcoesTenant(escopo.tenantId);
    }
    etapaSalvamento = "salvar-dados-principais";
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

    etapaSalvamento = "salvar-configuracoes-e-comodidades";
    await Promise.all([
      salvarConfiguracoesDaCasa(supabase, escopo, propriedade.id, entrada),
      salvarComodidadesDaCasa(supabase, escopo, propriedade.id, entrada),
    ]);
    etapaSalvamento = "atualizar-galeria-existente";
    await atualizarGaleriaExistentePropriedade(
      supabase,
      escopo.tenantId,
      propriedade.id,
      entrada,
    );
    etapaSalvamento = "salvar-imagem-capa";
    await salvarImagemCapa(supabase, escopo.tenantId, propriedade.id, entrada);
    etapaSalvamento = "salvar-galeria";
    await salvarGaleriaPropriedade(
      supabase,
      escopo.tenantId,
      propriedade.id,
      entrada,
    );
    etapaSalvamento = "confirmar-galeria";
    await confirmarGaleriaPropriedadePersistida(
      supabase,
      escopo.tenantId,
      propriedade.id,
      entrada,
    );
    etapaSalvamento = "limpar-rascunho";
    await limparRascunhoServidor(
      supabase,
      escopo.tenantId,
      propriedade.id,
    );
    revalidarModulo();
    return {
      mensagem: "Casa atualizada com sucesso.",
      propriedadeId: propriedade.id,
      sucesso: true,
    };
  } catch (erro) {
    return criarResultadoErroCasa(
      erro,
      "Erro ao atualizar propriedade.",
      {
        ...(escopo
          ? montarContextoErroCasa("atualizar", escopo)
          : { acao: "atualizar" }),
        etapaWizard: textoOpcional(formData, "etapaWizard") ?? "desconhecida",
        operacao: etapaSalvamento,
      },
      textoOpcional(formData, "propriedadeId") ?? undefined,
    );
  }
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
    if (statusDestino === "published") {
      await exigirLicencaPermiteAcoesTenant(escopo.tenantId);
    }

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

    // A exclusao de propriedade e logica para preservar financeiro e auditoria,
    // mas os modulos operacionais ignoram tudo que estiver ligado a esta casa.
    const dataExclusao = new Date().toISOString();
    const { error } = await supabase
      .from("properties")
      .update({
        deleted_at: dataExclusao,
        is_public: false,
        marketplace_featured: false,
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
    const propriedadeId = textoObrigatorio(
      formData,
      "propriedadeId",
      "propriedade",
    );
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
        max_guests: numeroInteiro(
          formData,
          "maxGuests",
          "capacidade maxima",
          1,
        ),
        min_responsible_age: numeroInteiro(
          formData,
          "minResponsibleAge",
          "idade minima",
          0,
        ),
        additional_rules: textoOpcional(formData, "additionalRules"),
      },
      { onConflict: "property_id" },
    );

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(
      CAMINHO_PROPRIEDADES,
      erro,
      "Erro ao atualizar regras da casa.",
    );
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=regras-casa-atualizadas`);
}

export async function atualizarPoliticaCancelamentoAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const propriedadeId = textoObrigatorio(
      formData,
      "propriedadeId",
      "propriedade",
    );
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
          0,
        ),
        cancellation_refund_until_percentage: numeroPercentual(
          formData,
          "refundUntilPercentage",
          "percentual de reembolso",
        ),
        cancellation_late_until_days: numeroInteiro(
          formData,
          "lateUntilDays",
          "dias para reembolso tardio",
          0,
        ),
        cancellation_late_refund_percentage: numeroPercentual(
          formData,
          "lateRefundPercentage",
          "percentual tardio",
        ),
        cancellation_no_refund_within_days: numeroInteiro(
          formData,
          "noRefundWithinDays",
          "periodo sem reembolso",
          0,
        ),
        cancellation_notes: textoOpcional(formData, "cancellationNotes"),
      },
      { onConflict: "property_id" },
    );

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(
      CAMINHO_PROPRIEDADES,
      erro,
      "Erro ao atualizar politica de cancelamento.",
    );
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=politica-cancelamento-atualizada`);
}

export async function atualizarRegrasReservaAction(formData: FormData) {
  const escopo = await carregarEscopoGerenciamento();

  try {
    const propriedadeId = textoObrigatorio(
      formData,
      "propriedadeId",
      "propriedade",
    );
    const minNights = numeroInteiro(
      formData,
      "minNights",
      "minimo de diarias",
      1,
    );
    const maxNights = numeroInteiroOuNulo(
      formData,
      "maxNights",
      "maximo de diarias",
      1,
    );
    const minAdvanceDays = numeroInteiro(
      formData,
      "minAdvanceDays",
      "antecedencia minima",
      0,
    );
    const maxAdvanceDays = numeroInteiroOuNulo(
      formData,
      "maxAdvanceDays",
      "antecedencia maxima",
      0,
    );

    if (maxNights !== null && maxNights < minNights) {
      throw new ErroRegraNegocio(
        "Maximo de diarias deve ser maior ou igual ao minimo.",
      );
    }
    if (maxAdvanceDays !== null && maxAdvanceDays < minAdvanceDays) {
      throw new ErroRegraNegocio(
        "Antecedencia maxima deve ser maior ou igual a minima.",
      );
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
        booking_mode: validarModoReserva(
          textoObrigatorio(formData, "bookingMode", "modo de reserva"),
        ),
      },
      { onConflict: "property_id" },
    );

    if (error) throw new Error(error.message);
    revalidarModulo();
  } catch (erro) {
    redirecionarComErro(
      CAMINHO_PROPRIEDADES,
      erro,
      "Erro ao atualizar regras de reserva.",
    );
  }

  redirect(`${CAMINHO_PROPRIEDADES}?sucesso=regras-reserva-atualizadas`);
}

function obterRascunhoFormulario(
  formData: FormData,
  propriedadeId: string,
): RascunhoFormularioCasa {
  const conteudo = textoObrigatorio(
    formData,
    "rascunhoFormulario",
    "rascunho da casa",
  );
  if (conteudo.length > 250_000) {
    throw new ErroRegraNegocio("O rascunho ultrapassou o limite permitido.");
  }

  let valor: unknown;
  try {
    valor = JSON.parse(conteudo);
  } catch {
    throw new ErroRegraNegocio("O rascunho recebido e invalido.");
  }

  if (
    !ehObjetoDesconhecido(valor) ||
    valor.versao !== 1 ||
    valor.operacaoId !== propriedadeId ||
    typeof valor.salvoEm !== "string" ||
    !ehObjetoDesconhecido(valor.campos)
  ) {
    throw new ErroRegraNegocio("O rascunho recebido e invalido.");
  }

  const campos: RascunhoFormularioCasa["campos"] = {};
  for (const [nome, entradas] of Object.entries(valor.campos).slice(0, 160)) {
    if (
      /(token|senha|password|secret|credential|api.?key)/i.test(nome) ||
      !Array.isArray(entradas)
    ) {
      continue;
    }

    campos[nome] = entradas.slice(0, 50).flatMap((entrada) => {
      if (
        !ehObjetoDesconhecido(entrada) ||
        typeof entrada.tipo !== "string" ||
        typeof entrada.valor !== "string"
      ) {
        return [];
      }
      return [
        {
          ...(typeof entrada.checked === "boolean"
            ? { checked: entrada.checked }
            : {}),
          tipo: entrada.tipo.slice(0, 40),
          valor: entrada.valor.slice(0, 12_000),
        },
      ];
    });
  }

  return {
    campos,
    etapaAtual:
      typeof valor.etapaAtual === "number"
        ? Math.max(0, Math.min(7, Math.trunc(valor.etapaAtual)))
        : 0,
    incluiArquivos: valor.incluiArquivos === true,
    operacaoId: propriedadeId,
    salvoEm: valor.salvoEm,
    ...(typeof valor.sincronizadoEm === "string"
      ? { sincronizadoEm: valor.sincronizadoEm }
      : {}),
    versao: 1,
  };
}

function montarRegistroRascunho(
  formData: FormData,
  escopo: EscopoGerenciamento,
  propriedadeId: string,
  existente: PropertyRow | null,
) {
  const nome = textoOpcional(formData, "nome") || existente?.name || "Casa em cadastro";
  const tipoInformado = textoOpcional(formData, "tipo");
  const tipo = TIPOS_PROPRIEDADE.includes(tipoInformado as PropertyType)
    ? (tipoInformado as PropertyType)
    : existente?.property_type || "seasonal_home";
  const enderecoAtual = objetoJson(existente?.address);
  const estruturaAtual = objetoJson(existente?.structure_details);
  const valoresAtuais = objetoJson(existente?.pricing_details);

  return {
    id: propriedadeId,
    tenant_id: escopo.tenantId,
    owner_id: escopo.ownerId,
    name: nome,
    slug: existente?.slug || gerarIdentificadorUrl(nome, propriedadeId),
    property_type: tipo,
    status: "draft" as const,
    headline: textoOpcional(formData, "descricaoCurta") || existente?.headline,
    description:
      textoOpcional(formData, "descricaoCompleta") || existente?.description,
    short_description:
      textoOpcional(formData, "descricaoCurta") || existente?.short_description,
    full_description:
      textoOpcional(formData, "descricaoCompleta") || existente?.full_description,
    is_public: false,
    marketplace_featured: false,
    public_details: existente?.public_details || {},
    address: {
      ...enderecoAtual,
      cidade: textoOpcional(formData, "cidade") || enderecoAtual.cidade || "",
      estado: textoOpcional(formData, "estado") || enderecoAtual.estado || "",
      linha1: textoOpcional(formData, "endereco") || enderecoAtual.linha1 || "",
    },
    structure_details: {
      ...estruturaAtual,
      banheiros: numeroRascunho(formData, "banheirosCasa", estruturaAtual.banheiros),
      hospedesMaximos: numeroRascunho(
        formData,
        "hospedesMaximos",
        estruturaAtual.hospedesMaximos,
      ),
      quartos: numeroRascunho(formData, "quartos", estruturaAtual.quartos),
    },
    pricing_details: {
      ...valoresAtuais,
      valorDiaria: numeroRascunho(formData, "valorDiaria", valoresAtuais.valorDiaria),
    },
    timezone: existente?.timezone || "America/Sao_Paulo",
  };
}

async function salvarPayloadRascunhoServidor(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
  rascunho: RascunhoFormularioCasa,
) {
  const { data: configuracao, error: erroBusca } = await supabase
    .from("property_settings")
    .select("settings")
    .eq("property_id", propriedadeId)
    .eq("tenant_id", tenantId)
    .maybeSingle<Pick<PropertySettingRow, "settings">>();

  if (erroBusca) {
    throw erroOperacaoCasa(
      erroBusca.message,
      "Nao foi possivel carregar o rascunho do servidor.",
    );
  }

  const settings = objetoJson(configuracao?.settings);
  const { error } = await supabase.from("property_settings").upsert(
    {
      property_id: propriedadeId,
      tenant_id: tenantId,
      settings: {
        ...settings,
        formDraft: rascunho as unknown as JsonValue,
      },
    },
    { onConflict: "property_id" },
  );

  if (error) {
    console.error("Erro bruto ao persistir o payload do rascunho da casa.", {
      mensagemTecnica: error.message,
      propriedadeId,
      tenantId,
    });
    throw erroOperacaoCasa(
      error.message,
      "Nao foi possivel salvar o rascunho no servidor.",
    );
  }
}

async function limparRascunhoServidor(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
) {
  const { data, error: erroBusca } = await supabase
    .from("property_settings")
    .select("settings")
    .eq("property_id", propriedadeId)
    .eq("tenant_id", tenantId)
    .maybeSingle<Pick<PropertySettingRow, "settings">>();
  if (erroBusca || !data) return;

  const settings = objetoJson(data.settings);
  if (!("formDraft" in settings)) return;
  delete settings.formDraft;

  const { error } = await supabase
    .from("property_settings")
    .update({ settings })
    .eq("property_id", propriedadeId)
    .eq("tenant_id", tenantId);
  if (error) {
    throw erroOperacaoCasa(
      error.message,
      "A casa foi salva, mas nao foi possivel finalizar o rascunho.",
    );
  }
}

function objetoJson(valor: JsonValue | undefined): Record<string, JsonValue> {
  return ehObjetoDesconhecido(valor) && !Array.isArray(valor)
    ? (valor as Record<string, JsonValue>)
    : {};
}

function ehObjetoDesconhecido(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function numeroRascunho(
  formData: FormData,
  chave: string,
  anterior: JsonValue | undefined,
) {
  const texto = textoOpcional(formData, chave)?.replace(",", ".");
  const numero = texto ? Number(texto) : Number(anterior);
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function obterEntradaPropriedade(formData: FormData): EntradaPropriedade {
  const nome = textoObrigatorio(formData, "nome", "nome");
  const descricaoCurta = textoObrigatorio(
    formData,
    "descricaoCurta",
    "descrição curta",
  );
  const hospedesMaximos = numeroInteiro(
    formData,
    "hospedesMaximos",
    "quantidade maxima de hospedes",
    1,
  );
  const quartos = numeroInteiro(
    formData,
    "quartosCasa",
    "quantidade de quartos",
    1,
  );
  const camas = numeroInteiroOpcional(formData, "camasCasa", 1, 1);
  const banheiros = numeroInteiro(
    formData,
    "banheirosCasa",
    "quantidade de banheiros",
    1,
  );
  const valorDiaria = numeroMoedaObrigatoria(
    formData,
    "valorDiaria",
    "valor da diaria",
    0.01,
  );
  const tituloPublico = textoOpcional(formData, "tituloPublico");
  const descricaoPublica = textoOpcional(formData, "descricaoPublica");
  const publica = checkboxAtivo(formData, "visibilidadePublica");
  const status = validarStatusPropriedade(
    textoObrigatorio(formData, "status", "status"),
  );
  const imagemCapaArquivo = obterArquivoImagem(formData, "imagemCapaArquivo");
  const galeriaArquivos = obterArquivosImagem(
    formData,
    "imagensGaleriaArquivos",
  );
  const imagemCapaId = imagemCapaArquivo
    ? uuidObrigatorio(formData, "imagemCapaId", "imagem de capa")
    : null;
  const galeriaArquivoIds = obterValoresMultiplos(
    formData,
    "galeriaArquivoIds",
  );
  if (
    galeriaArquivoIds.length !== galeriaArquivos.length ||
    galeriaArquivoIds.some((id) => !UUID_VALIDO.test(id))
  ) {
    throw new ErroRegraNegocio(
      "Nao foi possivel identificar as imagens da galeria.",
    );
  }
  const imagemPrincipalExistenteId = textoOpcional(
    formData,
    "imagemPrincipalExistenteId",
  );
  const formasPagamento = obterFormasPagamento(formData);
  const comodidadeIds = obterValoresMultiplos(formData, "comodidadeIds");
  const comodidadesPersonalizadas = obterComodidadesPersonalizadas(formData);
  const comodidadesPersonalizadasExistentes =
    obterComodidadesPersonalizadasExistentes(formData);

  validarPublicacaoObrigatoria({
    comodidadeIds,
    comodidadesPersonalizadas,
    comodidadesPersonalizadasExistentes,
    descricaoPublica,
    formData,
    galeriaArquivos,
    imagemCapaArquivo,
    publica: publica || status === "published",
    tituloPublico,
  });

  return {
    detalhesPublicos: {
      descricaoPublica,
      imagemCompartilhamento: validarUrlOpcional(
        formData,
        "imagemCompartilhamento",
      ),
      nomeExibicao: textoOpcional(formData, "nomeExibicao") ?? nome,
      tituloPublico,
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
    comodidadeIds,
    comodidadesPersonalizadas,
    comodidadesPersonalizadasExistentes,
    descricaoCompleta: textoOpcional(formData, "descricaoCompleta"),
    descricaoCurta,
    destaqueMarketplace: checkboxAtivo(formData, "destaqueMarketplace"),
    galeriaArquivos,
    galeriaArquivoIds,
    galeriaExistente: obterGaleriaExistente(
      formData,
      imagemPrincipalExistenteId,
    ),
    galeriaIndicePrincipal: numeroInteiroOpcionalOuNulo(
      formData,
      "imagemPrincipalGaleriaIndice",
      0,
    ),
    galeriaOrdens: obterNumerosInteirosMultiplos(formData, "ordensGaleria"),
    galeriaTitulos: obterValoresMultiplos(formData, "titulosGaleria"),
    imagensExistentesRemovidasIds: obterValoresMultiplos(
      formData,
      "imagensExistentesRemovidasIds",
    ),
    imagemCapaArquivo,
    imagemCapaId,
    nome,
    publica,
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
    status,
    tipo: validarTipoPropriedade(textoObrigatorio(formData, "tipo", "tipo")),
    valores: {
      aceitaCartaoCredito: formasPagamento.cartaoCredito.ativo,
      caucao: numeroMoedaOpcional(formData, "caucao", 0),
      cobraHospedeExtra: checkboxAtivo(formData, "cobraHospedeExtra"),
      formasPagamento,
      // Regra oficial: a capacidade cadastrada da casa e a quantidade sem extra.
      // Mantemos o campo legado sincronizado para contratos antigos nao divergirem.
      hospedesInclusos: hospedesMaximos,
      jurosParcelasCartao: formasPagamento.cartaoCredito.jurosParcelas,
      maxParcelasCartao: formasPagamento.cartaoCredito.maxParcelas,
      taxaLimpeza: numeroMoedaOpcional(formData, "taxaLimpeza", 0),
      tipoCobrancaHospedeExtra: validarTipoCobrancaHospedeExtra(
        textoOpcional(formData, "tipoCobrancaHospedeExtra"),
      ),
      valorDiaria,
      valorHospedeExtra: numeroMoedaOpcional(formData, "valorHospedeExtra", 0),
    },
  };
}

function validarTipoCobrancaHospedeExtra(
  _valor: string | null,
): TipoCobrancaHospedeExtra {
  void _valor;
  // Regra oficial: hospede extra e adicional da reserva, nao da diaria.
  return "per_stay";
}

function validarPublicacaoObrigatoria({
  comodidadeIds,
  comodidadesPersonalizadas,
  comodidadesPersonalizadasExistentes,
  descricaoPublica,
  formData,
  galeriaArquivos,
  imagemCapaArquivo,
  publica,
  tituloPublico,
}: {
  comodidadeIds: string[];
  comodidadesPersonalizadas: string[];
  comodidadesPersonalizadasExistentes: EntradaPropriedade["comodidadesPersonalizadasExistentes"];
  descricaoPublica: string | null;
  formData: FormData;
  galeriaArquivos: File[];
  imagemCapaArquivo: File | null;
  publica: boolean;
  tituloPublico: string | null;
}) {
  if (!publica) return;

  if (!tituloPublico) {
    throw new ErroRegraNegocio(
      "Informe o título público para publicar a casa.",
    );
  }

  if (!descricaoPublica) {
    throw new ErroRegraNegocio(
      "Informe a descrição pública para publicar a casa.",
    );
  }

  if (
    !possuiComodidadeValida({
      comodidadeIds,
      comodidadesPersonalizadas,
      comodidadesPersonalizadasExistentes,
    })
  ) {
    throw new ErroRegraNegocio(
      "Adicione pelo menos uma comodidade antes de publicar a casa.",
    );
  }

  const possuiImagemAtual =
    Boolean(textoOpcional(formData, "propriedadeId")) &&
    formData.get("possuiImagemPrincipalAtual") === "true";
  const possuiImagemNova = Boolean(imagemCapaArquivo);
  const galeriaDefinePrincipal =
    galeriaArquivos.length > 0 && formData.has("imagemPrincipalGaleriaIndice");

  if (!possuiImagemAtual && !possuiImagemNova && !galeriaDefinePrincipal) {
    throw new ErroRegraNegocio(
      "Adicione uma foto principal para publicar a casa.",
    );
  }
}

function possuiComodidadeValida({
  comodidadeIds,
  comodidadesPersonalizadas,
}: {
  comodidadeIds: string[];
  comodidadesPersonalizadas: string[];
  comodidadesPersonalizadasExistentes: EntradaPropriedade["comodidadesPersonalizadasExistentes"];
}) {
  // Publicacao sem comodidade enfraquece a conversao no Marketplace e gera
  // pagina publica vazia; rascunho continua livre para cadastro gradual.
  return (
    comodidadeIds.some(Boolean) ||
    comodidadesPersonalizadas.some((nome) => Boolean(nome.trim()))
  );
}

function obterFormasPagamento(formData: FormData): FormasPagamentoPropriedade {
  const pixAtivo = checkboxAtivo(formData, "pagamentoPixAtivo");
  const cartaoCreditoAtivo = checkboxAtivo(formData, "aceitaCartaoCredito");

  return {
    cartaoCredito: {
      ativo: cartaoCreditoAtivo,
      instrucoes: "",
      jurosParcelas: obterJurosParcelasCartao(formData),
      maxParcelas: cartaoCreditoAtivo
        ? Math.min(
            numeroInteiroOpcional(formData, "maxParcelasCartao", 1, 1),
            MAX_PARCELAS_CARTAO,
          )
        : 1,
    },
    cartaoDebito: {
      ativo: checkboxAtivo(formData, "pagamentoCartaoDebitoAtivo"),
      instrucoes: "",
    },
    dinheiro: {
      ativo: checkboxAtivo(formData, "pagamentoDinheiroAtivo"),
      instrucoes: "",
    },
    pix: {
      ativo: pixAtivo,
      banco: "",
      chave: "",
      instrucoes: "",
      recebedor: "",
      tipoChave: "aleatoria",
    },
    transferenciaBancaria: {
      agencia: "",
      ativo: checkboxAtivo(formData, "pagamentoTransferenciaAtivo"),
      banco: "",
      conta: "",
      instrucoes: "",
      recebedor: "",
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
      throw new ErroRegraNegocio(
        "Comodidade personalizada deve ter no maximo 80 caracteres.",
      );
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

function obterGaleriaExistente(
  formData: FormData,
  imagemPrincipalId: string | null,
): ImagemExistenteEntrada[] {
  const ids = obterValoresMultiplos(formData, "imagensExistentesIds");
  const titulos = obterValoresMultiplos(formData, "titulosImagensExistentes");
  const ordens = obterNumerosInteirosMultiplos(
    formData,
    "ordensImagensExistentes",
  );

  return ids.map((id, indice) => ({
    id,
    ordem: ordens[indice] ?? indice + 1,
    principal: Boolean(imagemPrincipalId && id === imagemPrincipalId),
    titulo: titulos[indice]?.trim() || `Foto ${indice + 1}`,
  }));
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
    throw erroOperacaoCasa(
      error.message,
      "Não foi possível salvar as configurações da casa.",
    );
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
  const idsValidos = await obterComodidadesValidas(supabase, escopo.tenantId, [
    ...entrada.comodidadeIds,
    ...idsPersonalizados,
  ]);

  const { error: erroLimpeza } = await supabase
    .from("property_amenities")
    .delete()
    .eq("tenant_id", escopo.tenantId)
    .eq("property_id", propriedadeId);

  if (erroLimpeza) {
    throw erroOperacaoCasa(
      erroLimpeza.message,
      "Erro ao atualizar comodidades.",
    );
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
      throw erroOperacaoCasa(
        error.message,
        "Erro ao atualizar comodidade personalizada.",
      );
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
      throw erroOperacaoCasa(
        erroBusca.message,
        "Erro ao validar comodidade personalizada.",
      );
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
    throw erroOperacaoCasa(
      error.message,
      "Erro ao validar comodidades da casa.",
    );
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
    throw erroOperacaoCasa(
      error.message,
      "Não foi possível validar o limite de casas.",
    );
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
  // Tenant suspenso/cancelado continua bloqueado. A validade da licenca fica na
  // regra central de tolerancia para nao bloquear o proprietario no dia do vencimento.
  const { data: tenant, error: erroTenant } = await supabase
    .from("tenants")
    .select("status")
    .eq("id", tenantId)
    .maybeSingle<{ status: string }>();

  if (erroTenant) {
    throw new ErroRegraNegocio(
      traduzirErroSupabase(
        erroTenant.message,
        "Nao foi possivel validar o tenant.",
      ),
    );
  }
  if (!tenant || !["trial", "active", "past_due"].includes(tenant.status)) {
    throw new ErroRegraNegocio(
      "Tenant inativo. Verifique o status da conta no Super Admin.",
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

function obterIdsMidiaEsperados(entrada: EntradaPropriedade) {
  return Array.from(
    new Set(
      [
        entrada.imagemCapaId,
        ...entrada.galeriaArquivoIds,
        ...entrada.galeriaExistente.map((imagem) => imagem.id),
      ].filter((id): id is string => Boolean(id)),
    ),
  );
}

function obterImagemPrincipalEsperada(entrada: EntradaPropriedade) {
  if (entrada.imagemCapaId) return entrada.imagemCapaId;
  if (entrada.galeriaIndicePrincipal !== null) {
    return entrada.galeriaArquivoIds[entrada.galeriaIndicePrincipal] ?? null;
  }
  return entrada.galeriaExistente.find((imagem) => imagem.principal)?.id ?? null;
}

async function confirmarGaleriaPropriedadePersistida(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
  entrada: EntradaPropriedade,
) {
  const idsEsperados = obterIdsMidiaEsperados(entrada);
  if (!idsEsperados.length) return;

  const { data, error } = await supabase
    .from("media_assets")
    .select("id,is_cover,storage_path,url,sort_order")
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedadeId)
    .eq("status", "active")
    .in("id", idsEsperados)
    .returns<Array<Pick<MediaAssetRow, "id" | "is_cover" | "storage_path" | "url">>>();

  if (error) {
    throw erroOperacaoCasa(
      error.message,
      "Nao foi possivel confirmar as imagens salvas.",
    );
  }

  const imagensPersistidas = data ?? [];
  const idsPersistidos = new Set(imagensPersistidas.map((imagem) => imagem.id));
  const faltantes = idsEsperados.filter((id) => !idsPersistidos.has(id));

  if (faltantes.length > 0) {
    throw new ErroRegraNegocio(
      "A casa foi salva como rascunho, mas algumas imagens nao foram vinculadas. Seus dados foram mantidos. Tente enviar novamente.",
    );
  }

  const principalEsperada = obterImagemPrincipalEsperada(entrada);
  if (!principalEsperada) return;

  const imagemPrincipal = imagensPersistidas.find(
    (imagem) => imagem.id === principalEsperada,
  );
  if (!imagemPrincipal?.is_cover) {
    throw new ErroRegraNegocio(
      "A casa foi salva como rascunho, mas a imagem principal nao foi confirmada. Tente salvar novamente.",
    );
  }
}

async function marcarCasaComoRascunhoAposFalhaMidia(
  supabase: ClienteSupabaseServer,
  escopo: EscopoGerenciamento,
  propriedadeId: string,
) {
  const { error } = await supabase
    .from("properties")
    .update({
      is_public: false,
      marketplace_featured: false,
      status: "draft",
    })
    .eq("id", propriedadeId)
    .eq("tenant_id", escopo.tenantId)
    .eq("owner_id", escopo.ownerId);

  if (error) {
    console.error("Falha ao manter casa como rascunho apos erro de imagem.", {
      mensagemTecnica: error.message,
      propriedadeId,
      tenantId: escopo.tenantId,
    });
  }
}

async function removerObjetoStorageSeguro(
  supabase: ClienteSupabaseServer,
  bucket: string,
  path: string,
  etapa: string,
) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (!error) return;

  console.error("Falha ao limpar imagem enviada sem registro no banco.", {
    etapa,
    mensagemTecnica: error.message,
    path,
  });
}

function ehFalhaMidiaCasa(erro: unknown) {
  const mensagem = erro instanceof Error ? erro.message.toLowerCase() : "";
  return /(imagem|galeria|foto|storage|bucket|m[ií]dia)/i.test(mensagem);
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
    throw erroOperacaoCasa(
      error.message,
      "Não foi possível calcular a ordem das imagens.",
    );
  }
  return (data?.sort_order ?? -1) + 1;
}

async function atualizarGaleriaExistentePropriedade(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
  entrada: EntradaPropriedade,
) {
  await removerImagensExistentesPropriedade(
    supabase,
    tenantId,
    propriedadeId,
    entrada.imagensExistentesRemovidasIds,
  );

  if (!entrada.galeriaExistente.length) return;

  const usaPrincipalNova =
    Boolean(entrada.imagemCapaArquivo) ||
    entrada.galeriaIndicePrincipal !== null;
  const principalExistente = entrada.galeriaExistente.find(
    (imagem) => imagem.principal,
  );

  if (principalExistente && !usaPrincipalNova) {
    // A capa publica deve ser unica por casa. Ao escolher uma imagem existente,
    // limpamos as demais antes de marcar a nova principal.
    const { error } = await supabase
      .from("media_assets")
      .update({ is_cover: false })
      .eq("tenant_id", tenantId)
      .eq("property_id", propriedadeId)
      .eq("status", "active");

    if (error) {
      throw erroOperacaoCasa(
        error.message,
        "Erro ao atualizar imagem principal.",
      );
    }
  }

  for (const imagem of entrada.galeriaExistente) {
    const atualizacao: {
      alt: string;
      is_cover?: boolean;
      sort_order: number;
    } = {
      alt: imagem.titulo,
      sort_order: imagem.ordem,
    };

    if (principalExistente && !usaPrincipalNova) {
      atualizacao.is_cover = imagem.id === principalExistente.id;
    }

    const { error } = await supabase
      .from("media_assets")
      .update(atualizacao)
      .eq("id", imagem.id)
      .eq("tenant_id", tenantId)
      .eq("property_id", propriedadeId)
      .eq("status", "active");

    if (error) {
      throw erroOperacaoCasa(error.message, "Erro ao atualizar galeria.");
    }
  }
}

async function removerImagensExistentesPropriedade(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
  imagemIds: string[],
) {
  if (!imagemIds.length) return;

  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedadeId)
    .eq("status", "active")
    .in("id", imagemIds)
    .returns<MediaAssetRow[]>();

  if (error) {
    throw erroOperacaoCasa(
      error.message,
      "Erro ao localizar imagens removidas.",
    );
  }

  await Promise.all(
    (data ?? []).map((imagem) => removerImagemDoStorage(supabase, imagem)),
  );

  const { error: erroRemocao } = await supabase
    .from("media_assets")
    .update({ is_cover: false, status: "deleted" })
    .eq("tenant_id", tenantId)
    .eq("property_id", propriedadeId)
    .in("id", imagemIds);

  if (erroRemocao) {
    throw erroOperacaoCasa(erroRemocao.message, "Erro ao remover imagens.");
  }
}

async function salvarImagemCapa(
  supabase: ClienteSupabaseServer,
  tenantId: string,
  propriedadeId: string,
  entrada: EntradaPropriedade,
) {
  if (!entrada.imagemCapaArquivo) return;
  const imagemId = entrada.imagemCapaId!;

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
        imagemId,
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
    throw erroOperacaoCasa(
      erroCapaAnterior.message,
      "Erro ao atualizar imagem principal.",
    );
  }

  const { error } = await supabase.from("media_assets").upsert(
    {
      id: imagemId,
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
    },
    { onConflict: "id" },
  );
  if (error) {
    await removerObjetoStorageSeguro(
      supabase,
      arquivo.bucket,
      arquivo.path,
      "imagem-capa",
    );
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
      throw erroOperacaoCasa(
        error.message,
        "Erro ao atualizar imagem principal.",
      );
    }
  }

  const proximaOrdem = await obterProximaOrdemMidia(
    supabase,
    tenantId,
    propriedadeId,
  );

  for (const [indice, arquivo] of entrada.galeriaArquivos.entries()) {
    const imagemId = entrada.galeriaArquivoIds[indice];
    if (!imagemId) {
      throw new ErroRegraNegocio(
        "Nao foi possivel identificar as imagens da galeria.",
      );
    }

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
          imagemId,
        ),
    );

    const titulo = entrada.galeriaTitulos[indice]?.trim() || arquivo.name;
    const ordemInformada = entrada.galeriaOrdens[indice];

    const { error } = await supabase.from("media_assets").upsert(
      {
        id: imagemId,
        alt: titulo,
        is_cover:
          galeriaDefineCapa && entrada.galeriaIndicePrincipal === indice,
        media_type: "image",
        property_id: propriedadeId,
        sort_order: ordemInformada ?? proximaOrdem + indice,
        status: "active",
        storage_bucket: midia.bucket,
        storage_path: midia.path,
        tenant_id: tenantId,
        url: midia.url,
      },
      { onConflict: "id" },
    );

    if (error) {
      await removerObjetoStorageSeguro(
        supabase,
        midia.bucket,
        midia.path,
        "galeria",
      );
      throw erroOperacaoCasa(
        error.message,
        "Erro ao salvar imagens da galeria.",
      );
    }
  }
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

function obterNumerosInteirosMultiplos(
  formData: FormData,
  chave: string,
): number[] {
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

function numeroPercentual(
  formData: FormData,
  chave: string,
  label: string,
): number {
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

  const partes = valor.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (partes) {
    // Campos time do navegador e do Postgres podem alternar entre HH:MM e
    // HH:MM:SS. Normalizamos para HH:MM para evitar falso erro ao editar casa.
    return `${partes[1]}:${partes[2]}`;
  }

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
  const valor = Number.parseFloat(
    textoObrigatorio(formData, chave, label).replace(",", "."),
  );
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

function validarModoReserva(
  valor: string,
): "manual_approval" | "instant_booking" {
  if (valor === "manual_approval" || valor === "instant_booking") return valor;
  throw new ErroRegraNegocio("Modo de reserva inválido.");
}

function exigirConfirmacaoExclusao(formData: FormData) {
  if (formData.get("confirmarExclusao") !== "confirmado") {
    throw new ErroRegraNegocio("Confirme a exclusão antes de continuar.");
  }
}

function gerarIdentificadorUrl(valor: string, identificador?: string): string {
  const base = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `${base || "item"}-${identificador?.slice(0, 8) ?? Date.now().toString(36)}`;
}

const UUID_VALIDO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuidObrigatorio(formData: FormData, chave: string, label: string) {
  const valor = textoObrigatorio(formData, chave, label);
  if (!UUID_VALIDO.test(valor)) {
    throw new ErroRegraNegocio(`Identificador de ${label} invalido.`);
  }
  return valor;
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
  const mensagemTecnica =
    erro instanceof ErroRegraNegocio
      ? (erro.causaTecnica ?? erro.message)
      : erro instanceof Error
        ? erro.message
        : null;
  const mensagem =
    erro instanceof ErroRegraNegocio
      ? traduzirErroSupabase(mensagemTecnica, erro.message)
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

function criarResultadoErroCasa(
  erro: unknown,
  mensagemLog: string,
  contexto: Record<string, unknown>,
  propriedadeId?: string,
): ResultadoSalvarPropriedade {
  const mensagemTecnica =
    erro instanceof ErroRegraNegocio
      ? (erro.causaTecnica ?? erro.message)
      : erro instanceof Error
        ? erro.message
        : null;
  const mensagem =
    erro instanceof ErroRegraNegocio
      ? traduzirErroSupabase(mensagemTecnica, erro.message)
      : traduzirErroSupabase(
          mensagemTecnica,
          "Nao foi possivel confirmar o salvamento da casa. Seus dados foram mantidos. Verifique sua conexao e tente novamente.",
        );
  const codigoSuporte = `CASA-${randomUUID().slice(0, 8).toUpperCase()}`;

  console.error(mensagemLog, {
    codigoSuporte,
    contexto,
    dataHora: new Date().toISOString(),
    mensagemTecnica,
    mensagemUsuario: mensagem,
    propriedadeId,
    stack: erro instanceof Error ? erro.stack : undefined,
  });

  return {
    codigoSuporte,
    mensagem,
    ...(propriedadeId ? { propriedadeId } : {}),
    sucesso: false,
  };
}

function traduzirErroSupabase(
  mensagemTecnica: string | null | undefined,
  fallback: string,
) {
  const mensagem = mensagemTecnica?.toLowerCase() ?? "";

  if (!mensagem) return fallback;
  if (
    mensagem.includes("row-level security") ||
    mensagem.includes("rls") ||
    mensagem.includes("permission denied") ||
    mensagem.includes("unauthorized") ||
    mensagem.includes("not authorized") ||
    mensagem.includes("403")
  ) {
    return fallbackEhSeguro(fallback)
      ? "Voce nao possui permissao para alterar as imagens desta casa."
      : ERRO_PERMISSAO_CASAS;
  }
  if (
    mensagem.includes("duplicate key") &&
    mensagem.includes("properties_slug")
  ) {
    return "Já existe uma casa com identificador semelhante. Tente novamente.";
  }
  if (mensagem.includes("violates not-null constraint")) {
    return "Existe um campo obrigatório da casa sem preenchimento. Revise os dados e tente novamente.";
  }
  if (mensagem.includes("violates check constraint")) {
    return "Existe um valor inválido no cadastro da casa. Revise os dados e tente novamente.";
  }
  if (
    mensagem.includes("mime")
  ) {
    return "Não foi possível salvar a imagem. Verifique o formato e tente novamente.";
  }
  if (
    mensagem.includes("file size") ||
    mensagem.includes("payload too large") ||
    mensagem.includes("entity too large") ||
    mensagem.includes("exceeded") ||
    mensagem.includes("limite")
  ) {
    return "A imagem ultrapassa o limite permitido. Envie uma imagem menor e tente novamente.";
  }
  if (mensagem.includes("bucket")) {
    return "Nao foi possivel conectar ao armazenamento da casa. Entre em contato com o suporte.";
  }
  if (mensagem.includes("storage")) {
    return "Nao foi possivel conectar ao armazenamento da casa. Tente novamente em instantes.";
  }
  if (
    mensagem.includes("jwt") ||
    mensagem.includes("session") ||
    mensagem.includes("auth")
  ) {
    return "Sessão expirada. Entre novamente.";
  }
  if (
    mensagem.includes("network") ||
    mensagem.includes("fetch failed") ||
    mensagem.includes("timeout") ||
    mensagem.includes("timed out") ||
    mensagem.includes("aborted")
  ) {
    return "Falha de conexão com o Supabase. Tente novamente em instantes.";
  }

  return fallback;
}

function erroOperacaoCasa(
  mensagemTecnica: string | null | undefined,
  fallback: string,
) {
  return new ErroRegraNegocio(
    traduzirErroSupabase(mensagemTecnica, fallback),
    mensagemTecnica ?? undefined,
  );
}

async function executarEtapaCasa<T>(
  fallback: string,
  etapa: () => Promise<T>,
): Promise<T> {
  try {
    return await etapa();
  } catch (erro) {
    const mensagemTecnica =
      erro instanceof ErroRegraNegocio
        ? (erro.causaTecnica ?? erro.message)
        : erro instanceof Error
          ? erro.message
          : null;
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
  revalidatePath("/dashboard");
  revalidatePath("/pendencias");
  revalidatePath("/reservas");
  revalidatePath("/calendario");
  revalidatePath("/limpeza");
  revalidatePath("/hospedes");
  revalidatePath("/relatorios");
  revalidatePath("/avaliacoes");
}
