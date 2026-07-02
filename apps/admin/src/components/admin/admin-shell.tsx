"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BedDouble,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileText,
  FileBarChart,
  Flag,
  Home,
  KeyRound,
  LayoutDashboard,
  Mail,
  MapPin,
  Menu,
  PackageCheck,
  PlugZap,
  ReceiptText,
  Settings,
  Sparkles,
  Star,
  UserRound,
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
import { HospedexBrand } from "../brand/hospedex-brand";
import { InteractiveCardEffects } from "../management/interactive-card";
import { NotificationBell } from "../notifications/notification-bell";

const ICONES_MENU: Record<IconeMenuAdmin, LucideIcon> = {
  auditoria: ClipboardCheck,
  avaliacoes: Star,
  calendario: CalendarDays,
  configuracoes: Settings,
  dashboard: LayoutDashboard,
  email: Mail,
  featureFlags: Flag,
  financeiro: CreditCard,
  funcionarios: Users,
  guiaRegiao: MapPin,
  hospedes: Users,
  inventario: PackageCheck,
  integracoes: PlugZap,
  licencas: KeyRound,
  limpeza: Sparkles,
  pendencias: ClipboardCheck,
  planos: ReceiptText,
  proprietarios: Building2,
  propriedades: Home,
  relatorios: FileBarChart,
  reservas: BedDouble,
  servicosExtras: ReceiptText,
  templatesEmail: FileText
};

export type AdminShellProps = {
  acaoSairMenu: ReactNode;
  acaoSairMobile: ReactNode;
  acaoSairSidebar: ReactNode;
  children: ReactNode;
  contexto: ContextoAutenticacao;
  logoConfiguracoesUrl: string | null;
  notificacoes: ResumoNotificacoesGerenciamento;
};

/**
 * Shell visual do painel administrativo.
 *
 * A navegação é calculada a partir do contexto multi-tenant recebido do servidor,
 * garantindo que funcionário, proprietário e super admin vejam estruturas distintas.
 */
export function AdminShell({
  acaoSairMenu,
  acaoSairMobile,
  acaoSairSidebar,
  children,
  contexto,
  logoConfiguracoesUrl,
  notificacoes
}: AdminShellProps) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const itensMenu = obterMenuAdmin(contexto);
  const perfil = obterPerfilMenuAdmin(contexto.role);
  const tituloPerfil = obterTituloPerfilAdmin(perfil);
  const nomeUsuario = contexto.profile.full_name ?? contexto.profile.email;
  const iniciaisUsuario = obterIniciaisUsuario(nomeUsuario, contexto.profile.email);
  const gerenciamento = perfil !== "super_admin";
  const avatarVisualUrl = gerenciamento
    ? logoConfiguracoesUrl ?? contexto.profile.avatar_url
    : contexto.profile.avatar_url;
  const configuracoesHref = gerenciamento ? "/configuracoes" : "/super-admin/configuracoes";

  return (
    <div
      className={cn(
        "admin-shell-bg premium-grid-bg dark min-h-screen text-foreground",
        // O ajuste visual de scrollbar pertence ao Gerenciamento, sem alterar a experiencia do Super Admin.
        "admin-management-shell",
      )}
      data-admin-perfil={perfil}
    >
      <InteractiveCardEffects />

      <TopbarAdmin
        acaoSairMenu={acaoSairMenu}
        avatarUrl={avatarVisualUrl}
        emailUsuario={contexto.profile.email}
        gerenciamento={gerenciamento}
        iniciaisUsuario={iniciaisUsuario}
        nomeUsuario={nomeUsuario}
        notificacoes={notificacoes}
        onAbrirMenu={() => setMenuAberto(true)}
        configuracoesHref={configuracoesHref}
        tituloPerfil={tituloPerfil}
      />

      <div className="grid w-full gap-6 px-4 py-4 sm:px-5 lg:grid-cols-[272px_minmax(0,1fr)] lg:px-4">
        <SidebarAdmin
          acaoSairSidebar={acaoSairSidebar}
          gerenciamento={gerenciamento}
          itens={itensMenu}
          pathname={pathname}
          tituloPerfil={tituloPerfil}
        />

        <motion.main
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0"
          // O conteudo principal precisa nascer visivel; se a animacao falhar,
          // o usuario nao pode ficar com a pagina carregada e invisivel.
          initial={false}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {children}
        </motion.main>
      </div>

      <AnimatePresence>
        {menuAberto ? (
          <MenuMobileAdmin
            acaoSairMobile={acaoSairMobile}
            gerenciamento={gerenciamento}
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
  acaoSairMenu: ReactNode;
  avatarUrl: string | null;
  emailUsuario: string;
  gerenciamento: boolean;
  iniciaisUsuario: string;
  nomeUsuario: string;
  notificacoes: ResumoNotificacoesGerenciamento;
  onAbrirMenu: () => void;
  configuracoesHref: string;
  tituloPerfil: string;
};

function TopbarAdmin({
  acaoSairMenu,
  avatarUrl,
  emailUsuario,
  gerenciamento,
  iniciaisUsuario,
  nomeUsuario,
  notificacoes,
  onAbrirMenu,
  configuracoesHref,
  tituloPerfil
}: TopbarAdminProps) {
  return (
    <header className="glass-navbar sticky top-0 z-40 bg-[#030712]/88">
      <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6">
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

          <div className={cn(gerenciamento && "lg:hidden")}>
            <HospedexBrand href={gerenciamento ? "/" : "/super-admin"} size="sm" surface />
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
          <PerfilUsuarioMenu
            acaoSairMenu={acaoSairMenu}
            avatarUrl={avatarUrl}
            configuracoesHref={configuracoesHref}
            emailUsuario={emailUsuario}
            iniciaisUsuario={iniciaisUsuario}
            nomeUsuario={nomeUsuario}
          />
        </div>
      </div>
    </header>
  );
}

type PerfilUsuarioMenuProps = {
  acaoSairMenu: ReactNode;
  avatarUrl: string | null;
  configuracoesHref: string;
  emailUsuario: string;
  iniciaisUsuario: string;
  nomeUsuario: string;
};

function PerfilUsuarioMenu({
  acaoSairMenu,
  avatarUrl,
  configuracoesHref,
  emailUsuario,
  iniciaisUsuario,
  nomeUsuario
}: PerfilUsuarioMenuProps) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative">
      <button
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-label="Abrir menu do perfil"
        className="group flex h-10 items-center gap-1.5 rounded-full border border-border bg-card/85 py-1 pl-1 pr-2 shadow-sm transition hover:border-cyan-300/45 hover:bg-cyan-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        onClick={() => setAberto((valorAtual) => !valorAtual)}
        type="button"
      >
        <AvatarUsuario avatarUrl={avatarUrl} iniciaisUsuario={iniciaisUsuario} nomeUsuario={nomeUsuario} />
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition group-hover:text-cyan-700 dark:group-hover:text-cyan-200",
            aberto && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {aberto ? (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-border bg-card/95 p-2 shadow-xl shadow-cyan-950/10 backdrop-blur-xl dark:shadow-black/30"
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            role="menu"
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">{nomeUsuario}</p>
              <p className="truncate text-xs text-muted-foreground">{emailUsuario}</p>
            </div>
            <div className="my-1 h-px bg-border/70" />
            <Link
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-cyan-500/10 hover:text-foreground"
              href={`${configuracoesHref}#configuracoes-gerais`}
              onClick={() => setAberto(false)}
              role="menuitem"
            >
              <UserRound className="h-4 w-4" />
              <span>Meu perfil</span>
            </Link>
            <Link
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-cyan-500/10 hover:text-foreground"
              href={configuracoesHref}
              onClick={() => setAberto(false)}
              role="menuitem"
            >
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </Link>
            <div className="my-1 h-px bg-border/70" />
            {acaoSairMenu}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function AvatarUsuario({
  avatarUrl,
  iniciaisUsuario,
  nomeUsuario
}: {
  avatarUrl: string | null;
  iniciaisUsuario: string;
  nomeUsuario: string;
}) {
  const [imagemFalhou, setImagemFalhou] = useState(false);
  const mostrarImagem = Boolean(avatarUrl && !imagemFalhou);

  useEffect(() => {
    setImagemFalhou(false);
  }, [avatarUrl]);

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-300/40 bg-cyan-500/15 text-xs font-semibold text-cyan-900 dark:text-cyan-100">
      {mostrarImagem && avatarUrl ? (
        <Image
          alt={nomeUsuario}
          className="h-full w-full object-cover"
          height={32}
          onError={() => setImagemFalhou(true)}
          src={avatarUrl}
          unoptimized
          width={32}
        />
      ) : (
        iniciaisUsuario
      )}
    </span>
  );
}

type SidebarAdminProps = {
  acaoSairSidebar: ReactNode;
  gerenciamento: boolean;
  itens: ItemMenuAdminResolvido[];
  pathname: string;
  tituloPerfil: string;
};

type GrupoMenuSidebar = {
  chaves: string[];
  titulo: string;
};

const GRUPOS_MENU_GERENCIAMENTO: GrupoMenuSidebar[] = [
  {
    chaves: ["/", "/propriedades", "/reservas", "/calendario", "/hospedes"],
    titulo: "Principal",
  },
  {
    chaves: [
      "/financeiro",
      "/pendencias",
      "/servicos-extras",
      "/limpeza",
      "/inventario",
      "/relatorios",
    ],
    titulo: "Operacional",
  },
  {
    chaves: [
      "/guia-regiao",
      "/avaliacoes",
      "/funcionarios",
      "/integracoes",
      "/configuracoes",
    ],
    titulo: "Configurações",
  },
  {
    chaves: ["/email", "/templates-email"],
    titulo: "Comunicacoes",
  },
];

function SidebarAdmin({
  acaoSairSidebar,
  gerenciamento,
  itens,
  pathname,
  tituloPerfil
}: SidebarAdminProps) {
  const grupos = agruparItensSidebar(itens, gerenciamento);

  if (!gerenciamento) {
    return (
      <aside className="hidden min-h-0 lg:block">
        <div className="glass-sidebar sticky top-[5.25rem] flex h-[calc(100dvh-6.5rem)] min-h-0 flex-col overflow-hidden p-3">
          <div className="shrink-0 px-2 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
              {tituloPerfil}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Menu administrativo</p>
          </div>
          <nav className="admin-sidebar-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
            {itens.map((item) => (
              <ItemMenu key={item.href} item={item} pathname={pathname} />
            ))}
            <div className="pt-1">{acaoSairSidebar}</div>
          </nav>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden min-h-0 lg:block">
      <div className="sticky top-20 flex h-[calc(100dvh-5.5rem)] min-h-0 flex-col overflow-hidden border-r border-slate-800/90 bg-slate-950/45 px-4 py-4 shadow-[18px_0_50px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div className="flex shrink-0 items-center gap-2 pb-5">
          <HospedexBrand href={gerenciamento ? "/" : "/super-admin"} size="sm" />
          <Badge className="border-cyan-400/30 bg-cyan-500/10 text-[11px] text-cyan-200" variant="outline">
            V2
          </Badge>
        </div>
        <div className="hidden">
          {gerenciamento ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                {tituloPerfil}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Navegação por perfil</p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                {tituloPerfil}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Navegação por perfil</p>
            </>
          )}
        </div>
        <nav className="admin-sidebar-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <MenuAgrupado grupos={grupos} pathname={pathname} />
          <div className="mt-5 border-t border-slate-800/80 pt-3">{acaoSairSidebar}</div>
        </nav>
      </div>
    </aside>
  );
}

type MenuMobileAdminProps = {
  acaoSairMobile: ReactNode;
  gerenciamento: boolean;
  itens: ItemMenuAdminResolvido[];
  onFechar: () => void;
  pathname: string;
  tituloPerfil: string;
};

function MenuMobileAdmin({
  acaoSairMobile,
  gerenciamento,
  itens,
  onFechar,
  pathname,
  tituloPerfil
}: MenuMobileAdminProps) {
  const grupos = agruparItensSidebar(itens, gerenciamento);

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/78 backdrop-blur-sm lg:hidden"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <motion.aside
        animate={{ x: 0 }}
        className="glass-sidebar flex h-full w-[min(22rem,88vw)] flex-col rounded-none border-y-0 border-l-0 p-4 shadow-xl"
        exit={{ x: "-100%" }}
        initial={{ x: "-100%" }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="flex shrink-0 items-center justify-between pb-5">
          <div className="flex items-center gap-2">
            <HospedexBrand href={gerenciamento ? "/" : "/super-admin"} size="sm" />
            <Badge className="border-cyan-400/30 bg-cyan-500/10 text-[11px] text-cyan-200" variant="outline">
              V2
            </Badge>
          </div>
          <div className="hidden">
            {gerenciamento ? (
              <>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
                  {tituloPerfil}
                </p>
                <p className="text-xs text-muted-foreground">Navegação por perfil</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">{tituloPerfil}</p>
                <p className="text-xs text-muted-foreground">Menu administrativo</p>
              </>
            )}
          </div>
          <Button aria-label="Fechar menu" onClick={onFechar} size="icon" type="button" variant="ghost">
            <X />
          </Button>
        </div>

        <nav className="admin-sidebar-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <MenuAgrupado grupos={grupos} onNavigate={onFechar} pathname={pathname} />
          <div className="mt-5 border-t border-slate-800/80 pt-3">{acaoSairMobile}</div>
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

type MenuAgrupadoProps = {
  grupos: Array<{
    itens: ItemMenuAdminResolvido[];
    titulo: string;
  }>;
  onNavigate?: () => void;
  pathname: string;
};

function MenuAgrupado({ grupos, onNavigate, pathname }: MenuAgrupadoProps) {
  return (
    <div className="space-y-6 pb-2">
      {grupos.map((grupo) =>
        grupo.itens.length > 0 ? (
          <section className="space-y-2" key={grupo.titulo}>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-500">
              {grupo.titulo}
            </p>
            <div className="space-y-1">
              {grupo.itens.map((item) => (
                <ItemMenu
                  item={item}
                  key={item.href}
                  pathname={pathname}
                  {...(onNavigate ? { onNavigate } : {})}
                />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}

function ItemMenu({ item, onNavigate, pathname }: ItemMenuProps) {
  const ativo = itemMenuEstaAtivo(pathname, item.href);
  const Icone = ICONES_MENU[item.icone];
  const conteudo = (
    <>
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan-300 transition-opacity",
          ativo ? "opacity-100" : "opacity-0",
        )}
      />
      <Icone
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          ativo ? "text-cyan-200" : "text-slate-400",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{item.titulo}</span>
      {item.bloqueadoPorFeatureFlag ? (
        <span className="rounded-md border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
          flag
        </span>
      ) : null}
    </>
  );
  const classes = cn(
    "relative flex h-10 items-center gap-3 rounded-lg px-3 pl-3.5 text-sm font-medium transition-colors duration-200",
    ativo
      ? "bg-cyan-500/14 text-cyan-50 shadow-sm shadow-cyan-950/20"
      : "text-slate-400 hover:bg-cyan-500/8 hover:text-slate-100",
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

function agruparItensSidebar(
  itens: ItemMenuAdminResolvido[],
  gerenciamento: boolean,
): Array<{ itens: ItemMenuAdminResolvido[]; titulo: string }> {
  if (!gerenciamento) {
    return [{ itens, titulo: "Plataforma" }];
  }

  const itensAgrupados = new Set<string>();
  const grupos = GRUPOS_MENU_GERENCIAMENTO.map((grupo) => {
    const itensDoGrupo = grupo.chaves
      .map((href) => itens.find((item) => item.href === href))
      .filter((item): item is ItemMenuAdminResolvido => Boolean(item));

    itensDoGrupo.forEach((item) => itensAgrupados.add(item.href));

    return {
      itens: itensDoGrupo,
      titulo: grupo.titulo,
    };
  });
  const itensSemGrupo = itens.filter((item) => !itensAgrupados.has(item.href));

  return itensSemGrupo.length
    ? [...grupos, { itens: itensSemGrupo, titulo: "Outros" }]
    : grupos;
}

function itemMenuEstaAtivo(pathname: string, href: string): boolean {
  if (href === "/" || href === "/super-admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function obterIniciaisUsuario(nomeUsuario: string, emailUsuario: string) {
  const base = (nomeUsuario || emailUsuario).trim();
  const partesNome = base.split(/\s+/).filter(Boolean);

  if (partesNome.length >= 2) {
    return `${partesNome[0]?.[0] ?? ""}${partesNome[1]?.[0] ?? ""}`.toUpperCase();
  }

  return (base.slice(0, 2) || "HP").toUpperCase();
}
