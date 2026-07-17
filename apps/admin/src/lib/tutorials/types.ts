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
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TutorialEtapa = {
  id: string;
  actionLabel: string;
  titulo: string;
  descricao: string;
  href: string;
  tourKey: string;
  dataTour?: string;
  concluida: boolean;
  bloqueada?: boolean;
};

export type TutorialResumoGerenciamento = {
  checklist: TutorialEtapa[];
  completedAt: string | null;
  progresso: number;
  mostrarChecklist: boolean;
  mostrarBoasVindas: boolean;
  mostrarConfirmacaoConclusao: boolean;
  somenteLeitura: boolean;
  status: TutorialStatus;
  storageScope: string;
  tutorialKey: string;
  tours: TutorialCard[];
  usuarioNome: string;
};

export type TutorialCard = {
  key: string;
  title: string;
  description: string;
  duration: string;
  status: TutorialStatus;
};
