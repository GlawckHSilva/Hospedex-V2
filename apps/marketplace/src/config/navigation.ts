import type { NavigationItem } from "@hospedex/types";

export const marketplaceNavigation = [
  {
    label: "Início",
    href: "/"
  },
  {
    label: "Destinos",
    href: "/#destinos"
  },
  {
    label: "Categorias",
    href: "/#categorias"
  },
  {
    label: "Hospedagens",
    href: "/propriedades"
  },
  {
    label: "Proprietários",
    href: "/#proprietarios"
  }
] as const satisfies readonly NavigationItem[];
