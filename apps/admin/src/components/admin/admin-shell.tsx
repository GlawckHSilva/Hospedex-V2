"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BedDouble,
  Building2,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  Flag,
  Home,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Menu,
  PackageCheck,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
  type LucideIcon
} from "lucide-react";

import { Badge, Button, ThemeToggle, cn } from "@hospedex/ui";

import {
  obterMenuAdmin,
  obterPerfilMenuAdmin,
  obterTituloPerfilAdmin,
  type IconeMenuAdmin,
  type ItemMenuAdminResolvido
} from "../../config/navigation";
import type { ContextoAutenticacao } from "../../lib/auth/types";
import type { ResumoNotificacoesGerenciamento } from "../../lib/notifications/types";
import { NotificationBell } from "../notifications/notification-bell";

const ICONES_MENU: Record<IconeMenuAdmin, LucideIcon> = {
  auditoria: ClipboardCheck,
  avaliacoes: Star,
  calendario: CalendarDays,
  confirmacoes: ClipboardCheck,
  configuracoes: Settings,
  dashboard: LayoutDashboard,
  featureFlags: Flag,
  financeiro: CreditCard,
  funcionarios: Users,
  guiaRegiao: MapPin,
  hospedes: Users,
  inventario: PackageCheck,
  licencas: KeyRound,
  limpeza: Sparkles,
  planos: ReceiptText,
  proprietarios: Building2,
  propriedades: Home,
  relatorios: FileBarChart,
  reservas: BedDouble,
  servicosExtras: ReceiptText,
  unidades: BarChart3
};

export type AdminShellProps = {
  acaoSair: ReactNode;
  children: ReactNode;
  contexto: ContextoAutenticacao;
  notificacoes: ResumoNotificacoesGerenciamento;
};

/**
 * Shell visual do painel administrativo.
 *
 * A navegação é calculada a partir do contexto multi-tenant recebido do servidor,
 * garantindo que funcionário, proprietário e super admin vejam estruturas distintas.
 */
export function AdminShell({ acaoSair, children, contexto, notificacoes }: AdminShellProps) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const itensMenu = obterMenuAdmin(contexto);
  const perfil = obterPerfilMenuAdmin(contexto.role);
  const tituloPerfil = obterTituloPerfilAdmin(perfil);
  const nomeUsuario = contexto.profile.full_name ?? contexto.profile.email;
  const nomeTenant = perfil === "super_admin" ? "Plataforma" : contexto.tenant?.name ?? "Sem tenant";

  return (
    <div className="admin-shell-bg premium-grid-bg min-h-screen text-foreground">
      <TopbarAdmin
        acaoSair={acaoSair}
        nomeTenant={nomeTenant}
        nomeUsuario={nomeUsuario}
        notificacoes={notificacoes}
        onAbrirMenu={() => setMenuAberto(true)}
        tituloPerfil={tituloPerfil}
      />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[264px_1fr]">
        <SidebarAdmin itens={itensMenu} pathname={pathname} tituloPerfil={tituloPerfil} />

        <motion.main
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {children}
        </motion.main>
      </div>

      <AnimatePresence>
        {menuAberto ? (
          <MenuMobileAdmin
            itens={itensMenu}
            onFechar={() => setMenuAberto(false)}
            pathname={pathname}
            tituloPerfil={tituloPerfil}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type TopbarAdminProps = {
  acaoSair: ReactNode;
  nomeTenant: string;
  nomeUsuario: string;
  notificacoes: ResumoNotificacoesGerenciamento;
  onAbrirMenu: () => void;
  tituloPerfil: string;
};

function TopbarAdmin({
  acaoSair,
  nomeTenant,
  nomeUsuario,
  notificacoes,
  onAbrirMenu,
  tituloPerfil
}: TopbarAdminProps) {
  return (
    <header className="glass-navbar sticky top-0 z-40 bg-background/72">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Abrir menu"
            className="lg:hidden"
            onClick={onAbrirMenu}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Menu />
          </Button>

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/40 bg-cyan-400/15 text-cyan-700 shadow-sm shadow-cyan-500/10 dark:text-cyan-200">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Admin Hospedex</p>
              <p className="truncate text-xs text-muted-foreground">{nomeTenant}</p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <Badge className="hidden sm:inline-flex" variant="info">
            {tituloPerfil}
          </Badge>
          <div className="hidden min-w-0 text-right md:block">
            <p className="truncate text-sm font-medium">{nomeUsuario}</p>
            <p className="text-xs text-muted-foreground">Contexto ativo</p>
          </div>
          <ThemeToggle />
          {tituloPerfil !== "Super Admin" ? <NotificationBell resumo={notificacoes} /> : null}
          {acaoSair}
        </div>
      </div>
    </header>
  );
}

type SidebarAdminProps = {
  itens: ItemMenuAdminResolvido[];
  pathname: string;
  tituloPerfil: string;
};

function SidebarAdmin({ itens, pathname, tituloPerfil }: SidebarAdminProps) {
  return (
    <aside className="hidden lg:block">
      <div className="glass-sidebar sticky top-21 h-[calc(100vh-6.5rem)] overflow-hidden p-3">
        <div className="mb-4 px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
            {tituloPerfil}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Navegação por perfil</p>
        </div>
        <nav className="space-y-1 overflow-y-auto pr-1">
          {itens.map((item) => (
            <ItemMenu key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>
    </aside>
  );
}

type MenuMobileAdminProps = SidebarAdminProps & {
  onFechar: () => void;
};

function MenuMobileAdmin({ itens, onFechar, pathname, tituloPerfil }: MenuMobileAdminProps) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm lg:hidden"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <motion.aside
        animate={{ x: 0 }}
        className="glass-sidebar h-full w-[min(22rem,88vw)] rounded-none border-y-0 border-l-0 p-4 shadow-xl"
        exit={{ x: "-100%" }}
        initial={{ x: "-100%" }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{tituloPerfil}</p>
            <p className="text-xs text-muted-foreground">Menu administrativo</p>
          </div>
          <Button aria-label="Fechar menu" onClick={onFechar} size="icon" type="button" variant="ghost">
            <X />
          </Button>
        </div>

        <nav className="space-y-1">
          {itens.map((item) => (
            <ItemMenu key={item.href} item={item} onNavigate={onFechar} pathname={pathname} />
          ))}
        </nav>
      </motion.aside>
    </motion.div>
  );
}

type ItemMenuProps = {
  item: ItemMenuAdminResolvido;
  onNavigate?: () => void;
  pathname: string;
};

function ItemMenu({ item, onNavigate, pathname }: ItemMenuProps) {
  const ativo = pathname === item.href;
  const Icone = ICONES_MENU[item.icone];
  const conteudo = (
    <>
      <Icone className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.titulo}</span>
      {item.bloqueadoPorFeatureFlag ? (
        <span className="rounded-md border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
          flag
        </span>
      ) : null}
    </>
  );
  const classes = cn(
    "flex h-10 items-center gap-2 rounded-lg px-3 text-sm transition duration-200 hover:translate-x-0.5",
    ativo
      ? "bg-cyan-500/14 text-cyan-800 ring-1 ring-cyan-400/30 dark:text-cyan-100"
      : "text-muted-foreground hover:bg-cyan-500/10 hover:text-foreground",
    item.bloqueadoPorFeatureFlag && "cursor-not-allowed opacity-55 hover:bg-transparent"
  );

  if (item.bloqueadoPorFeatureFlag) {
    return (
      <span aria-disabled="true" className={classes} title="Feature flag desabilitada">
        {conteudo}
      </span>
    );
  }

  return (
    <Link className={classes} href={item.href} {...(onNavigate ? { onClick: onNavigate } : {})}>
      {conteudo}
    </Link>
  );
}
