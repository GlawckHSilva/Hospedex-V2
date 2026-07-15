import Image from "next/image";
import Link from "next/link";

import { cn } from "@hospedex/ui";

type TamanhoMarcaHospedex = "sm" | "md" | "lg" | "xl";

export type HospedexBrandProps = {
  adaptarAoTema?: boolean;
  className?: string;
  href?: string;
  priority?: boolean;
  showText?: boolean;
  size?: TamanhoMarcaHospedex;
  surface?: boolean;
};

const TAMANHOS_MARCA: Record<
  TamanhoMarcaHospedex,
  { gap: string; logo: string; texto: string }
> = {
  sm: { gap: "gap-2", logo: "h-[34px] w-[34px]", texto: "text-lg" },
  md: { gap: "gap-2.5", logo: "h-10 w-10", texto: "text-xl" },
  lg: { gap: "gap-3", logo: "h-16 w-16", texto: "text-3xl" },
  xl: { gap: "gap-4", logo: "h-20 w-20", texto: "text-4xl" }
};

/**
 * Marca oficial da V2 do Hospedex.
 *
 * Centralizar a marca evita variacoes visuais entre login, loading, header e
 * sidebar. O texto segue a regra definida: "Hospe" em ciano e "dex" branco.
 */
export function HospedexBrand({
  adaptarAoTema = false,
  className,
  href,
  priority = false,
  showText = true,
  size = "md",
  surface = false
}: HospedexBrandProps) {
  const tamanho = TAMANHOS_MARCA[size];
  const conteudo = (
    <span
      className={cn(
        "inline-flex min-w-0 items-center",
        tamanho.gap,
        surface &&
          "rounded-2xl border border-cyan-300/20 bg-slate-950/80 px-2.5 py-1.5 shadow-sm shadow-cyan-950/20 backdrop-blur-xl",
        surface &&
          adaptarAoTema &&
          "border-slate-300 bg-white/85 shadow-slate-200/40 dark:border-cyan-300/20 dark:bg-slate-950/80 dark:shadow-cyan-950/20",
        className
      )}
    >
      <Image
        alt={showText ? "" : "Hospedex"}
        className={cn(
          "shrink-0 object-contain",
          adaptarAoTema && "brightness-0 dark:brightness-100",
          tamanho.logo
        )}
        height={853}
        priority={priority}
        src="/brand/hospedex-logo-white.png"
        width={853}
      />
      {showText ? (
        <span
          className={cn(
            "min-w-0 truncate font-bold leading-none tracking-normal",
            tamanho.texto
          )}
        >
          <span className={adaptarAoTema ? "text-cyan-700 dark:text-cyan-300" : "text-cyan-300"}>
            Hospe
          </span>
          <span className={adaptarAoTema ? "text-slate-900 dark:text-white" : "text-white"}>
            dex
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return conteudo;

  return (
    <Link aria-label="Ir para o painel Hospedex" href={href}>
      {conteudo}
    </Link>
  );
}
