/*
  Correcoes encontradas na auditoria Supabase da V2.

  Esta migration reforca o isolamento multi-tenant sem apagar dados:
  - valida que a propriedade pertence ao tenant antes de autorizar operacoes;
  - limita estados de notificacao ao proprio usuario e tenant ativo;
  - remove acesso direto a uma funcao financeira interna;
  - completa profiles antigos e alinha o Storage com os formatos aceitos pela UI.
*/

create or replace function app_private.can_access_property(
  target_tenant_id uuid,
  target_property_id uuid,
  permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.properties property_scope
    where property_scope.id = target_property_id
      and property_scope.tenant_id = target_tenant_id
  )
  and (
    app_private.is_tenant_owner(target_tenant_id)
    or exists (
      select 1
      from public.tenant_members tm
      join public.role_permissions rp on rp.role_id = tm.role_id
      join public.permissions p on p.id = rp.permission_id
      where tm.tenant_id = target_tenant_id
        and tm.user_id = auth.uid()
        and tm.status = 'active'
        and p.code = permission_code
        and (
          tm.property_scope is null
          or cardinality(tm.property_scope) = 0
          or target_property_id = any(tm.property_scope)
        )
    )
  );
$$;

comment on function app_private.can_access_property(uuid, uuid, text) is
  'Autoriza acesso somente quando property_id pertence ao tenant informado e o usuario possui a permissao exigida.';

drop policy if exists "management_notification_states_select_own"
  on public.management_notification_states;
drop policy if exists "management_notification_states_insert_own"
  on public.management_notification_states;
drop policy if exists "management_notification_states_update_own"
  on public.management_notification_states;
drop policy if exists "management_notification_states_delete_own"
  on public.management_notification_states;

create policy "management_notification_states_select_own"
on public.management_notification_states
for select to authenticated
using (
  user_id = auth.uid()
  and app_private.is_tenant_member(management_notification_states.tenant_id)
);

create policy "management_notification_states_insert_own"
on public.management_notification_states
for insert to authenticated
with check (
  user_id = auth.uid()
  and app_private.is_tenant_member(management_notification_states.tenant_id)
);

create policy "management_notification_states_update_own"
on public.management_notification_states
for update to authenticated
using (
  user_id = auth.uid()
  and app_private.is_tenant_member(management_notification_states.tenant_id)
)
with check (
  user_id = auth.uid()
  and app_private.is_tenant_member(management_notification_states.tenant_id)
);

create policy "management_notification_states_delete_own"
on public.management_notification_states
for delete to authenticated
using (
  user_id = auth.uid()
  and app_private.is_tenant_member(management_notification_states.tenant_id)
);

comment on policy "management_notification_states_select_own"
  on public.management_notification_states is
  'Permite leitura apenas do estado do usuario autenticado dentro de um tenant ao qual ele pertence.';
comment on policy "management_notification_states_insert_own"
  on public.management_notification_states is
  'Impede a criacao de estado de notificacao em outro tenant ou para outro usuario.';
comment on policy "management_notification_states_update_own"
  on public.management_notification_states is
  'Impede mover ou alterar estado de notificacao fora do tenant ativo do proprio usuario.';
comment on policy "management_notification_states_delete_own"
  on public.management_notification_states is
  'Permite excluir somente o estado do proprio usuario em tenant ativo.';

/*
  A funcao cria dados financeiros e deve ser chamada apenas pelo trigger interno
  de tenants ou por rotinas administrativas protegidas, nunca pelo cliente web.
*/
revoke all on function app_private.ensure_finance_defaults(uuid, uuid) from public;
revoke all on function app_private.ensure_finance_defaults(uuid, uuid) from anon;
revoke all on function app_private.ensure_finance_defaults(uuid, uuid) from authenticated;
grant execute on function app_private.ensure_finance_defaults(uuid, uuid) to service_role;

/*
  Usuarios anteriores ao bootstrap de Auth podem nao possuir profile. O backfill
  e idempotente e nao altera profiles existentes nem concede tenant ou role.
*/
insert into public.profiles (
  id,
  email,
  full_name,
  phone,
  avatar_url,
  platform_role
)
select
  auth_user.id,
  coalesce(auth_user.email, ''),
  auth_user.raw_user_meta_data ->> 'full_name',
  auth_user.raw_user_meta_data ->> 'phone',
  auth_user.raw_user_meta_data ->> 'avatar_url',
  'user'
from auth.users auth_user
where not exists (
  select 1
  from public.profiles profile
  where profile.id = auth_user.id
);

/*
  A configuracao do proprietario aceita SVG para a logo. O bucket precisa
  refletir exatamente essa validacao para o upload nao falhar no Storage.
*/
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]
where id = 'hospedex-property-media';
