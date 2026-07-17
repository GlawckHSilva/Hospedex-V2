export const TOUR_ANCHORS = {
  ajudaContextual: "ajuda-contextual",
  casasLista: "casas-lista",
  casasNova: "casas-nova",
  dashboardFinanceiro: "dashboard-financeiro",
  dashboardReservas: "dashboard-reservas",
  menuCasas: "menu-casas",
  menuPrincipal: "menu-principal",
  menuReservas: "menu-reservas",
  reservasStatus: "reservas-status"
} as const;

export type TutorialTourKey =
  | "dashboard:introduction:v1"
  | "properties:first-property:v1"
  | "reservations:first-request:v1";

export type TutorialTourStep = {
  id: string;
  route: string;
  targetId: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right" | "auto";
};

export type TutorialTourDefinition = {
  key: TutorialTourKey;
  title: string;
  description: string;
  duration: string;
  steps: TutorialTourStep[];
};

export const TUTORIAL_TOURS: Record<TutorialTourKey, TutorialTourDefinition> = {
  "dashboard:introduction:v1": {
    key: "dashboard:introduction:v1",
    title: "Conheça o painel",
    description: "Resumo rápido dos principais pontos do Dashboard.",
    duration: "2 min",
    steps: [
      {
        id: "menu",
        route: "/",
        targetId: TOUR_ANCHORS.menuPrincipal,
        title: "Menu principal",
        content: "Use a navegação lateral para acessar casas, reservas, calendário e financeiro.",
        placement: "right"
      },
      {
        id: "reservas",
        route: "/",
        targetId: TOUR_ANCHORS.dashboardReservas,
        title: "Resumo de reservas",
        content: "Aqui você acompanha reservas do mês e próximas movimentações.",
        placement: "bottom"
      },
      {
        id: "financeiro",
        route: "/",
        targetId: TOUR_ANCHORS.dashboardFinanceiro,
        title: "Indicadores financeiros",
        content: "Receita e pagamentos aparecem quando houver movimentações confirmadas.",
        placement: "bottom"
      },
      {
        id: "casas",
        route: "/",
        targetId: TOUR_ANCHORS.menuCasas,
        title: "Acesse suas casas",
        content: "Comece cadastrando ou revisando as hospedagens do seu tenant.",
        placement: "right"
      },
      {
        id: "ajuda",
        route: "/",
        targetId: TOUR_ANCHORS.ajudaContextual,
        title: "Ajuda contextual",
        content: "A central de ajuda permite iniciar ou rever tutoriais quando precisar.",
        placement: "bottom"
      }
    ]
  },
  "properties:first-property:v1": {
    key: "properties:first-property:v1",
    title: "Cadastrar primeira casa",
    description: "Entenda a lista, o botão de cadastro e a publicação.",
    duration: "2 min",
    steps: [
      {
        id: "lista",
        route: "/propriedades",
        targetId: TOUR_ANCHORS.casasLista,
        title: "Casas cadastradas",
        content: "Esta tela concentra hospedagens, rascunhos, publicação e edição.",
        placement: "bottom"
      },
      {
        id: "nova",
        route: "/propriedades",
        targetId: TOUR_ANCHORS.casasNova,
        title: "Nova casa",
        content: "Cadastre dados principais, fotos, valores e regras. Você pode salvar como rascunho.",
        placement: "left"
      }
    ]
  },
  "reservations:first-request:v1": {
    key: "reservations:first-request:v1",
    title: "Analisar reservas",
    description: "Localize status e ações importantes de reservas.",
    duration: "2 min",
    steps: [
      {
        id: "menu",
        route: "/",
        targetId: TOUR_ANCHORS.menuReservas,
        title: "Reservas",
        content: "Acesse a central completa para histórico, pagamentos e detalhes.",
        placement: "right"
      },
      {
        id: "status",
        route: "/reservas",
        targetId: TOUR_ANCHORS.reservasStatus,
        title: "Status da reserva",
        content: "Use filtros e abas para separar solicitações, aguardando pagamento e reservas confirmadas.",
        placement: "bottom"
      }
    ]
  }
};
