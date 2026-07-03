/*
  Centraliza dados de recebimento no tenant.

  Esses campos pertencem ao proprietario/empreendimento, nao a uma casa
  especifica. A casa deve apenas escolher quais formas aceita; dados como CPF,
  tipo de chave Pix e recebedor ficam em tenant_settings para evitar duplicacao
  e divergencia entre propriedades do mesmo tenant.
*/
alter table public.tenant_settings
  add column if not exists pix_key_type text not null default 'aleatoria',
  add column if not exists payment_receiver_document text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenant_settings_pix_key_type_check'
      and conrelid = 'public.tenant_settings'::regclass
  ) then
    alter table public.tenant_settings
      add constraint tenant_settings_pix_key_type_check
      check (pix_key_type in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));
  end if;
end $$;

comment on column public.tenant_settings.pix_key_type is
  'Tipo da chave Pix cadastrada pelo proprietario para mensagens e instrucoes de pagamento.';
comment on column public.tenant_settings.payment_receiver_document is
  'Documento publico do recebedor, como CPF ou CNPJ, usado em orientacoes manuais de pagamento.';
