/*
  Controle manual de pagamento por reserva.

  O gateway real continua fora do escopo. Estes campos permitem ao proprietario
  controlar recebimento, pendencia, estorno e cancelamento sem expor segredo no
  frontend e respeitando as policies ja existentes da tabela de reservas.
*/

alter table public.reservations
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_status_updated_at timestamptz,
  add column if not exists payment_status_updated_by uuid references public.profiles(id) on delete set null;

alter table public.reservations
  drop constraint if exists reservations_payment_status_check;

alter table public.reservations
  add constraint reservations_payment_status_check
  check (payment_status in ('pending', 'received', 'refunded', 'cancelled'));

update public.reservations
set
  payment_status = case
    when status = 'cancelled' then 'cancelled'
    else payment_status
  end,
  payment_status_updated_at = coalesce(payment_status_updated_at, updated_at)
where status = 'cancelled'
   or payment_status_updated_at is null;

create index if not exists reservations_tenant_payment_status_idx
  on public.reservations (tenant_id, owner_id, payment_status, status);

comment on column public.reservations.payment_status is
  'Controle manual de pagamento da reserva. Nao representa gateway real.';
comment on column public.reservations.payment_status_updated_at is
  'Data/hora da ultima alteracao manual do status de pagamento.';
comment on column public.reservations.payment_status_updated_by is
  'Usuario que alterou manualmente o status de pagamento.';
