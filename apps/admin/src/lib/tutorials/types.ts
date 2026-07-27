import type { TutorialKind, TutorialTourKey, TutorialTourStep } from "./tour-registry";

export type TutorialStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "dismissed"
  | "updated";

export type TutorialInvitationStatus = "pending" | "later" | "never" | "started";

export type TutorialProgressRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  tutorial_key: string;
  tutorial_version: number;
  status: Exclude<TutorialStatus, "updated">;
  current_step: number;
  completed_steps: string[];
  invitation_status: TutorialInvitationStatus | null;
  invitation_decided_at: string | null;
  restarted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TutorialCard = {
  completedAt: string | null;
  completedSteps: string[];
  currentStep: number;
  description: string;
  durationMinutes: number;
  icon: string;
  invitationStatus: TutorialInvitationStatus;
  key: TutorialTourKey;
  kind: TutorialKind;
  progress: number;
  route: string;
  status: TutorialStatus;
  stepCount: number;
  steps: TutorialTourStep[];
  title: string;
  version: number;
};

export type TutorialResumoGerenciamento = {
  progressoGeral: number;
  mostrarBoasVindas: boolean;
  storageScope: string;
  tours: TutorialCard[];
  usuarioNome: string;
};
