import { CalendarDays, MapPin, Search, SlidersHorizontal, Users } from "lucide-react";
import Link from "next/link";

import type { PropertyType } from "@hospedex/types";
import { GlassButton, GlassInput, buttonVariants, cn } from "@hospedex/ui";

import {
  MarketplaceIconField,
  MarketplacePlainField,
  marketplaceInputPlainClass,
  marketplaceInputWithIconClass,
  marketplaceSelectWithIconClass,
} from "../forms/marketplace-icon-field";

/**
 * Formulário público de busca do Marketplace.
 *
 * Os filtros são enviados por query string e revalidados no servidor. Isso evita
 * confiar no navegador para regras de disponibilidade, preço ou capacidade.
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
  tipo,
}: PropertySearchFormProps) {
  return (
    <form
      action="/propriedades"
      className={cn(
        "glass-panel grid gap-3 p-3 shadow-2xl shadow-cyan-950/10",
        compact
          ? "md:grid-cols-2 xl:grid-cols-[1fr_90px_150px_150px_160px_120px_120px_auto_auto]"
          : "md:grid-cols-2 xl:grid-cols-[1fr_150px_150px_130px_auto]",
      )}
    >
      <MarketplaceIconField icon={MapPin} label="Destino" srOnly>
        <GlassInput
          className={marketplaceInputWithIconClass}
          defaultValue={cidade}
          name="cidade"
          placeholder="Destino ou cidade"
        />
      </MarketplaceIconField>

      {compact ? (
        <MarketplacePlainField label="Estado" srOnly>
          <GlassInput
            className={cn(marketplaceInputPlainClass, "uppercase")}
            defaultValue={estado}
            maxLength={2}
            name="estado"
            placeholder="UF"
          />
        </MarketplacePlainField>
      ) : null}

      <MarketplaceIconField icon={CalendarDays} label="Entrada" srOnly>
        <GlassInput
          className={marketplaceInputWithIconClass}
          defaultValue={dataInicio}
          name="dataInicio"
          type="date"
        />
      </MarketplaceIconField>

      <MarketplaceIconField icon={CalendarDays} label="Saída" srOnly>
        <GlassInput
          className={marketplaceInputWithIconClass}
          defaultValue={dataFim}
          name="dataFim"
          type="date"
        />
      </MarketplaceIconField>

      <MarketplaceIconField icon={Users} label="Hóspedes" srOnly>
        <GlassInput
          className={marketplaceInputWithIconClass}
          defaultValue={hospedes}
          min={1}
          name="hospedes"
          placeholder="Hóspedes"
          type="number"
        />
      </MarketplaceIconField>

      {compact ? (
        <MarketplaceIconField icon={SlidersHorizontal} label="Tipo" srOnly>
          <select
            className={marketplaceSelectWithIconClass}
            defaultValue={tipo ?? ""}
            name="tipo"
          >
            <option value="">Tipos</option>
            <option value="seasonal_home">Casas</option>
            <option value="inn">Pousadas</option>
            <option value="small_hotel">Hotéis compactos</option>
          </select>
        </MarketplaceIconField>
      ) : null}

      {mostrarPreco ? (
        <>
          <MarketplacePlainField label="Preço mínimo" srOnly>
            <GlassInput
              className={marketplaceInputPlainClass}
              defaultValue={precoMinimo}
              min={0}
              name="precoMinimo"
              placeholder="Min."
              type="number"
            />
          </MarketplacePlainField>
          <MarketplacePlainField label="Preço máximo" srOnly>
            <GlassInput
              className={marketplaceInputPlainClass}
              defaultValue={precoMaximo}
              min={0}
              name="precoMaximo"
              placeholder="Max."
              type="number"
            />
          </MarketplacePlainField>
        </>
      ) : null}

      <GlassButton className="h-12" size="lg" type="submit">
        <Search className="h-4 w-4" />
        {compact ? "Buscar" : "Buscar hospedagens"}
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
