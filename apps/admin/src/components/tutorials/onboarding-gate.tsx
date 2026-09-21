"use client";

import { useEffect, useState, useTransition } from "react";
import { LifeBuoy, PlayCircle, Sparkles } from "lucide-react";

import { Button } from "@hospedex/ui";

import { dispensarBoasVindasAction } from "../../lib/tutorials/actions";
import type { TutorialTourKey } from "../../lib/tutorials/tour-registry";
import type { TutorialResumoGerenciamento } from "../../lib/tutorials/types";
import { AppModal } from "../management/entity-modal";

export function OnboardingGate({
  onStartTour,
  resumo,
}: {
  onStartTour: (tourKey: TutorialTourKey) => void;
  resumo: TutorialResumoGerenciamento | null;
}) {
  const [visivel, setVisivel] = useState(Boolean(resumo?.mostrarBoasVindas));
  const [pendente, startTransition] = useTransition();

  useEffect(() => setVisivel(Boolean(resumo?.mostrarBoasVindas)), [resumo?.mostrarBoasVindas]);
  if (!resumo) return null;

  function fechar() {
    setVisivel(false);
    startTransition(() => void dispensarBoasVindasAction());
  }

  function iniciar() {
    setVisivel(false);
    onStartTour("onboarding:initial");
  }

  return (
    <AppModal
      description="Uma apresentação curta, sem executar nenhuma ação por você."
      eyebrow="Primeiro acesso"
      onOpenChange={(open) => !open && fechar()}
      open={visivel}
      size="md"
      title={`Bem-vindo, ${resumo.usuarioNome}`}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Navegue com segurança", "Conheça menu, contexto ativo e módulos disponíveis."],
            ["Aprenda por módulo", "Cada área possui um guia curto e retomável."],
            ["Consulte quando quiser", "A Central de Ajuda mantém todo o progresso."],
          ].map(([titulo, texto]) => (
            <div className="rounded-xl border bg-background/55 p-3" key={titulo}>
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="mt-2 text-sm font-semibold">{titulo}</p>
              <p className="mt-1 text-xs text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button disabled={pendente} onClick={iniciar} type="button">
            <PlayCircle className="mr-2 h-4 w-4" />
            Iniciar apresentação
          </Button>
          <Button disabled={pendente} onClick={fechar} type="button" variant="outline">
            <LifeBuoy className="mr-2 h-4 w-4" />
            Ver depois
          </Button>
        </div>
      </div>
    </AppModal>
  );
}
