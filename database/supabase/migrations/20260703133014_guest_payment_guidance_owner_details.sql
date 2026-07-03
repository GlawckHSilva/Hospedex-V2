/*
  Atualiza as instrucoes de pagamento visiveis ao hospede.

  Os dados de recebimento agora pertencem ao tenant/proprietario. Esta funcao
  continua protegida por usuario autenticado e retorna apenas instrucoes da
  propria reserva do hospede, sem abrir tabelas internas nem usar service role
  no frontend.
*/
create or replace function public.get_guest_reservation_payment_guidance(
  p_reservation_ids uuid[]
)
returns table (
  reservation_id uuid,
  payment_method text,
  payment_status text,
  instruction text,
  owner_name text,
  owner_phone text,
  owner_whatsapp text,
  prepared_message text
)
language sql
stable
security definer
set search_path = public, app_private
as $$
  select
    reserva.id as reservation_id,
    reserva.payment_method,
    reserva.payment_status,
    nullif(
      case reserva.payment_method
        when 'pix' then trim(concat_ws(
          E'\n',
          case
            when nullif(configuracao.pix_key, '') is not null
              then concat('Chave Pix', case
                when configuracao.pix_key_type is not null
                  then concat(' (', configuracao.pix_key_type, ')')
                else ''
              end, ': ', configuracao.pix_key)
            else 'Combine o pagamento via Pix com o proprietario pelo contato informado.'
          end,
          case
            when nullif(configuracao.pix_receiver_name, '') is not null
              then concat('Recebedor: ', configuracao.pix_receiver_name)
            else null
          end,
          case
            when nullif(configuracao.payment_receiver_document, '') is not null
              then concat('CPF/CNPJ: ', configuracao.payment_receiver_document)
            else null
          end,
          case
            when nullif(configuracao.pix_bank_name, '') is not null
              then concat('Banco/instituicao: ', configuracao.pix_bank_name)
            else null
          end,
          nullif(configuracao.pix_payment_note, '')
        ))
        when 'cash' then coalesce(
          nullif(configuracao.cash_payment_instructions, ''),
          'Pagamento em dinheiro combinado diretamente com o proprietario.'
        )
        when 'debit_card' then coalesce(
          nullif(configuracao.debit_card_payment_instructions, ''),
          'Pagamento por debito sera orientado pelo proprietario, sem envio de dados sensiveis.'
        )
        when 'credit_card' then trim(concat_ws(
          ' ',
          nullif(configuracao.credit_card_payment_instructions, ''),
          nullif(configuracao.credit_card_installments_note, '')
        ))
        when 'bank_transfer' then coalesce(
          nullif(configuracao.bank_transfer_payment_instructions, ''),
          'Transferencia bancaria combinada diretamente com o proprietario.'
        )
        else 'O proprietario enviara as instrucoes de pagamento quando a reserva for confirmada.'
      end,
      ''
    ) as instruction,
    coalesce(nullif(proprietario.full_name, ''), tenant.name) as owner_name,
    coalesce(nullif(configuracao.phone, ''), proprietario.phone) as owner_phone,
    nullif(configuracao.whatsapp, '') as owner_whatsapp,
    concat(
      'Reserva ', reserva.code,
      ' - forma de pagamento: ', coalesce(reserva.payment_method, 'nao informada'),
      '. Valor oficial: BRL ', reserva.total_amount::text,
      '. Status do pagamento: ', reserva.payment_status, '.'
    ) as prepared_message
  from public.reservations reserva
  join public.tenants tenant on tenant.id = reserva.tenant_id
  join public.profiles proprietario on proprietario.id = reserva.owner_id
  left join public.tenant_settings configuracao on configuracao.tenant_id = reserva.tenant_id
  where reserva.id = any(p_reservation_ids)
    and reserva.guest_user_id = (select auth.uid());
$$;

comment on function public.get_guest_reservation_payment_guidance(uuid[]) is
  'Retorna instrucoes de pagamento do tenant para o hospede dono da reserva, sem expor secrets.';

revoke all on function public.get_guest_reservation_payment_guidance(uuid[]) from public;
revoke all on function public.get_guest_reservation_payment_guidance(uuid[]) from anon;
grant execute on function public.get_guest_reservation_payment_guidance(uuid[])
  to authenticated, service_role;

notify pgrst, 'reload schema';
