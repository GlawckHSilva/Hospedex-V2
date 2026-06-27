/*
  Corrige o contrato publico de solicitacao para ler as formas de pagamento
  salvas no cadastro da casa.

  A regra existe porque o proprietario configura pagamentos por casa em
  properties.pricing_details->formasPagamento. O Marketplace deve usar apenas
  sinais publicos booleanos e nunca expor chaves, instrucoes internas ou dados
  bancarios administrativos para o hospede.
*/
create or replace function public.get_public_property_request_profiles(
  p_property_ids uuid[]
)
returns table (
  property_id uuid,
  owner_name text,
  owner_avatar_url text,
  public_phone text,
  public_whatsapp text,
  business_name text,
  city text,
  state text,
  short_description text,
  is_verified boolean,
  payment_pix boolean,
  payment_cash boolean,
  payment_debit_card boolean,
  payment_credit_card boolean,
  payment_bank_transfer boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select
    p.id as property_id,
    coalesce(nullif(owner_profile.full_name, ''), t.name) as owner_name,
    owner_profile.avatar_url as owner_avatar_url,
    coalesce(nullif(ts.phone, ''), owner_profile.phone) as public_phone,
    nullif(ts.whatsapp, '') as public_whatsapp,
    t.name as business_name,
    nullif(ts.city, '') as city,
    nullif(ts.state, '') as state,
    nullif(ts.short_description, '') as short_description,
    true as is_verified,
    coalesce(
      case
        when jsonb_typeof(p.pricing_details #> '{formasPagamento,pix,ativo}') = 'boolean'
          then (p.pricing_details #>> '{formasPagamento,pix,ativo}')::boolean
        else null
      end,
      nullif(ts.pix_key, '') is not null,
      false
    ) as payment_pix,
    coalesce(
      case
        when jsonb_typeof(p.pricing_details #> '{formasPagamento,dinheiro,ativo}') = 'boolean'
          then (p.pricing_details #>> '{formasPagamento,dinheiro,ativo}')::boolean
        else null
      end,
      nullif(ts.cash_payment_instructions, '') is not null,
      false
    ) as payment_cash,
    coalesce(
      case
        when jsonb_typeof(p.pricing_details #> '{formasPagamento,cartaoDebito,ativo}') = 'boolean'
          then (p.pricing_details #>> '{formasPagamento,cartaoDebito,ativo}')::boolean
        else null
      end,
      nullif(ts.debit_card_payment_instructions, '') is not null,
      false
    ) as payment_debit_card,
    coalesce(
      case
        when jsonb_typeof(p.pricing_details #> '{formasPagamento,cartaoCredito,ativo}') = 'boolean'
          then (p.pricing_details #>> '{formasPagamento,cartaoCredito,ativo}')::boolean
        when jsonb_typeof(p.pricing_details -> 'aceitaCartaoCredito') = 'boolean'
          then (p.pricing_details ->> 'aceitaCartaoCredito')::boolean
        else null
      end,
      false
    ) as payment_credit_card,
    coalesce(
      case
        when jsonb_typeof(p.pricing_details #> '{formasPagamento,transferenciaBancaria,ativo}') = 'boolean'
          then (p.pricing_details #>> '{formasPagamento,transferenciaBancaria,ativo}')::boolean
        else null
      end,
      nullif(ts.bank_transfer_payment_instructions, '') is not null,
      false
    ) as payment_bank_transfer
  from public.properties p
  join public.tenants t on t.id = p.tenant_id
  join public.profiles owner_profile on owner_profile.id = p.owner_id
  left join public.tenant_settings ts on ts.tenant_id = p.tenant_id
  where p_property_ids is not null
    and p.id = any(p_property_ids)
    and app_private.is_marketplace_property_public(p.id);
$$;

comment on function public.get_public_property_request_profiles(uuid[]) is
  'Retorna dados publicos minimos e formas de pagamento configuradas no cadastro da casa.';

revoke all on function public.get_public_property_request_profiles(uuid[]) from public;
grant execute on function public.get_public_property_request_profiles(uuid[])
  to anon, authenticated;

notify pgrst, 'reload schema';
