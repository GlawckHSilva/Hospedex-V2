export type TutorialStatus = "not_started" | "in_progress" | "completed" | "dismissed";

export type TutorialProgressRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  tutorial_key: string;
  tutorial_version: number;
  status: TutorialStatus;
  current_step: number;
  completed_steps: string[];
  started_at: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
  updated_at: string;
};

export type TutorialEtapa = {
  id: string;
  titulo: string;
  descricao: string;
  href: string;
  dataTour?: string;
  concluida: boolean;
  bloqueada?: boolean;
};

export type TutorialResumoGerenciamento = {
  checklist: TutorialEtapa[];
  progresso: number;
  mostrarBoasVindas: boolean;
  somenteLeitura: boolean;
  tutorialKey: string;
  usuarioNome: string;
};
