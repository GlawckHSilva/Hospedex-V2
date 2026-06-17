import { CalendarDays, MapPin, Search, SlidersHorizontal, Users } from "lucide-react";
import Link from "next/link";

import type { PropertyType } from "@hospedex/types";
import { GlassButton, GlassInput, buttonVariants, cn } from "@hospedex/ui";

/**
 * Formulario publico de busca do Marketplace.
 *
 * Os filtros sao enviados por query string e revalidados no servidor. Isso evita
 * confiar no navegador para regras de disponibilidade, preco ou capacidade.
 */

export type PropertySearchFormProps = {
  cidade?: string | undefined;
  compact?: boolean;
  dataFim?: string | undefined;
  dataInicio?: string | undefined;
  estado?: string | undefined;
  hospedes?: number | undefined;
  mostrarPreco?: boolean;
  precoMaximo?: number | undefined;
  precoMinimo?: number | undefined;
  tipo?: PropertyType | undefined;
};

export function PropertySearchForm({
  cidade,
  compact = false,
  dataFim,
  dataInicio,
  estado,
  hospedes,
  mostrarPreco = false,
  precoMaximo,
  precoMinimo,
  tipo
}: PropertySearchFormProps) {
  return (
    <form
      action="/propriedades"
      className={cn(
        "glass-panel grid gap-3 p-3 shadow-2xl shadow-cyan-950/10",
        compact
          ? "md:grid-cols-2 xl:grid-cols-[1fr_90px_150px_150px_160px_120px_120px_auto_auto]"
          : "md:grid-cols-2 xl:grid-cols-[1fr_90px_150px_150px_130px_auto]"
      )}
    >
      <label className="relative">
        <span className="sr-only">Destino</span>
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <GlassInput
          className="h-12 pl-10"
          defaultValue={cidade}
          name="cidade"
          placeholder="Destino ou cidade"
        />
      </label>

      <label className="relative">
        <span className="sr-only">Estado</span>
        <GlassInput
          className="h-12 uppercase"
          defaultValue={estado}
          maxLength={2}
          name="estado"
          placeholder="UF"
        />
      </label>

      <label className="relative">
        <span className="sr-only">Check-in</span>
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <GlassInput
          className="h-12 pl-10"
          defaultValue={dataInicio}
          name="dataInicio"
          type="date"
        />
      </label>

      <label className="relative">
        <span className="sr-only">Check-out</span>
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <GlassInput
          className="h-12 pl-10"
          defaultValue={dataFim}
          name="dataFim"
          type="date"
        />
      </label>

      <label className="relative">
        <span className="sr-only">Hospedes</span>
        <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <GlassInput
          className="h-12 pl-10"
          defaultValue={hospedes}
          min={1}
          name="hospedes"
          placeholder="Hospedes"
          type="number"
        />
      </label>

      {compact ? (
        <label className="relative">
          <span className="sr-only">Tipo</span>
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            className="glass-input h-12 w-full rounded-md px-10 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={tipo ?? ""}
            name="tipo"
          >
            <option value="">Tipos</option>
            <option value="seasonal_home">Casas</option>
            <option value="inn">Pousadas</option>
            <option value="small_hotel">Hoteis compactos</option>
          </select>
        </label>
      ) : null}

      {mostrarPreco ? (
        <>
          <label className="relative">
            <span className="sr-only">Preco minimo</span>
            <GlassInput
              className="h-12"
              defaultValue={precoMinimo}
              min={0}
              name="precoMinimo"
              placeholder="Min."
              type="number"
            />
          </label>
          <label className="relative">
            <span className="sr-only">Preco maximo</span>
            <GlassInput
              className="h-12"
              defaultValue={precoMaximo}
              min={0}
              name="precoMaximo"
              placeholder="Max."
              type="number"
            />
          </label>
        </>
      ) : null}

      <GlassButton className="h-12" size="lg" type="submit">
        <Search className="h-4 w-4" />
        Buscar
      </GlassButton>

      {compact ? (
        <Link
          className={cn(buttonVariants({ size: "lg", variant: "ghost" }), "h-12")}
          href="/propriedades"
        >
          Limpar
        </Link>
      ) : null}
    </form>
  );
}
