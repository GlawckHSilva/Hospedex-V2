/*
  Corrige a policy de Storage das imagens de casas.

  Regra de negocio:
  - o proprietario do tenant pode gerenciar imagens das proprias casas;
  - funcionarios continuam dependendo da permissao properties.manage;
  - o tenant_id permanece no inicio do path para preservar isolamento multi-tenant;
  - a policy continua bloqueando escrita quando a licenca nao permite acoes.
*/

drop policy if exists "property_media_insert_manage" on storage.objects;
drop policy if exists "property_media_update_manage" on storage.objects;
drop policy if exists "property_media_delete_manage" on storage.objects;

create policy "property_media_insert_manage" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'hospedex-property-media'
  and (
    app_private.is_tenant_owner(app_private.storage_tenant_id(name))
    or app_private.has_tenant_permission(
      app_private.storage_tenant_id(name),
      'properties.manage'
    )
  )
);

create policy "property_media_update_manage" on storage.objects
for update to authenticated
using (
  bucket_id = 'hospedex-property-media'
  and (
    app_private.is_tenant_owner(app_private.storage_tenant_id(name))
    or app_private.has_tenant_permission(
      app_private.storage_tenant_id(name),
      'properties.manage'
    )
  )
)
with check (
  bucket_id = 'hospedex-property-media'
  and (
    app_private.is_tenant_owner(app_private.storage_tenant_id(name))
    or app_private.has_tenant_permission(
      app_private.storage_tenant_id(name),
      'properties.manage'
    )
  )
);

create policy "property_media_delete_manage" on storage.objects
for delete to authenticated
using (
  bucket_id = 'hospedex-property-media'
  and (
    app_private.is_tenant_owner(app_private.storage_tenant_id(name))
    or app_private.has_tenant_permission(
      app_private.storage_tenant_id(name),
      'properties.manage'
    )
  )
);
