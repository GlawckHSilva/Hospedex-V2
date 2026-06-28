import type { NavigationItem } from "@hospedex/types";

export const marketplaceNavigation = [
  {
    label: "Inicio",
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
    label: "Minhas reservas",
    href: "/minhas-reservas"
  },
  {
    label: "Proprietarios",
    href: "/#proprietarios"
  }
] as const satisfies readonly NavigationItem[];
