import catalogo from "./catalog.json";

import type { UserRole } from "@hospedex/types";

export type TutorialKind = "module" | "onboarding";
export type TutorialTourKey =
  | "calendar"
  | "cleaning"
  | "dashboard"
  | "extra-services"
  | "finance"
  | "guests"
  | "integrations"
  | "marketplace"
  | "onboarding:initial"
  | "properties"
  | "reports"
  | "reservations"
  | "settings"
  | "team";

export type TutorialTourStep = {
  content: string;
  id: string;
  placement?: "auto" | "bottom" | "left" | "right" | "top";
  route: string;
  targetId: string;
  title: string;
};

export type TutorialTourDefinition = {
  description: string;
  durationMinutes: number;
  icon: string;
  key: TutorialTourKey;
  kind: TutorialKind;
  roles: UserRole[];
  route: string;
  steps: TutorialTourStep[];
  title: string;
  version: number;
};

/**
 * Catálogo único dos tutoriais da V2.
 *
 * Conteúdo, versão e alvos ficam centralizados para impedir que convites,
 * Central de Ajuda e Joyride apresentem instruções divergentes.
 */
export const TUTORIAL_CATALOG = catalogo as TutorialTourDefinition[];

export const TUTORIAL_TOURS = Object.fromEntries(
  TUTORIAL_CATALOG.map((tutorial) => [tutorial.key, tutorial]),
) as Record<TutorialTourKey, TutorialTourDefinition>;

export function obterTutorialPorRota(pathname: string) {
  if (pathname === "/ajuda") return null;

  return (
    TUTORIAL_CATALOG.find(
      (tutorial) =>
        tutorial.kind === "module" &&
        (tutorial.route === "/"
          ? pathname === "/"
          : pathname === tutorial.route || pathname.startsWith(`${tutorial.route}/`)),
    ) ?? null
  );
}

export function obterTutorial(tutorialKey: string) {
  return TUTORIAL_CATALOG.find((tutorial) => tutorial.key === tutorialKey) ?? null;
}
