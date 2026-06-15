"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import type { PermissionCode } from "@hospedex/types";

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

const ContextoReactAutenticacao = createContext<ValorContextoAutenticacao | null>(null);

export type ProvedorAutenticacaoProps = {
  children: ReactNode;
  contextoInicial: ContextoAutenticacao | null;
};

/**
 * Provider cliente da sessão administrativa.
 *
 * O contexto completo vem do servidor para respeitar RLS e multi-tenant. No cliente,
 * escutamos mudanças de sessão apenas para limpar estado ou recarregar o contexto
 * quando o Supabase renovar login/senha.
 */
export function ProvedorAutenticacao({
  children,
  contextoInicial
}: ProvedorAutenticacaoProps) {
  const [contexto, setContexto] = useState<ContextoAutenticacao | null>(contextoInicial);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseEstaConfigurado()) return;

    const supabase = criarClienteSupabaseBrowser();
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === "SIGNED_OUT" || !sessao) {
        setContexto(null);
        return;
      }

      if (evento === "SIGNED_IN" || evento === "TOKEN_REFRESHED" || evento === "USER_UPDATED") {
        setCarregando(true);
        window.location.reload();
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

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
            contexto?.permissions.includes(permissao)
        );
      }
    }),
    [carregando, contexto, erro]
  );

  useEffect(() => {
    if (!supabaseEstaConfigurado()) {
      setErro("Supabase não configurado para autenticação.");
      return;
    }

    setErro(null);
  }, []);

  return (
    <ContextoReactAutenticacao.Provider value={valor}>
      {children}
    </ContextoReactAutenticacao.Provider>
  );
}

export function usarAutenticacao() {
  const contexto = useContext(ContextoReactAutenticacao);

  if (!contexto) {
    throw new Error("Provider de autenticação não encontrado.");
  }

  return contexto;
}
