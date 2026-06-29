import type { NavigationItem } from "@hospedex/types";

export const marketplaceNavigation = [
  {
    label: "Inicio",
    href: "/"
  },
  {
    label: "Hospedagens",
    href: "/propriedades"
  },
  {
    label: "Destinos",
    href: "/#destinos"
  },
  {
    label: "Anunciar",
    href: "/#proprietarios"
  }
] as const satisfies readonly NavigationItem[];
