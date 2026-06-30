/**
 * Mensagens prontas da central de Pendências.
 *
 * Centralizar estes textos evita que cada card invente uma explicação diferente
 * para o mesmo status operacional.
 */
export const MENSAGENS_PENDENCIA = {
  awaiting_payment: {
    description:
      "Reserva aprovada e aguardando pagamento. Registre o pagamento quando receber ou copie a mensagem de cobrança para enviar ao hóspede.",
    primaryAction: "Registrar pagamento",
    title: "Reserva aguardando pagamento"
  },
  checkin_pending: {
    description: "O check-in desta reserva precisa ser confirmado.",
    primaryAction: "Confirmar check-in",
    title: "Check-in pendente"
  },
  checkout_pending: {
    description:
      "O período da hospedagem terminou. Confirme o check-out para liberar as próximas etapas.",
    primaryAction: "Confirmar check-out",
    title: "Check-out pendente"
  },
  cleaning_pending: {
    description: "Esta casa precisa de limpeza antes de ficar disponível novamente.",
    primaryAction: "Marcar limpeza concluída",
    title: "Limpeza pendente"
  },
  partial_payment: {
    description: "A entrada foi registrada. Ainda existe saldo pendente para esta reserva.",
    primaryAction: "Registrar restante",
    title: "Pagamento parcial registrado"
  },
  payment_proof_review: {
    description:
      "O hóspede enviou um comprovante. Confira os dados antes de aprovar o pagamento.",
    primaryAction: "Analisar comprovante",
    title: "Comprovante aguardando análise"
  },
  reservation_request: {
    description:
      "Nova solicitação recebida. Analise os dados da reserva e aprove para gerar a cobrança.",
    primaryAction: "Aprovar e gerar cobrança",
    title: "Nova solicitação recebida"
  }
} as const;

export type TipoMensagemPendencia = keyof typeof MENSAGENS_PENDENCIA;
