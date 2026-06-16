/*
  Módulo financeiro inicial do proprietário.

  Esta migration não cria gateway, repasse ou relatórios avançados. Ela apenas
  garante uma conta caixa e categorias iniciais por tenant para os lançamentos
  manuais do painel financeiro.
*/

comment on table public.financial_accounts is
  'Contas financeiras do tenant. A conta caixa inicial permite lançamentos manuais antes de integrações bancárias.';
comment on table public.expense_categories is
  'Categorias financeiras do tenant. O nome histórico da tabela é mantido, mas o campo kind separa receitas e despesas.';
comment on table public.transactions is
  'Lançamentos financeiros do tenant. Integrações futuras devem preservar tenant_id e financeiro por propriedade/reserva.';

create or replace function app_private.ensure_finance_defaults(
  target_tenant_id uuid,
  target_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  /*
    Todo tenant precisa de uma conta caixa para criar lançamentos manuais.
    Isso evita bloquear o proprietário antes da fase de contas bancárias.
  */
  insert into public.financial_accounts (
    tenant_id,
    owner_id,
    name,
    account_type,
    currency,
    status
  )
  select
    target_tenant_id,
    target_owner_id,
    'Caixa principal',
    'cash',
    'BRL',
    'active'
  where not exists (
    select 1
    from public.financial_accounts fa
    where fa.tenant_id = target_tenant_id
      and fa.status = 'active'
  );

  insert into public.expense_categories (tenant_id, name, kind)
  values
    (target_tenant_id, 'Reserva', 'income'),
    (target_tenant_id, 'Serviço extra', 'income'),
    (target_tenant_id, 'Receita manual', 'income'),
    (target_tenant_id, 'Limpeza', 'expense'),
    (target_tenant_id, 'Manutenção', 'expense'),
    (target_tenant_id, 'Energia', 'expense'),
    (target_tenant_id, 'Água', 'expense'),
    (target_tenant_id, 'Internet', 'expense'),
    (target_tenant_id, 'Funcionários', 'expense'),
    (target_tenant_id, 'Produtos', 'expense'),
    (target_tenant_id, 'Outras', 'expense')
  on conflict (tenant_id, name, kind) do nothing;
end;
$$;

create or replace function app_private.create_finance_defaults_for_tenant()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  perform app_private.ensure_finance_defaults(new.id, new.owner_id);
  return new;
end;
$$;

drop trigger if exists create_finance_defaults_for_tenant on public.tenants;
create trigger create_finance_defaults_for_tenant
after insert on public.tenants
for each row execute function app_private.create_finance_defaults_for_tenant();

do $$
declare
  tenant_atual record;
begin
  for tenant_atual in
    select id, owner_id from public.tenants where deleted_at is null
  loop
    perform app_private.ensure_finance_defaults(tenant_atual.id, tenant_atual.owner_id);
  end loop;
end;
$$;

grant execute on function app_private.ensure_finance_defaults(uuid, uuid)
to authenticated, service_role;
