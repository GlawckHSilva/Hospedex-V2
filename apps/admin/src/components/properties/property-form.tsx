"use client";

import type { AmenityRow, PropertyStatus, PropertyType } from "@hospedex/types";
import {
  BedDouble,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Home,
  ImagePlus,
  MapPin,
  Sparkles,
  Trash2,
  WalletCards,
} from "lucide-react";
import type { ComponentProps, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import { Button, Input, Label, cn } from "@hospedex/ui";

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
  const [previewsGaleria, setPreviewsGaleria] = useState<Array<{ nome: string; url: string }>>([]);
  const capaRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const endereco = propriedade?.enderecoFormatado;
  const estrutura = propriedade?.estrutura;
  const valores = propriedade?.valores;
  const regras = propriedade?.regras;
  const unidadeCasa = propriedade?.unidades[0];
  const comodidadesSelecionadas = new Set(propriedade?.comodidades.map((item) => item.id) ?? []);
  const bloqueado = !podeGerenciar || Boolean(erroImagem);
  const etapa = ETAPAS[etapaAtual] ?? ETAPAS[0]!;

  useEffect(() => {
    return () => {
      if (previewCapa) URL.revokeObjectURL(previewCapa);
      previewsGaleria.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previewCapa, previewsGaleria]);

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

  function selecionarGaleria(arquivos: FileList | null) {
    previewsGaleria.forEach((preview) => URL.revokeObjectURL(preview.url));
    const lista = Array.from(arquivos ?? []);
    const erro = lista.map((arquivo) => validarImagem(arquivo)).find(Boolean) ?? null;
    setErroImagem(erro);
    setPreviewsGaleria(
      erro
        ? []
        : lista.map((arquivo) => ({ nome: arquivo.name, url: URL.createObjectURL(arquivo) })),
    );
  }

  function removerGaleria(indiceRemovido: number) {
    const input = galeriaRef.current;
    if (!input?.files) return;

    const dataTransfer = new DataTransfer();
    Array.from(input.files).forEach((arquivo, indice) => {
      if (indice !== indiceRemovido) dataTransfer.items.add(arquivo);
    });
    input.files = dataTransfer.files;
    selecionarGaleria(input.files);
  }

  function avancar() {
    setEtapaAtual((atual) => Math.min(atual + 1, ETAPAS.length - 1));
  }

  function voltar() {
    setEtapaAtual((atual) => Math.max(atual - 1, 0));
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

      <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button disabled={etapaAtual === 0} onClick={voltar} type="button" variant="outline">
          <ChevronLeft />
          Voltar
        </Button>
        <div className="flex justify-end gap-2">
          {etapaAtual < ETAPAS.length - 1 ? (
            <Button onClick={avancar} type="button" variant="outline">
              Proximo
              <ChevronRight />
            </Button>
          ) : null}
          <Button disabled={bloqueado} type="submit">
            {modo === "editar" ? "Salvar casa" : "Criar casa"}
          </Button>
        </div>
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
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <CampoMoeda defaultValue={valores?.valorDiaria ?? unidadeCasa?.base_price ?? 0} disabled={disabled} label="Valor da diaria" name="valorDiaria" />
      <CampoMoeda defaultValue={valores?.taxaLimpeza ?? 0} disabled={disabled} label="Taxa de limpeza" name="taxaLimpeza" />
      <CampoMoeda defaultValue={valores?.caucao ?? 0} disabled={disabled} label="Caucao" name="caucao" />
      <CampoMoeda defaultValue={valores?.valorHospedeExtra ?? 0} disabled={disabled} label="Valor por hospede extra" name="valorHospedeExtra" />
      <CampoNumero defaultValue={valores?.hospedesInclusos ?? 1} disabled={disabled} label="Hospedes inclusos no valor base" min={1} name="hospedesInclusos" />
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
  capaRef,
  disabled,
  erroImagem,
  galeriaRef,
  previewCapa,
  previewsGaleria,
  removerGaleria,
  selecionarCapa,
  selecionarGaleria,
}: {
  capaRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  erroImagem: string | null;
  galeriaRef: RefObject<HTMLInputElement | null>;
  previewCapa: string | null;
  previewsGaleria: Array<{ nome: string; url: string }>;
  removerGaleria: (indice: number) => void;
  selecionarCapa: (arquivo?: File) => void;
  selecionarGaleria: (arquivos: FileList | null) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CampoArquivo
          inputRef={capaRef}
          label="Imagem de capa"
          name="imagemCapaArquivo"
          onChange={(evento) => selecionarCapa(evento.currentTarget.files?.[0])}
          disabled={disabled}
        />
        <CampoArquivo
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
      <div className="grid gap-3 md:grid-cols-2">
        <PreviewImagem titulo="Imagem principal" url={previewCapa} />
        <div className="rounded-xl border bg-background/45 p-3">
          <p className="mb-3 text-sm font-semibold">Pre-visualizacao da galeria</p>
          {previewsGaleria.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {previewsGaleria.map((preview, indice) => (
                <div className="overflow-hidden rounded-lg border bg-background/55" key={`${preview.nome}-${preview.url}`}>
                  <img alt={preview.nome} className="h-24 w-full object-cover" src={preview.url} />
                  <div className="flex items-center justify-between gap-2 p-2">
                    <span className="truncate text-xs text-muted-foreground">{preview.nome}</span>
                    <Button onClick={() => removerGaleria(indice)} size="icon" type="button" variant="ghost">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Nenhuma imagem selecionada.
            </div>
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
  return (
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
  inputRef,
  label,
  ...props
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
} & ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={props.name}>{label}</Label>
      <Input accept="image/*" id={props.name} ref={inputRef} type="file" {...props} />
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
