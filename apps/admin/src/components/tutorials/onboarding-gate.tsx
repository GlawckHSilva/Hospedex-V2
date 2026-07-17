"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, LifeBuoy, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@hospedex/ui";

import { confirmarConclusaoOnboardingAction, dispensarBoasVindasAction } from "../../lib/tutorials/actions";
import type { TutorialTourKey } from "../../lib/tutorials/tour-registry";
import type { TutorialResumoGerenciamento } from "../../lib/tutorials/types";
import { AppModal } from "../management/entity-modal";

export function OnboardingGate({
  onStartTour,
  resumo
}: {
  onStartTour: (tourKey: TutorialTourKey) => void;
  resumo: TutorialResumoGerenciamento | null;
}) {
  const router = useRouter();
  const [visivel, setVisivel] = useState(Boolean(resumo?.mostrarBoasVindas));
  const [conclusaoVisivel, setConclusaoVisivel] = useState(Boolean(resumo?.mostrarConfirmacaoConclusao));
  const [pendente, startTransition] = useTransition();
  const confirmacaoEnviada = useRef(false);

  useEffect(() => {
    setVisivel(Boolean(resumo?.mostrarBoasVindas));
    setConclusaoVisivel(Boolean(resumo?.mostrarConfirmacaoConclusao));
  }, [resumo?.mostrarBoasVindas, resumo?.mostrarConfirmacaoConclusao]);

  if (!resumo) return null;

  function fechar() {
    setVisivel(false);
    startTransition(() => void dispensarBoasVindasAction());
  }

  function iniciar(tourKey: TutorialTourKey) {
    fechar();
    onStartTour(tourKey);
  }

  function fecharConclusao(destino?: string) {
    setConclusaoVisivel(false);
    if (confirmacaoEnviada.current) return;
    confirmacaoEnviada.current = true;
    startTransition(async () => {
      await confirmarConclusaoOnboardingAction();
      if (destino) router.push(destino);
    });
  }

  if (conclusaoVisivel) {
    return (
      <AppModal
        description="Sua conta está configurada. Você pode rever os primeiros passos quando quiser na Central de Ajuda."
        eyebrow="Configuração concluída"
        onOpenChange={(open) => {
          if (!open) fecharConclusao();
        }}
        open
        size="sm"
        title="Configuração inicial concluída"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            disabled={pendente}
            onClick={() => fecharConclusao("/ajuda")}
            type="button"
          >
            <LifeBuoy className="mr-2 h-4 w-4" />
            Abrir Central de Ajuda
          </Button>
          <Button disabled={pendente} onClick={() => fecharConclusao()} type="button" variant="outline">
            Fechar
          </Button>
        </div>
      </AppModal>
    );
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
          <Button disabled={pendente} onClick={() => iniciar("properties:first-property:v1")} type="button">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Começar configuração
          </Button>
          <Button disabled={pendente} onClick={() => iniciar("dashboard:introduction:v1")} type="button" variant="outline">
            Conhecer o painel
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
