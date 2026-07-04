"use client";

import type {
  RegionalGuideCategory,
  RegionalGuideLocationRow,
  RegionalGuideStatus
} from "@hospedex/types";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  ImageIcon,
  Info,
  MapPin,
  Phone,
  Save,
  Trash2,
  UploadCloud,
  Waves
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode
} from "react";

import { Button, Input, Label } from "@hospedex/ui";

import {
  CATEGORIAS_GUIA_REGIAO,
  STATUS_GUIA_REGIAO
} from "../../lib/regional-guide/types";

/**
 * Wizard de recomendações do Guia da região.
 *
 * O cadastro alimenta a página pública da hospedagem. Por isso a interface
 * separa dados operacionais em etapas curtas, evita formulário gigante e
 * valida antes de enviar para as Server Actions que preservam o multi-tenant.
 */

type RegionalGuideFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  deleteAction?: (formData: FormData) => void | Promise<void>;
  local?: RegionalGuideLocationRow;
  modo: "criar" | "editar";
  podeGerenciar: boolean;
};

type EtapaWizard = {
  descricao: string;
  id: "principal" | "localizacao" | "contato" | "foto";
  titulo: string;
};

const ETAPAS: EtapaWizard[] = [
  {
    descricao: "Nome, categoria e ordem de exibição.",
    id: "principal",
    titulo: "Principal"
  },
  {
    descricao: "Descrição, referência e mapa.",
    id: "localizacao",
    titulo: "Localização"
  },
  {
    descricao: "Horário e canais públicos de contato.",
    id: "contato",
    titulo: "Contato"
  },
  {
    descricao: "Imagem principal e prévia pública.",
    id: "foto",
    titulo: "Foto e prévia"
  }
];

const TIPOS_IMAGEM_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO_IMAGEM_BYTES = 5 * 1024 * 1024;

const campoClasse =
  "flex h-11 w-full rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:border-cyan-300/60 focus-visible:ring-2 focus-visible:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-32 w-full rounded-xl border border-border/80 bg-background/70 px-3 py-3 text-sm leading-6 shadow-sm outline-none transition focus-visible:border-cyan-300/60 focus-visible:ring-2 focus-visible:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50";

export function RegionalGuideForm({
  action,
  deleteAction,
  local,
  modo,
  podeGerenciar
}: RegionalGuideFormProps) {
  const formId = useId();
  const arquivoInputRef = useRef<HTMLInputElement | null>(null);
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [erroEtapa, setErroEtapa] = useState<string | null>(null);
  const [submetendo, setSubmetendo] = useState(false);
  const [nome, setNome] = useState(local?.name ?? "");
  const [categoria, setCategoria] = useState<RegionalGuideCategory>(
    local?.category ?? "restaurants"
  );
  const [status, setStatus] = useState<RegionalGuideStatus>(
    local?.status ?? "active"
  );
  const [descricao, setDescricao] = useState(local?.description ?? "");
  const [endereco, setEndereco] = useState(local?.address ?? "");
  const [linkMapa, setLinkMapa] = useState(local?.website_url ?? "");
  const [horario, setHorario] = useState(local?.opening_hours ?? "");
  const [telefone, setTelefone] = useState(local?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(local?.whatsapp ?? "");
  const [foto, setFoto] = useState(local?.cover_image_url ?? "");
  const [previewArquivo, setPreviewArquivo] = useState<string | null>(null);
  const [prioridade, setPrioridade] = useState(
    String(Math.max(local?.display_order ?? 1, 1))
  );
  const [usarTelefoneNoWhatsapp, setUsarTelefoneNoWhatsapp] = useState(false);
  const etapa = ETAPAS[etapaAtual] ?? ETAPAS[0]!;
  const etapaFinal = etapaAtual === ETAPAS.length - 1;
  const progresso = Math.round(((etapaAtual + 1) / ETAPAS.length) * 100);
  const rotuloCategoria = useMemo(
    () =>
      CATEGORIAS_GUIA_REGIAO.find((item) => item.value === categoria)?.label ??
      "Outros",
    [categoria]
  );
  const imagemPreview = previewArquivo ?? foto;

  useEffect(() => {
    rolarModalParaTopo();
  }, [etapaAtual]);

  useEffect(() => {
    return () => {
      if (previewArquivo) URL.revokeObjectURL(previewArquivo);
    };
  }, [previewArquivo]);

  function aplicarTelefoneComoWhatsapp(marcado: boolean) {
    setUsarTelefoneNoWhatsapp(marcado);
    if (marcado) setWhatsapp(telefone);
  }

  function avancar() {
    const erro = validarEtapa(etapaAtual);
    if (erro) {
      setErroEtapa(erro);
      return;
    }

    setErroEtapa(null);
    setEtapaAtual((valor) => Math.min(valor + 1, ETAPAS.length - 1));
  }

  function voltar() {
    setErroEtapa(null);
    setEtapaAtual((valor) => Math.max(valor - 1, 0));
  }

  function validarAntesDeEnviar(evento: React.FormEvent<HTMLFormElement>) {
    for (let indice = 0; indice < ETAPAS.length; indice += 1) {
      const erro = validarEtapa(indice);
      if (erro) {
        evento.preventDefault();
        setSubmetendo(false);
        setEtapaAtual(indice);
        setErroEtapa(erro);
        return;
      }
    }

    setSubmetendo(true);
  }

  function validarEtapa(indice: number) {
    if (indice === 0) {
      if (!nome.trim()) return "Informe o nome do local.";
      if (!categoria) return "Selecione uma categoria.";
      if (!status) return "Selecione um status.";
      const ordem = Number.parseInt(prioridade, 10);
      if (Number.isNaN(ordem) || ordem < 1) {
        return "A prioridade deve ser maior que zero.";
      }
    }

    if (indice === 1 && linkMapa && !urlValida(linkMapa)) {
      return "Informe um link válido do Google Maps.";
    }

    if (indice === 2) {
      if (telefone && !telefoneValido(telefone)) return "Informe um telefone válido.";
      if (whatsapp && !telefoneValido(whatsapp)) return "Informe um WhatsApp válido.";
    }

    if (indice === 3 && foto && !urlValida(foto)) {
      return "Informe uma URL válida para a imagem.";
    }

    return null;
  }

  function selecionarImagem(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    const erro = validarArquivoImagem(arquivo);
    if (erro) {
      setErroEtapa(erro);
      evento.target.value = "";
      return;
    }

    if (previewArquivo) URL.revokeObjectURL(previewArquivo);
    setPreviewArquivo(URL.createObjectURL(arquivo));
    setErroEtapa(null);
  }

  function removerFoto() {
    if (previewArquivo) URL.revokeObjectURL(previewArquivo);
    setPreviewArquivo(null);
    setFoto("");
    if (arquivoInputRef.current) arquivoInputRef.current.value = "";
  }

  function confirmarExclusao() {
    return window.confirm(
      "Apagar recomendação local?\n\nEsse local deixará de aparecer no guia da região para os hóspedes. Essa ação não poderá ser desfeita."
    );
  }

  return (
    <div className="grid min-h-0">
      <form
        action={action}
        className="grid min-h-0"
        encType="multipart/form-data"
        id={formId}
        onSubmit={validarAntesDeEnviar}
      >
        {local ? <input name="localId" type="hidden" value={local.id} /> : null}

        <div className="sticky top-0 z-20 border-b border-border bg-card/95 pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div>
              <p className="font-semibold text-foreground">
                Etapa {etapaAtual + 1} de {ETAPAS.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{etapa.descricao}</p>
            </div>
            <span className="text-xs font-semibold text-cyan-200">
              {progresso}% concluído
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {ETAPAS.map((item, indice) => (
              <button
                className="group grid gap-2 text-left"
                disabled={!podeGerenciar}
                key={item.id}
                onClick={() => {
                  if (indice <= etapaAtual) {
                    setErroEtapa(null);
                    setEtapaAtual(indice);
                  }
                }}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={[
                      "grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold transition",
                      indice === etapaAtual
                        ? "border-cyan-300 bg-cyan-400 text-slate-950"
                        : indice < etapaAtual
                          ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                          : "border-border bg-background/70 text-muted-foreground"
                    ].join(" ")}
                  >
                    {indice < etapaAtual ? <Check className="h-4 w-4" /> : indice + 1}
                  </span>
                  <span className="hidden h-px flex-1 bg-border sm:block" />
                </span>
                <span
                  className={[
                    "truncate text-xs font-semibold",
                    indice === etapaAtual ? "text-cyan-200" : "text-muted-foreground"
                  ].join(" ")}
                >
                  {item.titulo}
                </span>
              </button>
            ))}
          </div>
        </div>

        {erroEtapa ? (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {erroEtapa}
          </div>
        ) : null}

        <div className="py-5 pb-28">
          {etapa.id === "principal" ? (
            <EtapaCard
              descricao="Defina como a recomendação será organizada no guia público."
              icon={<MapPin className="h-5 w-5" />}
              titulo="Principal"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <CampoTexto
                  disabled={!podeGerenciar || submetendo}
                  label="Nome do local"
                  name="name"
                  onChange={setNome}
                  placeholder="Ex: Praia Central, Restaurante Tropeiros, Mercado Avenida"
                  required
                  value={nome}
                />
                <CampoCategoria
                  disabled={!podeGerenciar || submetendo}
                  onChange={setCategoria}
                  value={categoria}
                />
                <CampoStatus
                  disabled={!podeGerenciar || submetendo}
                  onChange={setStatus}
                  value={status}
                />
                <CampoTexto
                  disabled={!podeGerenciar || submetendo}
                  helper="Locais com número menor aparecem primeiro."
                  label="Prioridade no guia"
                  min="1"
                  name="displayOrder"
                  onChange={setPrioridade}
                  placeholder="1"
                  required
                  type="number"
                  value={prioridade}
                />
              </div>
            </EtapaCard>
          ) : null}

          {etapa.id === "localizacao" ? (
            <EtapaCard
              descricao="Use uma linguagem simples para orientar o hóspede sem exigir endereço completo."
              icon={<MapPin className="h-5 w-5" />}
              titulo="Localização"
            >
              <div className="grid gap-4">
                <CampoTextoArea
                  disabled={!podeGerenciar || submetendo}
                  helper="Escreva como se estivesse recomendando o local para um hóspede."
                  label="Descrição para o hóspede"
                  name="description"
                  onChange={setDescricao}
                  placeholder="Ex: Praia tranquila para banho, caminhada e pôr do sol. Boa opção para famílias."
                  value={descricao}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <CampoTexto
                    disabled={!podeGerenciar || submetendo}
                    helper="Para praias, uma referência clara é suficiente."
                    label="Endereço ou referência"
                    name="address"
                    onChange={setEndereco}
                    placeholder="Ex: Praia Central, próximo ao calçadão"
                    value={endereco}
                  />
                  <CampoTexto
                    disabled={!podeGerenciar || submetendo}
                    helper="A estrutura atual salva este link no campo público existente do Guia."
                    label="Link do Google Maps"
                    name="websiteUrl"
                    onChange={setLinkMapa}
                    placeholder="https://maps.google.com/..."
                    type="url"
                    value={linkMapa}
                  />
                </div>
              </div>
            </EtapaCard>
          ) : null}

          {etapa.id === "contato" ? (
            <EtapaCard
              descricao="Mostre apenas contatos úteis para o hóspede decidir ou se orientar."
              icon={<Phone className="h-5 w-5" />}
              titulo="Contato"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <CampoTexto
                  disabled={!podeGerenciar || submetendo}
                  helper="Aceita texto livre, como Livre acesso ou Aberto ao público."
                  label="Horário de funcionamento"
                  name="openingHours"
                  onChange={setHorario}
                  placeholder="Ex: Livre acesso"
                  value={horario}
                />
                <CampoTexto
                  disabled={!podeGerenciar || submetendo}
                  label="Telefone"
                  name="phone"
                  onChange={(valor) => {
                    const mascarado = mascararTelefone(valor);
                    setTelefone(mascarado);
                    if (usarTelefoneNoWhatsapp) setWhatsapp(mascarado);
                  }}
                  placeholder="(43) 99810-8328"
                  value={telefone}
                />
                <div className="grid gap-2">
                  <CampoTexto
                    disabled={!podeGerenciar || usarTelefoneNoWhatsapp || submetendo}
                    label="WhatsApp"
                    name="whatsapp"
                    onChange={(valor) => setWhatsapp(mascararTelefone(valor))}
                    placeholder="(43) 99810-8328"
                    value={whatsapp}
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input
                      checked={usarTelefoneNoWhatsapp}
                      className="h-4 w-4 accent-cyan-400"
                      disabled={!podeGerenciar || submetendo}
                      onChange={(evento) =>
                        aplicarTelefoneComoWhatsapp(evento.target.checked)
                      }
                      type="checkbox"
                    />
                    Usar o mesmo número do telefone
                  </label>
                </div>
                <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-4 text-sm text-cyan-100/90">
                  <Info className="mb-2 h-4 w-4" />
                  O site oficial separado ainda não existe na tabela do Guia. Nesta etapa,
                  o link público existente foi usado para o Google Maps.
                </div>
              </div>
            </EtapaCard>
          ) : null}

          {etapa.id === "foto" ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <EtapaCard
                descricao="Envie uma imagem leve para valorizar a recomendação pública."
                icon={<ImageIcon className="h-5 w-5" />}
                titulo="Foto principal"
              >
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-dashed border-cyan-400/35 bg-cyan-500/10 p-4">
                    <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
                      <div className="overflow-hidden rounded-xl border border-border/80 bg-background/60">
                        {imagemPreview ? (
                          <img
                            alt="Prévia da imagem do local"
                            className="h-40 w-full object-cover"
                            src={imagemPreview}
                          />
                        ) : (
                          <div className="grid h-40 place-items-center text-cyan-200">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold">Foto principal</h4>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            Envie JPG, PNG ou WebP até 5MB. A imagem é enviada ao
                            Supabase Storage ao salvar.
                          </p>
                        </div>
                        <input
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={!podeGerenciar || submetendo}
                          name="coverImageFile"
                          onChange={selecionarImagem}
                          ref={arquivoInputRef}
                          type="file"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={!podeGerenciar || submetendo}
                            onClick={() => arquivoInputRef.current?.click()}
                            type="button"
                            variant="outline"
                          >
                            <UploadCloud className="h-4 w-4" />
                            {imagemPreview || foto ? "Trocar imagem" : "Escolher imagem"}
                          </Button>
                          {imagemPreview || foto ? (
                            <Button
                              disabled={!podeGerenciar || submetendo}
                              onClick={removerFoto}
                              type="button"
                              variant="outline"
                            >
                              Remover foto
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <CampoTexto
                    disabled={!podeGerenciar || submetendo}
                    helper="Alternativa secundária caso você já tenha a imagem hospedada."
                    label="Ou cole uma URL da imagem"
                    name="coverImageUrl"
                    onChange={setFoto}
                    placeholder="https://..."
                    type="url"
                    value={foto}
                  />
                </div>
              </EtapaCard>

              <PreviewCard
                categoria={rotuloCategoria}
                categoriaValor={categoria}
                descricao={descricao}
                endereco={endereco}
                foto={imagemPreview}
                horario={horario}
                linkMapa={linkMapa}
                nome={nome}
                telefone={telefone}
                whatsapp={whatsapp}
              />
            </div>
          ) : null}
        </div>
      </form>

      <div className="sticky bottom-0 z-30 -mx-5 flex flex-col gap-3 border-t border-border bg-card/95 px-5 py-4 backdrop-blur-xl sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button disabled={submetendo} type="button" variant="outline">
            Cancelar
          </Button>
          {modo === "editar" && local && deleteAction ? (
            <form action={deleteAction}>
              <input name="localId" type="hidden" value={local.id} />
              <Button
                className="w-full border-red-500/40 text-red-300 hover:bg-red-500/10 sm:w-auto"
                disabled={!podeGerenciar || submetendo}
                formAction={deleteAction}
                onClick={(evento) => {
                  if (!confirmarExclusao()) evento.preventDefault();
                }}
                type="submit"
                variant="outline"
              >
                <Trash2 className="h-4 w-4" />
                Apagar local
              </Button>
            </form>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            disabled={etapaAtual === 0 || submetendo}
            onClick={voltar}
            type="button"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
          {etapaFinal ? (
            <Button disabled={!podeGerenciar || submetendo} form={formId} type="submit">
              <Save className="h-4 w-4" />
              {submetendo
                ? modo === "criar"
                  ? "Criando..."
                  : "Salvando..."
                : modo === "criar"
                  ? "Criar local"
                  : "Salvar alterações"}
            </Button>
          ) : (
            <Button
              disabled={!podeGerenciar || submetendo}
              onClick={avancar}
              type="button"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function EtapaCard({
  children,
  descricao,
  icon,
  titulo
}: {
  children: ReactNode;
  descricao: string;
  icon: ReactNode;
  titulo: string;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-background/45 p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-500/10 text-cyan-200">
          {icon}
        </span>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{titulo}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{descricao}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

function CampoTexto({
  disabled,
  helper,
  label,
  min,
  name,
  onChange,
  placeholder,
  required,
  type = "text",
  value
}: {
  disabled?: boolean;
  helper?: string;
  label: string;
  min?: string;
  name: string;
  onChange?: (valor: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        className={campoClasse}
        disabled={disabled}
        id={name}
        min={min}
        name={name}
        onChange={(evento) => onChange?.(evento.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
      {helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function CampoTextoArea({
  disabled,
  helper,
  label,
  name,
  onChange,
  placeholder,
  value
}: {
  disabled?: boolean;
  helper?: string;
  label: string;
  name: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        className={areaClasse}
        disabled={disabled}
        id={name}
        name={name}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function CampoCategoria({
  disabled,
  onChange,
  value
}: {
  disabled?: boolean;
  onChange: (valor: RegionalGuideCategory) => void;
  value: RegionalGuideCategory;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="category">Categoria</Label>
      <select
        className={campoClasse}
        disabled={disabled}
        id="category"
        name="category"
        onChange={(evento) => onChange(evento.target.value as RegionalGuideCategory)}
        required
        value={value}
      >
        {CATEGORIAS_GUIA_REGIAO.filter((categoria) => categoria.value !== "todas").map(
          (categoria) => (
            <option key={categoria.value} value={categoria.value}>
              {categoria.label}
            </option>
          )
        )}
      </select>
      <p className="text-xs leading-5 text-muted-foreground">
        Use “Praias” para recomendações litorâneas ou pontos de banho.
      </p>
    </div>
  );
}

function CampoStatus({
  disabled,
  onChange,
  value
}: {
  disabled?: boolean;
  onChange: (valor: RegionalGuideStatus) => void;
  value: RegionalGuideStatus;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status">Status</Label>
      <select
        className={campoClasse}
        disabled={disabled}
        id="status"
        name="status"
        onChange={(evento) => onChange(evento.target.value as RegionalGuideStatus)}
        required
        value={value}
      >
        {STATUS_GUIA_REGIAO.filter((status) => status.value !== "todos").map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <p className="text-xs leading-5 text-muted-foreground">
        Locais ativos aparecem para o hóspede na página pública.
      </p>
    </div>
  );
}

function PreviewCard({
  categoria,
  categoriaValor,
  descricao,
  endereco,
  foto,
  horario,
  linkMapa,
  nome,
  telefone,
  whatsapp
}: {
  categoria: string;
  categoriaValor: RegionalGuideCategory;
  descricao: string;
  endereco: string;
  foto: string | null;
  horario: string;
  linkMapa: string;
  nome: string;
  telefone: string;
  whatsapp: string;
}) {
  const IconeCategoria = categoriaValor === "beaches" ? Waves : MapPin;

  return (
    <aside className="rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-4 shadow-xl shadow-cyan-950/15 xl:sticky xl:top-24 xl:self-start">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
        Prévia no guia da região
      </p>
      <div className="mt-4 overflow-hidden rounded-xl border border-border/80 bg-background/70">
        {foto ? (
          <img alt="" className="h-40 w-full object-cover" src={foto} />
        ) : (
          <div className="grid h-40 place-items-center bg-cyan-500/10 text-cyan-200">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        <div className="p-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
            <IconeCategoria className="h-3.5 w-3.5" />
            {categoria}
          </span>
          <h4 className="mt-3 text-lg font-semibold">
            {nome || "Nome do local"}
          </h4>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {descricao || "Descrição curta da recomendação para o hóspede."}
          </p>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {endereco ? <LinhaPreview icon={<MapPin />} texto={endereco} /> : null}
            {horario ? <LinhaPreview icon={<Clock3 />} texto={horario} /> : null}
            {telefone || whatsapp ? (
              <LinhaPreview icon={<Phone />} texto={whatsapp || telefone} />
            ) : null}
          </div>
          {linkMapa ? (
            <span className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-cyan-400/30 px-3 text-xs font-semibold text-cyan-100">
              Ver no mapa
              <ExternalLink className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function LinhaPreview({ icon, texto }: { icon: ReactNode; texto: string }) {
  return (
    <p className="flex items-start gap-2">
      <span className="mt-0.5 text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span>{texto}</span>
    </p>
  );
}

function mascararTelefone(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function telefoneValido(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length >= 10 && digitos.length <= 11;
}

function urlValida(valor: string) {
  try {
    const url = new URL(valor);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function validarArquivoImagem(arquivo: File) {
  if (!TIPOS_IMAGEM_ACEITOS.includes(arquivo.type)) {
    return "Use uma imagem JPG, PNG ou WebP.";
  }

  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_BYTES) {
    return "A imagem deve ter no máximo 5MB.";
  }

  return null;
}

function rolarModalParaTopo() {
  const dialog = document.querySelector('[role="dialog"]');
  const corpo = dialog?.children.item(1) as HTMLElement | null;

  corpo?.scrollTo({ top: 0, behavior: "smooth" });
}
