"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { PermissionCode } from "@hospedex/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hospedex/ui";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import type { ContextoAutenticacao } from "../../lib/auth/types";
import { criarClienteSupabaseBrowser } from "../../lib/supabase/client";
import { supabaseEstaConfigurado } from "../../lib/supabase/env";

type ValorContextoAutenticacao = {
  contexto: ContextoAutenticacao | null;
  carregando: boolean;
  erro: string | null;
  featureHabilitada: (chave: string) => boolean;
  possuiPermissao: (permissao: PermissionCode) => boolean;
};

const ContextoReactAutenticacao =
  createContext<ValorContextoAutenticacao | null>(null);
const TEMPO_LIMITE_REVALIDACAO_MS = 8_000;
const EVENTOS_REVALIDACAO = new Set<AuthChangeEvent>([
  "SIGNED_IN",
  "TOKEN_REFRESHED",
  "USER_UPDATED",
]);
const ROTAS_PUBLICAS = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/nova-senha",
  "/auth/callback",
];

export type ProvedorAutenticacaoProps = {
  children: ReactNode;
  contextoInicial: ContextoAutenticacao | null;
};

/**
 * Provider cliente da sessão administrativa.
 *
 * O contexto completo vem do servidor para respeitar RLS e multi-tenant. No cliente,
 * revalidamos apenas a sessão do Supabase em eventos de foco/refresh, sem reload
 * forçado, para evitar loop de loading ao voltar para a aba.
 */
export function ProvedorAutenticacao({
  children,
  contextoInicial,
}: ProvedorAutenticacaoProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [contexto, setContexto] = useState<ContextoAutenticacao | null>(
    contextoInicial,
  );
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const idRevalidacaoRef = useRef(0);
  const revalidacaoAtivaRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rotaPublica = useMemo(
    () => ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota)),
    [pathname],
  );

  const limparTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const invalidarSessaoLocal = useCallback(
    (mensagem?: string) => {
      limparTimeout();
      idRevalidacaoRef.current += 1;
      revalidacaoAtivaRef.current = false;
      setCarregando(false);
      setContexto(null);
      if (mensagem) setErro(mensagem);
      if (!rotaPublica) router.replace("/login?message=Sessao expirada.");
    },
    [limparTimeout, rotaPublica, router],
  );

  const validarSessaoCliente = useCallback(
    (opcoes?: { forcar?: boolean; atualizarServidor?: boolean }) => {
      if (!supabaseEstaConfigurado()) {
        setErro("Supabase nao configurado para autenticacao.");
        return;
      }

      if (revalidacaoAtivaRef.current && !opcoes?.forcar) return;

      const idRevalidacao = idRevalidacaoRef.current + 1;
      idRevalidacaoRef.current = idRevalidacao;
      revalidacaoAtivaRef.current = true;
      setCarregando(true);
      setErro(null);
      limparTimeout();

      timeoutRef.current = setTimeout(() => {
        if (idRevalidacaoRef.current !== idRevalidacao) return;

        // Ao expirar, a tentativa antiga é invalidada para que resposta tardia
        // do Supabase não limpe o erro nem recoloque a tela em loading.
        idRevalidacaoRef.current += 1;
        revalidacaoAtivaRef.current = false;
        setCarregando(false);
        setErro("Não foi possível carregar sua sessão.");
      }, TEMPO_LIMITE_REVALIDACAO_MS);

      const supabase = criarClienteSupabaseBrowser();
      void supabase.auth
        .getSession()
        .then(
          ({
            data,
            error,
          }: {
            data: { session: Session | null };
            error: Error | null;
          }) => {
            if (idRevalidacaoRef.current !== idRevalidacao) return;
            if (error) throw error;

            if (!data.session) {
              if (rotaPublica) {
                setContexto(null);
                setErro(null);
                return;
              }

              invalidarSessaoLocal("Não foi possível carregar sua sessão.");
              return;
            }

            setErro(null);
            if (opcoes?.atualizarServidor) router.refresh();
          },
        )
        .catch((erroRevalidacao: unknown) => {
          if (idRevalidacaoRef.current !== idRevalidacao) return;

          console.error(
            "Falha ao revalidar sessao no cliente.",
            erroRevalidacao,
          );
          setErro("Não foi possível carregar sua sessão.");
        })
        .finally(() => {
          if (idRevalidacaoRef.current !== idRevalidacao) return;

          limparTimeout();
          revalidacaoAtivaRef.current = false;
          setCarregando(false);
        });
    },
    [invalidarSessaoLocal, limparTimeout, rotaPublica, router],
  );

  const sairEEntrarNovamente = useCallback(() => {
    if (!supabaseEstaConfigurado()) {
      router.replace("/login");
      return;
    }

    setCarregando(true);
    const supabase = criarClienteSupabaseBrowser();
    void supabase.auth.signOut().finally(() => {
      invalidarSessaoLocal();
      router.replace("/login");
    });
  }, [invalidarSessaoLocal, router]);

  useEffect(() => {
    if (!supabaseEstaConfigurado()) return;

    const supabase = criarClienteSupabaseBrowser();
    const { data } = supabase.auth.onAuthStateChange(
      (evento: AuthChangeEvent, sessao: Session | null) => {
        if (evento === "SIGNED_OUT" || !sessao) {
          invalidarSessaoLocal();
          return;
        }

        if (EVENTOS_REVALIDACAO.has(evento)) validarSessaoCliente();
      },
    );

    function revalidarAoVoltarFoco() {
      if (document.visibilityState === "visible") validarSessaoCliente();
    }

    document.addEventListener("visibilitychange", revalidarAoVoltarFoco);
    window.addEventListener("focus", revalidarAoVoltarFoco);

    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", revalidarAoVoltarFoco);
      window.removeEventListener("focus", revalidarAoVoltarFoco);
      limparTimeout();
      idRevalidacaoRef.current += 1;
      revalidacaoAtivaRef.current = false;
    };
  }, [invalidarSessaoLocal, limparTimeout, validarSessaoCliente]);

  const valor = useMemo<ValorContextoAutenticacao>(
    () => ({
      contexto,
      carregando,
      erro,
      featureHabilitada(chave) {
        // Feature ausente fica desabilitada para evitar liberar módulos por acidente.
        return Boolean(contexto?.featureFlags[chave]);
      },
      possuiPermissao(permissao) {
        // Proprietário e super admin representam o topo da hierarquia do tenant.
        return Boolean(
          contexto?.role === "owner" ||
          contexto?.role === "super_admin" ||
          contexto?.permissions.includes(permissao),
        );
      },
    }),
    [carregando, contexto, erro],
  );

  useEffect(() => {
    if (!supabaseEstaConfigurado()) {
      setErro("Supabase nao configurado para autenticacao.");
      return;
    }

    setErro(null);
  }, []);

  if (erro && !rotaPublica) {
    return (
      <TelaErroSessao
        carregando={carregando}
        onSair={sairEEntrarNovamente}
        onTentarNovamente={() =>
          validarSessaoCliente({ atualizarServidor: true, forcar: true })
        }
      />
    );
  }

  return (
    <ContextoReactAutenticacao.Provider value={valor}>
      {children}
    </ContextoReactAutenticacao.Provider>
  );
}

export function usarAutenticacao() {
  const contexto = useContext(ContextoReactAutenticacao);

  if (!contexto) {
    throw new Error("Provider de autenticacao nao encontrado.");
  }

  return contexto;
}

type TelaErroSessaoProps = {
  carregando: boolean;
  onSair: () => void;
  onTentarNovamente: () => void;
};

function TelaErroSessao({
  carregando,
  onSair,
  onTentarNovamente,
}: TelaErroSessaoProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Não foi possível carregar sua sessão.</CardTitle>
          <CardDescription>
            A revalidação da sessão demorou mais que o esperado. Tente novamente
            ou entre de novo para renovar os cookies do Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button
            disabled={carregando}
            onClick={onTentarNovamente}
            type="button"
          >
            Tentar novamente
          </Button>
          <Button
            disabled={carregando}
            onClick={onSair}
            type="button"
            variant="outline"
          >
            Sair e entrar novamente
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
