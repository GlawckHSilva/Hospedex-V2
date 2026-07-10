import { CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import type { PlanRow } from "@hospedex/types";
import { GlassCard, StatusBadge } from "@hospedex/ui";

import { OwnerTrialSignupForm } from "../../../components/owner-trial/owner-trial-signup-form";
import { PublicShell } from "../../../components/layout/public-shell";
import { criarClienteSupabaseServer } from "../../../lib/supabase/server";

type PlanoCadastroRow = Pick<PlanRow, "annual_price" | "code" | "max_properties" | "monthly_price" | "name">;

export const dynamic = "force-dynamic";

export default async function CadastroTrialPage({
  searchParams
}: {
  searchParams: Promise<{ erro?: string; plan?: string }>;
}) {
  const { erro, plan } = await searchParams;
  const supabase = await criarClienteSupabaseServer();
  if (!supabase || !plan) redirect("/anunciar#planos");

  const { data: usuario } = await supabase.auth.getUser();
  if (usuario.user) {
    const { data: vinculo } = await supabase
      .from("tenant_members")
      .select("id")
      .eq("user_id", usuario.user.id)
      .eq("status", "active")
      .maybeSingle<{ id: string }>();

    if (vinculo) {
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.trim() || "https://hospedex.vercel.app";
      redirect(`${adminUrl}/login?message=${encodeURIComponent("Sua conta de proprietario ja existe. Entre para acessar o gerenciamento.")}`);
    }

    redirect(`/anunciar?aviso=${encodeURIComponent("Saia da conta de hospede atual antes de criar uma conta de proprietario.")}#planos`);
  }

  const { data: plano, error } = await supabase
    .from("plans")
    .select("code,name,monthly_price,annual_price,max_properties")
    .eq("code", plan.toLowerCase())
    .eq("status", "active")
    .maybeSingle<PlanoCadastroRow>();

  if (error || !plano) redirect("/anunciar#planos");

  return (
    <PublicShell>
      <section className="premium-grid-bg min-h-[calc(100vh-4rem)] border-b">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:py-14">
          <aside className="space-y-6 lg:sticky lg:top-24">
            <StatusBadge tone="info">30 dias gratis</StatusBadge>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">Comece seu Gerenciamento Hospedex</h1>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">Crie seu empreendimento, organize a operacao e publique suas casas sem cobranca no primeiro mes.</p>
            </div>
            <GlassCard className="space-y-4 p-5 text-sm text-muted-foreground">
              <Linha icon={<Sparkles />} texto="Trial completo por 30 dias" />
              <Linha icon={<ShieldCheck />} texto="Sem cobranca imediata" />
              <Linha icon={<CreditCard />} texto="Sem dados de cartao nesta etapa" />
            </GlassCard>
          </aside>

          <GlassCard className="p-5 sm:p-7">
            <OwnerTrialSignupForm
              {...(erro ? { erro } : {})}
              plano={{
                codigo: plano.code,
                limiteCasas: Number(plano.max_properties),
                nome: plano.name,
                precoAnual: Number(plano.annual_price),
                precoMensal: Number(plano.monthly_price)
              }}
            />
          </GlassCard>
        </div>
      </section>
    </PublicShell>
  );
}

function Linha({ icon, texto }: { icon: React.ReactNode; texto: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-cyan-300 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span>{texto}</span>
    </div>
  );
}
