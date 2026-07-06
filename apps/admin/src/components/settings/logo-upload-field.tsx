"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button, cn } from "@hospedex/ui";

type LogoUploadFieldProps = {
  disabled?: boolean;
  logoUrl: string | null;
};

const TIPOS_LOGO_ACEITOS = ".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml";

/**
 * Campo de logo do proprietario.
 *
 * A UI evita URL manual porque a origem correta da marca deve ser um arquivo do
 * dispositivo. O upload real continua na Server Action para preservar sessao,
 * permissoes e isolamento multi-tenant antes de gravar no Supabase Storage.
 */
export function LogoUploadField({ disabled, logoUrl }: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewSelecionado, setPreviewSelecionado] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [removerLogo, setRemoverLogo] = useState(false);

  const previewLogo = useMemo(() => {
    if (removerLogo) return null;
    return previewSelecionado ?? logoUrl;
  }, [logoUrl, previewSelecionado, removerLogo]);

  useEffect(() => {
    return () => {
      if (previewSelecionado) URL.revokeObjectURL(previewSelecionado);
    };
  }, [previewSelecionado]);

  function selecionarArquivo(arquivo: File | undefined) {
    if (previewSelecionado) URL.revokeObjectURL(previewSelecionado);

    if (!arquivo) {
      setPreviewSelecionado(null);
      setNomeArquivo(null);
      return;
    }

    setPreviewSelecionado(URL.createObjectURL(arquivo));
    setNomeArquivo(arquivo.name);
    setRemoverLogo(false);
  }

  function removerPreview() {
    if (previewSelecionado) URL.revokeObjectURL(previewSelecionado);
    setPreviewSelecionado(null);
    setNomeArquivo(null);
    setRemoverLogo(true);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">Logo</span>
      <input name="logoUrlAtual" type="hidden" value={logoUrl ?? ""} />
      {removerLogo ? <input name="removerLogo" type="hidden" value="on" /> : null}

      <div className="rounded-xl border bg-background/45 p-4">
        {previewLogo ? (
          <div
            aria-label="Preview da logo"
            className="h-24 rounded-lg border bg-contain bg-center bg-no-repeat"
            role="img"
            style={{ backgroundImage: `url("${previewLogo}")` }}
          />
        ) : (
          <div className="grid h-24 place-items-center rounded-lg border border-dashed bg-background/45 text-sm text-muted-foreground">
            Nenhuma logo configurada
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-500/10 px-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-500/15 dark:text-cyan-200",
              disabled && "pointer-events-none opacity-50",
            )}
            htmlFor="logoFile"
          >
            <ImageUp className="h-4 w-4" />
            {previewLogo ? "Trocar logo" : "Escolher logo"}
          </label>
          <input
            accept={TIPOS_LOGO_ACEITOS}
            className="sr-only"
            disabled={disabled}
            id="logoFile"
            name="logoFile"
            onChange={(evento) => selecionarArquivo(evento.target.files?.[0])}
            ref={inputRef}
            type="file"
          />

          {previewLogo ? (
            <Button
              disabled={disabled}
              onClick={removerPreview}
              size="sm"
              type="button"
              variant="outline"
            >
              <Trash2 />
              Remover logo
            </Button>
          ) : null}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {nomeArquivo ??
            "PNG, JPG, WebP ou SVG. Recomendado: 512x512px com fundo transparente."}
        </p>
      </div>
    </div>
  );
}
