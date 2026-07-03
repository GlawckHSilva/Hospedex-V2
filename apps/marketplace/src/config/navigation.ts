import type { NavigationItem } from "@hospedex/types";

export const marketplaceNavigation = [
  {
    label: "Início",
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
    href: "/anunciar"
  }
] as const satisfies readonly NavigationItem[];
