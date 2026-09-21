export const TUTORIAL_INICIAL_KEY = "onboarding:initial" as const;

// Mantidos apenas para impedir que usuários antigos recebam novamente as boas-vindas.
export const TUTORIAL_LEGACY_KEYS = [
  "boas-vindas-gerenciamento",
  "gerenciamento-primeiros-passos",
] as const;
