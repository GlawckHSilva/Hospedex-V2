/*
  Cadastro completo de casas no Gerenciamento.

  Os campos novos aceitam nulo ou default para nao quebrar casas existentes.
  Visibilidade/destaque ficam armazenados, mas o Marketplace nao e alterado
  nesta etapa; a publicacao real continua controlada por fluxo proprio.
*/

alter table public.properties
  add column if not exists short_description text,
  add column if not exists full_description text,
  add column if not exists is_public boolean not null default false,
  add column if not exists marketplace_featured boolean not null default false,
  add column if not exists structure_details jsonb not null default '{}'::jsonb,
  add column if not exists pricing_details jsonb not null default '{}'::jsonb;

comment on column public.properties.short_description is
  'Resumo curto editado no Gerenciamento para uso operacional e exibicao futura.';
comment on column public.properties.full_description is
  'Descricao completa da casa. Mantida separada do resumo para evitar perda de contexto.';
comment on column public.properties.is_public is
  'Intencao do proprietario de exibir a casa publicamente. Marketplace nao consome automaticamente nesta etapa.';
comment on column public.properties.marketplace_featured is
  'Marca de destaque futura do Marketplace, controlada no Gerenciamento sem alterar vitrine agora.';
comment on column public.properties.structure_details is
  'Dados estruturais da casa que nao pertencem a unidade padrao, preservando compatibilidade multi-tenant.';
comment on column public.properties.pricing_details is
  'Valores operacionais da casa. Pagamento online e tarifario por periodo ficam fora desta etapa.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'properties_structure_details_object_check'
      and conrelid = 'public.properties'::regclass
  ) then
    alter table public.properties
      add constraint properties_structure_details_object_check
      check (jsonb_typeof(structure_details) = 'object');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'properties_pricing_details_object_check'
      and conrelid = 'public.properties'::regclass
  ) then
    alter table public.properties
      add constraint properties_pricing_details_object_check
      check (jsonb_typeof(pricing_details) = 'object');
  end if;
end $$;

update public.properties
set
  short_description = coalesce(short_description, headline, description),
  full_description = coalesce(full_description, description)
where short_description is null
   or full_description is null;
