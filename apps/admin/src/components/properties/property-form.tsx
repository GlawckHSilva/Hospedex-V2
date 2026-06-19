"use client";

import type { AmenityRow, PropertyStatus, PropertyType } from "@hospedex/types";
import {
  BedDouble,
  Camera,
  Clock3,
  CreditCard,
  Home,
  ImagePlus,
  MapPin,
  Plus,
  Sparkles,
  Star,
  Trash2,
  WalletCards,
} from "lucide-react";
import type { ComponentProps, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import { Input, Label, cn } from "@hospedex/ui";

import { ActionButton } from "../management/action-button";
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
 * owner, plano, multiunidade e permissoes continuam validados na server action.
 */
export type PropertyFormProps = {
  comodidadesDisponiveis: AmenityRow[];
  modo: "criar" | "editar";
  multiUnidadesAtivo: boolean;
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
  | "comodidades";

const ETAPAS: Array<{ icon: ReactNode; id: EtapaId; label: string }> = [
  { icon: <Home />, id: "basico", label: "Basico" },
  { icon: <MapPin />, id: "localizacao", label: "Localizacao" },
  { icon: <BedDouble />, id: "estrutura", label: "Estrutura" },
  { icon: <WalletCards />, id: "valores", label: "Valores" },
  { icon: <Clock3 />, id: "regras", label: "Regras" },
  { icon: <Camera />, id: "imagens", label: "Imagens" },
  { icon: <Sparkles />, id: "comodidades", label: "Comodidades" },
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

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const MAX_PARCELAS_CARTAO = 12;

type PreviewGaleria = {
  id: string;
  nome: string;
  ordem: number;
  principal: boolean;
  titulo: string;
  url: string;
};

function criarPreviewGaleria(arquivo: File, ordem: number, principal: boolean): PreviewGaleria {
  return {
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

export function PropertyForm({
  comodidadesDisponiveis,
  modo,
  multiUnidadesAtivo,
  podeGerenciar,
  propriedade,
}: PropertyFormProps) {
  const action = modo === "editar" ? atualizarPropriedadeAction : criarPropriedadeAction;
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [erroImagem, setErroImagem] = useState<string | null>(null);
  const [previewCapa, setPreviewCapa] = useState<string | null>(null);
  const [previewsGaleria, setPreviewsGaleria] = useState<PreviewGaleria[]>([]);
  const capaRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const arquivosGaleriaRef = useRef<File[]>([]);
  const previewCapaRef = useRef<string | null>(null);
  const previewsGaleriaRef = useRef<PreviewGaleria[]>([]);
  const endereco = propriedade?.enderecoFormatado;
  const estrutura = propriedade?.estrutura;
  const valores = propriedade?.valores;
  const regras = propriedade?.regras;
  const unidadeCasa = propriedade?.unidades[0];
  const comodidadesSelecionadas = new Set(propriedade?.comodidades.map((item) => item.id) ?? []);
  const bloqueado = !podeGerenciar || Boolean(erroImagem);
  const etapa = ETAPAS[etapaAtual] ?? ETAPAS[0]!;

  useEffect(() => {
    previewCapaRef.current = previewCapa;
  }, [previewCapa]);

  useEffect(() => {
    previewsGaleriaRef.current = previewsGaleria;
  }, [previewsGaleria]);

  useEffect(() => {
    return () => {
      if (previewCapaRef.current) URL.revokeObjectURL(previewCapaRef.current);
      previewsGaleriaRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
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

    const erro = novasImagens.map((arquivo) => validarImagem(arquivo)).find(Boolean) ?? null;
    setErroImagem(erro);

    if (erro) {
      sincronizarArquivosGaleria(arquivosGaleriaRef.current);
      return;
    }

    // O input file do navegador substitui a selecao a cada upload.
    // A ref preserva a colecao real para que novas fotos sejam adicionadas sem apagar as anteriores.
    sincronizarArquivosGaleria([...arquivosGaleriaRef.current, ...novasImagens]);

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

      return normalizarGaleria(previewsAtuais.filter((_, indice) => indice !== indiceRemovido));
    });

    sincronizarArquivosGaleria(arquivosGaleriaRef.current.filter((_, indice) => indice !== indiceRemovido));
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

  return (
    <form action={action} className="space-y-5">
      {propriedade ? <input name="propriedadeId" type="hidden" value={propriedade.id} /> : null}

      <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ETAPAS.map((item, indice) => (
          <button
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition [&_svg]:h-4 [&_svg]:w-4",
              indice === etapaAtual
                ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-700 dark:text-cyan-200"
                : "bg-background/45 text-muted-foreground hover:border-cyan-300/40 hover:text-foreground",
            )}
            key={item.id}
            onClick={() => setEtapaAtual(indice)}
            type="button"
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <section className="rounded-2xl border bg-background/45 p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-200 [&_svg]:h-4 [&_svg]:w-4">
            {etapa.icon}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
              Etapa {etapaAtual + 1} de {ETAPAS.length}
            </p>
            <h3 className="font-semibold">{etapa.label}</h3>
          </div>
        </div>

        {/*
          Mantemos todas as etapas montadas para que o FormData envie todos os
          campos ao salvar. A troca visual ocorre com hidden, sem formulários
          duplicados ou perda de dados entre abas da modal.
        */}
        <div hidden={etapa.id !== "basico"}>
          <EtapaBasico
            defaultDescricaoCompleta={propriedade?.full_description ?? propriedade?.description ?? ""}
            defaultDescricaoCurta={propriedade?.short_description ?? propriedade?.headline ?? ""}
            defaultDestaque={propriedade?.marketplace_featured ?? false}
            defaultNome={propriedade?.name}
            defaultPublica={propriedade?.is_public ?? false}
            defaultStatus={propriedade?.status ?? "draft"}
            defaultTipo={propriedade?.property_type ?? "seasonal_home"}
            disabled={!podeGerenciar}
          />
        </div>

        <div hidden={etapa.id !== "localizacao"}>
          <EtapaLocalizacao endereco={endereco} disabled={!podeGerenciar} />
        </div>

        <div hidden={etapa.id !== "estrutura"}>
          <EtapaEstrutura
            disabled={!podeGerenciar}
            estrutura={estrutura}
            multiUnidadesAtivo={multiUnidadesAtivo}
            unidadeCasa={unidadeCasa}
          />
        </div>

        <div hidden={etapa.id !== "valores"}>
          <EtapaValores disabled={!podeGerenciar} unidadeCasa={unidadeCasa} valores={valores} />
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
            previewCapa={previewCapa}
            previewsGaleria={previewsGaleria}
            atualizarTituloGaleria={atualizarTituloGaleria}
            definirPrincipalGaleria={definirPrincipalGaleria}
            removerGaleria={removerGaleria}
            selecionarCapa={selecionarCapa}
            selecionarGaleria={selecionarGaleria}
          />
        </div>

        <div hidden={etapa.id !== "comodidades"}>
          <EtapaComodidades
            comodidades={comodidadesDisponiveis}
            disabled={!podeGerenciar}
            selecionadas={comodidadesSelecionadas}
          />
        </div>
      </section>

      <div className="flex justify-end border-t pt-4">
        <ActionButton disabled={bloqueado} size="lg" type="submit" variant="add">
          {modo === "editar" ? "Salvar casa" : "Criar casa"}
        </ActionButton>
      </div>
    </form>
  );
}

function EtapaBasico({
  defaultDescricaoCompleta,
  defaultDescricaoCurta,
  defaultDestaque,
  defaultNome,
  defaultPublica,
  defaultStatus,
  defaultTipo,
  disabled,
}: {
  defaultDescricaoCompleta: string;
  defaultDescricaoCurta: string;
  defaultDestaque: boolean;
  defaultNome?: string | undefined;
  defaultPublica: boolean;
  defaultStatus: PropertyStatus;
  defaultTipo: PropertyType;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CampoTexto defaultValue={defaultNome} disabled={disabled} label="Nome da casa" name="nome" />
        <CampoSelect defaultValue={defaultTipo} disabled={disabled} label="Tipo" name="tipo" options={TIPOS} />
      </div>
      <CampoTexto
        defaultValue={defaultDescricaoCurta}
        disabled={disabled}
        label="Descricao curta"
        name="descricaoCurta"
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
        <CampoSelect defaultValue={defaultStatus} disabled={disabled} label="Status" name="status" options={STATUS} />
        <CampoCheckbox defaultChecked={defaultPublica} disabled={disabled} label="Visibilidade publica" name="visibilidadePublica" />
        <CampoCheckbox defaultChecked={defaultDestaque} disabled={disabled} label="Destaque no marketplace" name="destaqueMarketplace" />
      </div>
    </div>
  );
}

function EtapaLocalizacao({
  disabled,
  endereco,
}: {
  disabled: boolean;
  endereco?: PropriedadeComRelacionamentos["enderecoFormatado"] | undefined;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-[1.4fr_0.5fr]">
        <CampoTexto defaultValue={endereco?.linha1} disabled={disabled} label="Endereco" name="endereco" />
        <CampoTexto defaultValue={endereco?.numero} disabled={disabled} label="Numero" name="numero" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <CampoTexto defaultValue={endereco?.bairro} disabled={disabled} label="Bairro" name="bairro" />
        <CampoTexto defaultValue={endereco?.cidade} disabled={disabled} label="Cidade" name="cidade" />
        <CampoTexto defaultValue={endereco?.estado} disabled={disabled} label="Estado" maxLength={2} name="estado" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <CampoTexto defaultValue={endereco?.cep} disabled={disabled} label="CEP" name="cep" />
        <CampoTexto defaultValue={endereco?.complemento} disabled={disabled} label="Complemento" name="complemento" />
        <CampoTexto defaultValue={endereco?.referencia} disabled={disabled} label="Referencia" name="referencia" />
      </div>
      <CampoTexto
        defaultValue={endereco?.googleMapsLink}
        disabled={disabled}
        label="Link do Google Maps"
        name="googleMapsLink"
        placeholder="URL do Google Maps, link encurtado ou coordenadas futuramente."
      />
    </div>
  );
}

function EtapaEstrutura({
  disabled,
  estrutura,
  multiUnidadesAtivo,
  unidadeCasa,
}: {
  disabled: boolean;
  estrutura?: PropriedadeComRelacionamentos["estrutura"] | undefined;
  multiUnidadesAtivo: boolean;
  unidadeCasa?: PropriedadeComRelacionamentos["unidades"][number] | undefined;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <CampoNumero defaultValue={estrutura?.hospedesMaximos ?? unidadeCasa?.capacity ?? 1} disabled={disabled} label="Quantidade maxima de hospedes" min={1} name="hospedesMaximos" />
        <CampoNumero defaultValue={estrutura?.quartos ?? unidadeCasa?.bedrooms ?? 0} disabled={disabled} label="Quartos" min={0} name="quartosCasa" />
        <CampoNumero defaultValue={estrutura?.camas ?? unidadeCasa?.beds ?? 1} disabled={disabled} label="Camas" min={1} name="camasCasa" />
        <CampoNumero defaultValue={estrutura?.banheiros ?? unidadeCasa?.bathrooms ?? 0} disabled={disabled} label="Banheiros" min={0} name="banheirosCasa" />
        <CampoNumero defaultValue={estrutura?.garagemVagas ?? 0} disabled={disabled} label="Garagem/vagas" min={0} name="garagemVagas" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <CampoCheckbox defaultChecked={estrutura?.areaExterna ?? false} disabled={disabled} label="Area externa" name="areaExterna" />
        <CampoCheckbox defaultChecked={estrutura?.piscina ?? false} disabled={disabled} label="Piscina" name="piscina" />
        <CampoCheckbox defaultChecked={estrutura?.churrasqueira ?? false} disabled={disabled} label="Churrasqueira" name="churrasqueira" />
      </div>
      {!multiUnidadesAtivo ? (
        <p className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-3 text-sm text-muted-foreground">
          Como multiunidades esta desligado, estes dados atualizam a unidade interna "Casa inteira".
        </p>
      ) : null}
    </div>
  );
}

function EtapaValores({
  disabled,
  unidadeCasa,
  valores,
}: {
  disabled: boolean;
  unidadeCasa?: PropriedadeComRelacionamentos["unidades"][number] | undefined;
  valores?: PropriedadeComRelacionamentos["valores"] | undefined;
}) {
  const [aceitaCartaoCredito, setAceitaCartaoCredito] = useState(
    valores?.aceitaCartaoCredito ?? false,
  );
  const [maxParcelasCartao, setMaxParcelasCartao] = useState(
    Math.min(valores?.maxParcelasCartao ?? 1, MAX_PARCELAS_CARTAO),
  );
  const jurosPorParcela = new Map(
    (valores?.jurosParcelasCartao ?? []).map((item) => [
      item.parcela,
      item.jurosPercentual,
    ]),
  );

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <CampoMoeda defaultValue={valores?.valorDiaria ?? unidadeCasa?.base_price ?? 0} disabled={disabled} label="Valor da diaria" name="valorDiaria" />
        <CampoMoeda defaultValue={valores?.taxaLimpeza ?? 0} disabled={disabled} label="Taxa de limpeza" name="taxaLimpeza" />
        <CampoMoeda defaultValue={valores?.caucao ?? 0} disabled={disabled} label="Caucao" name="caucao" />
        <CampoMoeda defaultValue={valores?.valorHospedeExtra ?? 0} disabled={disabled} label="Valor por hospede extra" name="valorHospedeExtra" />
        <CampoNumero defaultValue={valores?.hospedesInclusos ?? 1} disabled={disabled} label="Hospedes inclusos no valor base" min={1} name="hospedesInclusos" />
      </div>

      <section className="rounded-xl border bg-background/45 p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-cyan-200">
            <CreditCard className="h-4 w-4" />
          </span>
          <div>
            <h4 className="font-semibold">Cartao de credito</h4>
            <p className="text-sm text-muted-foreground">
              Estrutura preparada para pagamento futuro, sem gateway nesta etapa.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border bg-background/55 px-3 py-2 text-sm">
            <input
              checked={aceitaCartaoCredito}
              disabled={disabled}
              name="aceitaCartaoCredito"
              onChange={(evento) => setAceitaCartaoCredito(evento.currentTarget.checked)}
              type="checkbox"
            />
            Aceita cartao de credito
          </label>

          <CampoNumero
            disabled={disabled || !aceitaCartaoCredito}
            label="Quantidade maxima de parcelas"
            max={MAX_PARCELAS_CARTAO}
            min={1}
            name="maxParcelasCartao"
            onChange={(evento) =>
              setMaxParcelasCartao(
                Math.min(
                  Math.max(Number.parseInt(evento.currentTarget.value || "1", 10), 1),
                  MAX_PARCELAS_CARTAO,
                ),
              )
            }
            value={maxParcelasCartao}
          />
        </div>

        {aceitaCartaoCredito ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: maxParcelasCartao }, (_, indice) => {
              const parcela = indice + 1;
              return (
                <CampoNumero
                  defaultValue={jurosPorParcela.get(parcela) ?? (parcela === 1 ? 0 : "")}
                  disabled={disabled}
                  key={parcela}
                  label={`${parcela}x - juros %`}
                  min={0}
                  name={`jurosParcela${parcela}`}
                  step="0.01"
                />
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
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
        <CampoTexto defaultValue={regras?.check_in_time ?? ""} disabled={disabled} label="Horario de check-in" name="checkInTime" type="time" />
        <CampoTexto defaultValue={regras?.check_out_time ?? ""} disabled={disabled} label="Horario de check-out" name="checkOutTime" type="time" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <CampoCheckbox defaultChecked={regras?.allow_pets ?? false} disabled={disabled} label="Permite pets" name="allowPets" />
        <CampoCheckbox defaultChecked={regras?.allow_smoking ?? false} disabled={disabled} label="Permite fumantes" name="allowSmoking" />
        <CampoCheckbox defaultChecked={regras?.allow_events ?? false} disabled={disabled} label="Permite festas/eventos" name="allowEvents" />
      </div>
      <CampoArea defaultValue={regras?.additional_rules ?? ""} disabled={disabled} label="Regras adicionais" name="additionalRules" />
    </div>
  );
}

function EtapaImagens({
  atualizarTituloGaleria,
  capaRef,
  definirPrincipalGaleria,
  disabled,
  erroImagem,
  galeriaRef,
  previewCapa,
  previewsGaleria,
  removerGaleria,
  selecionarCapa,
  selecionarGaleria,
}: {
  atualizarTituloGaleria: (indice: number, titulo: string) => void;
  capaRef: RefObject<HTMLInputElement | null>;
  definirPrincipalGaleria: (indice: number) => void;
  disabled: boolean;
  erroImagem: string | null;
  galeriaRef: RefObject<HTMLInputElement | null>;
  previewCapa: string | null;
  previewsGaleria: PreviewGaleria[];
  removerGaleria: (indice: number) => void;
  selecionarCapa: (arquivo?: File) => void;
  selecionarGaleria: (arquivos: FileList | null) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CampoArquivo
          botaoLabel="Escolher arquivo"
          inputRef={capaRef}
          label="Imagem de capa"
          name="imagemCapaArquivo"
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
        {previewCapa ? <PreviewImagem titulo="Imagem principal" url={previewCapa} /> : null}
        <div className="rounded-xl border bg-background/45 p-3">
          <p className="mb-3 text-sm font-semibold">Galeria</p>
          {previewsGaleria.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {previewsGaleria.map((preview, indice) => (
                <div className="grid gap-3 overflow-hidden rounded-lg border bg-background/55 p-3" key={preview.id}>
                  <input name="titulosGaleria" readOnly type="hidden" value={preview.titulo} />
                  <input name="ordensGaleria" readOnly type="hidden" value={preview.ordem} />
                  {preview.principal ? (
                    <input name="imagemPrincipalGaleriaIndice" readOnly type="hidden" value={indice} />
                  ) : null}

                  <img alt={preview.titulo || preview.nome} className="h-28 w-full rounded-lg object-cover" src={preview.url} />
                  <CampoTexto
                    disabled={disabled}
                    label="Nome/titulo da foto"
                    name={`tituloGaleriaVisual${indice}`}
                    onChange={(evento) => atualizarTituloGaleria(indice, evento.currentTarget.value)}
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
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma foto selecionada. Use o botao Adicionar foto quando quiser montar a galeria.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EtapaComodidades({
  comodidades,
  disabled,
  selecionadas,
}: {
  comodidades: AmenityRow[];
  disabled: boolean;
  selecionadas: Set<string>;
}) {
  const [novaComodidade, setNovaComodidade] = useState("");
  const [personalizadas, setPersonalizadas] = useState<string[]>([]);

  function adicionarComodidade() {
    const nome = novaComodidade.trim();
    if (!nome || personalizadas.includes(nome)) return;
    setPersonalizadas((atuais) => [...atuais, nome]);
    setNovaComodidade("");
  }

  function removerComodidade(nome: string) {
    setPersonalizadas((atuais) => atuais.filter((item) => item !== nome));
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {comodidades.map((comodidade) => (
          <CampoCheckbox
            defaultChecked={selecionadas.has(comodidade.id)}
            disabled={disabled}
            key={comodidade.id}
            label={comodidade.name}
            name="comodidadeIds"
            value={comodidade.id}
          />
        ))}
      </div>

      <div className="rounded-xl border bg-background/45 p-4">
        <Label htmlFor="novaComodidade">Nome da nova comodidade</Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            disabled={disabled}
            id="novaComodidade"
            maxLength={80}
            onChange={(evento) => setNovaComodidade(evento.currentTarget.value)}
            placeholder="Ex.: Vista para o rio"
            value={novaComodidade}
          />
          <ActionButton disabled={disabled} icon={<Plus className="h-4 w-4" />} onClick={adicionarComodidade} type="button" variant="add">
            Adicionar comodidade
          </ActionButton>
        </div>

        {personalizadas.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {personalizadas.map((nome) => (
              <span className="inline-flex items-center gap-2 rounded-xl border bg-background/60 px-2 py-1 text-sm" key={nome}>
                <input name="comodidadesPersonalizadas" readOnly type="hidden" value={nome} />
                {nome}
                <ActionButton
                  aria-label={`Remover ${nome}`}
                  disabled={disabled}
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => removerComodidade(nome)}
                  size="icon"
                  type="button"
                  variant="delete"
                >
                  Remover
                </ActionButton>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CampoTexto({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}

function CampoNumero(props: ComponentProps<typeof Input> & { label: string; name: string }) {
  return <CampoTexto {...props} type="number" />;
}

function CampoMoeda(props: ComponentProps<typeof Input> & { label: string; name: string }) {
  return <CampoTexto {...props} min={0} step="0.01" type="number" />;
}

function CampoArea({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & ComponentProps<"textarea">) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea className={areaClasse} id={name} name={name} {...props} />
    </div>
  );
}

function CampoSelect({
  defaultValue,
  disabled,
  label,
  name,
  options,
}: {
  defaultValue: string;
  disabled: boolean;
  label: string;
  name: string;
  options: Array<{ label: string; valor: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select className={campoClasse} defaultValue={defaultValue} disabled={disabled} id={name} name={name}>
        {options.map((option) => (
          <option key={option.valor} value={option.valor}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoCheckbox({
  defaultChecked,
  disabled,
  label,
  name,
  value = "on",
}: {
  defaultChecked?: boolean;
  disabled: boolean;
  label: string;
  name: string;
  value?: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border bg-background/45 px-3 py-2 text-sm">
      <input defaultChecked={defaultChecked} disabled={disabled} name={name} type="checkbox" value={value} />
      {label}
    </label>
  );
}

function CampoArquivo({
  botaoLabel,
  inputRef,
  label,
  ...props
}: {
  botaoLabel: string;
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
} & ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={props.name}>{label}</Label>
      <Input
        accept="image/*"
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
    </div>
  );
}

function PreviewImagem({ titulo, url }: { titulo: string; url: string | null }) {
  return (
    <div className="rounded-xl border bg-background/45 p-3">
      <p className="mb-3 text-sm font-semibold">{titulo}</p>
      {url ? (
        <img alt={titulo} className="h-40 w-full rounded-lg object-cover" src={url} />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          <ImagePlus className="mr-2 h-4 w-4" />
          Nenhuma imagem selecionada.
        </div>
      )}
    </div>
  );
}
