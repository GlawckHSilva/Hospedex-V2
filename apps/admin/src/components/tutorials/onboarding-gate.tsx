"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, LifeBuoy, Sparkles } from "lucide-react";

import { Button } from "@hospedex/ui";

import { dispensarBoasVindasAction } from "../../lib/tutorials/actions";
import type { TutorialResumoGerenciamento } from "../../lib/tutorials/types";
import { AppModal } from "../management/entity-modal";

export function OnboardingGate({ resumo }: { resumo: TutorialResumoGerenciamento | null }) {
  const [visivel, setVisivel] = useState(Boolean(resumo?.mostrarBoasVindas));
  const [pendente, startTransition] = useTransition();

  if (!resumo) return null;

  function fechar() {
    setVisivel(false);
    startTransition(() => void dispensarBoasVindasAction());
  }

  return (
    <AppModal
      description="Use este guia para configurar o Gerenciamento sem perder o contexto."
      eyebrow="Primeiros passos"
      onOpenChange={(open) => {
        if (!open) fechar();
      }}
      open={visivel}
      size="md"
      title={`Bem-vindo, ${resumo.usuarioNome}`}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Configure sua conta", "Dados, módulos e formas de pagamento."],
            ["Cadastre casas", "Fotos, valores, regras e publicação."],
            ["Acompanhe reservas", "Pendências, calendário e financeiro."]
          ].map(([titulo, texto]) => (
            <div className="rounded-xl border bg-background/55 p-3" key={titulo}>
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="mt-2 text-sm font-semibold">{titulo}</p>
              <p className="mt-1 text-xs text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
        {resumo.somenteLeitura ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-100">
            Sua licença está em modo somente leitura. O tutorial continua disponível, mas novas ações ficam bloqueadas até a regularização.
          </div>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            disabled={pendente}
            onClick={fechar}
            type="button"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Começar
          </Button>
          <Button
            disabled={pendente}
            onClick={fechar}
            type="button"
            variant="outline"
          >
            <LifeBuoy className="mr-2 h-4 w-4" />
            Ver depois
          </Button>
        </div>
      </div>
    </AppModal>
  );
}
