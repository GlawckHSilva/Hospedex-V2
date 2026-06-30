/*
  Normaliza a cobranca de hospede extra para valor por reserva.

  Algumas casas ficaram salvas com tipo "per_night", o que fazia o Marketplace
  multiplicar o valor do hospede extra pela quantidade de diarias. Na regra atual
  da V2, "valorHospedeExtra" representa o acrescimo por hospede extra na reserva.
*/

update public.properties
set pricing_details =
  coalesce(pricing_details, '{}'::jsonb) ||
  jsonb_build_object(
    'tipoCobrancaHospedeExtra',
    'per_stay',
    'extra_guest_fee_type',
    'per_stay'
  )
where coalesce(pricing_details ->> 'tipoCobrancaHospedeExtra', '') = 'per_night'
   or coalesce(pricing_details ->> 'extra_guest_fee_type', '') = 'per_night';
