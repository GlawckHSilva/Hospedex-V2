"use client";

import type {
  AmenityRow,
  MediaAssetRow,
  PropertyStatus,
  PropertyType,
} from "@hospedex/types";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Banknote,
  Camera,
  CheckCircle2,
  Cloud,
  CloudOff,
  Copy,
  Clock3,
  CreditCard,
  GripVertical,
  Home,
  ImagePlus,
  Landmark,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Share2,
  Sparkles,
  Star,
  Smartphone,
  Trash2,
  WalletCards,
  Save,
  RefreshCw,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ComponentProps, FormEvent, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import { Input, Label, cn } from "@hospedex/ui";

import { ActionButton } from "../management/action-button";
import { AppModal } from "../management/entity-modal";
import { WizardStepper } from "../management/wizard-stepper";
import { PropertyAmenitiesStep } from "./property-amenities-step";
import { usarAutenticacao } from "../auth/auth-provider";
import {
  salvarRascunhoPropriedadeAction,
  type ResultadoSalvarPropriedade,
} from "../../lib/properties/actions";
import {
  encontrarRascunhoCasaLocal,
  lerRascunhoCasaLocal,
  notificarRascunhoCasaAtualizado,
  obterChaveRascunhoCasa,
  removerRascunhosCasaLocal,
} from "../../lib/properties/property-draft-local";
import type {
  PropriedadeComRelacionamentos,
  RascunhoFormularioCasa,
} from "../../lib/properties/types";
import {
  TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_BYTES,
  TAMANHO_MAXIMO_IMAGEM_PROPRIEDADE_MB,
  TAMANHO_MAXIMO_ENVIO_PROPRIEDADE_BYTES,
  TAMANHO_MAXIMO_ENVIO_PROPRIEDADE_MB,
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
  userId?: string;
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
    descricao: "Identificação, status e textos principais da casa.",
    icon: <Home />,
    id: "basico",
    label: "Básico",
  },
  {
    descricao: "Endereço operacional e referências para localização.",
    icon: <MapPin />,
    id: "localizacao",
    label: "Localização",
  },
  {
    descricao: "Capacidade, quartos e estrutura física da hospedagem.",
    icon: <BedDouble />,
    id: "estrutura",
    label: "Estrutura",
  },
  {
    descricao: "Diária, taxas e configuração futura de cartão.",
    icon: <WalletCards />,
    id: "valores",
    label: "Valores",
  },
  {
    descricao: "Horários, regras e observações internas.",
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
    descricao: "Comodidades padrão e personalizadas.",
    icon: <Sparkles />,
    id: "comodidades",
    label: "Comodidades",
  },
  {
    descricao: "Dados públicos usados no Marketplace.",
    icon: <Share2 />,
    id: "compartilhamento",
    label: "Publicação",
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
  { valor: "paused", label: "Inativa" },
];

const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
].map((uf) => ({ label: uf, valor: uf }));

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const MAX_PARCELAS_CARTAO = 12;

type ErrosFormularioCasa = Partial<Record<string, string>>;

type CampoObrigatorioCasa = {
  etapa: EtapaId;
  maximo?: number;
  mensagem: string;
  minimo?: number;
  name: string;
  obrigatorio?: boolean;
  tipo: "comodidade" | "hora" | "imagem" | "numero" | "texto" | "url";
  validarQuando?: (dados: FormData) => boolean;
};

const CAMPOS_OBRIGATORIOS_CASA: CampoObrigatorioCasa[] = [
  {
    etapa: "basico",
    mensagem: "Informe o nome interno da casa.",
    name: "nome",
    tipo: "texto",
  },
  {
    etapa: "basico",
    mensagem: "Informe o tipo da hospedagem.",
    name: "tipo",
    tipo: "texto",
  },
  {
    etapa: "basico",
    mensagem: "Informe a descrição curta da casa.",
    name: "descricaoCurta",
    tipo: "texto",
  },
  {
    etapa: "localizacao",
    mensagem: "Informe o endereço.",
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
    etapa: "localizacao",
    mensagem: "Informe um link do Google Maps valido.",
    name: "googleMapsLink",
    obrigatorio: false,
    tipo: "url",
  },
  {
    etapa: "estrutura",
    mensagem: "Informe a capacidade máxima de hóspedes.",
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
    mensagem: "Informe uma quantidade de camas valida.",
    minimo: 1,
    name: "camasCasa",
    obrigatorio: false,
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
    etapa: "estrutura",
    mensagem: "Informe uma quantidade de vagas valida.",
    minimo: 0,
    name: "garagemVagas",
    obrigatorio: false,
    tipo: "numero",
  },
  {
    etapa: "valores",
    mensagem: "Informe um valor de diária válido.",
    minimo: 0.01,
    name: "valorDiaria",
    tipo: "numero",
  },
  {
    etapa: "valores",
    mensagem: "Informe uma taxa de limpeza valida.",
    minimo: 0,
    name: "taxaLimpeza",
    obrigatorio: false,
    tipo: "numero",
  },
  {
    etapa: "valores",
    mensagem: "Informe uma caucao valida.",
    minimo: 0,
    name: "caucao",
    obrigatorio: false,
    tipo: "numero",
  },
  {
    etapa: "valores",
    mensagem: "Informe um valor por hospede extra valido.",
    minimo: 0,
    name: "valorHospedeExtra",
    obrigatorio: false,
    tipo: "numero",
  },
  {
    etapa: "valores",
    mensagem: "Informe a quantidade máxima de parcelas.",
    maximo: MAX_PARCELAS_CARTAO,
    minimo: 1,
    name: "maxParcelasCartao",
    tipo: "numero",
    validarQuando: (dados) => dados.get("aceitaCartaoCredito") === "on",
  },
  ...Array.from({ length: MAX_PARCELAS_CARTAO }, (_, indice) => ({
    etapa: "valores" as const,
    maximo: 100,
    mensagem: "Informe juros entre 0% e 100%.",
    minimo: 0,
    name: `jurosParcela${indice + 1}`,
    obrigatorio: false,
    tipo: "numero" as const,
    validarQuando: (dados: FormData) =>
      dados.get("aceitaCartaoCredito") === "on",
  })),
  {
    etapa: "regras",
    mensagem: "Informe um horario de check-in valido.",
    name: "checkInTime",
    obrigatorio: false,
    tipo: "hora",
  },
  {
    etapa: "regras",
    mensagem: "Informe um horario de check-out valido.",
    name: "checkOutTime",
    obrigatorio: false,
    tipo: "hora",
  },
  {
    etapa: "imagens",
    mensagem: "Adicione uma foto principal para publicar a casa.",
    name: "imagemCapaArquivo",
    tipo: "imagem",
    validarQuando: deveValidarPublicacao,
  },
  {
    etapa: "comodidades",
    mensagem: "Adicione pelo menos uma comodidade antes de publicar a casa.",
    name: "comodidadeIds",
    tipo: "comodidade",
    validarQuando: deveValidarPublicacao,
  },
  {
    etapa: "compartilhamento",
    mensagem: "Informe uma URL valida para a imagem de compartilhamento.",
    name: "imagemCompartilhamento",
    obrigatorio: false,
    tipo: "url",
  },
  {
    etapa: "compartilhamento",
    mensagem: "Informe o título público para publicar a casa.",
    name: "tituloPublico",
    tipo: "texto",
    validarQuando: deveValidarPublicacao,
  },
  {
    etapa: "compartilhamento",
    mensagem: "Informe a descrição pública para publicar a casa.",
    name: "descricaoPublica",
    tipo: "texto",
    validarQuando: deveValidarPublicacao,
  },
];

function deveValidarPublicacao(dados: FormData) {
  return (
    dados.get("visibilidadePublica") === "on" ||
    dados.get("status") === "published"
  );
}

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
  arquivo: File | null;
  existenteId: string | null;
  id: string;
  nome: string;
  ordem: number;
  origem: "existente" | "nova";
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
    existenteId: null,
    id: crypto.randomUUID(),
    nome: arquivo.name,
    ordem,
    origem: "nova",
    principal,
    titulo: arquivo.name.replace(/\.[^.]+$/, ""),
    url: URL.createObjectURL(arquivo),
  };
}

function criarPreviewsGaleriaExistente(
  imagens: MediaAssetRow[],
): PreviewGaleria[] {
  return normalizarGaleria(
    imagens
      .filter((imagem) => Boolean(imagem.url))
      .map((imagem, indice) => ({
        arquivo: null,
        existenteId: imagem.id,
        id: `existente-${imagem.id}`,
        nome: imagem.alt || `Foto ${indice + 1}`,
        ordem: indice + 1,
        origem: "existente" as const,
        principal: imagem.is_cover,
        titulo: imagem.alt || `Foto ${indice + 1}`,
        url: imagem.url ?? "",
      })),
  );
}

function normalizarGaleria(previews: PreviewGaleria[]): PreviewGaleria[] {
  if (!previews.length) return [];

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

function revogarPreviewLocal(preview: PreviewGaleria) {
  if (preview.origem === "nova") URL.revokeObjectURL(preview.url);
}

function obterArquivosPreviews(previews: PreviewGaleria[]) {
  return previews
    .filter(
      (preview): preview is PreviewGaleria & { arquivo: File } =>
        preview.origem === "nova" && Boolean(preview.arquivo),
    )
    .map((preview) => preview.arquivo);
}

function indiceDaEtapa(etapaId: EtapaId) {
  return Math.max(
    ETAPAS.findIndex((etapa) => etapa.id === etapaId),
    0,
  );
}

function validarHoraFormulario(valor: string) {
  if (!valor.trim()) return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor.trim());
}

function validarUrlFormulario(valor: string) {
  if (!valor.trim()) return true;

  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validarFormularioCasa(
  formulario: HTMLFormElement,
  etapasPermitidas?: Set<EtapaId>,
  contexto: { possuiComodidade: boolean; possuiImagemPrincipal: boolean } = {
    possuiComodidade: false,
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

    if (campo.tipo === "url" && !validarUrlFormulario(valorBruto)) {
      erros[campo.name] = campo.mensagem;
      continue;
    }

    if (campo.tipo === "hora" && !validarHoraFormulario(valorBruto)) {
      erros[campo.name] = campo.mensagem;
      continue;
    }

    if (campo.tipo === "imagem" && !contexto.possuiImagemPrincipal) {
      erros[campo.name] = campo.mensagem;
      continue;
    }

    if (campo.tipo === "comodidade" && !contexto.possuiComodidade) {
      erros[campo.name] = campo.mensagem;
      continue;
    }

    if (campo.tipo === "numero") {
      if (!valorBruto && campo.obrigatorio === false) continue;

      const valor = Number.parseFloat(valorBruto.replace(",", "."));
      if (
        !Number.isFinite(valor) ||
        valor < (campo.minimo ?? 0) ||
        (typeof campo.maximo === "number" && valor > campo.maximo)
      ) {
        erros[campo.name] = campo.mensagem;
      }
    }
  }

  return erros;
}

type ControleFormularioCasa =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

type EstadoSincronizacaoRascunho =
  | "aguardando"
  | "falha"
  | "local"
  | "salvando"
  | "servidor";

type ConflitoRascunhoCasa = {
  local: RascunhoFormularioCasa;
  servidor: RascunhoFormularioCasa;
};

function deveIgnorarCampoRascunho(campo: ControleFormularioCasa) {
  if (!campo.name) return true;
  if (!(campo instanceof HTMLInputElement)) return false;

  return ["button", "file", "hidden", "reset", "submit"].includes(campo.type);
}

function serializarRascunhoCasa(
  formulario: HTMLFormElement,
  etapaAtual: number,
  operacaoId: string,
): RascunhoFormularioCasa {
  const campos: RascunhoFormularioCasa["campos"] = {};
  const controles = Array.from(
    formulario.querySelectorAll<ControleFormularioCasa>(
      "input, select, textarea",
    ),
  );
  const incluiArquivos = Array.from(
    formulario.querySelectorAll<HTMLInputElement>('input[type="file"]'),
  ).some((campo) => Boolean(campo.files?.length));

  controles.forEach((campo) => {
    if (deveIgnorarCampoRascunho(campo)) return;

    const valores = campos[campo.name] ?? [];
    if (campo instanceof HTMLInputElement) {
      const valor: RascunhoFormularioCasa["campos"][string][number] = {
        tipo: campo.type,
        valor: campo.value,
      };
      if (campo.type === "checkbox" || campo.type === "radio") {
        valor.checked = campo.checked;
      }
      valores.push(valor);
    } else {
      valores.push({
        tipo: campo.tagName.toLowerCase(),
        valor: campo.value,
      });
    }
    campos[campo.name] = valores;
  });

  return {
    campos,
    etapaAtual,
    incluiArquivos,
    operacaoId,
    salvoEm: new Date().toISOString(),
    versao: 1,
  };
}

function aplicarRascunhoCasa(
  formulario: HTMLFormElement,
  rascunho: RascunhoFormularioCasa,
) {
  const controles = Array.from(
    formulario.querySelectorAll<ControleFormularioCasa>(
      "input, select, textarea",
    ),
  );

  Object.entries(rascunho.campos).forEach(([nome, valores]) => {
    controles
      .filter((controle) => controle.name === nome)
      .forEach((controle, indice) => {
        const valor = valores[indice];
        if (!valor) return;

        if (controle instanceof HTMLInputElement) {
          if (controle.type === "checkbox" || controle.type === "radio") {
            controle.checked = Boolean(valor.checked);
          } else {
            controle.value = valor.valor;
          }
        } else {
          controle.value = valor.valor;
        }

        controle.dispatchEvent(new Event("input", { bubbles: true }));
        controle.dispatchEvent(new Event("change", { bubbles: true }));
      });
  });
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

function obterTextoSincronizacao(estado: EstadoSincronizacaoRascunho) {
  if (estado === "salvando") return "Salvando rascunho...";
  if (estado === "servidor") return "Todas as alteracoes foram salvas";
  if (estado === "aguardando") return "Aguardando conexao";
  if (estado === "falha") return "Falha na sincronizacao";
  return "Salvo neste dispositivo";
}

export function PropertyForm({
  comodidadesDisponiveis,
  modo,
  podeGerenciar,
  propriedade,
  userId,
}: PropertyFormProps) {
  const { contexto } = usarAutenticacao();
  const router = useRouter();
  const searchParams = useSearchParams();
  const erroServidor = searchParams.get("erro");
  const usuarioRascunho = userId ?? contexto?.userId ?? "usuario";
  const chaveRascunho = obterChaveRascunhoCasa(
    modo,
    usuarioRascunho,
    propriedade?.id,
  );
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [errosCampos, setErrosCampos] = useState<ErrosFormularioCasa>({});
  const [erroImagem, setErroImagem] = useState<string | null>(null);
  const [avisoRascunho, setAvisoRascunho] = useState<string | null>(null);
  const [conflitoRascunho, setConflitoRascunho] =
    useState<ConflitoRascunhoCasa | null>(null);
  const [estadoSincronizacao, setEstadoSincronizacao] =
    useState<EstadoSincronizacaoRascunho>("local");
  const [previewCapa, setPreviewCapa] = useState<string | null>(null);
  const [imagemCapaId, setImagemCapaId] = useState<string | null>(null);
  const [operacaoId, setOperacaoId] = useState(
    modo === "editar" ? (propriedade?.id ?? "") : "",
  );
  const [resultadoSalvamento, setResultadoSalvamento] =
    useState<ResultadoSalvarPropriedade | null>(null);
  const [tipoFalha, setTipoFalha] = useState<
    "salvamento" | "sincronizacao" | null
  >(null);
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const [previewsGaleria, setPreviewsGaleria] = useState<PreviewGaleria[]>(() =>
    criarPreviewsGaleriaExistente(propriedade?.imagens ?? []),
  );
  const [idsImagensRemovidas, setIdsImagensRemovidas] = useState<string[]>([]);
  const [publicaSelecionada, setPublicaSelecionada] = useState(
    propriedade?.is_public ?? false,
  );
  const [statusSelecionado, setStatusSelecionado] = useState<PropertyStatus>(
    propriedade?.status ?? "draft",
  );
  const [quantidadeComodidadesValidas, setQuantidadeComodidadesValidas] =
    useState(propriedade?.comodidades.length ?? 0);
  const formRef = useRef<HTMLFormElement>(null);
  const capaRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const arquivosGaleriaRef = useRef<File[]>([]);
  const timerRascunhoRef = useRef<number | null>(null);
  const primeiraSincronizacaoRef = useRef(true);
  const promessaSincronizacaoRef = useRef<Promise<boolean> | null>(null);
  const sincronizarRascunhoAtualRef = useRef<() => Promise<boolean>>(
    async () => false,
  );
  const rascunhoInicialVerificadoRef = useRef(false);
  const aplicandoRascunhoRef = useRef(false);
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
    !operacaoId ||
    Boolean(erroImagem) ||
    Object.keys(errosCampos).length > 0;
  const etapa = ETAPAS[etapaAtual] ?? ETAPAS[0]!;
  const estaNaUltimaEtapa = etapaAtual === ETAPAS.length - 1;
  const etapasConcluidas = ETAPAS.slice(0, etapaAtual).map((item) => item.id);
  const etapasComErro = obterEtapasComErro(errosCampos);
  const imagemPrincipalSelecionada =
    previewCapa ??
    previewsGaleria.find((preview) => preview.principal)?.url ??
    propriedade?.imagemCapa?.url ??
    null;

  useEffect(() => {
    previewCapaRef.current = previewCapa;
  }, [previewCapa]);

  useEffect(() => {
    previewsGaleriaRef.current = previewsGaleria;
  }, [previewsGaleria]);

  useEffect(() => {
    const formulario = formRef.current;
    if (!formulario) return;
    if (rascunhoInicialVerificadoRef.current) return;

    // Um cadastro sincronizado passa de "criar" para "editar". A busca pelo
    // operationId preserva a copia local mais recente nessa transicao.
    const rascunhoLocal = propriedade?.id
      ? encontrarRascunhoCasaLocal(usuarioRascunho, propriedade.id)
      : lerRascunhoCasaLocal(chaveRascunho);
    const rascunhoServidor = propriedade?.rascunhoFormulario ?? null;

    if (
      rascunhoLocal &&
      rascunhoServidor &&
      rascunhoLocal.salvoEm !== rascunhoServidor.salvoEm
    ) {
      setConflitoRascunho({
        local: rascunhoLocal,
        servidor: rascunhoServidor,
      });
      setAvisoRascunho(
        "Existem alteracoes diferentes neste dispositivo e no servidor. Escolha qual versao deseja recuperar.",
      );
      rascunhoInicialVerificadoRef.current = true;
      return;
    }

    const rascunho = rascunhoLocal ?? rascunhoServidor;
    if (rascunho) {
      recuperarRascunho(rascunho, rascunhoLocal ? "local" : "servidor");
    }
    rascunhoInicialVerificadoRef.current = true;
  }, [
    chaveRascunho,
    modo,
    propriedade?.id,
    propriedade?.rascunhoFormulario,
    usuarioRascunho,
  ]);

  useEffect(() => {
    if (modo === "criar" && !operacaoId) setOperacaoId(crypto.randomUUID());
  }, [modo, operacaoId]);

  useEffect(() => {
    return () => {
      if (timerRascunhoRef.current) {
        window.clearTimeout(timerRascunhoRef.current);
      }
      if (previewCapaRef.current) URL.revokeObjectURL(previewCapaRef.current);
      previewsGaleriaRef.current.forEach(revogarPreviewLocal);
    };
  }, []);

  function sincronizarEstadosControladosDoFormulario() {
    const formulario = formRef.current;
    if (!formulario) return;

    const visibilidadePublica = formulario.elements.namedItem(
      "visibilidadePublica",
    );
    if (visibilidadePublica instanceof HTMLInputElement) {
      setPublicaSelecionada(visibilidadePublica.checked);
    }

    const status = formulario.querySelector<HTMLInputElement>(
      'input[name="status"]:checked',
    );
    if (status && ["draft", "published", "paused"].includes(status.value)) {
      setStatusSelecionado(status.value as PropertyStatus);
    }
  }

  function recuperarRascunho(
    rascunho: RascunhoFormularioCasa,
    origem: "local" | "servidor",
  ) {
    const formulario = formRef.current;
    if (!formulario) return;

    if (modo === "criar") setOperacaoId(rascunho.operacaoId);
    aplicandoRascunhoRef.current = true;
    try {
      aplicarRascunhoCasa(formulario, rascunho);
    } finally {
      aplicandoRascunhoRef.current = false;
    }
    setEtapaAtual(
      Math.min(Math.max(rascunho.etapaAtual, 0), ETAPAS.length - 1),
    );
    sincronizarEstadosControladosDoFormulario();
    setEstadoSincronizacao(origem === "servidor" ? "servidor" : "local");
    setAvisoRascunho(
      rascunho.incluiArquivos
        ? "Rascunho recuperado. Selecione novamente as imagens locais antes de salvar."
        : origem === "servidor"
          ? "Rascunho recuperado do servidor."
          : "Rascunho recuperado neste dispositivo.",
    );
  }

  function escolherVersaoRascunho(rascunho: RascunhoFormularioCasa) {
    recuperarRascunho(
      rascunho,
      conflitoRascunho?.servidor === rascunho ? "servidor" : "local",
    );
    try {
      removerRascunhosCasaLocal(usuarioRascunho, rascunho.operacaoId);
      window.localStorage.setItem(chaveRascunho, JSON.stringify(rascunho));
      notificarRascunhoCasaAtualizado();
    } catch {
      setEstadoSincronizacao("falha");
    }
    setConflitoRascunho(null);
  }

  function salvarRascunhoLocal(
    mensagem?: string | null,
    etapaOverride = etapaAtual,
  ): RascunhoFormularioCasa | null {
    const formulario = formRef.current;
    if (!formulario || !operacaoId) return null;

    // O rascunho local evita perda de dados quando a validacao do servidor
    // rejeita o envio. Arquivos ficam fora do localStorage por seguranca.
    const rascunho = serializarRascunhoCasa(
      formulario,
      etapaOverride,
      operacaoId,
    );
    try {
      window.localStorage.setItem(chaveRascunho, JSON.stringify(rascunho));
      notificarRascunhoCasaAtualizado();
      setEstadoSincronizacao(navigator.onLine ? "local" : "aguardando");
    } catch {
      setEstadoSincronizacao("falha");
      setAvisoRascunho(
        "Nao foi possivel salvar o rascunho neste navegador. Revise os campos destacados antes de sair.",
      );
      return null;
    }
    if (mensagem !== null) {
      setAvisoRascunho(
        mensagem ??
          "Rascunho salvo neste dispositivo. Voce pode corrigir os campos sem perder o que digitou.",
      );
    }
    return rascunho;
  }

  async function executarSincronizacaoRascunho(
    etapaOverride = etapaAtual,
  ): Promise<boolean> {
    const formulario = formRef.current;
    const rascunho = salvarRascunhoLocal(null, etapaOverride);
    if (!formulario || !rascunho) return false;
    if (!navigator.onLine) {
      setEstadoSincronizacao("aguardando");
      setAvisoRascunho(
        "Sem conexao. O rascunho foi salvo neste dispositivo e sera sincronizado quando a conexao voltar.",
      );
      return false;
    }

    setEstadoSincronizacao("salvando");
    const dados = new FormData(formulario);
    dados.delete("imagemCapaArquivo");
    dados.delete("imagensGaleriaArquivos");
    dados.set("operacaoId", rascunho.operacaoId);
    dados.set("etapaWizard", String(etapaOverride + 1));
    dados.set("rascunhoFormulario", JSON.stringify(rascunho));

    try {
      const resultado = await salvarRascunhoPropriedadeAction(dados);
      if (!resultado.sucesso) {
        setResultadoSalvamento(resultado);
        setTipoFalha("sincronizacao");
        setEstadoSincronizacao("falha");
        setAvisoRascunho(
          `${resultado.mensagem} Ele continua salvo neste dispositivo.`,
        );
        return false;
      }

      const sincronizado: RascunhoFormularioCasa = {
        ...rascunho,
        ...(resultado.sincronizadoEm
          ? { sincronizadoEm: resultado.sincronizadoEm }
          : {}),
      };
      window.localStorage.setItem(
        chaveRascunho,
        JSON.stringify(sincronizado),
      );
      notificarRascunhoCasaAtualizado();
      setEstadoSincronizacao("servidor");
      setAvisoRascunho("Todas as alteracoes foram salvas.");
      setResultadoSalvamento(null);
      setTipoFalha(null);
      if (primeiraSincronizacaoRef.current) {
        primeiraSincronizacaoRef.current = false;
        router.refresh();
      }
      return true;
    } catch (erro) {
      console.error("Falha ao sincronizar o rascunho da casa.", erro);
      setEstadoSincronizacao("falha");
      setAvisoRascunho(
        "Nao foi possivel conectar ao servidor. O rascunho foi salvo neste dispositivo.",
      );
      return false;
    }
  }

  function sincronizarRascunho(
    etapaOverride = etapaAtual,
  ): Promise<boolean> {
    if (promessaSincronizacaoRef.current) {
      return promessaSincronizacaoRef.current;
    }
    const promessa = executarSincronizacaoRascunho(etapaOverride).finally(
      () => {
        promessaSincronizacaoRef.current = null;
      },
    );
    promessaSincronizacaoRef.current = promessa;
    return promessa;
  }

  function agendarSincronizacaoRascunho() {
    if (timerRascunhoRef.current) {
      window.clearTimeout(timerRascunhoRef.current);
    }

    timerRascunhoRef.current = window.setTimeout(() => {
      void sincronizarRascunho();
    }, 1_000);
  }

  function descartarRascunhoLocal() {
    try {
      window.localStorage.removeItem(chaveRascunho);
      removerRascunhosCasaLocal(usuarioRascunho, operacaoId);
      notificarRascunhoCasaAtualizado();
    } catch {
      // Sem acao: o descarte visual ja remove o aviso para o usuario.
    }
    setAvisoRascunho(null);
    setEstadoSincronizacao("local");
  }

  async function copiarDetalhesSuporte() {
    const detalhes = {
      codigo: resultadoSalvamento?.codigoSuporte ?? "SEM-CODIGO",
      dataHora: new Date().toISOString(),
      etapa: `${etapaAtual + 1}/${ETAPAS.length} - ${etapa.label}`,
      operacao: modo === "editar" ? "editar-casa" : "criar-casa",
      propriedadeId: operacaoId,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(detalhes, null, 2));
      setAvisoRascunho("Detalhes seguros copiados para o suporte.");
    } catch {
      setAvisoRascunho(
        "Nao foi possivel copiar automaticamente. Informe o codigo exibido ao suporte.",
      );
    }
  }

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
    setImagemCapaId(arquivo && !erro ? crypto.randomUUID() : null);
    if (arquivo && !erro) removerErrosDosCampos(["imagemCapaArquivo"]);
  }

  function sincronizarArquivosGaleria(previews: PreviewGaleria[]) {
    const arquivos = obterArquivosPreviews(previews);
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
      sincronizarArquivosGaleria(previewsGaleriaRef.current);
      return;
    }

    // O input file do navegador substitui a selecao a cada upload.
    // A ref preserva a colecao real para que novas fotos sejam adicionadas sem apagar as anteriores.
    removerErrosDosCampos(["imagemCapaArquivo"]);

    setPreviewsGaleria((previewsAtuais) => {
      const normalizados = normalizarGaleria([
        ...previewsAtuais,
        ...novasImagens.map((arquivo, indice) =>
          criarPreviewGaleria(
            arquivo,
            previewsAtuais.length + indice + 1,
            previewsAtuais.length === 0 && indice === 0,
          ),
        ),
      ]);
      sincronizarArquivosGaleria(normalizados);
      return normalizados;
    });
  }

  function removerGaleria(indiceRemovido: number) {
    // A validacao total sera refeita no proximo envio com a colecao reduzida.
    setErroImagem(null);
    setPreviewsGaleria((previewsAtuais) => {
      const previewRemovido = previewsAtuais[indiceRemovido];
      if (previewRemovido) {
        revogarPreviewLocal(previewRemovido);
        if (previewRemovido.existenteId) {
          setIdsImagensRemovidas((idsAtuais) =>
            idsAtuais.includes(previewRemovido.existenteId!)
              ? idsAtuais
              : [...idsAtuais, previewRemovido.existenteId!],
          );
        }
      }

      const atualizados = normalizarGaleria(
        previewsAtuais.filter((_, indice) => indice !== indiceRemovido),
      );
      sincronizarArquivosGaleria(atualizados);
      return atualizados;
    });
  }

  function reordenarGaleria(indiceAtual: number, indiceDestino: number) {
    setPreviewsGaleria((previewsAtuais) => {
      if (
        indiceAtual === indiceDestino ||
        indiceAtual < 0 ||
        indiceDestino < 0 ||
        indiceAtual >= previewsAtuais.length ||
        indiceDestino >= previewsAtuais.length
      ) {
        return previewsAtuais;
      }

      const atualizados = [...previewsAtuais];
      const [itemAtual] = atualizados.splice(indiceAtual, 1);
      if (!itemAtual) return previewsAtuais;

      atualizados.splice(indiceDestino, 0, itemAtual);
      const normalizados = normalizarGaleria(atualizados);
      sincronizarArquivosGaleria(normalizados);
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

  function aoAlterarFormulario(evento: FormEvent<HTMLFormElement>) {
    if (aplicandoRascunhoRef.current) return;
    limparErroDoCampo(evento);
    salvarRascunhoLocal(null);
    agendarSincronizacaoRascunho();
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
        "comodidadeIds",
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
      void sincronizarRascunho(indiceDestino);
      setEtapaAtual(indiceDestino);
    }
  }

  function voltarEtapa() {
    const destino = Math.max(etapaAtual - 1, 0);
    void sincronizarRascunho(destino);
    setEtapaAtual(destino);
  }

  function fecharWizard() {
    // Fechamento autorizado apenas depois de sucesso completo no servidor.
    // O formulário não controla a modal diretamente; por isso emite um evento
    // interno para a AppModal encerrar o Portal sem depender de clique visual.
    formRef.current
      ?.closest('[role="dialog"]')
      ?.dispatchEvent(new Event("hospedex:fechar-modal"));
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
    const destino = Math.min(etapaAtual + 1, ETAPAS.length - 1);
    void sincronizarRascunho(destino);
    setEtapaAtual(destino);
  }

  async function validarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvandoRef.current) return;

    salvarRascunhoLocal(null);

    if (!podeGerenciar || erroImagem) {
      salvarRascunhoLocal(
        "Corrija os campos destacados. O rascunho foi salvo neste dispositivo.",
      );
      return;
    }

    const erros = validarFormularioCasa(
      evento.currentTarget,
      undefined,
      obterContextoValidacaoCasa(),
    );
    if (Object.keys(erros).length > 0) {
      salvarRascunhoLocal(
        "Corrija os campos destacados. O rascunho foi salvo neste dispositivo.",
      );
      aplicarErrosValidacao(erros);
      return;
    }

    const formulario = evento.currentTarget;
    const dados = montarDadosSalvamento(formulario);
    const tamanhoArquivos = Array.from(dados.values()).reduce(
      (total, valor) => total + (valor instanceof File ? valor.size : 0),
      0,
    );
    if (tamanhoArquivos > TAMANHO_MAXIMO_ENVIO_PROPRIEDADE_BYTES) {
      setErroImagem(
        `As imagens deste salvamento somam mais de ${TAMANHO_MAXIMO_ENVIO_PROPRIEDADE_MB} MB. Remova algumas fotos, salve a casa e adicione as demais depois. Seus dados foram mantidos.`,
      );
      salvarRascunhoLocal(
        "O envio excedeu o limite seguro, mas os dados do formulario foram mantidos neste dispositivo.",
      );
      return;
    }

    setErrosCampos({});
    setResultadoSalvamento(null);
    salvandoRef.current = true;
    setSalvando(true);

    try {
      await sincronizarRascunho();
      const resultado = await salvarCasaFinal(dados);
      setResultadoSalvamento(resultado);
      setTipoFalha(resultado.sucesso ? null : "salvamento");

      if (!resultado.sucesso) {
        setAvisoRascunho(
          `${resultado.mensagem} Seus dados continuam disponiveis para nova tentativa.`,
        );
        return;
      }

      descartarRascunhoLocal();
      formulario.dataset.bloquearFechamento = "false";
      salvandoRef.current = false;
      setSalvando(false);
      router.refresh();
      window.setTimeout(() => {
        fecharWizard();
        router.replace(
          `/propriedades?sucesso=${
            modo === "editar" ? "propriedade-atualizada" : "propriedade-criada"
          }`,
        );
      }, 0);
    } catch (erro) {
      console.error("Falha de conexao ao salvar a casa.", erro);
      setResultadoSalvamento({
        mensagem:
          "Nao foi possivel confirmar o salvamento da casa. Seus dados foram mantidos. Verifique sua conexao e tente novamente.",
        sucesso: false,
      });
      setTipoFalha("salvamento");
      setAvisoRascunho(
        "A confirmacao do servidor nao chegou. Tente salvar novamente; a mesma casa sera reutilizada.",
      );
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  }

  sincronizarRascunhoAtualRef.current = () => sincronizarRascunho();

  useEffect(() => {
    function preservarAntesDeSair() {
      const formulario = formRef.current;
      if (!formulario || !operacaoId) return;
      try {
        const rascunho = serializarRascunhoCasa(
          formulario,
          etapaAtual,
          operacaoId,
        );
        window.localStorage.setItem(chaveRascunho, JSON.stringify(rascunho));
        notificarRascunhoCasaAtualizado();
      } catch {
        // O navegador pode bloquear armazenamento durante o fechamento.
      }
    }

    function sincronizarAoVoltarConexao() {
      void sincronizarRascunhoAtualRef.current();
    }

    window.addEventListener("beforeunload", preservarAntesDeSair);
    window.addEventListener("online", sincronizarAoVoltarConexao);
    return () => {
      window.removeEventListener("beforeunload", preservarAntesDeSair);
      window.removeEventListener("online", sincronizarAoVoltarConexao);
    };
  }, [chaveRascunho, etapaAtual, operacaoId]);

  function obterContextoValidacaoCasa() {
    return {
      possuiComodidade: quantidadeComodidadesValidas > 0,
      possuiImagemPrincipal: Boolean(
        previewCapa ||
        previewsGaleria.some((preview) => preview.principal),
      ),
    };
  }

  function montarDadosSalvamento(formulario: HTMLFormElement) {
    const dados = new FormData(formulario);
    const previews = previewsGaleriaRef.current;
    const arquivoCapa = capaRef.current?.files?.[0] ?? null;
    let indiceNovaImagem = 0;

    dados.set("operacaoId", operacaoId);
    dados.set("etapaWizard", String(etapaAtual + 1));
    dados.delete("imagemCapaArquivo");
    dados.delete("imagemCapaId");
    dados.delete("possuiImagemPrincipalAtual");
    dados.delete("imagensGaleriaArquivos");
    dados.delete("galeriaArquivoIds");
    dados.delete("titulosGaleria");
    dados.delete("ordensGaleria");
    dados.delete("imagemPrincipalGaleriaIndice");
    dados.delete("imagensExistentesIds");
    dados.delete("titulosImagensExistentes");
    dados.delete("ordensImagensExistentes");
    dados.delete("imagemPrincipalExistenteId");
    dados.delete("imagensExistentesRemovidasIds");

    if (arquivoCapa && imagemCapaId) {
      dados.append("imagemCapaArquivo", arquivoCapa);
      dados.set("imagemCapaId", imagemCapaId);
    }

    idsImagensRemovidas.forEach((imagemId) => {
      dados.append("imagensExistentesRemovidasIds", imagemId);
    });

    previews.forEach((preview) => {
      if (preview.origem === "existente" && preview.existenteId) {
        dados.append("imagensExistentesIds", preview.existenteId);
        dados.append("titulosImagensExistentes", preview.titulo);
        dados.append("ordensImagensExistentes", String(preview.ordem));
        if (preview.principal) {
          dados.set("imagemPrincipalExistenteId", preview.existenteId);
          dados.set("possuiImagemPrincipalAtual", "true");
        }
        return;
      }

      if (preview.origem === "nova" && preview.arquivo) {
        dados.append("imagensGaleriaArquivos", preview.arquivo);
        dados.append("galeriaArquivoIds", preview.id);
        dados.append("titulosGaleria", preview.titulo);
        dados.append("ordensGaleria", String(preview.ordem));
        if (preview.principal) {
          dados.set("imagemPrincipalGaleriaIndice", String(indiceNovaImagem));
        }
        indiceNovaImagem += 1;
      }
    });

    return dados;
  }

  async function salvarCasaFinal(dados: FormData) {
    const resposta = await fetch("/api/properties/save", {
      body: dados,
      credentials: "same-origin",
      method: "POST",
    });
    const resultado = (await resposta.json().catch(() => null)) as
      | ResultadoSalvarPropriedade
      | null;

    if (resultado) return resultado;

    return {
      mensagem:
        "Nao foi possivel confirmar o salvamento da casa. Seus dados foram mantidos. Tente novamente.",
      sucesso: false,
    } satisfies ResultadoSalvarPropriedade;
  }

  return (
    <form
      className="flex min-h-full flex-col"
      data-bloquear-fechamento={salvando ? "true" : "false"}
      onChange={aoAlterarFormulario}
      onInput={aoAlterarFormulario}
      onSubmit={validarEnvio}
      ref={formRef}
    >
      <input name="operacaoId" type="hidden" value={operacaoId} />
      {propriedade ? (
        <input name="propriedadeId" type="hidden" value={propriedade.id} />
      ) : null}

      <div className="sticky top-0 z-20 border-b border-cyan-300/10 bg-card/95 px-5 py-5 backdrop-blur-xl sm:px-8">
        <WizardStepper
          etapaAtual={etapaAtual}
          etapas={ETAPAS}
          etapasComErro={etapasComErro}
          etapasConcluidas={etapasConcluidas}
          onEtapaClick={(indice) => navegarParaEtapa(indice)}
        />
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {estadoSincronizacao === "salvando" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-600" />
          ) : estadoSincronizacao === "aguardando" ||
            estadoSincronizacao === "falha" ? (
            <CloudOff className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <Cloud className="h-3.5 w-3.5 text-cyan-600" />
          )}
          {obterTextoSincronizacao(estadoSincronizacao)}
        </div>
      </div>

      <div className="flex-1 px-5 py-6 pb-32 sm:px-8 sm:pb-36">
        {erroServidor ? (
          <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {erroServidor}
          </p>
        ) : null}
        {resultadoSalvamento && !resultadoSalvamento.sucesso ? (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
            <p>{resultadoSalvamento.mensagem}</p>
            {resultadoSalvamento.codigoSuporte ? (
              <p className="mt-1 text-xs font-semibold">
                Codigo para suporte: {resultadoSalvamento.codigoSuporte}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {tipoFalha === "salvamento" ? (
                <ActionButton
                  icon={<RefreshCw className="h-4 w-4" />}
                  onClick={() => formRef.current?.requestSubmit()}
                  size="sm"
                  type="button"
                  variant="edit"
                >
                  Tentar novamente
                </ActionButton>
              ) : (
                <ActionButton
                  icon={<RefreshCw className="h-4 w-4" />}
                  onClick={() => void sincronizarRascunho()}
                  size="sm"
                  type="button"
                  variant="edit"
                >
                  Tentar sincronizar
                </ActionButton>
              )}
              <ActionButton
                icon={<Copy className="h-4 w-4" />}
                onClick={() => void copiarDetalhesSuporte()}
                size="sm"
                type="button"
                variant="view"
              >
                Copiar detalhes para o suporte
              </ActionButton>
              <ActionButton
                onClick={() => {
                  setResultadoSalvamento(null);
                  setTipoFalha(null);
                }}
                size="sm"
                type="button"
                variant="view"
              >
                Continuar editando
              </ActionButton>
              <ActionButton
                onClick={fecharWizard}
                size="sm"
                type="button"
                variant="view"
              >
                Ver rascunhos
              </ActionButton>
            </div>
          </div>
        ) : null}
        {conflitoRascunho ? (
          <div className="mb-4 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-3 text-sm">
            <p className="font-semibold">Escolha a versao que deseja manter.</p>
            <p className="mt-1 text-muted-foreground">
              Nenhuma versao sera sobrescrita sem sua confirmacao.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton
                onClick={() => escolherVersaoRascunho(conflitoRascunho.local)}
                size="sm"
                type="button"
                variant="view"
              >
                Usar versao deste dispositivo
              </ActionButton>
              <ActionButton
                onClick={() =>
                  escolherVersaoRascunho(conflitoRascunho.servidor)
                }
                size="sm"
                type="button"
                variant="edit"
              >
                Usar versao do servidor
              </ActionButton>
            </div>
          </div>
        ) : null}
        {avisoRascunho ? (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-3 py-3 text-sm text-cyan-50 sm:flex-row sm:items-center sm:justify-between">
            <p>{avisoRascunho}</p>
            <button
              className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 underline-offset-4 hover:underline sm:text-right"
              onClick={descartarRascunhoLocal}
              type="button"
            >
              Descartar rascunho
            </button>
          </div>
        ) : null}

        <section className="rounded-2xl border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_34%)] p-4 shadow-2xl shadow-cyan-950/10 sm:p-6">
          <div className="mb-6 flex items-start gap-4 border-b border-cyan-300/10 pb-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-500/15 text-cyan-700 shadow-lg shadow-cyan-950/20 dark:text-cyan-200 [&_svg]:h-6 [&_svg]:w-6">
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
              onStatusChange={setStatusSelecionado}
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
            <EtapaRegras
              disabled={!podeGerenciar}
              erros={errosCampos}
              regras={regras}
            />
          </div>

          <div hidden={etapa.id !== "imagens"}>
            <EtapaImagens
              capaRef={capaRef}
              disabled={!podeGerenciar}
              erroImagem={erroImagem}
              galeriaRef={galeriaRef}
              idsImagensRemovidas={idsImagensRemovidas}
              imagemCapaId={imagemCapaId}
              imagemCapaAtual={propriedade?.imagemCapa?.url ?? null}
              publicaSelecionada={publicaSelecionada}
              previewCapa={previewCapa}
              previewsGaleria={previewsGaleria}
              erros={errosCampos}
              atualizarTituloGaleria={atualizarTituloGaleria}
              definirPrincipalGaleria={definirPrincipalGaleria}
              reordenarGaleria={reordenarGaleria}
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
              onQuantidadeValidaChange={setQuantidadeComodidadesValidas}
              selecionadas={comodidadesSelecionadas}
            />
          </div>

          <div hidden={etapa.id !== "compartilhamento"}>
            <EtapaCompartilhamento
              detalhes={propriedade?.detalhesPublicos}
              disabled={!podeGerenciar}
              erros={errosCampos}
              imagemCapaUrl={imagemPrincipalSelecionada}
              propriedade={propriedade}
              quantidadeComodidadesValidas={quantidadeComodidadesValidas}
              publicaSelecionada={
                publicaSelecionada || statusSelecionado === "published"
              }
            />
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 z-30 flex flex-col gap-3 border-t border-cyan-300/10 bg-card/95 px-5 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton
            disabled={salvando}
            icon={<X className="h-4 w-4" />}
            onClick={fecharWizard}
            size="md"
            type="button"
            variant="cancel"
          >
            Cancelar
          </ActionButton>
          <ActionButton
            disabled={!podeGerenciar || salvando}
            icon={<Save className="h-4 w-4" />}
            onClick={() => void sincronizarRascunho()}
            size="md"
            type="button"
            variant="view"
          >
            Salvar rascunho
          </ActionButton>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <ActionButton
            disabled={etapaAtual === 0 || salvando}
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={voltarEtapa}
            size="md"
            type="button"
            variant="view"
          >
            Voltar
          </ActionButton>

          {!estaNaUltimaEtapa ? (
            <ActionButton
              disabled={!podeGerenciar || salvando}
              icon={<ArrowRight className="h-4 w-4" />}
              onClick={avancarEtapa}
              size="lg"
              type="button"
              variant="edit"
            >
              Próximo
            </ActionButton>
          ) : (
            <BotaoSalvarCasa
              bloqueado={bloqueado}
              modo={modo}
              salvando={salvando}
            />
          )}
        </div>
      </div>
    </form>
  );
}

function BotaoSalvarCasa({
  bloqueado,
  modo,
  salvando,
}: {
  bloqueado: boolean;
  modo: "criar" | "editar";
  salvando: boolean;
}) {
  return (
    <ActionButton
      disabled={bloqueado || salvando}
      icon={
        salvando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )
      }
      size="lg"
      type="submit"
      variant="add"
    >
      {salvando
        ? modo === "editar"
          ? "Salvando..."
          : "Criando..."
        : modo === "editar"
          ? "Salvar casa"
          : "Criar casa"}
    </ActionButton>
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
  onStatusChange,
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
  onStatusChange: (status: PropertyStatus) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={defaultNome}
          disabled={disabled}
          erro={erros.nome}
          ajuda="Nome usado apenas internamente no painel."
          label="Nome interno da casa"
          name="nome"
          obrigatorio
        />
        <CampoTexto
          defaultValue={defaultNomeExibicao}
          disabled={disabled}
          ajuda="Nome exibido na página pública e nos cards."
          label="Título público da hospedagem"
          name="nomeExibicao"
          placeholder="Casa do Lago em Manoel Ribas"
        />
        <CampoSelect
          defaultValue={defaultTipo}
          disabled={disabled}
          erro={erros.tipo}
          ajuda="Selecione o tipo da hospedagem."
          label="Tipo de hospedagem"
          name="tipo"
          obrigatorio
          options={TIPOS}
        />
      </div>
      <CampoTexto
        defaultValue={defaultDescricaoCurta}
        disabled={disabled}
        erro={erros.descricaoCurta}
        ajuda="Resumo rápido que aparece nos cards e listagens."
        label="Descrição curta"
        name="descricaoCurta"
        obrigatorio
        placeholder="Casa aconchegante com vista para o lago."
      />
      <CampoArea
        defaultValue={defaultDescricaoCompleta}
        disabled={disabled}
        ajuda="Descrição detalhada da hospedagem para a página pública."
        label="Descrição completa"
        name="descricaoCompleta"
        placeholder="Descreva a experiência completa da casa."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <CampoStatusSegmentado
          defaultValue={defaultStatus}
          disabled={disabled}
          label="Status"
          name="status"
          onChange={onStatusChange}
          options={STATUS}
        />
        <CampoCheckbox
          defaultChecked={defaultPublica}
          disabled={disabled}
          label="Visibilidade pública"
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

function CampoStatusSegmentado({
  defaultValue,
  disabled,
  label,
  name,
  onChange,
  options,
}: {
  defaultValue: PropertyStatus;
  disabled: boolean;
  label: string;
  name: string;
  onChange?: (valor: PropertyStatus) => void;
  options: Array<{ label: string; valor: PropertyStatus }>;
}) {
  const [valorAtual, setValorAtual] = useState(defaultValue);

  return (
    <div className="grid gap-2 md:col-span-2">
      <LabelCampo>{label}</LabelCampo>
      <div className="grid overflow-hidden rounded-xl border bg-background/60 p-1 sm:grid-cols-3">
        {options.map((option) => (
          <label
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition",
              valorAtual === option.valor &&
                "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-300/40",
              disabled && "cursor-not-allowed opacity-60",
            )}
            key={option.valor}
          >
            <input
              checked={valorAtual === option.valor}
              className="sr-only"
              disabled={disabled}
              name={name}
              onChange={() => {
                setValorAtual(option.valor);
                onChange?.(option.valor);
              }}
              type="radio"
              value={option.valor}
            />
            {option.label}
            {valorAtual === option.valor ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : null}
          </label>
        ))}
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
          label="Endereço"
          name="endereco"
          obrigatorio
          placeholder="Rua das Palmeiras"
        />
        <CampoTexto
          defaultValue={endereco?.numero}
          disabled={disabled}
          label="Número"
          name="numero"
          placeholder="123"
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
          placeholder="Manoel Ribas"
        />
        <CampoSelect
          defaultValue={endereco?.estado || "PR"}
          disabled={disabled}
          erro={erros.estado}
          label="Estado"
          name="estado"
          obrigatorio
          options={UFS}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <CampoTexto
          defaultValue={endereco?.cep}
          disabled={disabled}
          label="CEP"
          maxLength={9}
          name="cep"
          placeholder="85260-000"
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
          label="Referência"
          name="referencia"
          placeholder="Próximo ao mercado X"
        />
      </div>
      <CampoTexto
        defaultValue={endereco?.googleMapsLink}
        disabled={disabled}
        erro={erros.googleMapsLink}
        label="Link do Google Maps"
        name="googleMapsLink"
        placeholder="Cole o link da localização da casa no Google Maps."
        type="url"
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
        <CampoContador
          defaultValue={estrutura?.hospedesMaximos ?? 1}
          disabled={disabled}
          erro={erros.hospedesMaximos}
          label="Capacidade máxima de hóspedes"
          min={1}
          name="hospedesMaximos"
          obrigatorio
        />
        <CampoContador
          defaultValue={estrutura?.quartos ?? 1}
          disabled={disabled}
          erro={erros.quartosCasa}
          label="Quartos"
          min={1}
          name="quartosCasa"
          obrigatorio
        />
        <CampoContador
          defaultValue={estrutura?.camas ?? 1}
          disabled={disabled}
          erro={erros.camasCasa}
          label="Camas"
          min={1}
          name="camasCasa"
        />
        <CampoContador
          defaultValue={estrutura?.banheiros ?? 1}
          disabled={disabled}
          erro={erros.banheirosCasa}
          label="Banheiros"
          min={1}
          name="banheirosCasa"
          obrigatorio
        />
        <CampoContador
          defaultValue={estrutura?.garagemVagas ?? 0}
          disabled={disabled}
          erro={erros.garagemVagas}
          label="Garagem / vagas"
          min={0}
          name="garagemVagas"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <CampoCheckbox
          defaultChecked={estrutura?.areaExterna ?? false}
          disabled={disabled}
          label="Área externa"
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
          label="Valor da diária"
          name="valorDiaria"
          obrigatorio
          placeholder="R$ 450,00"
        />
        <CampoMoeda
          defaultValue={valores?.taxaLimpeza ?? 0}
          disabled={disabled}
          erro={erros.taxaLimpeza}
          label="Taxa de limpeza"
          name="taxaLimpeza"
        />
        <CampoMoeda
          defaultValue={valores?.caucao ?? 0}
          disabled={disabled}
          label="Caução / depósito"
          erro={erros.caucao}
          name="caucao"
          placeholder="R$ 300,00"
        />
        <CampoMoeda
          defaultValue={valores?.valorHospedeExtra ?? 0}
          disabled={disabled}
          label="Valor por hóspede extra"
          erro={erros.valorHospedeExtra}
          name="valorHospedeExtra"
          placeholder="R$ 150,00"
        />
        <CampoSelect
          defaultValue={valores?.tipoCobrancaHospedeExtra ?? "per_stay"}
          disabled={disabled}
          label="Cobrança do hóspede extra"
          name="tipoCobrancaHospedeExtra"
          options={[{ label: "Por reserva", valor: "per_stay" }]}
        />
      </div>
      <CampoCheckbox
        defaultChecked={valores?.cobraHospedeExtra ?? false}
        disabled={disabled}
        label="Cobrar hóspede extra?"
        name="cobraHospedeExtra"
      />
      <p className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-3 text-sm text-muted-foreground">
        O valor extra será cobrado somente quando a reserva ultrapassar a
        capacidade máxima da casa.
      </p>

      <section className="grid gap-4 rounded-xl border bg-background/45 p-4">
        <div>
          <h4 className="font-semibold">Pagamento da hospedagem</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure apenas os métodos aceitos pelo proprietário. Não salve
            dados de cartão, tokens ou senhas.
          </p>
        </div>

        {!possuiPagamentoAtivo ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-900 dark:text-amber-100">
            Nenhuma forma de pagamento foi configurada. O hóspede não verá
            opções de pagamento no Marketplace.
          </p>
        ) : null}

        <div className="grid gap-3">
          <CartaoFormaPagamento
            ativo={pixAtivo}
            descricao="Usa os dados de Pix cadastrados nas Configurações do proprietário."
            disabled={disabled}
            icon={<Smartphone className="h-4 w-4" />}
            label="Pix"
            name="pagamentoPixAtivo"
            onChange={setPixAtivo}
          >
            <AvisoDadosPagamentoTenant metodo="Pix" />
          </CartaoFormaPagamento>

          <CartaoFormaPagamento
            ativo={dinheiroAtivo}
            descricao="Usa a instrução global cadastrada nas Configurações."
            disabled={disabled}
            icon={<Banknote className="h-4 w-4" />}
            label="Dinheiro"
            name="pagamentoDinheiroAtivo"
            onChange={setDinheiroAtivo}
          >
            <AvisoDadosPagamentoTenant metodo="dinheiro" />
          </CartaoFormaPagamento>

          <CartaoFormaPagamento
            ativo={cartaoDebitoAtivo}
            descricao="Usa a instrução global sem coletar dados de cartão."
            disabled={disabled}
            icon={<CreditCard className="h-4 w-4" />}
            label="Cartão de débito"
            name="pagamentoCartaoDebitoAtivo"
            onChange={setCartaoDebitoAtivo}
          >
            <AvisoDadosPagamentoTenant metodo="cartão de débito" />
          </CartaoFormaPagamento>

          <CartaoFormaPagamento
            ativo={aceitaCartaoCredito}
            descricao="A casa define parcelas e juros; os dados de recebimento ficam nas Configurações."
            disabled={disabled}
            icon={<CreditCard className="h-4 w-4" />}
            label="Cartão de crédito"
            name="aceitaCartaoCredito"
            onChange={setAceitaCartaoCredito}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <CampoNumero
                disabled={disabled || !aceitaCartaoCredito}
                erro={erros.maxParcelasCartao}
                label="Quantidade máxima de parcelas"
                max={MAX_PARCELAS_CARTAO}
                min={1}
                name="maxParcelasCartao"
                obrigatorio={aceitaCartaoCredito}
                onChange={(evento) =>
                  alterarMaxParcelasCartao(evento.currentTarget.value)
                }
                value={maxParcelasCartao}
              />
              <AvisoDadosPagamentoTenant metodo="cartão de crédito" />
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
                    <span className="text-right">Ação</span>
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
                  eyebrow="Cartão de crédito"
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
            descricao="Usa os dados globais de transferência cadastrados nas Configurações."
            disabled={disabled}
            icon={<Landmark className="h-4 w-4" />}
            label="Transferência bancária"
            name="pagamentoTransferenciaAtivo"
            onChange={setTransferenciaAtiva}
          >
            <AvisoDadosPagamentoTenant metodo="transferência bancária" />
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

function AvisoDadosPagamentoTenant({ metodo }: { metodo: string }) {
  return (
    <p className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-3 text-sm leading-6 text-muted-foreground">
      Os dados de {metodo} são cadastrados uma vez em Configurações do
      proprietário. Nesta casa, marque apenas se essa forma de pagamento será
      aceita.
    </p>
  );
}

function EtapaRegras({
  disabled,
  erros,
  regras,
}: {
  disabled: boolean;
  erros: ErrosFormularioCasa;
  regras?: PropriedadeComRelacionamentos["regras"] | undefined;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto
          defaultValue={normalizarHoraInput(regras?.check_in_time)}
          disabled={disabled}
          label="Horário de check-in"
          erro={erros.checkInTime}
          name="checkInTime"
          type="time"
        />
        <CampoTexto
          defaultValue={normalizarHoraInput(regras?.check_out_time)}
          disabled={disabled}
          label="Horário de check-out"
          erro={erros.checkOutTime}
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
          label="Aceita crianças"
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
        label="Instruções especiais"
        name="specialInstructions"
        placeholder="Informações que poderão ser apresentadas ao hóspede."
      />
      <CampoArea
        defaultValue={regras?.internal_notes ?? ""}
        disabled={disabled}
        label="Observações internas"
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
  imagemCapaUrl,
  propriedade,
  quantidadeComodidadesValidas,
  publicaSelecionada,
}: {
  detalhes?: PropriedadeComRelacionamentos["detalhesPublicos"] | undefined;
  disabled: boolean;
  erros: ErrosFormularioCasa;
  imagemCapaUrl: string | null;
  propriedade?: PropriedadeComRelacionamentos | undefined;
  quantidadeComodidadesValidas: number;
  publicaSelecionada: boolean;
}) {
  const titulo =
    detalhes?.tituloPublico || propriedade?.name || "Título público da casa";
  const cidade = propriedade?.enderecoFormatado?.cidade;
  const estado = propriedade?.enderecoFormatado?.estado;
  const estrutura = propriedade?.estrutura;
  const valorDiaria = propriedade?.valores?.valorDiaria ?? 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <div className="grid gap-4">
        <p className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-3 text-sm text-muted-foreground">
          Revise os dados públicos antes de salvar ou publicar a casa.
        </p>
        {publicaSelecionada && quantidadeComodidadesValidas === 0 ? (
          <p className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 text-sm text-amber-100">
            <strong className="block text-foreground">
              Comodidades pendentes
            </strong>
            Adicione pelo menos uma comodidade antes de publicar esta casa.
          </p>
        ) : null}
        <CampoTexto
          defaultValue={detalhes?.tituloPublico}
          disabled={disabled}
          erro={erros.tituloPublico}
          label="Título público"
          name="tituloPublico"
          obrigatorio={publicaSelecionada}
        />
        <CampoArea
          defaultValue={detalhes?.descricaoPublica}
          disabled={disabled}
          erro={erros.descricaoPublica}
          ajuda="Resumo que será usado na página pública da hospedagem."
          label="Descrição pública"
          name="descricaoPublica"
          obrigatorio={publicaSelecionada}
        />
        <CampoTexto
          defaultValue={detalhes?.imagemCompartilhamento}
          disabled={disabled}
          label="Imagem de compartilhamento"
          erro={erros.imagemCompartilhamento}
          name="imagemCompartilhamento"
          placeholder="https://..."
          type="url"
        />
      </div>

      <aside className="overflow-hidden rounded-2xl border border-cyan-300/15 bg-background/55">
        <div className="relative h-48 bg-cyan-950/40">
          {imagemCapaUrl ? (
            <img
              alt={titulo}
              className="h-full w-full object-cover"
              src={imagemCapaUrl}
            />
          ) : (
            <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
              <div>
                <ImagePlus className="mx-auto h-8 w-8 text-cyan-300" />
                <p className="mt-2">Adicione uma imagem de capa.</p>
              </div>
            </div>
          )}
          <span className="absolute right-3 top-3 rounded-full bg-cyan-500 px-3 py-1 text-xs font-bold text-cyan-950">
            Prévia
          </span>
        </div>
        <div className="grid gap-3 p-4">
          <h4 className="text-lg font-semibold">{titulo}</h4>
          <p className="text-sm text-muted-foreground">
            {[cidade, estado].filter(Boolean).join(" / ") ||
              "Localização ainda não informada"}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{estrutura?.hospedesMaximos ?? 0} hóspedes</span>
            <span>{estrutura?.quartos ?? 0} quartos</span>
            <span>{estrutura?.banheiros ?? 0} banheiros</span>
          </div>
          <p className="border-t border-cyan-300/10 pt-3 text-sm text-muted-foreground">
            A partir de{" "}
            <strong className="text-xl text-foreground">
              {new Intl.NumberFormat("pt-BR", {
                currency: "BRL",
                style: "currency",
              }).format(valorDiaria)}
            </strong>
            /noite
          </p>
        </div>
      </aside>
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
  idsImagensRemovidas,
  imagemCapaId,
  imagemCapaAtual,
  previewCapa,
  previewsGaleria,
  publicaSelecionada,
  reordenarGaleria,
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
  idsImagensRemovidas: string[];
  imagemCapaId: string | null;
  imagemCapaAtual: string | null;
  previewCapa: string | null;
  previewsGaleria: PreviewGaleria[];
  publicaSelecionada: boolean;
  reordenarGaleria: (indiceAtual: number, indiceDestino: number) => void;
  removerGaleria: (indice: number) => void;
  selecionarCapa: (arquivo?: File) => void;
  selecionarGaleria: (arquivos: FileList | null) => void;
  totalImagensAtuais: number;
}) {
  const [indiceArrastado, setIndiceArrastado] = useState<number | null>(null);
  const imagemPrincipal =
    previewCapa ??
    previewsGaleria.find((preview) => preview.principal)?.url ??
    imagemCapaAtual;
  const possuiPrincipalExistente = previewsGaleria.some(
    (preview) => preview.origem === "existente" && preview.principal,
  );

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
          label="Galeria com múltiplas fotos"
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
        {imagemCapaId ? (
          <input name="imagemCapaId" type="hidden" value={imagemCapaId} />
        ) : null}
        {possuiPrincipalExistente ? (
          <input name="possuiImagemPrincipalAtual" type="hidden" value="true" />
        ) : null}
        {idsImagensRemovidas.map((imagemId) => (
          <input
            key={imagemId}
            name="imagensExistentesRemovidasIds"
            readOnly
            type="hidden"
            value={imagemId}
          />
        ))}
        {imagemPrincipal ? (
          <PreviewImagem
            titulo={
              previewCapa ? "Nova imagem principal" : "Imagem principal atual"
            }
            url={imagemPrincipal}
          />
        ) : null}
        <div className="rounded-xl border bg-background/45 p-3">
          <p className="mb-3 text-sm font-semibold">Galeria da hospedagem</p>
          <p className="-mt-2 mb-3 text-xs text-muted-foreground">
            Visualize as fotos salvas, adicione novas imagens e arraste os cards
            para definir a ordem pública.
          </p>
          {previewsGaleria.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {previewsGaleria.map((preview, indice) => {
                const indiceNovaGaleria = previewsGaleria
                  .slice(0, indice)
                  .filter((item) => item.origem === "nova").length;
                const arrastando = indiceArrastado === indice;

                return (
                  <div
                    className={cn(
                      "grid gap-3 overflow-hidden rounded-lg border bg-background/55 p-3 transition",
                      !disabled &&
                        "cursor-grab hover:bg-cyan-300/5 active:cursor-grabbing",
                      arrastando &&
                        "border-cyan-300/60 bg-cyan-300/10 opacity-80",
                    )}
                    draggable={!disabled}
                    key={preview.id}
                    onDragEnd={() => setIndiceArrastado(null)}
                    onDragOver={(evento) => evento.preventDefault()}
                    onDragStart={() => setIndiceArrastado(indice)}
                    onDrop={(evento) => {
                      evento.preventDefault();
                      if (indiceArrastado !== null) {
                        reordenarGaleria(indiceArrastado, indice);
                      }
                      setIndiceArrastado(null);
                    }}
                  >
                    {preview.origem === "existente" && preview.existenteId ? (
                      <>
                        <input
                          name="imagensExistentesIds"
                          readOnly
                          type="hidden"
                          value={preview.existenteId}
                        />
                        <input
                          name="titulosImagensExistentes"
                          readOnly
                          type="hidden"
                          value={preview.titulo}
                        />
                        <input
                          name="ordensImagensExistentes"
                          readOnly
                          type="hidden"
                          value={preview.ordem}
                        />
                        {preview.principal ? (
                          <input
                            name="imagemPrincipalExistenteId"
                            readOnly
                            type="hidden"
                            value={preview.existenteId}
                          />
                        ) : null}
                      </>
                    ) : (
                      <>
                        <input
                          name="galeriaArquivoIds"
                          readOnly
                          type="hidden"
                          value={preview.id}
                        />
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
                            value={indiceNovaGaleria}
                          />
                        ) : null}
                      </>
                    )}

                    <div className="relative overflow-hidden rounded-lg">
                      {preview.url ? (
                        <img
                          alt={preview.titulo || preview.nome}
                          className="h-28 w-full object-cover"
                          src={preview.url}
                        />
                      ) : (
                        <div className="grid h-28 place-items-center border border-dashed text-xs text-muted-foreground">
                          Sem prévia
                        </div>
                      )}
                      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2 py-1 text-[0.68rem] font-semibold text-white backdrop-blur">
                        <GripVertical className="h-3.5 w-3.5" />
                        Arrastar
                      </div>
                      {preview.principal ? (
                        <span className="absolute right-2 top-2 rounded-full bg-cyan-300 px-2 py-1 text-[0.68rem] font-bold text-slate-950">
                          Principal
                        </span>
                      ) : null}
                    </div>
                    <CampoTexto
                      disabled={disabled}
                      label="Nome/título da foto"
                      name={`tituloGaleriaVisual${indice}`}
                      onChange={(evento) =>
                        atualizarTituloGaleria(
                          indice,
                          evento.currentTarget.value,
                        )
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
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-28 place-items-center rounded-xl border border-dashed p-4 text-center">
              <div>
                <ImagePlus className="mx-auto h-6 w-6 text-cyan-600" />
                <p className="mt-2 text-sm font-medium">
                  {idsImagensRemovidas.length
                    ? "Todas as fotos foram marcadas para remoção"
                    : totalImagensAtuais
                      ? `${totalImagensAtuais} foto(s) já cadastrada(s)`
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
  ajuda?: string | undefined;
  erro?: string | undefined;
  label: string;
  name: string;
  obrigatorio?: boolean;
};

function CampoTexto({
  ajuda,
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
      {ajuda ? (
        <p className="-mt-1 text-xs text-muted-foreground">{ajuda}</p>
      ) : null}
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

function CampoContador({
  defaultValue,
  disabled,
  erro,
  label,
  max,
  min = 0,
  name,
  obrigatorio,
}: CampoTextoProps) {
  const minimo = typeof min === "number" ? min : Number(min ?? 0);
  const maximo = typeof max === "number" ? max : undefined;
  const [valor, setValor] = useState(() => {
    const inicial = Number(defaultValue ?? minimo);
    return Number.isFinite(inicial) ? Math.max(inicial, minimo) : minimo;
  });
  const erroId = erro ? `${name}-erro` : undefined;

  function atualizarValor(novoValor: number) {
    const limitado = Math.max(
      minimo,
      maximo ? Math.min(novoValor, maximo) : novoValor,
    );
    setValor(limitado);
  }

  return (
    <div className="grid gap-2">
      <LabelCampo htmlFor={name} obrigatorio={obrigatorio}>
        {label}
      </LabelCampo>
      <div
        className={cn(
          "grid h-11 grid-cols-[2.75rem_1fr_2.75rem] overflow-hidden rounded-xl border bg-background/70 shadow-sm",
          erro && "border-destructive/70 bg-destructive/5",
        )}
      >
        <button
          aria-label={`Diminuir ${label}`}
          className="grid place-items-center border-r text-muted-foreground transition hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled || valor <= minimo}
          onClick={() => atualizarValor(valor - 1)}
          type="button"
        >
          <Minus className="h-4 w-4" />
        </button>
        <Input
          aria-describedby={erroId}
          aria-invalid={Boolean(erro)}
          className="h-full rounded-none border-0 bg-transparent text-center font-semibold shadow-none focus-visible:ring-0"
          disabled={disabled}
          id={name}
          min={minimo}
          name={name}
          onChange={(evento) =>
            atualizarValor(Number(evento.currentTarget.value || minimo))
          }
          type="number"
          value={valor}
        />
        <button
          aria-label={`Aumentar ${label}`}
          className="grid place-items-center border-l text-muted-foreground transition hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled || (maximo ? valor >= maximo : false)}
          onClick={() => atualizarValor(valor + 1)}
          type="button"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {erro ? (
        <p className="text-xs font-medium text-destructive" id={erroId}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}

function CampoMoeda(props: CampoTextoProps) {
  return (
    <CampoTexto
      {...props}
      inputMode="decimal"
      min={0}
      placeholder="R$ 0,00"
      step="0.01"
      type="number"
    />
  );
}

function CampoArea({
  ajuda,
  className,
  erro,
  label,
  name,
  obrigatorio,
  ...props
}: {
  ajuda?: string | undefined;
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
      {ajuda ? (
        <p className="-mt-1 text-xs text-muted-foreground">{ajuda}</p>
      ) : null}
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
  ajuda,
  defaultValue,
  disabled,
  erro,
  label,
  name,
  obrigatorio,
  options,
}: {
  ajuda?: string | undefined;
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
      {ajuda ? (
        <p className="-mt-1 text-xs text-muted-foreground">{ajuda}</p>
      ) : null}
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
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-background/45 px-3 py-3 text-sm transition hover:border-cyan-300/35 hover:bg-cyan-500/5">
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
