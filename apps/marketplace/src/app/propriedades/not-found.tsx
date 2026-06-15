import Link from "next/link";

import { buttonVariants, cn } from "@hospedex/ui";

import { PublicShell } from "../../components/layout/public-shell";

export default function PropriedadesNotFound() {
  return (
    <PublicShell>
      <section className="grid min-h-[70svh] place-items-center px-4 py-16 text-center">
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold">Propriedade indisponível</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Esta hospedagem não está publicada ou não faz parte da vitrine pública.
          </p>
          <Link className={cn(buttonVariants(), "mt-6")} href="/propriedades">
            Ver propriedades
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
