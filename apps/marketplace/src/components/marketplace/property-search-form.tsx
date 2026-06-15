import { Search, SlidersHorizontal, Users } from "lucide-react";
import Link from "next/link";

import { GlassButton, GlassInput, cn, buttonVariants } from "@hospedex/ui";

import type { PropertyType } from "@hospedex/types";

export type PropertySearchFormProps = {
  cidade?: string | undefined;
  tipo?: PropertyType | undefined;
  hospedes?: number | undefined;
  compact?: boolean;
};

export function PropertySearchForm({
  cidade,
  tipo,
  hospedes,
  compact = false
}: PropertySearchFormProps) {
  return (
    <form
      action="/propriedades"
      className={cn(
        "glass-panel grid gap-3 p-3 shadow-2xl shadow-cyan-950/10",
        compact ? "lg:grid-cols-[1fr_180px_150px_auto_auto]" : "lg:grid-cols-[1fr_190px_160px_auto]"
      )}
    >
      <label className="relative">
        <span className="sr-only">Cidade</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <GlassInput
          className="h-12 pl-10"
          defaultValue={cidade}
          name="cidade"
          placeholder="Buscar por cidade"
        />
      </label>
      <label className="relative">
        <span className="sr-only">Tipo</span>
        <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          className="glass-input h-12 w-full rounded-md px-10 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={tipo ?? ""}
          name="tipo"
        >
          <option value="">Todos os tipos</option>
          <option value="seasonal_home">Casas</option>
          <option value="inn">Pousadas</option>
          <option value="small_hotel">Hotéis compactos</option>
        </select>
      </label>
      <label className="relative">
        <span className="sr-only">Hóspedes</span>
        <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <GlassInput
          className="h-12 pl-10"
          defaultValue={hospedes}
          min={1}
          name="hospedes"
          placeholder="Hóspedes"
          type="number"
        />
      </label>
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
