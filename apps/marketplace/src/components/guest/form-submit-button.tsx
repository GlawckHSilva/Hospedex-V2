"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { GlassButton } from "@hospedex/ui";

export function FormSubmitButton({
  children,
  pendingText
}: {
  children: string;
  pendingText: string;
}) {
  const { pending } = useFormStatus();

  return (
    <GlassButton className="w-full" disabled={pending} type="submit">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingText : children}
    </GlassButton>
  );
}
