"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function FormSubmitButton({
  children,
  pendingText,
}: {
  children: string;
  pendingText: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary/35 bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-cyan-950/20 transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:pointer-events-none disabled:bg-primary/45 disabled:text-primary-foreground/70"
      disabled={pending}
      type="submit"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingText : children}
    </button>
  );
}
