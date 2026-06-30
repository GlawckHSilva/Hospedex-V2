"use client";

import type { AmenityRow, PropertyStatus, PropertyType } from "@hospedex/types";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BedDouble,
  Banknote,
  Camera,
  Clock3,
  CreditCard,
  Home,
  ImagePlus,
  Landmark,
  MapPin,
  Share2,
  Sparkles,
  Star,
  Smartphone,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { ComponentProps, FormEvent, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import { Input, Label, cn } from "@hospedex/ui";

import { ActionButton } from "../management/action-button";
import { AppModal } from "../management/entity-modal";
import { FormActionButton } from "../management/form-submit-button";
import { WizardStepper } from "../management/wizard-stepper";
import { PropertyAmenitiesStep } from "./property-amenities-step";
import {
  atualizarPropriedadeAction,
  criarPropriedadeAction,
} from "../../lib/properties/actions";
import type { PropriedadeComRelacionamentos } from "../../lib/properties/types";
import {
  TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_BYTES,
  TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_MB,
  tipoImagemPropriedadePermitido,
} from "../../lib/properties/media-limits";

/**
 * Formulario completo de casa em etapas.
 *
 * A UI coleta dados publicos, operacionais, regras e imagens, mas tenant,
 * owner, plano e permissoes continuam validados na server action.
 */
export type PropertyFormProps = {
  comodidadesDisponiveis: AmenityRow[];
  modo: "criar" | "editar";
  podeGerenciar: boolean;
  propriedade?: PropriedadeComRelacionamentos;
};

type EtapaId =
  | "basico"
  | "localizacao"
  | "estrutura"
  | "valores"
  | "regras"
  | "imagens"
  | "comodidades"
  | "compartilhamento";

const ETAPAS: Array<{
  descricao: string;
  icon: ReactNode;
  id: EtapaId;
  label: string;
}> = [
  {
    descricao: "Identificacao, status e textos principais da casa.",
    icon: <Home />,
    id: "basico",
    label: "Basico",
  },
  {
    descricao: "Endereco operacional e referencias para localizacao.",
    icon: <MapPin />,
    id: "localizacao",
    label: "Localizacao",
  },
  {
    descricao: "Capacidade, quartos e estrutura fisica da hospedagem.",
    icon: <BedDouble />,
    id: "estrutura",
    label: "Estrutura",
  },
  {
    descricao: "Diaria, taxas e configuracao futura de cartao.",
    icon: <WalletCards />,
    id: "valores",
    label: "Valores",
  },
  {
    descricao: "Horarios, regras e observacoes internas.",
    icon: <Clock3 />,
    id: "regras",
    label: "Regras",
  },
  {
    descricao: "Capa e novas fotos da galeria.",
    icon: <Camera />,
    id: "imagens",
    label: "Imagens",
  },
  {
    descricao: "Comodidades padrao e personalizadas.",
    icon: <Sparkles />,
    id: "comodidades",
    label: "Comodidades",
  },
  {
    descricao: "Dados publicos usados no Marketplace.",
    icon: <Share2 />,
    id: "compartilhamento",
    label: "Publicacao",
  },
];

const TIPOS: Array<{ label: string; valor: PropertyType }> = [
  { valor: "seasonal_home", label: "Casa de temporada" },
  { valor: "inn", label: "Pousada" },
  { valor: "small_hotel", label: "Pequeno hotel" },
];

const STATUS: Array<{ label: string; valor: PropertyStatus }> = [
  { valor: "draft", label: "Rascunho" },
  { valor: "published", label: "Ativa" },
  { valor: "paused", label: "Pausada" },
];

const TIPOS_CHAVE_PIX = [
  { label: "CPF", valor: "cpf" },
  { label: "CNPJ", valor: "cnpj" },
  { label: "E-mail", valor: "email" },
  { label: "Telefone", valor: "telefone" },
  { label: "Chave aleatoria", valor: "aleatoria" },
];

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const MAX_PARCELAS_CARTAO = 12;

type ErrosFormularioCasa = Partial<Record<string, string>>;

type CampoObrigatorioCasa = {
  etapa: EtapaId;
  mensagem: string;
  minimo?: number;
  name: string;
  tipo: "imagem" | "numero" | "texto";
  validarQuando?: (dados: FormData) => boolean;
};

const CAMPOS_OBRIGATORIOS_CASA: CampoObrigatorioCasa[] = [
  {
    etapa: "basico",
    mensagem: "Informe o nome da casa.",
    name: "nome",
    tipo: "texto",
  },
  {
    etapa: "basico",
    mensagem: "Informe o tipo da casa.",
    name: "tipo",
    tipo: "texto",
  },
  {
    etapa: "basico",
    mensagem: "Informe a descricao curta da casa.",
    name: "descricaoCurta",
    tipo: "texto",
  },
  {
    etapa: "localizacao",
    mensagem: "Informe o endereco.",
    name: "endereco",
    tipo: "texto",
  },
  {
    etapa: "localizacao",
    mensagem: "Informe a cidade.",
    name: "cidade",
    tipo: "texto",
  },
  {
    etapa: "localizacao",
    mensagem: "Informe o estado.",
    name: "estado",
    tipo: "texto",
  },
  {
    etapa: "estrutura",
    mensagem: "Informe a quantidade maxima de hospedes.",
    minimo: 1,
    name: "hospedesMaximos",
    tipo: "numero",
  },
  {
    etapa: "estrutura",
    mensagem: "Informe a quantidade de quartos.",
    minimo: 1,
    name: "quartosCasa",
    tipo: "numero",
  },
  {
    etapa: "estrutura",
    mensagem: "Informe a quantidade de banheiros.",
    minimo: 1,
    name: "banheirosCasa",
    tipo: "numero",
  },
  {
    etapa: "valores",
    mensagem: "Informe o valor da diaria.",
    minimo: 0.01,
    name: "valorDiaria",
    tipo: "numero",
  },
  {
    etapa: "valores",
    mensagem: "Informe a chave Pix.",
    name: "pixChave",
    tipo: "texto",
    validarQuando: (dados) => dados.get("pagamentoPixAtivo") === "on",
  },
  {
    etapa: "valores",
    mensagem: "Informe o nome do recebedor do Pix.",
    name: "pixRecebedor",
    tipo: "texto",
    validarQuando: (dados) => dados.get("pagamentoPixAtivo") === "on",
  },
  {
    etapa: "valores",
    mensagem: "Informe a quantidade maxima de parcelas.",
    minimo: 1,
    name: "maxParcelasCartao",
    tipo: "numero",
    validarQuando: (dados) => dados.get("aceitaCartaoCredito") === "on",
  },
  {
    etapa: "imagens",
    mensagem: "Adicione uma foto principal para publicar a casa.",
    name: "imagemCapaArquivo",
    tipo: "imagem",
    validarQuando: (dados) => dados.get("visibilidadePublica") === "on",
  },
  {
    etapa: "compartilhamento",
    mensagem: "Informe o titulo publico para publicar a casa.",
    name: "tituloPublico",
    tipo: "texto",
    validarQuando: (dados) => dados.get("visibilidadePublica") === "on",
  },
  {
    etapa: "compartilhamento",
    mensagem: "Informe a descricao publica para publicar a casa.",
    name: "descricaoPublica",
    tipo: "texto",
    validarQuando: (dados) => dados.get("visibilidadePublica") === "on",
  },
];

type JurosParcelaCartao =
  PropriedadeComRelacionamentos["valores"]["jurosParcelasCartao"][number];

function limitarParcelasCartao(valor: number) {
  if (!Number.isFinite(valor)) return 1;
  return Math.min(Math.max(Math.trunc(valor), 1), MAX_PARCELAS_CARTAO);
}

function normalizarValorJuros(valor: string | number | undefined) {
  const numero = Number(String(valor ?? "0").replace(",", "."));
  if (!Number.isFinite(numero) || numero < 0) return "0";
  return String(numero);
}

function formatarJuros(valor: string | number | undefined) {
  const numero = Number(normalizarValorJuros(valor));
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(numero) ? 0 : 2,
  }).format(numero)}%`;
}

function criarJurosParcelasIniciais(
  maxParcelas: number,
  jurosExistentes: JurosParcelaCartao[] = [],
) {
  const jurosPorParcela = new Map(
    jurosExistentes.map((item) => [item.parcela, item.jurosPercentual]),
  );

  return Array.from({ length: maxParcelas }, (_, indice) => {
    const parcela = indice + 1;
    return [
      parcela,
      normalizarValorJuros(jurosPorParcela.get(parcela) ?? 0),
    ] as const;
  }).reduce<Record<number, string>>((resultado, [parcela, juros]) => {
    resultado[parcela] = juros;
    return resultado;
  }, {});
}

type PreviewGaleria = {
  arquivo: File;
  id: string;
  nome: string;
  ordem: number;
  principal: boolean;
  titulo: string;
  url: string;
};

function criarPreviewGaleria(
  arquivo: File,
  ordem: number,
  principal: boolean,
): PreviewGaleria {
  return {
    arquivo,
    id: `${arquivo.name}-${arquivo.lastModified}-${arquivo.size}-${crypto.randomUUID()}`,
    nome: arquivo.name,
    ordem,
    principal,
    titulo: arquivo.name.replace(/\.[^.]+$/, ""),
    url: URL.createObjectURL(arquivo),
  };
}

function normalizarGaleria(previews: PreviewGaleria[]): PreviewGaleria[] {
  const indicePrincipal = Math.max(
    previews.findIndex((preview) => preview.principal),
    0,
  );

  return previews.map((preview, indice) => ({
    ...preview,
    ordem: indice + 1,
    // Toda galeria precisa manter uma imagem principal para uso futuro no marketplace.
    principal: indice === indicePrincipal,
  }));
}

function indiceDaEtapa(etapaId: EtapaId) {
  return Math.max(
    ETAPAS.findIndex((etapa) => etapa.id === etapaId),
    0,
  );
}

function validarFormularioCasa(
  formulario: HTMLFormElement,
  etapasPermitidas?: Set<EtapaId>,
  contexto: { possuiImagemPrincipal: boolean } = {
    possuiImagemPrincipal: false,
  },
): ErrosFormularioCasa {
  const dados = new FormData(formulario);
  const erros: ErrosFormularioCasa = {};

  for (const campo of CAMPOS_OBRIGATORIOS_CASA) {
    if (etapasPermitidas && !etapasPermitidas.has(campo.etapa)) continue;
    if (campo.validarQuando && !campo.validarQuando(dados)) continue;

    const valorBruto = dados.get(campo.name)?.toString().trim() ?? "";
    if (campo.tipo === "texto" && !valorBruto) {
      erros[campo.name] = campo.mensagem;
      continue;
    }

    if (campo.tipo === "imagem" && !contexto.possuiImagemPrincipal) {
      erros[campo.name] = campo.mensagem;
      continue;
    }

    if (campo.tipo === "numero") {
      const valor = Number.parseFloat(valorBruto.replace(",", "."));
      if (!Number.isFinite(valor) || valor < (campo.minimo ?? 0)) {
        erros[campo.name] = campo.mensagem;
      }
    }
  }

  return erros;
}

function removerErrosDaEtapa(
  erros: ErrosFormularioCasa,
  etapaId: EtapaId,
): ErrosFormularioCasa {
  const camposDaEtapa = new Set(
    CAMPOS_OBRIGATORIOS_CASA.filter((campo) => campo.etapa === etapaId).map(
      (campo) => campo.name,
    ),
  );

  return Object.fromEntries(
    Object.entries(erros).filter(([nome]) => !camposDaEtapa.has(nome)),
  );
}

function obterEtapasComErro(erros: ErrosFormularioCasa): EtapaId[] {
  const camposComErro = new Set(Object.keys(erros));
  const etapas = CAMPOS_OBRIGATORIOS_CASA.filter((campo) =>
    camposComErro.has(campo.name),
  ).map((campo) => campo.etapa);

  return Array.from(new Set(etapas));
}

export function PropertyForm({
  comodidadesDisponiveis,
  modo,
  podeGerenciar,
  propriedade,
}: PropertyFormProps) {
  const action =
    modo === "editar" ? atualizarPropriedadeAction : criarPropriedadeAction;
  const searchParams = useSearchParams();
  const erroServidor = searchParams.get("erro");
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [errosCampos, setErrosCampos] = useState<ErrosFormularioCasa>({});
  const [erroImagem, setErroImagem] = useState<string | null>(null);
  const [previewCapa, setPreviewCapa] = useState<string | null>(null);
  const [previewsGaleria, setPreviewsGaleria] = useState<PreviewGaleria[]>([]);
  const [publicaSelecionada, setPublicaSelecionada] = useState(
    propriedade?.is_public ?? false,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const capaRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const arquivosGaleriaRef = useRef<File[]>([]);
  const previewCapaRef = useRef<string | null>(null);
  const previewsGaleriaRef = useRef<PreviewGaleria[]>([]);
  const endereco = propriedade?.enderecoFormatado;
  const estrutura = propriedade?.estrutura;
  const valores = propriedade?.valores;
  const regras = propriedade?.regras;
  const comodidadesSelecionadas = new Set(
    propriedade?.comodidades.map((item) => item.id) ?? [],
  );
  const bloqueado =
    !podeGerenciar ||
    Boolean(erroImagem) ||
    Object.keys(errosCampos).length > 0;
  const etapa = ETAPAS[etapaAtual] ?? ETAPAS[0]!;
  const estaNaUltimaEtapa = etapaAtual === ETAPAS.length - 1;
  const etapasConcluidas = ETAPAS.slice(0, etapaAtual).map((item) => item.id);
  const etapasComErro = obterEtapasComErro(errosCampos);

  useEffect(() => {
    previewCapaRef.current = previewCapa;
  }, [previewCapa]);

  useEffect(() => {
    previewsGaleriaRef.current = previewsGaleria;
  }, [previewsGaleria]);

  useEffect(() => {
    return () => {
      if (previewCapaRef.current) URL.revokeObjectURL(previewCapaRef.current);
      previewsGaleriaRef.current.forEach((preview) =>
        URL.revokeObjectURL(preview.url),
      );
    };
  }, []);

  function validarImagem(arquivo?: File) {
    if (!arquivo) return null;
    if (!tipoImagemPropriedadePermitido(arquivo.type)) {
      return "Use uma imagem JPG, PNG, WebP ou GIF.";
    }
    if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_BYTES) {
      return `A imagem deve ter no maximo ${TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_MB}MB.`;
    }
    return null;
  }

  function selecionarCapa(arquivo?: File) {
    const erro = validarImagem(arquivo);
    setErroImagem(erro);
    if (previewCapa) URL.revokeObjectURL(previewCapa);
    setPreviewCapa(arquivo && !erro ? URL.createObjectURL(arquivo) : null);
    if (arquivo && !erro) removerErrosDosCampos(["imagemCapaArquivo"]);
  }

  function sincronizarArquivosGaleria(arquivos: File[]) {
    arquivosGaleriaRef.current = arquivos;

    if (!galeriaRef.current) return;

    const colecao = new DataTransfer();
    arquivos.forEach((arquivo) => colecao.items.add(arquivo));
    galeriaRef.current.files = colecao.files;
  }

  function selecionarGaleria(arquivos: FileList | null) {
    const novasImagens = Array.from(arquivos ?? []);

    if (novasImagens.length === 0) return;

    const erro =
      novasImagens.map((arquivo) => validarImagem(arquivo)).find(Boolean) ??
      null;
    setErroImagem(erro);

    if (erro) {
      sincronizarArquivosGaleria(arquivosGaleriaRef.current);
      return;
    }

    // O input file do navegador substitui a selecao a cada upload.
    // A ref preserva a colecao real para que novas fotos sejam adicionadas sem apagar as anteriores.
    sincronizarArquivosGaleria([
      ...arquivosGaleriaRef.current,
      ...novasImagens,
    ]);
    removerErrosDosCampos(["imagemCapaArquivo"]);

    setPreviewsGaleria((previewsAtuais) =>
      normalizarGaleria([
        ...previewsAtuais,
        ...novasImagens.map((arquivo, indice) =>
          criarPreviewGaleria(
            arquivo,
            previewsAtuais.length + indice + 1,
            previewsAtuais.length === 0 && indice === 0,
          ),
        ),
      ]),
    );
  }

  function removerGaleria(indiceRemovido: number) {
    setPreviewsGaleria((previewsAtuais) => {
      const previewRemovido = previewsAtuais[indiceRemovido];
      if (previewRemovido) URL.revokeObjectURL(previewRemovido.url);

      const atualizados = normalizarGaleria(
        previewsAtuais.filter((_, indice) => indice !== indiceRemovido),
      );
      sincronizarArquivosGaleria(atualizados.map((preview) => preview.arquivo));
      return atualizados;
    });
  }

  function moverGaleria(indiceAtual: number, deslocamento: -1 | 1) {
    setPreviewsGaleria((previewsAtuais) => {
      const indiceDestino = indiceAtual + deslocamento;
      if (indiceDestino < 0 || indiceDestino >= previewsAtuais.length)
        return previewsAtuais;

      const atualizados = [...previewsAtuais];
      const itemAtual = atualizados[indiceAtual];
      const itemDestino = atualizados[indiceDestino];
      if (!itemAtual || !itemDestino) return previewsAtuais;

      atualizados[indiceAtual] = itemDestino;
      atualizados[indiceDestino] = itemAtual;
      const normalizados = normalizarGaleria(atualizados);
      sincronizarArquivosGaleria(
        normalizados.map((preview) => preview.arquivo),
      );
      return normalizados;
    });
  }

  function atualizarTituloGaleria(indiceAlterado: number, titulo: string) {
    setPreviewsGaleria((atuais) =>
      atuais.map((preview, indice) =>
        indice === indiceAlterado ? { ...preview, titulo } : preview,
      ),
    );
  }

  function definirPrincipalGaleria(indicePrincipal: number) {
    setPreviewsGaleria((atuais) =>
      atuais.map((preview, indice) => ({
        ...preview,
        principal: indice === indicePrincipal,
      })),
    );
  }

  function focarCampoInvalido(nome: string) {
    window.setTimeout(() => {
      const campo = formRef.current?.querySelector<HTMLElement>(
        `[name="${nome}"]`,
      );
      campo?.scrollIntoView({ behavior: "smooth", block: "center" });
      campo?.focus({ preventScroll: true });
    }, 80);
  }

  function aplicarErrosValidacao(erros: ErrosFormularioCasa) {
    const primeiroCampo = CAMPOS_OBRIGATORIOS_CASA.find(
      (campo) => erros[campo.name],
    );
    setErrosCampos(erros);

    if (!primeiroCampo) return;

    // O wizard volta para a etapa do primeiro erro para evitar envio invisivel
    // e manter o modal aberto com a correcao exatamente onde o usuario precisa.
    setEtapaAtual(indiceDaEtapa(primeiroCampo.etapa));
    focarCampoInvalido(primeiroCampo.name);
  }

  function limparErroDoCampo(evento: FormEvent<HTMLFormElement>) {
    const alvo = evento.target as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement;
    if (!alvo.name || !errosCampos[alvo.name]) return;

    setErrosCampos((errosAtuais) => {
      const novosErros = { ...errosAtuais };
      delete novosErros[alvo.name];
      return novosErros;
    });
  }

  function removerErrosDosCampos(nomes: string[]) {
    setErrosCampos((errosAtuais) => {
      const novosErros = { ...errosAtuais };
      nomes.forEach((nome) => {
        delete novosErros[nome];
      });
      return novosErros;
    });
  }

  function atualizarVisibilidadePublica(ativo: boolean) {
    setPublicaSelecionada(ativo);
    if (!ativo) {
      removerErrosDosCampos([
        "tituloPublico",
        "descricaoPublica",
        "imagemCapaArquivo",
      ]);
    }
  }

  function validarAteEtapaDestino(indiceDestino: number) {
    const formulario = formRef.current;
    if (!formulario) return true;

    const etapasParaValidar = new Set(
      ETAPAS.slice(0, indiceDestino).map((item) => item.id),
    );
    const erros = validarFormularioCasa(
      formulario,
      etapasParaValidar,
      obterContextoValidacaoCasa(),
    );

    if (Object.keys(erros).length > 0) {
      aplicarErrosValidacao(erros);
      return false;
    }

    return true;
  }

  function navegarParaEtapa(indiceDestino: number) {
    if (indiceDestino <= etapaAtual || validarAteEtapaDestino(indiceDestino)) {
      setEtapaAtual(indiceDestino);
    }
  }

  function voltarEtapa() {
    setEtapaAtual((indiceAtual) => Math.max(indiceAtual - 1, 0));
  }

  function avancarEtapa() {
    const formulario = formRef.current;
    if (!formulario) return;

    const errosEtapa = validarFormularioCasa(
      formulario,
      new Set([etapa.id]),
      obterContextoValidacaoCasa(),
    );
    if (Object.keys(errosEtapa).length > 0) {
      aplicarErrosValidacao({
        ...removerErrosDaEtapa(errosCampos, etapa.id),
        ...errosEtapa,
      });
      return;
    }

    setErrosCampos((errosAtuais) => removerErrosDaEtapa(errosAtuais, etapa.id));
    setEtapaAtual((indiceAtual) =>
      Math.min(indiceAtual + 1, ETAPAS.length - 1),
    );
  }

  function validarEnvio(evento: FormEvent<HTMLFormElement>) {
    if (!podeGerenciar || erroImagem) {
      evento.preventDefault();
      return;
    }

    const erros = validarFormularioCasa(
      evento.currentTarget,
      undefined,
      obterContextoValidacaoCasa(),
    );
    if (Object.keys(erros).length > 0) {
      evento.preventDefault();
      aplicarErrosValidacao(erros);
      return;
    }

    setErrosCampos({});
  }

  function obterContextoValidacaoCasa() {
    return {
      possuiImagemPrincipal: Boolean(
        previewCapa ||
        propriedade?.imagemCapa?.url ||
        previewsGaleria.some((preview) => preview.principal),
      ),
    };
  }

  return (
    <form
      action={action}
      className="space-y-5 pb-1"
      onChange={limparErroDoCampo}
      onInput={limparErroDoCampo}
      onSubmit={validarEnvio}
      ref={formRef}
    >
      {propriedade ? (
        <input name="propriedadeId" type="hidden" value={propriedade.id} />
      ) : null}

      {erroServidor ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {erroServidor}
        </p>
      ) : null}

      <WizardStepper
        etapaAtual={etapaAtual}
        etapas={ETAPAS}
        etapasComErro={etapasComErro}
        etapasConcluidas={etapasConcluidas}
        onEtapaClick={(indice) => navegarParaEtapa(indice)}
      />

      <section className="rounded-2xl border bg-background/45 p-4 sm:p-5">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-200 [&_svg]:h-4 [&_svg]:w-4">
            {etapa.icon}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
              Etapa {etapaAtual + 1} de {ETAPAS.length}
            </p>
            <h3 className="font-semibold">{etapa.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {etapa.descricao}
            </p>
          </div>
        </div>

        {/*
          Mantemos todas as etapas montadas para que o FormData envie todos os
          campos ao salvar. A troca visual ocorre com hidden, sem formulários
          duplicados ou perda de dados entre abas da modal.
        */}
        <div hidden={etapa.id !== "basico"}>
          <EtapaBasico
            defaultDescricaoCompleta={
              propriedade?.full_description ?? propriedade?.description ?? ""
            }
            defaultDescricaoCurta={
              propriedade?.short_description ?? propriedade?.headline ?? ""
            }
            defaultDestaque={propriedade?.marketplace_featured ?? false}
            defaultNome={propriedade?.name}
            defaultNomeExibicao={
              propriedade?.detalhesPublicos.nomeExibicao ||
              propriedade?.name ||
              ""
            }
            defaultPublica={propriedade?.is_public ?? false}
            defaultStatus={propriedade?.status ?? "draft"}
            defaultTipo={propriedade?.property_type ?? "seasonal_home"}
            disabled={!podeGerenciar}
            erros={errosCampos}
            onPublicaChange={atualizarVisibilidadePublica}
          />
        </div>

        <div hidden={etapa.id !== "localizacao"}>
          <EtapaLocalizacao
            endereco={endereco}
            disabled={!podeGerenciar}
            erros={errosCampos}
          />
        </div>

        <div hidden={etapa.id !== "estrutura"}>
          <EtapaEstrutura
            disabled={!podeGerenciar}
            erros={errosCampos}
            estrutura={estrutura}
          />
        </div>

        <div hidden={etapa.id !== "valores"}>
          <EtapaValores
            disabled={!podeGerenciar}
            erros={errosCampos}
            valores={valores}
          />
        </div>

        <div hidden={etapa.id !== "regras"}>
          <EtapaRegras disabled={!podeGerenciar} regras={regras} />
        </div>

        <div hidden={etapa.id !== "imagens"}>
          <EtapaImagens
            capaRef={capaRef}
            disabled={!podeGerenciar}
            erroImagem={erroImagem}
            galeriaRef={galeriaRef}
            imagemCapaAtual={propriedade?.imagemCapa?.url ?? null}
            publicaSelecionada={publicaSelecionada}
            previewCapa={previewCapa}
            previewsGaleria={previewsGaleria}
            erros={errosCampos}
            atualizarTituloGaleria={atualizarTituloGaleria}
            definirPrincipalGaleria={definirPrincipalGaleria}
            moverGaleria={moverGaleria}
            removerGaleria={removerGaleria}
            selecionarCapa={selecionarCapa}
            selecionarGaleria={selecionarGaleria}
            totalImagensAtuais={propriedade?.imagens.length ?? 0}
          />
        </div>

        <div hidden={etapa.id !== "comodidades"}>
          <PropertyAmenitiesStep
            comodidades={comodidadesDisponiveis}
            disabled={!podeGerenciar}
            selecionadas={comodidadesSelecionadas}
          />
        </div>

        <div hidden={etapa.id !== "compartilhamento"}>
          <EtapaCompartilhamento
            detalhes={propriedade?.detalhesPublicos}
            disabled={!podeGerenciar}
            erros={errosCampos}
            publicaSelecionada={publicaSelecionada}
          />
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div>
          {etapaAtual > 0 ? (
            <ActionButton
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={voltarEtapa}
              size="md"
              type="button"
              variant="view"
            >
              Voltar
            </ActionButton>
          ) : null}
        </div>

        {!estaNaUltimaEtapa ? (
          <ActionButton
            disabled={!podeGerenciar}
            onClick={avancarEtapa}
            size="lg"
            type="button"
            variant="edit"
          >
            Proximo
          </ActionButton>
        ) : (
          <BotaoSalvarCasa bloqueado={bloqueado} modo={modo} />
        )}
      </div>
    </form>
  );
}

function BotaoSalvarCasa({
  bloqueado,
  modo,
}: {
  bloqueado: boolean;
  modo: "criar" | "editar";
}) {
  return (
    <FormActionButton
      disabled={bloqueado}
      pendingLabel={modo === "editar" ? "Salvando..." : "Criando..."}
      size="lg"
      variant="add"
    >
      {modo === "editar" ? "Salvar casa" : "Criar casa"}
    </FormActionButton>
  );
}

function EtapaBasico({
  defaultDescricaoCompleta,
  defaultDescricaoCurta,
  defaultDestaque,
  defaultNome,
  defaultNomeExibicao,
  defaultPublica,
  defaultStatus,
  defaultTipo,
  disabled,
  erros,
  onPublicaChange,
}: {
  defaultDescricaoCompleta: string;
  defaultDescricaoCurta: string;
  defaultDestaque: boolean;
  defaultNome?: string | undefined;
  defaultNomeExibicao: string;
  defaultPublica: boolean;
  defaultStatus: PropertyStatus;
  defaultTipo: PropertyType;
  disabled: boolean;
  erros: ErrosFormularioCasa;
  onPublicaChange: (ativo: boolean) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={defaultNome}
          disabled={disabled}
          erro={erros.nome}
          label="Nome da casa"
          name="nome"
          obrigatorio
        />
        <CampoTexto
          defaultValue={defaultNomeExibicao}
          disabled={disabled}
          label="Nome de exibicao"
          name="nomeExibicao"
          placeholder="Nome apresentado futuramente ao hospede."
        />
        <CampoSelect
          defaultValue={defaultTipo}
          disabled={disabled}
          erro={erros.tipo}
          label="Tipo"
          name="tipo"
          obrigatorio
          options={TIPOS}
        />
      </div>
      <CampoTexto
        defaultValue={defaultDescricaoCurta}
        disabled={disabled}
        erro={erros.descricaoCurta}
        label="Descricao curta"
        name="descricaoCurta"
        obrigatorio
        placeholder="Resumo curto para cards e operacao."
      />
      <CampoArea
        defaultValue={defaultDescricaoCompleta}
        disabled={disabled}
        label="Descricao completa"
        name="descricaoCompleta"
        placeholder="Descreva a experiencia completa da casa."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <CampoSelect
          defaultValue={defaultStatus}
          disabled={disabled}
          label="Status"
          name="status"
          options={STATUS}
        />
        <CampoCheckbox
          defaultChecked={defaultPublica}
          disabled={disabled}
          label="Visibilidade publica"
          name="visibilidadePublica"
          onChange={(evento) => onPublicaChange(evento.currentTarget.checked)}
        />
        <CampoCheckbox
          defaultChecked={defaultDestaque}
          disabled={disabled}
          label="Destaque no marketplace"
          name="destaqueMarketplace"
        />
      </div>
    </div>
  );
}

function EtapaLocalizacao({
  disabled,
  endereco,
  erros,
}: {
  disabled: boolean;
  endereco?: PropriedadeComRelacionamentos["enderecoFormatado"] | undefined;
  erros: ErrosFormularioCasa;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-[1.4fr_0.5fr]">
        <CampoTexto
          defaultValue={endereco?.linha1}
          disabled={disabled}
          erro={erros.endereco}
          label="Endereco"
          name="endereco"
          obrigatorio
        />
        <CampoTexto
          defaultValue={endereco?.numero}
          disabled={disabled}
          label="Numero"
          name="numero"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <CampoTexto
          defaultValue={endereco?.bairro}
          disabled={disabled}
          label="Bairro"
          name="bairro"
        />
        <CampoTexto
          defaultValue={endereco?.cidade}
          disabled={disabled}
          erro={erros.cidade}
          label="Cidade"
          name="cidade"
          obrigatorio
        />
        <CampoTexto
          defaultValue={endereco?.estado}
          disabled={disabled}
          erro={erros.estado}
          label="Estado"
          maxLength={2}
          name="estado"
          obrigatorio
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <CampoTexto
          defaultValue={endereco?.cep}
          disabled={disabled}
          label="CEP"
          name="cep"
        />
        <CampoTexto
          defaultValue={endereco?.complemento}
          disabled={disabled}
          label="Complemento"
          name="complemento"
        />
        <CampoTexto
          defaultValue={endereco?.referencia}
          disabled={disabled}
          label="Referencia"
          name="referencia"
        />
      </div>
      <CampoTexto
        defaultValue={endereco?.googleMapsLink}
        disabled={disabled}
        label="Link do Google Maps"
        name="googleMapsLink"
        placeholder="https://maps.google.com/..."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <CampoNumero
          defaultValue={endereco?.latitude ?? ""}
          disabled={disabled}
          label="Latitude"
          max={90}
          min={-90}
          name="latitude"
          step="0.000001"
        />
        <CampoNumero
          defaultValue={endereco?.longitude ?? ""}
          disabled={disabled}
          label="Longitude"
          max={180}
          min={-180}
          name="longitude"
          step="0.000001"
        />
      </div>
    </div>
  );
}

function EtapaEstrutura({
  disabled,
  erros,
  estrutura,
}: {
  disabled: boolean;
  erros: ErrosFormularioCasa;
  estrutura?: PropriedadeComRelacionamentos["estrutura"] | undefined;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <CampoNumero
          defaultValue={estrutura?.hospedesMaximos ?? 1}
          disabled={disabled}
          erro={erros.hospedesMaximos}
          label="Quantidade maxima de hospedes"
          min={1}
          name="hospedesMaximos"
          obrigatorio
        />
        <CampoNumero
          defaultValue={estrutura?.quartos ?? 1}
          disabled={disabled}
          erro={erros.quartosCasa}
          label="Quartos"
          min={1}
          name="quartosCasa"
          obrigatorio
        />
        <CampoNumero
          defaultValue={estrutura?.camas ?? 1}
          disabled={disabled}
          label="Camas"
          min={1}
          name="camasCasa"
        />
        <CampoNumero
          defaultValue={estrutura?.banheiros ?? 1}
          disabled={disabled}
          erro={erros.banheirosCasa}
          label="Banheiros"
          min={1}
          name="banheirosCasa"
          obrigatorio
        />
        <CampoNumero
          defaultValue={estrutura?.garagemVagas ?? 0}
          disabled={disabled}
          label="Garagem/vagas"
          min={0}
          name="garagemVagas"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <CampoCheckbox
          defaultChecked={estrutura?.areaExterna ?? false}
          disabled={disabled}
          label="Area externa"
          name="areaExterna"
        />
        <CampoCheckbox
          defaultChecked={estrutura?.piscina ?? false}
          disabled={disabled}
          label="Piscina"
          name="piscina"
        />
        <CampoCheckbox
          defaultChecked={estrutura?.churrasqueira ?? false}
          disabled={disabled}
          label="Churrasqueira"
          name="churrasqueira"
        />
      </div>
    </div>
  );
}

function EtapaValores({
  disabled,
  erros,
  valores,
}: {
  disabled: boolean;
  erros: ErrosFormularioCasa;
  valores?: PropriedadeComRelacionamentos["valores"] | undefined;
}) {
  const pagamentos = valores?.formasPagamento;
  const maxParcelasInicial = limitarParcelasCartao(
    pagamentos?.cartaoCredito.maxParcelas ?? valores?.maxParcelasCartao ?? 1,
  );
  const [pixAtivo, setPixAtivo] = useState(pagamentos?.pix.ativo ?? false);
  const [dinheiroAtivo, setDinheiroAtivo] = useState(
    pagamentos?.dinheiro.ativo ?? false,
  );
  const [cartaoDebitoAtivo, setCartaoDebitoAtivo] = useState(
    pagamentos?.cartaoDebito.ativo ?? false,
  );
  const [aceitaCartaoCredito, setAceitaCartaoCredito] = useState(
    pagamentos?.cartaoCredito.ativo ?? valores?.aceitaCartaoCredito ?? false,
  );
  const [transferenciaAtiva, setTransferenciaAtiva] = useState(
    pagamentos?.transferenciaBancaria.ativo ?? false,
  );
  const [maxParcelasCartao, setMaxParcelasCartao] =
    useState(maxParcelasInicial);
  const [jurosCartao, setJurosCartao] = useState(() =>
    criarJurosParcelasIniciais(
      maxParcelasInicial,
      pagamentos?.cartaoCredito.jurosParcelas ?? valores?.jurosParcelasCartao,
    ),
  );
  const [parcelaEmEdicao, setParcelaEmEdicao] = useState<number | null>(null);
  const [jurosEmEdicao, setJurosEmEdicao] = useState("0");
  const parcelasCartao = Array.from(
    { length: maxParcelasCartao },
    (_, indice) => indice + 1,
  );
  const possuiPagamentoAtivo =
    pixAtivo ||
    dinheiroAtivo ||
    cartaoDebitoAtivo ||
    aceitaCartaoCredito ||
    transferenciaAtiva;

  function alterarMaxParcelasCartao(valor: string) {
    const novoLimite = limitarParcelasCartao(Number.parseInt(valor || "1", 10));
    setMaxParcelasCartao(novoLimite);

    setJurosCartao((jurosAtuais) =>
      Array.from({ length: novoLimite }, (_, indice) => {
        const parcela = indice + 1;
        return [parcela, jurosAtuais[parcela] ?? "0"] as const;
      }).reduce<Record<number, string>>((resultado, [parcela, juros]) => {
        resultado[parcela] = juros;
        return resultado;
      }, {}),
    );

    if (parcelaEmEdicao && parcelaEmEdicao > novoLimite) {
      setParcelaEmEdicao(null);
    }
  }

  function abrirEdicaoJuros(parcela: number) {
    setParcelaEmEdicao(parcela);
    setJurosEmEdicao(jurosCartao[parcela] ?? "0");
  }

  function salvarJurosParcela() {
    if (!parcelaEmEdicao) return;

    setJurosCartao((jurosAtuais) => ({
      ...jurosAtuais,
      [parcelaEmEdicao]: normalizarValorJuros(jurosEmEdicao),
    }));
    setParcelaEmEdicao(null);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <CampoMoeda
          defaultValue={valores?.valorDiaria ?? 0}
          disabled={disabled}
          erro={erros.valorDiaria}
          label="Valor da diaria"
          name="valorDiaria"
          obrigatorio
        />
        <CampoMoeda
          defaultValue={valores?.taxaLimpeza ?? 0}
          disabled={disabled}
          label="Taxa de limpeza"
          name="taxaLimpeza"
        />
        <CampoMoeda
          defaultValue={valores?.caucao ?? 0}
          disabled={disabled}
          label="Caucao"
          name="caucao"
        />
        <CampoMoeda
          defaultValue={valores?.valorHospedeExtra ?? 0}
          disabled={disabled}
          label="Valor por hospede extra por reserva"
          name="valorHospedeExtra"
        />
        <CampoSelect
          defaultValue={valores?.tipoCobrancaHospedeExtra ?? "per_stay"}
          disabled={disabled}
          label="Cobranca do hospede extra"
          name="tipoCobrancaHospedeExtra"
          options={[
            { label: "Por reserva", valor: "per_stay" },
          ]}
        />
      </div>
      <CampoCheckbox
        defaultChecked={valores?.cobraHospedeExtra ?? false}
        disabled={disabled}
        label="Cobrar hospede extra"
        name="cobraHospedeExtra"
      />

      <section className="grid gap-4 rounded-xl border bg-background/45 p-4">
        <div>
          <h4 className="font-semibold">Pagamento da hospedagem</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure apenas os metodos aceitos pelo proprietario. Nao salve
            dados de cartao, tokens ou senhas.
          </p>
        </div>

        {!possuiPagamentoAtivo ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-900 dark:text-amber-100">
            Nenhuma forma de pagamento foi configurada. O hospede nao vera
            opcoes de pagamento no Marketplace.
          </p>
        ) : null}

        <div className="grid gap-3">
          <CartaoFormaPagamento
            ativo={pixAtivo}
            descricao="Chave e instrucoes para pagamento manual por Pix."
            disabled={disabled}
            icon={<Smartphone className="h-4 w-4" />}
            label="Pix"
            name="pagamentoPixAtivo"
            onChange={setPixAtivo}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <CampoSelect
                defaultValue={pagamentos?.pix.tipoChave ?? "aleatoria"}
                disabled={disabled || !pixAtivo}
                label="Tipo da chave Pix"
                name="pixTipoChave"
                options={TIPOS_CHAVE_PIX}
              />
              <CampoTexto
                defaultValue={pagamentos?.pix.chave ?? ""}
                disabled={disabled || !pixAtivo}
                erro={erros.pixChave}
                label="Chave Pix"
                name="pixChave"
                obrigatorio={pixAtivo}
              />
              <CampoTexto
                defaultValue={pagamentos?.pix.recebedor ?? ""}
                disabled={disabled || !pixAtivo}
                erro={erros.pixRecebedor}
                label="Nome do recebedor"
                name="pixRecebedor"
                obrigatorio={pixAtivo}
              />
              <CampoTexto
                defaultValue={pagamentos?.pix.banco ?? ""}
                disabled={disabled || !pixAtivo}
                label="Banco/instituicao"
                name="pixBanco"
              />
            </div>
            <CampoArea
              className="min-h-16"
              defaultValue={pagamentos?.pix.instrucoes ?? ""}
              disabled={disabled || !pixAtivo}
              label="Instrucao Pix"
              name="pixInstrucoes"
              placeholder="Ex.: Enviar comprovante apos o pagamento."
            />
          </CartaoFormaPagamento>

          <CartaoFormaPagamento
            ativo={dinheiroAtivo}
            descricao="Instrucao simples para pagamento presencial ou combinado."
            disabled={disabled}
            icon={<Banknote className="h-4 w-4" />}
            label="Dinheiro"
            name="pagamentoDinheiroAtivo"
            onChange={setDinheiroAtivo}
          >
            <CampoArea
              className="min-h-16"
              defaultValue={pagamentos?.dinheiro.instrucoes ?? ""}
              disabled={disabled || !dinheiroAtivo}
              label="Instrucao para dinheiro"
              name="dinheiroInstrucoes"
              placeholder="Ex.: Pagamento no check-in."
            />
          </CartaoFormaPagamento>

          <CartaoFormaPagamento
            ativo={cartaoDebitoAtivo}
            descricao="Instrucao operacional sem coletar dados de cartao."
            disabled={disabled}
            icon={<CreditCard className="h-4 w-4" />}
            label="Cartao de debito"
            name="pagamentoCartaoDebitoAtivo"
            onChange={setCartaoDebitoAtivo}
          >
            <CampoArea
              className="min-h-16"
              defaultValue={pagamentos?.cartaoDebito.instrucoes ?? ""}
              disabled={disabled || !cartaoDebitoAtivo}
              label="Instrucao para debito"
              name="cartaoDebitoInstrucoes"
              placeholder="Ex.: Pagamento via maquininha no local."
            />
          </CartaoFormaPagamento>

          <CartaoFormaPagamento
            ativo={aceitaCartaoCredito}
            descricao="Parcelamento manual preparado para calculo futuro."
            disabled={disabled}
            icon={<CreditCard className="h-4 w-4" />}
            label="Cartao de credito"
            name="aceitaCartaoCredito"
            onChange={setAceitaCartaoCredito}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <CampoNumero
                disabled={disabled || !aceitaCartaoCredito}
                erro={erros.maxParcelasCartao}
                label="Quantidade maxima de parcelas"
                max={MAX_PARCELAS_CARTAO}
                min={1}
                name="maxParcelasCartao"
                obrigatorio={aceitaCartaoCredito}
                onChange={(evento) =>
                  alterarMaxParcelasCartao(evento.currentTarget.value)
                }
                value={maxParcelasCartao}
              />
              <CampoArea
                className="min-h-16"
                defaultValue={pagamentos?.cartaoCredito.instrucoes ?? ""}
                disabled={disabled || !aceitaCartaoCredito}
                label="Instrucao para credito"
                name="cartaoCreditoInstrucoes"
                placeholder="Ex.: Link enviado pelo proprietario."
              />
            </div>

            {aceitaCartaoCredito ? (
              <>
                {/*
                  Mantemos os campos ocultos com o contrato atual da server action.
                  A UI fica limpa, mas cada parcela continua sendo salva individualmente.
                */}
                {parcelasCartao.map((parcela) => (
                  <input
                    key={parcela}
                    name={`jurosParcela${parcela}`}
                    type="hidden"
                    value={jurosCartao[parcela] ?? "0"}
                  />
                ))}

                <div className="mt-4 overflow-hidden rounded-xl border bg-background/55">
                  <div className="grid grid-cols-[0.7fr_1fr_auto] gap-3 border-b bg-cyan-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-200">
                    <span>Parcela</span>
                    <span>Juros</span>
                    <span className="text-right">Acao</span>
                  </div>
                  <div className="divide-y">
                    {parcelasCartao.map((parcela) => (
                      <div
                        className="grid grid-cols-[0.7fr_1fr_auto] items-center gap-3 px-3 py-3 text-sm"
                        key={parcela}
                      >
                        <span className="font-semibold">{parcela}x</span>
                        <span className="text-muted-foreground">
                          {formatarJuros(jurosCartao[parcela])}
                        </span>
                        <ActionButton
                          disabled={disabled}
                          onClick={() => abrirEdicaoJuros(parcela)}
                          size="sm"
                          type="button"
                          variant="edit"
                        >
                          Editar
                        </ActionButton>
                      </div>
                    ))}
                  </div>
                </div>

                <AppModal
                  description="Informe o percentual aplicado a esta parcela."
                  eyebrow="Cartao de credito"
                  onOpenChange={(open) => {
                    if (!open) setParcelaEmEdicao(null);
                  }}
                  open={parcelaEmEdicao !== null}
                  size="sm"
                  title="Editar juros da parcela"
                >
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="parcelaCartaoSelecionada">Parcela</Label>
                      <Input
                        id="parcelaCartaoSelecionada"
                        readOnly
                        value={parcelaEmEdicao ? `${parcelaEmEdicao}x` : ""}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="jurosCartaoSelecionado">Juros (%)</Label>
                      <Input
                        disabled={disabled}
                        id="jurosCartaoSelecionado"
                        min={0}
                        onChange={(evento) =>
                          setJurosEmEdicao(evento.currentTarget.value)
                        }
                        step="0.01"
                        type="number"
                        value={jurosEmEdicao}
                      />
                    </div>
                    <div className="flex justify-end border-t pt-4">
                      <ActionButton
                        disabled={disabled}
                        onClick={salvarJurosParcela}
                        size="md"
                        type="button"
                        variant="add"
                      >
                        Salvar
                      </ActionButton>
                    </div>
                  </div>
                </AppModal>
              </>
            ) : null}
          </CartaoFormaPagamento>

          <CartaoFormaPagamento
            ativo={transferenciaAtiva}
            descricao="Dados opcionais para transferencia manual."
            disabled={disabled}
            icon={<Landmark className="h-4 w-4" />}
            label="Transferencia bancaria"
            name="pagamentoTransferenciaAtivo"
            onChange={setTransferenciaAtiva}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <CampoTexto
                defaultValue={pagamentos?.transferenciaBancaria.banco ?? ""}
                disabled={disabled || !transferenciaAtiva}
                label="Banco"
                name="transferenciaBanco"
              />
              <CampoTexto
                defaultValue={pagamentos?.transferenciaBancaria.recebedor ?? ""}
                disabled={disabled || !transferenciaAtiva}
                label="Nome do recebedor"
                name="transferenciaRecebedor"
              />
              <CampoTexto
                defaultValue={pagamentos?.transferenciaBancaria.agencia ?? ""}
                disabled={disabled || !transferenciaAtiva}
                label="Agencia"
                name="transferenciaAgencia"
              />
              <CampoTexto
                defaultValue={pagamentos?.transferenciaBancaria.conta ?? ""}
                disabled={disabled || !transferenciaAtiva}
                label="Conta"
                name="transferenciaConta"
              />
            </div>
            <CampoArea
              className="min-h-16"
              defaultValue={pagamentos?.transferenciaBancaria.instrucoes ?? ""}
              disabled={disabled || !transferenciaAtiva}
              label="Instrucao para transferencia"
              name="transferenciaInstrucoes"
              placeholder="Ex.: Dados enviados apos confirmacao da reserva."
            />
          </CartaoFormaPagamento>
        </div>
      </section>
    </div>
  );
}

function CartaoFormaPagamento({
  ativo,
  children,
  descricao,
  disabled,
  icon,
  label,
  name,
  onChange,
}: {
  ativo: boolean;
  children: ReactNode;
  descricao: string;
  disabled: boolean;
  icon: ReactNode;
  label: string;
  name: string;
  onChange: (ativo: boolean) => void;
}) {
  return (
    <section className="grid gap-3 rounded-xl border bg-background/55 p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          checked={ativo}
          className="mt-1"
          disabled={disabled}
          name={name}
          onChange={(evento) => onChange(evento.currentTarget.checked)}
          type="checkbox"
        />
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-cyan-200">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {descricao}
          </span>
        </span>
      </label>
      {ativo ? (
        <div className="grid gap-3 border-t pt-3">{children}</div>
      ) : null}
    </section>
  );
}

function EtapaRegras({
  disabled,
  regras,
}: {
  disabled: boolean;
  regras?: PropriedadeComRelacionamentos["regras"] | undefined;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={normalizarHoraInput(regras?.check_in_time)}
          disabled={disabled}
          label="Horario de check-in"
          name="checkInTime"
          type="time"
        />
        <CampoTexto
          defaultValue={normalizarHoraInput(regras?.check_out_time)}
          disabled={disabled}
          label="Horario de check-out"
          name="checkOutTime"
          type="time"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CampoCheckbox
          defaultChecked={regras?.allow_pets ?? false}
          disabled={disabled}
          label="Permite pets"
          name="allowPets"
        />
        <CampoCheckbox
          defaultChecked={regras?.allow_children ?? true}
          disabled={disabled}
          label="Aceita criancas"
          name="allowChildren"
        />
        <CampoCheckbox
          defaultChecked={regras?.allow_smoking ?? false}
          disabled={disabled}
          label="Permite fumantes"
          name="allowSmoking"
        />
        <CampoCheckbox
          defaultChecked={regras?.allow_events ?? false}
          disabled={disabled}
          label="Permite festas/eventos"
          name="allowEvents"
        />
      </div>
      <CampoArea
        defaultValue={regras?.additional_rules ?? ""}
        disabled={disabled}
        label="Regras gerais"
        name="additionalRules"
      />
      <CampoArea
        defaultValue={regras?.special_instructions ?? ""}
        disabled={disabled}
        label="Instrucoes especiais"
        name="specialInstructions"
        placeholder="Informacoes que poderao ser apresentadas ao hospede."
      />
      <CampoArea
        defaultValue={regras?.internal_notes ?? ""}
        disabled={disabled}
        label="Observacoes internas"
        name="internalNotes"
        placeholder="Visivel apenas no Gerenciamento."
      />
    </div>
  );
}

function normalizarHoraInput(valor?: string | null) {
  if (!valor) return "";
  return valor.slice(0, 5);
}

function EtapaCompartilhamento({
  detalhes,
  disabled,
  erros,
  publicaSelecionada,
}: {
  detalhes?: PropriedadeComRelacionamentos["detalhesPublicos"] | undefined;
  disabled: boolean;
  erros: ErrosFormularioCasa;
  publicaSelecionada: boolean;
}) {
  return (
    <div className="grid gap-4">
      <p className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-3 text-sm text-muted-foreground">
        Campos opcionais preparados para publicacao e compartilhamento futuros.
        Nenhuma regra de SEO e aplicada agora.
      </p>
      <CampoTexto
        defaultValue={detalhes?.tituloPublico}
        disabled={disabled}
        erro={erros.tituloPublico}
        label="Titulo publico"
        name="tituloPublico"
        obrigatorio={publicaSelecionada}
      />
      <CampoArea
        defaultValue={detalhes?.descricaoPublica}
        disabled={disabled}
        erro={erros.descricaoPublica}
        label="Descricao publica"
        name="descricaoPublica"
        obrigatorio={publicaSelecionada}
      />
      <CampoTexto
        defaultValue={detalhes?.imagemCompartilhamento}
        disabled={disabled}
        label="Imagem de compartilhamento"
        name="imagemCompartilhamento"
        placeholder="https://..."
        type="url"
      />
    </div>
  );
}

function EtapaImagens({
  atualizarTituloGaleria,
  capaRef,
  definirPrincipalGaleria,
  disabled,
  erroImagem,
  erros,
  galeriaRef,
  imagemCapaAtual,
  moverGaleria,
  previewCapa,
  previewsGaleria,
  publicaSelecionada,
  removerGaleria,
  selecionarCapa,
  selecionarGaleria,
  totalImagensAtuais,
}: {
  atualizarTituloGaleria: (indice: number, titulo: string) => void;
  capaRef: RefObject<HTMLInputElement | null>;
  definirPrincipalGaleria: (indice: number) => void;
  disabled: boolean;
  erroImagem: string | null;
  erros: ErrosFormularioCasa;
  galeriaRef: RefObject<HTMLInputElement | null>;
  imagemCapaAtual: string | null;
  moverGaleria: (indice: number, deslocamento: -1 | 1) => void;
  previewCapa: string | null;
  previewsGaleria: PreviewGaleria[];
  publicaSelecionada: boolean;
  removerGaleria: (indice: number) => void;
  selecionarCapa: (arquivo?: File) => void;
  selecionarGaleria: (arquivos: FileList | null) => void;
  totalImagensAtuais: number;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CampoArquivo
          botaoLabel="Escolher arquivo"
          erro={erros.imagemCapaArquivo}
          inputRef={capaRef}
          label="Imagem de capa"
          name="imagemCapaArquivo"
          obrigatorio={publicaSelecionada}
          onChange={(evento) => selecionarCapa(evento.currentTarget.files?.[0])}
          disabled={disabled}
        />
        <CampoArquivo
          botaoLabel="Adicionar foto"
          inputRef={galeriaRef}
          label="Galeria com multiplas fotos"
          multiple
          name="imagensGaleriaArquivos"
          onChange={(evento) => selecionarGaleria(evento.currentTarget.files)}
          disabled={disabled}
        />
      </div>
      {erroImagem ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erroImagem}
        </p>
      ) : null}
      <div className="grid gap-3">
        {imagemCapaAtual ? (
          <input name="possuiImagemPrincipalAtual" type="hidden" value="true" />
        ) : null}
        {previewCapa || imagemCapaAtual ? (
          <PreviewImagem
            titulo={
              previewCapa ? "Nova imagem principal" : "Imagem principal atual"
            }
            url={previewCapa ?? imagemCapaAtual ?? ""}
          />
        ) : null}
        <div className="rounded-xl border bg-background/45 p-3">
          <p className="mb-3 text-sm font-semibold">Galeria</p>
          {previewsGaleria.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {previewsGaleria.map((preview, indice) => (
                <div
                  className="grid gap-3 overflow-hidden rounded-lg border bg-background/55 p-3"
                  key={preview.id}
                >
                  <input
                    name="titulosGaleria"
                    readOnly
                    type="hidden"
                    value={preview.titulo}
                  />
                  <input
                    name="ordensGaleria"
                    readOnly
                    type="hidden"
                    value={preview.ordem}
                  />
                  {preview.principal ? (
                    <input
                      name="imagemPrincipalGaleriaIndice"
                      readOnly
                      type="hidden"
                      value={indice}
                    />
                  ) : null}

                  <img
                    alt={preview.titulo || preview.nome}
                    className="h-28 w-full rounded-lg object-cover"
                    src={preview.url}
                  />
                  <CampoTexto
                    disabled={disabled}
                    label="Nome/titulo da foto"
                    name={`tituloGaleriaVisual${indice}`}
                    onChange={(evento) =>
                      atualizarTituloGaleria(indice, evento.currentTarget.value)
                    }
                    value={preview.titulo}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionButton
                      disabled={disabled}
                      icon={<Star className="h-4 w-4" />}
                      onClick={() => definirPrincipalGaleria(indice)}
                      size="sm"
                      type="button"
                      variant={preview.principal ? "status" : "settings"}
                    >
                      Principal
                    </ActionButton>
                    <ActionButton
                      aria-label="Mover foto para cima"
                      disabled={disabled || indice === 0}
                      icon={<ArrowUp className="h-4 w-4" />}
                      onClick={() => moverGaleria(indice, -1)}
                      size="icon"
                      type="button"
                      variant="settings"
                    >
                      Subir
                    </ActionButton>
                    <ActionButton
                      aria-label="Mover foto para baixo"
                      disabled={
                        disabled || indice === previewsGaleria.length - 1
                      }
                      icon={<ArrowDown className="h-4 w-4" />}
                      onClick={() => moverGaleria(indice, 1)}
                      size="icon"
                      type="button"
                      variant="settings"
                    >
                      Descer
                    </ActionButton>
                    <ActionButton
                      disabled={disabled}
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => removerGaleria(indice)}
                      size="sm"
                      type="button"
                      variant="delete"
                    >
                      Remover foto
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-28 place-items-center rounded-xl border border-dashed p-4 text-center">
              <div>
                <ImagePlus className="mx-auto h-6 w-6 text-cyan-600" />
                <p className="mt-2 text-sm font-medium">
                  {totalImagensAtuais
                    ? `${totalImagensAtuais} foto(s) ja cadastrada(s)`
                    : "Nenhuma foto cadastrada"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Adicione novas fotos aqui. A galeria salva permite definir
                  capa, reordenar e excluir.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type CampoTextoProps = ComponentProps<typeof Input> & {
  erro?: string | undefined;
  label: string;
  name: string;
  obrigatorio?: boolean;
};

function CampoTexto({
  className,
  erro,
  label,
  name,
  obrigatorio,
  ...props
}: CampoTextoProps) {
  const erroId = erro ? `${name}-erro` : undefined;

  return (
    <div className="grid gap-2">
      <LabelCampo htmlFor={name} obrigatorio={obrigatorio}>
        {label}
      </LabelCampo>
      <Input
        aria-describedby={erroId}
        aria-invalid={Boolean(erro)}
        className={cn(
          className,
          erro &&
            "border-destructive/70 bg-destructive/5 focus-visible:ring-destructive/40",
        )}
        id={name}
        name={name}
        {...props}
      />
      {erro ? (
        <p className="text-xs font-medium text-destructive" id={erroId}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}

function CampoNumero(props: CampoTextoProps) {
  return <CampoTexto {...props} type="number" />;
}

function CampoMoeda(props: CampoTextoProps) {
  return <CampoTexto {...props} min={0} step="0.01" type="number" />;
}

function CampoArea({
  className,
  erro,
  label,
  name,
  obrigatorio,
  ...props
}: {
  erro?: string | undefined;
  label: string;
  name: string;
  obrigatorio?: boolean;
} & ComponentProps<"textarea">) {
  const erroId = erro ? `${name}-erro` : undefined;

  return (
    <div className="grid gap-2">
      <LabelCampo htmlFor={name} obrigatorio={obrigatorio}>
        {label}
      </LabelCampo>
      <textarea
        aria-describedby={erroId}
        aria-invalid={Boolean(erro)}
        className={cn(
          areaClasse,
          erro &&
            "border-destructive/70 bg-destructive/5 focus-visible:ring-destructive/40",
          className,
        )}
        id={name}
        name={name}
        {...props}
      />
      {erro ? (
        <p className="text-xs font-medium text-destructive" id={erroId}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}

function CampoSelect({
  defaultValue,
  disabled,
  erro,
  label,
  name,
  obrigatorio,
  options,
}: {
  defaultValue: string;
  disabled: boolean;
  erro?: string | undefined;
  label: string;
  name: string;
  obrigatorio?: boolean;
  options: Array<{ label: string; valor: string }>;
}) {
  const erroId = erro ? `${name}-erro` : undefined;

  return (
    <div className="grid gap-2">
      <LabelCampo htmlFor={name} obrigatorio={obrigatorio}>
        {label}
      </LabelCampo>
      <select
        aria-describedby={erroId}
        aria-invalid={Boolean(erro)}
        className={cn(
          campoClasse,
          erro &&
            "border-destructive/70 bg-destructive/5 focus-visible:ring-destructive/40",
        )}
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        name={name}
      >
        {options.map((option) => (
          <option key={option.valor} value={option.valor}>
            {option.label}
          </option>
        ))}
      </select>
      {erro ? (
        <p className="text-xs font-medium text-destructive" id={erroId}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}

function CampoCheckbox({
  defaultChecked,
  disabled,
  label,
  name,
  onChange,
  value = "on",
}: {
  defaultChecked?: boolean;
  disabled: boolean;
  label: string;
  name: string;
  onChange?: ComponentProps<"input">["onChange"];
  value?: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border bg-background/45 px-3 py-2 text-sm">
      <input
        defaultChecked={defaultChecked}
        disabled={disabled}
        name={name}
        onChange={onChange}
        type="checkbox"
        value={value}
      />
      {label}
    </label>
  );
}

function CampoArquivo({
  botaoLabel,
  erro,
  inputRef,
  label,
  obrigatorio,
  ...props
}: {
  botaoLabel: string;
  erro?: string | undefined;
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  obrigatorio?: boolean;
} & ComponentProps<typeof Input>) {
  const erroId = erro ? `${props.name}-erro` : undefined;

  return (
    <div className="grid gap-2">
      <LabelCampo htmlFor={props.name} obrigatorio={obrigatorio}>
        {label}
      </LabelCampo>
      <Input
        accept="image/*"
        aria-describedby={erroId}
        aria-invalid={Boolean(erro)}
        className="sr-only"
        id={props.name}
        ref={inputRef}
        type="file"
        {...props}
      />
      <ActionButton
        disabled={props.disabled}
        icon={<ImagePlus className="h-4 w-4" />}
        onClick={() => inputRef.current?.click()}
        type="button"
        variant="add"
      >
        {botaoLabel}
      </ActionButton>
      {erro ? (
        <p className="text-xs font-medium text-destructive" id={erroId}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}

function LabelCampo({
  children,
  htmlFor,
  obrigatorio,
}: {
  children: ReactNode;
  htmlFor?: string | undefined;
  obrigatorio?: boolean | undefined;
}) {
  return (
    <Label className="inline-flex items-center gap-1" htmlFor={htmlFor}>
      <span>{children}</span>
      {obrigatorio ? (
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      ) : null}
    </Label>
  );
}

function PreviewImagem({
  titulo,
  url,
}: {
  titulo: string;
  url: string | null;
}) {
  return (
    <div className="rounded-xl border bg-background/45 p-3">
      <p className="mb-3 text-sm font-semibold">{titulo}</p>
      {url ? (
        <img
          alt={titulo}
          className="h-40 w-full rounded-lg object-cover"
          src={url}
        />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          <ImagePlus className="mr-2 h-4 w-4" />
          Nenhuma imagem selecionada.
        </div>
      )}
    </div>
  );
}
