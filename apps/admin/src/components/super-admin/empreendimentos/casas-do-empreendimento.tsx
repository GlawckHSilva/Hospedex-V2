"use client";

import { useMemo, useState } from "react";
import { Eye, ExternalLink, Home } from "lucide-react";

import { Input, StatusBadge } from "@hospedex/ui";

import type {
  CasaEmpreendimento,
  EmpreendimentoCompleto
} from "../../../lib/super-admin/empreendimentos/data";
import { ActionButton } from "../../management/action-button";
import { EntityViewModal } from "../../management/entity-modal";
import {
  formatarData,
  formatarMoeda
} from "../proprietarios/proprietario-detail-shared";

const campoClasse =
  "flex h-10 w-full cursor-pointer rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Lista as casas de um tenant dentro do detalhe do empreendimento.
 * O Super Admin apenas consulta dados do tenant selecionado; edicao continua no painel do proprietario.
 */
export function CasasDoEmpreendimento({
  abrirInicialmente = false,
  empreendimento
}: {
  abrirInicialmente?: boolean;
  empreendimento: EmpreendimentoCompleto;
}) {
  const [aberto, setAberto] = useState(abrirInicialmente);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todas");
  const [publicacao, setPublicacao] = useState("todas");
  const [ordenacao, setOrdenacao] = useState("recentes");
  const casas = empreendimento.casas;
  const publicadas = casas.filter((casa) => casa.isPublica).length;
  const ativas = casas.filter(casaEstaAtiva).length;
  const filtradas = useMemo(() => {
    const buscaNormalizada = busca.trim().toLowerCase();
    return [...casas]
      .filter((casa) => {
        if (status === "ativas" && !casaEstaAtiva(casa)) return false;
        if (status === "inativas" && casaEstaAtiva(casa)) return false;
        if (publicacao === "publicadas" && !casa.isPublica) return false;
        if (publicacao === "rascunhos" && casa.isPublica) return false;
        if (!buscaNormalizada) return true;
        return [casa.nome, casa.cidade, casa.estado].join(" ").toLowerCase().includes(buscaNormalizada);
      })
      .sort((a, b) => {
        if (ordenacao === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
        if (ordenacao === "atualizacao") return b.atualizadaEm.localeCompare(a.atualizadaEm);
        return b.criadaEm.localeCompare(a.criadaEm);
      });
  }, [busca, casas, ordenacao, publicacao, status]);

  return (
    <section className="rounded-2xl border bg-background/35 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">Casas deste empreendimento</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Casas cadastradas: {casas.length}/{empreendimento.operacao.casasLimite} - Publicadas: {publicadas} - Rascunho: {casas.length - publicadas}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ativas: {ativas} - Inativas: {casas.length - ativas}
          </p>
        </div>
        <ActionButton icon={<Home />} onClick={() => setAberto((valor) => !valor)} type="button" variant="view">
          {aberto ? "Ocultar casas" : "Ver casas deste empreendimento"}
        </ActionButton>
      </div>

      {aberto ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_150px_190px_170px]">
            <Input
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar por nome ou cidade"
              value={busca}
            />
            <select className={campoClasse} onChange={(evento) => setStatus(evento.target.value)} value={status}>
              <option value="todas">Todas</option>
              <option value="ativas">Ativas</option>
              <option value="inativas">Inativas</option>
            </select>
            <select className={campoClasse} onChange={(evento) => setPublicacao(evento.target.value)} value={publicacao}>
              <option value="todas">Todas publicacoes</option>
              <option value="publicadas">Publicadas</option>
              <option value="rascunhos">Rascunho/Nao publicadas</option>
            </select>
            <select className={campoClasse} onChange={(evento) => setOrdenacao(evento.target.value)} value={ordenacao}>
              <option value="recentes">Mais recentes</option>
              <option value="nome">Nome A-Z</option>
              <option value="atualizacao">Ultima atualizacao</option>
            </select>
          </div>

          {filtradas.length ? (
            <div className="grid gap-3">
              {filtradas.map((casa) => (
                <CasaResumoCard casa={casa} empreendimento={empreendimento} key={casa.id} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-5 text-center">
              <p className="font-semibold">Nenhuma casa cadastrada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Este empreendimento ainda nao possui casas cadastradas pelo proprietario.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function CasaResumoCard({
  casa,
  empreendimento
}: {
  casa: CasaEmpreendimento;
  empreendimento: EmpreendimentoCompleto;
}) {
  return (
    <article className="grid gap-3 rounded-xl border bg-background/45 p-3 sm:grid-cols-[96px_1fr_auto] sm:items-center">
      {casa.imagemCapaUrl ? (
        <img
          alt={`Imagem de ${casa.nome}`}
          className="h-24 w-full rounded-lg object-cover sm:w-24"
          loading="lazy"
          src={casa.imagemCapaUrl}
        />
      ) : (
        <div className="flex h-24 w-full items-center justify-center rounded-lg border bg-cyan-500/10 text-cyan-300 sm:w-24">
          <Home className="h-6 w-6" />
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate font-semibold">{casa.nome}</h4>
          <StatusBadge tone={casaEstaAtiva(casa) ? "success" : "neutral"}>
            {casaEstaAtiva(casa) ? "Ativa" : "Inativa"}
          </StatusBadge>
          <StatusBadge tone={casa.isPublica ? "info" : "warning"}>
            {casa.isPublica ? "Publicada" : "Nao publicada"}
          </StatusBadge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {casa.cidade || "Localizacao nao informada"}{casa.estado ? ` - ${casa.estado}` : ""}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatarDiaria(casa.diaria)} - {formatarQuantidade(casa.capacidade, "hospede")} - {formatarQuantidade(casa.quartos, "quarto")} - {formatarQuantidade(casa.banheiros, "banheiro")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {casa.paginaPublicaUrl ? (
          <a
            className="inline-flex min-h-8 items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/8 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-500/15 dark:text-cyan-200 [&_svg]:h-4 [&_svg]:w-4"
            href={casa.paginaPublicaUrl}
            rel="noreferrer"
            target="_blank"
          >
            Ver pagina publica
            <ExternalLink />
          </a>
        ) : null}
        <EntityViewModal
          description="Dados principais da casa vinculada a este tenant."
          title={casa.nome}
          triggerIcon={<Eye />}
          triggerLabel="Ver detalhes"
        >
          <DetalheCasa casa={casa} empreendimento={empreendimento} />
        </EntityViewModal>
      </div>
    </article>
  );
}

function DetalheCasa({
  casa,
  empreendimento
}: {
  casa: CasaEmpreendimento;
  empreendimento: EmpreendimentoCompleto;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Info label="Tenant" valor={empreendimento.tenant.name} />
        <Info label="Proprietario" valor={empreendimento.profile?.full_name ?? "Sem nome"} />
        <Info label="Tipo" valor={labelTipoCasa(casa.tipo)} />
        <Info label="Status" valor={labelStatusCasa(casa.status)} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Info label="Cidade" valor={casa.cidade || "Localizacao nao informada"} />
        <Info label="Estado" valor={casa.estado || "Localizacao nao informada"} />
        <Info label="Endereco" valor={casa.endereco || "Endereco nao informado"} />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Info label="Hospedes" valor={valorOuFallback(casa.capacidade, "Capacidade nao informada")} />
        <Info label="Quartos" valor={valorOuFallback(casa.quartos, "Quartos nao informados")} />
        <Info label="Banheiros" valor={valorOuFallback(casa.banheiros, "Banheiros nao informados")} />
        <Info label="Diaria" valor={formatarDiaria(casa.diaria)} />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Info label="Taxa de limpeza" valor={casa.taxaLimpeza ? formatarMoeda(casa.taxaLimpeza) : "Nao informada"} />
        <Info label="Reservas" valor={String(casa.reservasTotal)} />
        <Info label="Reservas futuras" valor={String(casa.reservasFuturas)} />
        <Info label="Imagens" valor={String(casa.imagensTotal)} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Info label="Publicacao" valor={casa.isPublica ? "Publicada" : "Rascunho/Nao publicada"} />
        <Info label="Ultima atualizacao" valor={formatarData(casa.atualizadaEm)} />
      </div>
      {casa.paginaPublicaUrl ? (
        <a className="text-sm font-semibold text-cyan-600 hover:text-cyan-500" href={casa.paginaPublicaUrl} rel="noreferrer" target="_blank">
          Abrir pagina publica
        </a>
      ) : null}
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border bg-background/45 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{valor}</p>
    </div>
  );
}

function casaEstaAtiva(casa: CasaEmpreendimento) {
  return casa.status === "published" || casa.status === "draft";
}

function formatarDiaria(valor: number) {
  return valor > 0 ? `${formatarMoeda(valor)}/noite` : "Diaria nao informada";
}

function formatarQuantidade(valor: number, singular: string) {
  if (valor <= 0) return `${singular} nao informado`;
  return `${valor} ${singular}${valor === 1 ? "" : "s"}`;
}

function valorOuFallback(valor: number, fallback: string) {
  return valor > 0 ? String(valor) : fallback;
}

function labelTipoCasa(tipo: CasaEmpreendimento["tipo"]) {
  const labels: Record<CasaEmpreendimento["tipo"], string> = {
    inn: "Pousada",
    seasonal_home: "Casa de temporada",
    small_hotel: "Pequeno hotel"
  };
  return labels[tipo] ?? "Tipo nao informado";
}

function labelStatusCasa(status: CasaEmpreendimento["status"]) {
  const labels: Record<CasaEmpreendimento["status"], string> = {
    archived: "Arquivada",
    draft: "Rascunho",
    paused: "Pausada",
    published: "Publicada"
  };
  return labels[status] ?? "Status nao informado";
}
