/*
  Integração manual entre pagamento de reserva e financeiro.

  O gateway real continua fora do escopo. Esta migration remove uma constraint
  antiga de status que ainda convivia com a regra nova e prepara o lançamento
  financeiro para guardar o nome do hóspede sem depender de joins futuros.
*/

alter table public.reservations
  drop constraint if exists reservations_status_check1;

alter table public.reservations
  drop constraint if exists reservations_status_check;

alter table public.reservations
  add constraint reservations_status_check
  check (status in (
    'pending',
    'awaiting_payment',
    'confirmed',
    'checked_in',
    'checked_out',
    'completed',
    'cancelled'
  ));

alter table public.transactions
  add column if not exists guest_name text;

create index if not exists transactions_tenant_reservation_type_idx
  on public.transactions (tenant_id, reservation_id, transaction_type);

comment on column public.transactions.guest_name is
  'Nome do hóspede no momento do lançamento. Mantém rastreabilidade financeira mesmo se o cadastro do hóspede mudar.';
