import { redirect } from "next/navigation";

/**
 * Rota legada mantida para não quebrar links antigos.
 *
 * Confirmações deixou de ser módulo principal e passou a ser parte da central
 * operacional de Pendências. A autenticação e as permissões continuam sendo
 * validadas na rota de destino.
 */
export default function ConfirmacoesPage() {
  redirect("/pendencias");
}
