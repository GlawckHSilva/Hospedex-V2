import { AlertCircle, Search } from "lucide-react";

import { GlassCard, StatusBadge } from "@hospedex/ui";

import { PublicShell } from "../../components/layout/public-shell";
import { PropertySearchForm } from "../../components/marketplace/property-search-form";
import { PropertyCard } from "../../components/properties/property-card";
import {
  carregarPropriedadesPublicas,
  normalizarTipoPropriedade
} from "../../lib/marketplace/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PropriedadesPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const filtros = normalizarFiltros(await searchParams);
  const resultado = await carregarPropriedadesPublicas({
    cidade: filtros.cidade,
    dataFim: filtros.dataFim,
    dataInicio: filtros.dataInicio,
    estado: filtros.estado,
    hospedes: filtros.hospedes,
    limite: 24,
    precoMaximo: filtros.precoMaximo,
    precoMinimo: filtros.precoMinimo,
    tipo: filtros.tipo
  });

  return (
    <PublicShell>
      <section className="premium-grid-bg border-b bg-[linear-gradient(135deg,var(--background),var(--secondary))]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:py-16">
          <div className="max-w-3xl">
            <StatusBadge tone="info">Marketplace</StatusBadge>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
              Hospedagens publicadas
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
              Busque propriedades ativas por cidade, tipo e capacidade inicial.
            </p>
          </div>
          <PropertySearchForm
            cidade={filtros.cidade}
            compact
            dataFim={filtros.dataFim}
            dataInicio={filtros.dataInicio}
            estado={filtros.estado}
            hospedes={filtros.hospedes}
            mostrarPreco
            precoMaximo={filtros.precoMaximo}
            precoMinimo={filtros.precoMinimo}
            tipo={filtros.tipo}
          />
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:py-12">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {resultado.propriedades.length} resultado
              {resultado.propriedades.length === 1 ? "" : "s"} encontrado
              {resultado.propriedades.length === 1 ? "" : "s"}
            </p>
            {!resultado.supabaseConfigurado ? (
              <p className="text-sm text-muted-foreground">
                Configure o Supabase para carregar dados reais.
              </p>
            ) : null}
          </div>

          {resultado.erro ? (
            <GlassCard className="flex items-start gap-3 border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Não foi possível carregar a listagem.</p>
                <p className="mt-1 text-destructive/80">{resultado.erro}</p>
              </div>
            </GlassCard>
          ) : null}

          {!resultado.erro && resultado.propriedades.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {resultado.propriedades.map((propriedade) => (
                <PropertyCard key={propriedade.id} property={propriedade} />
              ))}
            </div>
          ) : null}

          {!resultado.erro && !resultado.propriedades.length ? (
            <div className="premium-empty-state">
              <div className="max-w-md">
                <span className="premium-empty-state__icon mx-auto">
                  <Search className="h-5 w-5" />
                </span>
                <h2 className="mt-5 text-xl font-semibold">Nenhuma propriedade encontrada</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Ajuste cidade, tipo ou número de hóspedes para ver outras
                  propriedades publicadas.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </PublicShell>
  );
}

function normalizarFiltros(params: Record<string, string | string[] | undefined>) {
  const cidade = obterParametro(params.cidade)?.trim() || undefined;
  const estado = obterParametro(params.estado)?.trim().toUpperCase() || undefined;
  const dataInicio = normalizarData(obterParametro(params.dataInicio));
  const dataFim = normalizarData(obterParametro(params.dataFim));
  const tipo = normalizarTipoPropriedade(obterParametro(params.tipo));
  const hospedesValor = Number(obterParametro(params.hospedes));
  const precoMinimo = normalizarNumero(obterParametro(params.precoMinimo));
  const precoMaximo = normalizarNumero(obterParametro(params.precoMaximo));
  const hospedes =
    Number.isFinite(hospedesValor) && hospedesValor > 0
      ? Math.round(hospedesValor)
      : undefined;

  return {
    cidade,
    dataFim,
    dataInicio,
    estado,
    hospedes,
    precoMaximo,
    precoMinimo,
    tipo
  };
}

function obterParametro(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}

function normalizarData(valor: string | undefined) {
  return valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : undefined;
}

function normalizarNumero(valor: string | undefined) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : undefined;
}
