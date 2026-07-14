"use client";

import { useEffect, useMemo, useState } from "react";

import { criarClienteSupabaseBrowser } from "../../lib/supabase/client";

export type PerfilHospedeMenu = {
  avatar_url: string | null;
  email: string;
  full_name: string | null;
};

/**
 * Carrega o perfil do hóspede autenticado para os menus públicos.
 *
 * A consulta fica no client apenas para personalizar a navegacao. A protecao
 * real das reservas continua nas Server Components e nas policies RLS.
 */
export function useGuestProfile() {
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilHospedeMenu | null>(null);

  useEffect(() => {
    const supabase = criarClienteSupabaseBrowser();
    if (!supabase) {
      setCarregando(false);
      return;
    }

    const clienteSupabase = supabase;
    let ativo = true;

    async function carregarPerfil() {
      const { data: usuarioResultado } = await clienteSupabase.auth.getUser();
      const usuario = usuarioResultado.user;

      if (!usuario) {
        if (ativo) {
          setPerfil(null);
          setCarregando(false);
        }
        return;
      }

      const { data } = await clienteSupabase
        .from("profiles")
        .select("full_name,email,avatar_url")
        .eq("id", usuario.id)
        .maybeSingle<PerfilHospedeMenu>();

      if (ativo) {
        setPerfil(
          data ?? {
            avatar_url: null,
            email: usuario.email ?? "",
            full_name: usuario.email ?? "Hóspede"
          }
        );
        setCarregando(false);
      }
    }

    void carregarPerfil();

    const {
      data: { subscription }
    } = clienteSupabase.auth.onAuthStateChange(() => {
      void carregarPerfil();
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  const iniciais = useMemo(() => obterIniciaisHospede(perfil), [perfil]);

  return { carregando, iniciais, perfil };
}

export function obterIniciaisHospede(perfil: PerfilHospedeMenu | null) {
  const base = perfil?.full_name || perfil?.email || "Hóspede";
  return base
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

export async function sairHospede() {
  const supabase = criarClienteSupabaseBrowser();
  await supabase?.auth.signOut();
  window.location.href = "/login";
}
