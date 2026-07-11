"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function FormSubmitButton({
  children,
  pendingText
}: {
  children: string;
  pendingText: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-400 px-4 text-sm font-semibold text-slate-950 shadow-sm shadow-cyan-950/20 transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:pointer-events-none disabled:bg-cyan-400/50 disabled:text-slate-950/70"
      disabled={pending}
      type="submit"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingText : children}
    </button>
  );
}
