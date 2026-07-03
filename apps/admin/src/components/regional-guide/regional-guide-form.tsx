"use client";

import type {
  RegionalGuideCategory,
  RegionalGuideLocationRow,
  RegionalGuideStatus
} from "@hospedex/types";
import {
  ExternalLink,
  ImageIcon,
  MapPin,
  Phone,
  Save,
  Trash2
} from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";

import { Button, Input, Label } from "@hospedex/ui";

import {
  CATEGORIAS_GUIA_REGIAO,
  STATUS_GUIA_REGIAO
} from "../../lib/regional-guide/types";

/**
 * Formulário guiado do Guia da região.
 *
 * O proprietário está cadastrando uma recomendação pública para hóspedes.
 * Por isso o formulário prioriza linguagem clara, prévia visual e validações
 * simples antes de enviar os dados para as Server Actions multi-tenant.
 */

type RegionalGuideFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  deleteAction?: (formData: FormData) => void | Promise<void>;
  local?: RegionalGuideLocationRow;
  modo: "criar" | "editar";
  podeGerenciar: boolean;
};

const campoClasse =
  "flex h-11 w-full rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:border-cyan-300/60 focus-visible:ring-2 focus-visible:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50";
const areaClasse =
  "min-h-28 w-full rounded-xl border border-border/80 bg-background/70 px-3 py-3 text-sm leading-6 shadow-sm outline-none transition focus-visible:border-cyan-300/60 focus-visible:ring-2 focus-visible:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50";

export function RegionalGuideForm({
  action,
  deleteAction,
  local,
  modo,
  podeGerenciar
}: RegionalGuideFormProps) {
  const formId = useId();
  const [nome, setNome] = useState(local?.name ?? "");
  const [categoria, setCategoria] = useState<RegionalGuideCategory>(
    local?.category ?? "restaurants"
  );
  const [status, setStatus] = useState<RegionalGuideStatus>(
    local?.status ?? "active"
  );
  const [descricao, setDescricao] = useState(local?.description ?? "");
  const [endereco, setEndereco] = useState(local?.address ?? "");
  const [horario, setHorario] = useState(local?.opening_hours ?? "");
  const [telefone, setTelefone] = useState(local?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(local?.whatsapp ?? "");
  const [site, setSite] = useState(local?.website_url ?? "");
  const [foto, setFoto] = useState(local?.cover_image_url ?? "");
  const [prioridade, setPrioridade] = useState(
    String(Math.max(local?.display_order ?? 1, 1))
  );
  const [usarTelefoneNoWhatsapp, setUsarTelefoneNoWhatsapp] = useState(false);
  const rotuloCategoria = useMemo(
    () =>
      CATEGORIAS_GUIA_REGIAO.find((item) => item.value === categoria)?.label ??
      "Outros",
    [categoria]
  );

  function aplicarTelefoneComoWhatsapp(marcado: boolean) {
    setUsarTelefoneNoWhatsapp(marcado);
    if (marcado) setWhatsapp(telefone);
  }

  function confirmarExclusao() {
    return window.confirm(
      "Apagar recomendação?\n\nEssa recomendação deixará de aparecer no guia da região para os hóspedes. Essa ação não poderá ser desfeita."
    );
  }

  return (
    <div className="grid min-h-0">
      <form action={action} className="grid gap-5 pb-24" id={formId}>
        {local ? <input name="localId" type="hidden" value={local.id} /> : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            <SecaoFormulario
              descricao="Dados que identificam a recomendação no painel e na página pública."
              titulo="Informações principais"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <CampoTexto
                  disabled={!podeGerenciar}
                  label="Nome do local"
                  name="name"
                  onChange={setNome}
                  placeholder="Ex: Praia Central, Restaurante Tropeiros, Mercado Avenida"
                  required
                  value={nome}
                />
                <CampoCategoria
                  disabled={!podeGerenciar}
                  onChange={setCategoria}
                  value={categoria}
                />
                <CampoTexto
                  disabled={!podeGerenciar}
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
                <CampoStatus
                  disabled={!podeGerenciar}
                  onChange={setStatus}
                  value={status}
                />
              </div>
            </SecaoFormulario>

            <SecaoFormulario
              descricao="Escreva como se estivesse recomendando o local para um hóspede."
              titulo="Descrição para o hóspede"
            >
              <CampoTextoArea
                disabled={!podeGerenciar}
                label="Descrição para o hóspede"
                name="description"
                onChange={setDescricao}
                placeholder="Ex: Praia tranquila para banho, caminhada e pôr do sol. Boa opção para famílias."
                value={descricao}
              />
            </SecaoFormulario>

            <SecaoFormulario
              descricao="Para praias e pontos abertos, uma referência clara pode ser melhor que endereço completo."
              titulo="Localização"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <CampoTexto
                  disabled={!podeGerenciar}
                  label="Endereço ou referência"
                  name="address"
                  onChange={setEndereco}
                  placeholder="Ex: Praia Central, próximo ao calçadão"
                  value={endereco}
                />
                <CampoTexto
                  disabled={!podeGerenciar}
                  label="Site ou link do Google Maps"
                  name="websiteUrl"
                  onChange={setSite}
                  placeholder="https://..."
                  type="url"
                  value={site}
                />
              </div>
            </SecaoFormulario>

            <SecaoFormulario
              descricao="Contato e horário aparecem para o hóspede quando cadastrados."
              titulo="Contato"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <CampoTexto
                  disabled={!podeGerenciar}
                  label="Horário de funcionamento"
                  name="openingHours"
                  onChange={setHorario}
                  placeholder="Ex: Livre acesso, Aberto ao público, Segunda a sábado das 08h às 18h"
                  value={horario}
                />
                <CampoTexto
                  disabled={!podeGerenciar}
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
                    disabled={!podeGerenciar || usarTelefoneNoWhatsapp}
                    label="WhatsApp"
                    name="whatsapp"
                    onChange={(valor) => setWhatsapp(mascararTelefone(valor))}
                    placeholder="(43) 99810-8328"
                    value={whatsapp}
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      checked={usarTelefoneNoWhatsapp}
                      className="h-4 w-4 accent-cyan-400"
                      disabled={!podeGerenciar}
                      onChange={(evento) =>
                        aplicarTelefoneComoWhatsapp(evento.target.checked)
                      }
                      type="checkbox"
                    />
                    Usar o mesmo número do telefone
                  </label>
                </div>
              </div>
            </SecaoFormulario>

            <SecaoFormulario
              descricao="Use uma foto que ajude o hóspede a reconhecer o local."
              titulo="Imagem"
            >
              <CampoTexto
                disabled={!podeGerenciar}
                label="Foto principal"
                name="coverImageUrl"
                onChange={setFoto}
                placeholder="Cole a URL da imagem do local"
                type="url"
                value={foto}
              />
              {foto ? (
                <Button
                  className="w-fit"
                  disabled={!podeGerenciar}
                  onClick={() => setFoto("")}
                  type="button"
                  variant="outline"
                >
                  Remover foto
                </Button>
              ) : null}
            </SecaoFormulario>
          </div>

          <aside className="xl:sticky xl:top-4 xl:self-start">
            <PreviewCard
              categoria={rotuloCategoria}
              descricao={descricao}
              endereco={endereco}
              foto={foto}
              horario={horario}
              nome={nome}
              site={site}
              telefone={telefone}
              whatsapp={whatsapp}
            />
          </aside>
        </div>
      </form>

      <div className="sticky bottom-0 -mx-5 mt-2 flex flex-col gap-3 border-t border-border bg-card/95 px-5 py-4 backdrop-blur-xl sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
          {modo === "editar" && local && deleteAction ? (
            <form action={deleteAction}>
              <input name="localId" type="hidden" value={local.id} />
              <Button
                className="w-full border-red-500/40 text-red-300 hover:bg-red-500/10 sm:w-auto"
                disabled={!podeGerenciar}
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

        <Button disabled={!podeGerenciar} form={formId} type="submit">
          <Save className="h-4 w-4" />
          {modo === "criar" ? "Criar local" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}

function SecaoFormulario({
  children,
  descricao,
  titulo
}: {
  children: ReactNode;
  descricao: string;
  titulo: string;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-background/45 p-4">
      <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{descricao}</p>
      <div className="mt-4 grid gap-4">{children}</div>
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
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function CampoTextoArea({
  disabled,
  label,
  name,
  onChange,
  placeholder,
  value
}: {
  disabled?: boolean;
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
      <p className="text-xs text-muted-foreground">
        Locais ativos aparecem para o hóspede na página pública.
      </p>
    </div>
  );
}

function PreviewCard({
  categoria,
  descricao,
  endereco,
  foto,
  horario,
  nome,
  site,
  telefone,
  whatsapp
}: {
  categoria: string;
  descricao: string;
  endereco: string;
  foto: string;
  horario: string;
  nome: string;
  site: string;
  telefone: string;
  whatsapp: string;
}) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-4 shadow-xl shadow-cyan-950/15">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
        Prévia no guia da região
      </p>
      <div className="mt-4 overflow-hidden rounded-xl border border-border/80 bg-background/70">
        {foto ? (
          <img
            alt=""
            className="h-36 w-full object-cover"
            src={foto}
          />
        ) : (
          <div className="grid h-36 place-items-center bg-cyan-500/10 text-cyan-200">
            <ImageIcon className="h-7 w-7" />
          </div>
        )}
        <div className="p-4">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
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
            {horario ? <LinhaPreview icon={<ExternalLink />} texto={horario} /> : null}
            {telefone || whatsapp ? (
              <LinhaPreview icon={<Phone />} texto={whatsapp || telefone} />
            ) : null}
          </div>
          {site ? (
            <span className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-cyan-400/30 px-3 text-xs font-semibold text-cyan-100">
              Ver no mapa
              <ExternalLink className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
      </div>
    </div>
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
