/*
  Normaliza public_details de propriedades.

  Um bug do formulário de edição salvava chaves em português, enquanto Admin e
  Marketplace leem o contrato público em inglês. Esta migration preserva dados
  existentes e grava os campos no contrato oficial.
*/

update public.properties
set public_details =
  public_details
  || jsonb_strip_nulls(
    jsonb_build_object(
      'displayName',
        coalesce(public_details ->> 'displayName', public_details ->> 'nomeExibicao'),
      'publicTitle',
        coalesce(public_details ->> 'publicTitle', public_details ->> 'tituloPublico'),
      'publicDescription',
        coalesce(public_details ->> 'publicDescription', public_details ->> 'descricaoPublica'),
      'shareImageUrl',
        coalesce(public_details ->> 'shareImageUrl', public_details ->> 'imagemCompartilhamento')
    )
  )
where public_details ?| array[
  'nomeExibicao',
  'tituloPublico',
  'descricaoPublica',
  'imagemCompartilhamento'
];
