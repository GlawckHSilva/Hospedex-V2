/*
  Corrige o alvo de conflito usado pela RPC de pagamento.

  A funcao set_reservation_payment_operational usa ON CONFLICT em
  tenant_id/reservation_id para receitas de reserva. Este indice replica
  exatamente o predicado esperado pelo Postgres e evita falha ao registrar
  pagamento recebido em producao.
*/

create unique index if not exists transactions_reservation_income_conflict_uidx
  on public.transactions (tenant_id, reservation_id)
  where transaction_type = 'income';
