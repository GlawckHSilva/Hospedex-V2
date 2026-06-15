/*
  Responsável por arquivar resíduos do schema antigo da V1.

  A V2 do Hospedex é a fonte oficial do banco. Esta migration não apaga dados:
  move tabelas e rotinas antigas para um schema isolado, fora de `public`.
  Isso evita conflito com a Data API do Supabase e mantém o schema público
  alinhado às migrations multi-tenant da V2.
*/

do $$
declare
  tabelas_v2 text[] := array[
    'profiles',
    'tenants',
    'roles',
    'tenant_members',
    'permissions',
    'role_permissions',
    'feature_flags',
    'tenant_features',
    'plans',
    'plan_features',
    'subscriptions',
    'licenses',
    'properties',
    'property_settings',
    'unit_categories',
    'units',
    'amenities',
    'property_amenities',
    'media_assets',
    'reservations',
    'reservation_guests',
    'reservation_status_history',
    'financial_accounts',
    'expense_categories',
    'transactions',
    'audit_logs',
    'deleted_items'
  ];
  tabela record;
  rotina record;
  possui_legado boolean;
begin
  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name <> all (tabelas_v2)
      and table_name <> 'spatial_ref_sys'
  ) or exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
    where n.nspname = 'public'
      and d.objid is null
      and p.proname in (
        'enforce_property_license_limit',
        'ensure_property_slug',
        'handle_new_user',
        'has_active_owner_license',
        'is_admin',
        'is_owner',
        'is_owner_admin',
        'is_property_bookable',
        'is_property_publicly_visible',
        'is_super_admin',
        'is_super_admin_email',
        'protect_profile_role_changes',
        'protect_property_license_fields',
        'protect_property_review_update',
        'slugify',
        'sync_property_license_fields',
        'touch_platform_financial_movements_updated_at',
        'validate_property_review_insert'
      )
  )
  into possui_legado;

  if possui_legado then
    create schema if not exists legacy_v1;
    comment on schema legacy_v1 is
      'Arquivo seguro de objetos da V1 preservados fora do schema public da V2.';
  end if;

  for tabela in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name <> all (tabelas_v2)
      and table_name <> 'spatial_ref_sys'
    order by table_name
  loop
    -- Tabelas da V1 saem de public para não ficarem expostas pela Data API.
    execute format('alter table public.%I set schema legacy_v1', tabela.table_name);
  end loop;

  for rotina in
    select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
    where n.nspname = 'public'
      and d.objid is null
      and p.proname in (
        'enforce_property_license_limit',
        'ensure_property_slug',
        'handle_new_user',
        'has_active_owner_license',
        'is_admin',
        'is_owner',
        'is_owner_admin',
        'is_property_bookable',
        'is_property_publicly_visible',
        'is_super_admin',
        'is_super_admin_email',
        'protect_profile_role_changes',
        'protect_property_license_fields',
        'protect_property_review_update',
        'slugify',
        'sync_property_license_fields',
        'touch_platform_financial_movements_updated_at',
        'validate_property_review_insert'
      )
    order by p.proname
  loop
    -- Rotinas antigas deixam de ficar no schema exposto; a V2 usa app_private.
    execute format(
      'alter function public.%I(%s) set schema legacy_v1',
      rotina.proname,
      rotina.argumentos
    );
  end loop;
end $$;
