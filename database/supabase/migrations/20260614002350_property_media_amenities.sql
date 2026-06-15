alter table public.media_assets
  add column if not exists is_cover boolean not null default false;

create index if not exists media_assets_cover_idx
  on public.media_assets (tenant_id, property_id, unit_id, is_cover, sort_order)
  where status = 'active';

comment on column public.media_assets.is_cover is
  'Define a imagem principal da propriedade ou unidade. A imagem continua no Storage; exclusão lógica evita quebrar histórico futuro.';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'hospedex-property-media',
  'hospedex-property-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function app_private.storage_tenant_id(object_name text)
returns uuid
language plpgsql
stable
set search_path = public, app_private, storage
as $$
declare
  tenant_text text;
begin
  tenant_text := (storage.foldername(object_name))[1];
  return tenant_text::uuid;
exception
  when others then
    return null;
end;
$$;

comment on function app_private.storage_tenant_id(text) is
  'Extrai o tenant_id do caminho do Storage. Caminhos inválidos retornam null para bloquear policies sem erro público.';

drop policy if exists "property_media_select_public" on storage.objects;
drop policy if exists "property_media_insert_manage" on storage.objects;
drop policy if exists "property_media_update_manage" on storage.objects;
drop policy if exists "property_media_delete_manage" on storage.objects;

create policy "property_media_select_public" on storage.objects
for select to public
using (bucket_id = 'hospedex-property-media');

create policy "property_media_insert_manage" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'hospedex-property-media'
  and app_private.has_tenant_permission(
    app_private.storage_tenant_id(name),
    'properties.manage'
  )
);

create policy "property_media_update_manage" on storage.objects
for update to authenticated
using (
  bucket_id = 'hospedex-property-media'
  and app_private.has_tenant_permission(
    app_private.storage_tenant_id(name),
    'properties.manage'
  )
)
with check (
  bucket_id = 'hospedex-property-media'
  and app_private.has_tenant_permission(
    app_private.storage_tenant_id(name),
    'properties.manage'
  )
);

create policy "property_media_delete_manage" on storage.objects
for delete to authenticated
using (
  bucket_id = 'hospedex-property-media'
  and app_private.has_tenant_permission(
    app_private.storage_tenant_id(name),
    'properties.manage'
  )
);

insert into public.amenities (tenant_id, code, name, category, is_system)
select null, codigo, nome, 'estrutura', true
from (
  values
    ('piscina', 'Piscina'),
    ('wifi', 'Wi-Fi'),
    ('ar_condicionado', 'Ar-condicionado'),
    ('churrasqueira', 'Churrasqueira'),
    ('tv', 'TV'),
    ('estacionamento', 'Estacionamento'),
    ('pet_friendly', 'Pet friendly')
) as comodidade(codigo, nome)
where not exists (
  select 1
  from public.amenities existente
  where existente.tenant_id is null
    and existente.code = comodidade.codigo
);
